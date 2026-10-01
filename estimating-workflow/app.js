'use strict';
(() => {
  const data = JSON.parse(document.getElementById('knowledge').textContent);
  const views = [...document.querySelectorAll('.view')];
  const dialog = document.getElementById('detail-dialog');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => typeof value === 'number' ? new Intl.NumberFormat('en-US', {maximumFractionDigits:9}).format(value) : String(value ?? 'ไม่มีค่า');
  let formulas = [], formulaPromise = null, page = 0, filtered = [], activeView = 'flow';
  const PAGE_SIZE = 40;

  function setView(name, updateHash = true) {
    if (!views.some(v => v.id === name)) name = 'flow';
    activeView = name;
    views.forEach(v => { v.hidden = v.id !== name; });
    document.querySelectorAll('[data-view]').forEach(a => {
      a.classList.toggle('active', a.dataset.view === name);
      if (a.dataset.view === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (updateHash) history.replaceState(null, '', '#' + name);
    if (name === 'flow') requestAnimationFrame(drawFlow);
    if (name === 'registry') loadFormulas();
  }

  function selectProduct(product) {
    setView('formulas');
    document.querySelectorAll('[data-formula-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.formulaTab === product)));
    document.querySelectorAll('[data-formula-panel]').forEach(p => { p.hidden = p.dataset.formulaPanel !== product; });
    document.getElementById('formulas-heading').scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }

  function openDialog(kicker, title, html) {
    document.getElementById('detail-kicker').textContent = kicker;
    document.getElementById('detail-title').textContent = title;
    document.getElementById('detail-content').innerHTML = html;
    if (!dialog.open) dialog.showModal();
  }

  function showGates(ids) {
    const selected = ids.split(',').map(id => data.gates.find(g => g.id === id)).filter(Boolean);
    const html = selected.map(g => {
      const findings = data.findings.filter(f => (f.gate.match(/G\d{2}/g) || []).includes(g.id));
      return '<div class="dialog-gate"><h3>' + esc(g.id + ' ' + g.step) + '</h3><dl class="detail-dl">' +
        '<dt>AI ทำ</dt><dd>' + esc(g.ai_action) + '</dd>' +
        '<dt>คนรับรอง</dt><dd>' + esc(g.decision_required) + '</dd>' +
        '<dt>บทบาทที่เสนอ</dt><dd>' + esc(g.human_role_proposed) + '</dd>' +
        '<dt>ให้ HOLD เมื่อ</dt><dd>' + esc(g.hold_trigger) + '</dd>' +
        '<dt>หลักฐาน</dt><dd>' + esc(g.source_evidence) + '</dd>' +
        '<dt>ข้อมูลต้องมี</dt><dd><code>' + esc(g.required_fields) + '</code></dd></dl>' +
        '<p class="note">สถานะ: ' + esc(g.status) + ' คำตอบจาก AI เป็น PROPOSED</p>' +
        (findings.length ? '<h3>ประเด็นเกี่ยวข้อง (' + findings.length + ')</h3>' + findings.map(f => '<p><strong>' + esc(f.id + ' ' + f.title) + '</strong><br>' + esc(f.evidence) + '<br><strong>ต้องตอบ:</strong> ' + esc(f.human_decision) + '</p>').join('') : '') + '</div>';
    }).join('');
    openDialog('HUMAN GATE · รอรับรอง', selected.map(g => g.id).join(' + '), html);
  }

  function showHold() {
    openDialog('HOLD · ใช้ได้ทุกขั้น', 'หยุดที่ประเด็นที่ยังไม่ผ่าน', '<ol><li>ระบุขั้นงานและประเด็นที่ขาด ขัดแย้ง หมดอายุ หรือผิดเงื่อนไข</li><li>ผูกไฟล์ ชีต เซลล์ หรือภาพหลักฐานกับประเด็น</li><li>AI เสนอคำตอบและคำนวณทดลองได้ในสถานะ PROPOSED</li><li>คนรับรองคำตอบ เหตุผล หลักฐาน ผู้รับรอง วันที่ เวอร์ชัน และวันสิ้นอายุ</li><li>เมื่อแก้ข้อมูล ให้คำนวณใหม่และตรวจ Gate ที่ได้รับผลกระทบ</li></ol><p class="note">รับรองบาง Gate ไม่ได้หมายถึงรับรองทั้งงาน G08 ต้องตรวจครบทุกประเด็นที่จำเป็นของฉบับเดียวกัน</p><button type="button" id="show-open-findings">เปิด 30 เรื่องรอยืนยัน</button>');
    document.getElementById('show-open-findings').addEventListener('click', () => { dialog.close(); setView('findings'); });
  }

  const edges = [
    ['start','bom'], ['start','scope'], ['bom','rate'], ['rate','select'], ['scope','select'],
    ...['desk','cabinet','chair','partition'].map(x => ['select',x]),
    ...['desk','cabinet','chair','partition'].map(x => [x,'compute']),
    ['compute','commercial'], ['commercial','approval'], ['approval','hold','hold'],
    ['approval','release'], ['release','quote','dashed'], ['quote','delivery'],
    ['hold','start','hold-return'], ['delivery','select','feedback']
  ];

  function drawFlow() {
    if (activeView !== 'flow' && !matchMedia('print').matches) return;
    const surface = document.querySelector('.flow-surface'), frame = surface.getBoundingClientRect();
    if (!frame.width) return;
    const svg = document.getElementById('flow-lines');
    svg.setAttribute('viewBox', '0 0 ' + frame.width + ' ' + frame.height);
    const rect = id => {
      const r = document.getElementById('flow-' + id).getBoundingClientRect();
      return {x:r.left-frame.left, y:r.top-frame.top, w:r.width, h:r.height};
    };
    const mobile = matchMedia('(max-width:640px)').matches && !matchMedia('print').matches;
    const paths = edges.map(([from,to,kind]) => {
      const a = rect(from), b = rect(to); let d, extra = '';
      if (kind === 'hold-return') {
        const rail = 5;
        d = `M ${a.x} ${a.y+a.h/2} H ${rail} V ${b.y+b.h/2} H ${b.x}`;
        extra = 'hold-line dashed loop';
      } else if (kind === 'feedback') {
        const rail = frame.width-5;
        d = `M ${a.x+a.w} ${a.y+a.h/2} H ${rail} V ${b.y+b.h/2} H ${b.x+b.w}`;
        extra = 'dashed loop';
      } else if (mobile && from === 'select' && ['chair','partition'].includes(to)) {
        const rail = to === 'chair' ? 5 : frame.width-5;
        d = `M ${a.x+a.w/2} ${a.y+a.h} V ${a.y+a.h+14} H ${rail} V ${b.y-13} H ${b.x+b.w/2} V ${b.y}`;
      } else if (mobile && ['desk','cabinet'].includes(from) && to === 'compute') {
        const rail = from === 'desk' ? 5 : frame.width-5;
        d = `M ${a.x+a.w/2} ${a.y+a.h} V ${a.y+a.h+14} H ${rail} V ${b.y-13} H ${b.x+b.w/2} V ${b.y}`;
      } else if (kind === 'hold' && Math.abs((a.y+a.h/2)-(b.y+b.h/2)) < a.h) {
        d = `M ${a.x+a.w} ${a.y+a.h/2} H ${b.x}`; extra = 'hold-line';
      } else {
        const x1=a.x+a.w/2,y1=a.y+a.h,x2=b.x+b.w/2,y2=b.y;
        const mid=y1+Math.max(10,(y2-y1)/2);
        d = `M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`;
        if (kind === 'hold') extra='hold-line';
        if (kind === 'dashed') extra='dashed';
      }
      return `<path class="connector ${extra}" d="${d}"/>`;
    }).join('');
    document.getElementById('connectors').innerHTML=paths;
  }

  async function loadFormulas() {
    if (formulaPromise) return formulaPromise;
    formulaPromise = (async () => {
      try {
        const response = await fetch('formulas.json?v=20261001');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const registry = await response.json();
        formulas = registry.formulas.map((row,index) => {
          const sheet=registry.sheets[row.s];
          const file=registry.files.find(f=>f.alias===sheet.alias);
          const refs = pairs => pairs.map(([si,cell]) => "'" + registry.sheets[si].name + "'!" + cell);
          return {...row, index, alias:sheet.alias, file:file.file, sheet:sheet.name, state:sheet.state, precedents:refs(row.precedents), blank_precedents:refs(row.blank_precedents)};
        });
        refreshSheetOptions(); filterFormulas();
      } catch (err) {
        document.getElementById('formula-body').innerHTML='<tr><td class="empty" colspan="5">โหลดทะเบียนสูตรไม่สำเร็จ</td></tr>';
        const error=document.getElementById('data-error');error.hidden=false;
        error.textContent='โหลดข้อมูลไม่สำเร็จ ('+err.message+') กดเมนูสูตรทุกเซลล์อีกครั้ง หรือลองเปิดไฟล์ JSON';
        formulaPromise=null;
      }
    })();
    return formulaPromise;
  }

  function refreshSheetOptions() {
    const group=document.getElementById('formula-group').value;
    const select=document.getElementById('formula-sheet'),old=select.value;
    const names=[...new Set(formulas.filter(r=>!group||r.alias===group).map(r=>r.sheet))];
    select.innerHTML='<option value="">ทุกชีต</option>'+names.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('');
    if(names.includes(old)) select.value=old;
  }

  function filterFormulas(reset=true) {
    const needle=document.getElementById('formula-search').value.trim().toLowerCase();
    const group=document.getElementById('formula-group').value,sheet=document.getElementById('formula-sheet').value,state=document.getElementById('formula-state').value;
    filtered=formulas.filter(r=>(!group||r.alias===group)&&(!sheet||r.sheet===sheet)&&(!needle||[r.file,r.sheet,r.cell,r.formula].join(' ').toLowerCase().includes(needle))&&(!state||(state==='primary'&&r.primary_path)||(state==='hidden'&&r.state==='hidden')||(state==='error'&&r.status==='SOURCE_ERROR')||(state==='blank'&&r.blank_precedents.length)));
    if(reset)page=0;
    renderFormulas();
  }

  function renderFormulas() {
    const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));page=Math.min(page,pages-1);
    const rows=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
    document.getElementById('formula-body').innerHTML=rows.length?rows.map(r=>'<tr><td><strong>'+esc(data.labels[r.alias])+'</strong><small>'+esc(r.sheet)+'</small>'+(r.state==='hidden'?'<span class="status history">ชีตซ่อน / ประวัติ</span>':'')+'</td><td><code>'+esc(r.cell)+'</code></td><td><button class="formula-open" type="button" data-formula="'+r.index+'" aria-label="ดูสูตร '+esc(r.alias+' '+r.sheet+' '+r.cell)+'"><span class="formula-preview">'+esc(r.formula)+'</span></button></td><td>'+esc(num(r.recalculated))+'</td><td>'+(r.status==='SOURCE_ERROR'?'<span class="status error">Error เดิม</span>':'<span>ตรงค่าบันทึก</span>')+(r.blank_precedents.length?'<small>อ้างค่าว่าง '+r.blank_precedents.length+' เซลล์</small>':'')+(r.primary_path?'<small>เส้นทางหลักที่ตรวจ</small>':'')+'</td></tr>').join(''):'<tr><td class="empty" colspan="5">ไม่พบสูตรตามตัวกรอง</td></tr>';
    document.getElementById('formula-count').textContent='พบ '+num(filtered.length)+' / '+num(formulas.length)+' สูตร'+(rows.length?' · แสดง '+(page*PAGE_SIZE+1)+'–'+(page*PAGE_SIZE+rows.length):'');
    document.getElementById('formula-page').textContent=(page+1)+' / '+pages;
    document.getElementById('formula-prev').disabled=page===0;
    document.getElementById('formula-next').disabled=page>=pages-1;
    document.getElementById('data-error').hidden=true;
  }

  function showFormula(index) {
    const r=formulas[index];if(!r)return;
    openDialog(data.labels[r.alias]+' · '+(r.state==='hidden'?'ชีตซ่อน / ประวัติ':'ชีตแสดง'),r.sheet+'!'+r.cell,
      '<pre class="detail-formula">'+esc(r.formula)+'</pre><button id="copy-formula" type="button">คัดลอกสูตร</button> <span id="copy-status" class="copy-status" aria-live="polite"></span>'+
      '<dl class="detail-dl"><dt>ไฟล์</dt><dd>'+esc(r.file)+'</dd><dt>ค่าที่บันทึกเดิม</dt><dd>'+esc(num(r.cached))+'</dd><dt>ผลคำนวณซ้ำ</dt><dd>'+esc(num(r.recalculated))+'</dd><dt>สถานะตรวจเลข</dt><dd>'+esc(r.status==='MATCH'?'ตรงค่าที่บันทึกไว้ (MATCH)':'Error เดิมในต้นฉบับ (SOURCE_ERROR)')+'</dd><dt>สถานะกฎ</dt><dd>Observed · ยังไม่รับรอง</dd></dl>'+
      '<h3>เซลล์ที่อ้างอิง ('+r.precedents.length+')</h3><div class="ref-list">'+(r.precedents.map(p=>'<code>'+esc(p)+'</code>').join('')||'<span>สูตรค่าคงที่ / ไม่มีเซลล์อ้างอิง</span>')+'</div>'+
      (r.blank_precedents.length?'<h3>เซลล์อ้างอิงที่ว่าง ('+r.blank_precedents.length+')</h3><div class="ref-list">'+r.blank_precedents.map(p=>'<code>'+esc(p)+'</code>').join('')+'</div><p class="note">Excel อาจใช้ค่าว่างเป็นศูนย์ในสูตรเดิม ต้องให้คนยืนยันการใช้ / ไม่ใช้ หรือข้อมูลตกหล่นก่อนใช้กับงานจริง</p>':'')+
      '<p class="note">ผลนี้เป็นการคำนวณซ้ำจากต้นฉบับ ใช้ตรวจเส้นทางสูตร การตรวจเลขตรงไม่ได้อนุมัติสเปก กฎ หรือราคาเสนอ</p>');
    document.getElementById('copy-formula').addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(r.formula);document.getElementById('copy-status').textContent='คัดลอกแล้ว';}
      catch{document.getElementById('copy-status').textContent='เลือกข้อความสูตรด้านบนเพื่อคัดลอก';}
    });
  }

  function filterFindings() {
    const needle=document.getElementById('finding-search').value.trim().toLowerCase(),gate=document.getElementById('finding-gate').value,group=document.getElementById('finding-group').value;
    let count=0;
    document.querySelectorAll('.finding').forEach(el=>{
      const visible=(!needle||el.textContent.toLowerCase().includes(needle))&&(!gate||(el.dataset.gates.match(/G\d{2}/g)||[]).includes(gate))&&(!group||el.dataset.group===group);
      el.hidden=!visible;if(visible){count++;if(needle)el.open=true;}
    });
    document.getElementById('finding-count').textContent='แสดง '+count+' / 30 ประเด็น';
  }

  document.querySelectorAll('[data-view]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();setView(a.dataset.view);}));
  document.querySelectorAll('[data-formula-tab]').forEach(b=>b.addEventListener('click',()=>selectProduct(b.dataset.formulaTab)));
  document.querySelectorAll('[data-gate]').forEach(b=>b.addEventListener('click',()=>showGates(b.dataset.gate)));
  document.querySelectorAll('[data-product]').forEach(b=>b.addEventListener('click',()=>selectProduct(b.dataset.product)));
  document.querySelector('[data-hold]').addEventListener('click',showHold);
  document.getElementById('detail-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  document.getElementById('formula-body').addEventListener('click',e=>{const b=e.target.closest('[data-formula]');if(b)showFormula(Number(b.dataset.formula));});
  document.getElementById('formula-search').addEventListener('input',()=>filterFormulas());
  document.getElementById('formula-group').addEventListener('change',()=>{refreshSheetOptions();filterFormulas();});
  document.getElementById('formula-sheet').addEventListener('change',()=>filterFormulas());
  document.getElementById('formula-state').addEventListener('change',()=>filterFormulas());
  document.getElementById('formula-prev').addEventListener('click',()=>{page--;renderFormulas();});
  document.getElementById('formula-next').addEventListener('click',()=>{page++;renderFormulas();});
  document.getElementById('finding-search').addEventListener('input',filterFindings);
  document.getElementById('finding-gate').addEventListener('change',filterFindings);
  document.getElementById('finding-group').addEventListener('change',filterFindings);
  window.addEventListener('hashchange',()=>setView(location.hash.slice(1),false));
  new ResizeObserver(()=>requestAnimationFrame(drawFlow)).observe(document.querySelector('.flow-surface'));
  if(document.fonts)document.fonts.ready.then(drawFlow);
  window.addEventListener('beforeprint',()=>{document.querySelectorAll('.prose').forEach(p=>p.hidden=false);document.querySelectorAll('.document-block').forEach(d=>d.open=true);drawFlow();});
  window.addEventListener('afterprint',()=>{const product=document.querySelector('[data-formula-tab][aria-selected=true]').dataset.formulaTab;document.querySelectorAll('[data-formula-panel]').forEach(p=>p.hidden=p.dataset.formulaPanel!==product);setView(activeView,false);});
  document.getElementById('print').addEventListener('click',()=>window.print());
  setView(location.hash.slice(1)||'flow',false);
})();
