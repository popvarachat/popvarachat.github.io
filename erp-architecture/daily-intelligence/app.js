'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const API = 'daily-status.json';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const evidenceStatus = {EVIDENCE_ONLY:'มีหลักฐานบางส่วน',MAPPED:'พบแหล่งข้อมูล',UNVERIFIED:'รอยืนยันแหล่ง',CERTIFIED:'รับรองแล้ว'};
  const statusClass = s => s==='EVIDENCE_ONLY'||s==='CERTIFIED'?'has':s==='MAPPED'?'mapped':'unknown';
  const domainName = {production:'Production',supply:'Supply / Logistics',quality:'Quality & Rework',finance:'Finance / Cost'};
  const xy = {
    purchase:[30,80],receipt:[270,80],inventory:[510,80],material:[750,80],labor:[990,80],
    machine:[30,340],output:[270,340],transfer:[510,340],quality:[750,340],rework:[990,340],
    scrap:[30,600],wip:[270,600],cost:[510,600],delivery:[750,600],gl:[990,600]
  };
  const edgePairs = [
    ['purchase','receipt'],['receipt','inventory'],['inventory','material'],['material','output'],
    ['labor','output'],['machine','output'],['output','transfer'],['transfer','quality'],
    ['quality','rework'],['rework','output'],['quality','delivery'],
    ['quality','scrap'],['output','wip'],['wip','cost'],['inventory','cost'],
    ['scrap','cost'],['cost','gl'],['delivery','gl'],['receipt','cost']
  ];
  const todayInThailand=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const state = {dataset:null,pivot:null,privateSnapshot:null,focused:'receipt',domain:'all',query:'',view:'map',date:todayInThailand(),zoom:1,dx:0,dy:0,dragging:null,private:false};
  const safe = t => String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sourceBadge = s => evidenceStatus[s]||'ยังไม่ทราบ';
  const find = id => state.dataset?.dimensions.find(d=>d.id===id);
  const isCertified = (d,day) => d?.status==='CERTIFIED' && d.as_of===day &&
    Number.isFinite(d.daily_value) && d.records_certified===true && d.public_release_approved===true;
  const allDims = () => state.dataset?.dimensions||[];
  const filter = d => (state.domain==='all'||d.domain===state.domain) &&
    (!state.query||[d.name,d.en,d.question,d.applications,d.owner].join(' ').toLowerCase().includes(state.query.toLowerCase()));
  function niceDate(day) {
    try{return new Date(day+'T12:00:00+07:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});}
    catch{return day;}
  }
  function toast(msg) {
    const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2300);
  }
  function setText(id,v){$(id).textContent=v;}
  function setFilter(domain) {
    state.domain=domain;
    document.querySelectorAll('[data-domain]').forEach(b=>b.classList.toggle('active',b.dataset.domain===domain));
    const selected=find(state.focused);
    if(selected&&!filter(selected))state.focused=allDims().find(filter)?.id||state.focused;
    renderVisual();
  }
  function setDate(day){
    if(!/^\d{4}-\d\d-\d\d$/.test(day))return;
    if(day < '2024-01-01'||day > todayInThailand())return;
    state.date=day;
    $('focusDate').value=day;
    setText('dateFoot','ข้อมูลรายวันเฉพาะ '+niceDate(day)+' · หากไม่ผ่านรับรองจะแสดง —');
    const params=new URLSearchParams(location.search);params.set('date',day);
    history.replaceState(null,'',location.pathname+'?'+params.toString());
    renderSummary();renderInspector();renderPrivate();
  }
  function dateDelta(delta){
    const dt=new Date(state.date+'T12:00:00+07:00');dt.setUTCDate(dt.getUTCDate()+delta);
    const ds=dt.toISOString().slice(0,10);setDate(ds);
  }
  function renderSummary(){
    const ds=allDims(),evidence=ds.filter(d=>d.status==='EVIDENCE_ONLY').length,
      cert=ds.filter(d=>isCertified(d,state.date)).length;
    setText('totalDomains',ds.length||'—');setText('evidenceCount',evidence);setText('certifiedCount',cert);
    setText('pendingCount',ds.length-cert);
    setText('sourceState',cert===ds.length&&ds.length?'CERTIFIED': 'PARTIAL · NOT CERTIFIED');
    setText('asOfValue','JDE sample · 20 ต.ค. 2026 · WIP '+(state.pivot?.source_snapshot||'รอเชื่อม Snapshot'));
    setText('truthTitle',cert===ds.length&&ds.length?'ข้อมูลรายวันผ่านการรับรองครบ':'รายงานมีหลักฐานจาก JDE แต่ยังไม่มี KPI รายวันที่ผ่านการรับรองครบ');
    setText('truthText',cert?'KPI ที่ผ่านการรับรองของ '+niceDate(state.date)+' = '+cert+' มิติ':'กำลังแยกข้อมูลจริง / ตัวอย่าง / การตั้งค่า และส่วนที่ยังเชื่อมไม่ได้ · '+niceDate(state.date)+' ยังสรุปยอดรวมรายวันไม่ได้');
    const counts = ['EVIDENCE_ONLY','MAPPED','UNVERIFIED'].map(s=>ds.filter(d=>d.status===s).length);
    const slices=[counts[0],counts[1],counts[2]];
    const n=ds.length||1, p1=(slices[0]/n*100),p2=((slices[0]+slices[1])/n*100);
    $('coverageDonut').style.background='conic-gradient(#2fa17f 0 '+p1+'%,#eab564 '+p1+'% '+p2+'%,#a5b6be '+p2+'% 100%)';
    setText('coverageNum',counts[0]);
    $('coverageBars').innerHTML=[
      ['EVIDENCE_ONLY','has','มีหลักฐานบางส่วน',counts[0]],
      ['MAPPED','mapped','พบ Source/Report แล้ว',counts[1]],
      ['UNVERIFIED','unknown','ยังไม่รับรอง Source',counts[2]]
    ].map(([k,c,label,num])=>'<div><div class="bar-top"><span>'+safe(label)+'</span><span>'+num+' / '+n+'</span></div><div class="bar-rail"><div class="bar-fill '+c+'" style="width:'+(num/n*100)+'%"></div></div></div>').join('');
    setText('coverageTag',n+' แหล่งข้อมูล');
  }
  function svgEl(name,props={},text){
    const el=document.createElementNS(SVG_NS,name);
    for(const [key,value] of Object.entries(props))el.setAttribute(key,value);
    if(text!==undefined)el.textContent=text;return el;
  }
  function pathBetween(a,b){
    const A=xy[a],B=xy[b];if(!A||!B)return '';
    const ax=A[0]+103,ay=A[1]+43,bx=B[0]+103,by=B[1]+43;
    if(Math.abs(ay-by)<60){
      const x1=ax+101, x2=bx-101;
      if(bx>ax)return 'M '+x1+' '+ay+' C '+(x1+41)+' '+ay+','+(x2-41)+' '+by+','+x2+' '+by;
      return 'M '+ax+' '+(ay+43)+' C '+ax+' '+(ay+104)+','+bx+' '+(by+104)+','+bx+' '+(by+43);
    }
    const dir=by>ay?1:-1, sy=ay+dir*45, ey=by-dir*45;
    return 'M '+ax+' '+sy+' C '+ax+' '+(sy+Math.max(55,Math.abs(ey-sy)*.48)*dir)+','+bx+' '+(ey-Math.max(55,Math.abs(ey-sy)*.48)*dir)+','+bx+' '+ey;
  }
  function renderMap(){
    const svg=$('flowSvg');svg.replaceChildren();
    const defs=svgEl('defs'),mark=svgEl('marker',{id:'arrowTip',markerWidth:'7',markerHeight:'7',refX:'4.6',refY:'3',orient:'auto'});
    mark.append(svgEl('path',{d:'M0,0 L0,6 L6,3 z',fill:'#a6c2bc'}));defs.append(mark);svg.append(defs);
    const scene=svgEl('g',{id:'scene'});svg.append(scene);
    scene.append(svgEl('text',{x:'26',y:'43',fill:'#91a7a3','font-size':'12','font-weight':'900','letter-spacing':'2'},'UPSTREAM / SUPPLY'));
    scene.append(svgEl('text',{x:'26',y:'302',fill:'#91a7a3','font-size':'12','font-weight':'900','letter-spacing':'2'},'OPERATIONS / FACTORY'));
    scene.append(svgEl('text',{x:'26',y:'562',fill:'#91a7a3','font-size':'12','font-weight':'900','letter-spacing':'2'},'CONTROL / ACCOUNTING'));
    const paths=svgEl('g',{class:'edges'});scene.append(paths);
    for(const [a,b] of edgePairs){
      const highlight=a===state.focused||b===state.focused;
      const path=svgEl('path',{d:pathBetween(a,b),class:'flow-edge'+(highlight?' hi':''),'marker-end':'url(#arrowTip)'});
      if((find(a)&&!filter(find(a)))||(find(b)&&!filter(find(b))))path.setAttribute('opacity','0.08');
      paths.append(path);
    }
    for(const dim of allDims()){
      const pos=xy[dim.id];if(!pos)continue;
      const klass=statusClass(dim.status);const g=svgEl('g',{class:'flow-node '+klass+(dim.id===state.focused?' active':'')+(filter(dim)?'':' filtered'),
        transform:'translate('+pos[0]+' '+pos[1]+')',tabindex:filter(dim)?'-1':'0',role:'button','aria-label':dim.name+' '+sourceBadge(dim.status)});
      g.append(svgEl('rect',{x:0,y:0,width:206,height:86,rx:13}));
      g.append(svgEl('rect',{class:'orb',x:13,y:19,width:44,height:44,rx:13}));
      g.append(svgEl('text',{class:'sequence',x:35,y:46,'text-anchor':'middle'},dim.seq));
      const nm=dim.name.length>12?dim.name.slice(0,12)+'…':dim.name;
      g.append(svgEl('text',{class:'name',x:68,y:32},nm));
      let en=dim.en.length>24?dim.en.slice(0,23)+'…':dim.en;
      g.append(svgEl('text',{class:'en',x:68,y:50},en));
      g.append(svgEl('circle',{class:'status-dot',cx:183,cy:70,r:4}));
      g.addEventListener('click',e=>{if(state.dragging?.moved)return;focus(dim.id);});
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focus(dim.id)}});
      scene.append(g);
    }
    applyScene();
    setText('graphCount',allDims().filter(filter).length+' / '+allDims().length+' กระบวนการ');
  }
  function focus(id){
    if(!find(id))return;state.focused=id;
    renderVisual();
    if(window.innerWidth<900)$('inspectorMain').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function applyScene(){
    const s=document.getElementById('scene');if(!s)return;
    s.setAttribute('transform','translate('+state.dx+' '+state.dy+') scale('+state.zoom+')');
    setText('zoomPct',Math.round(state.zoom*100)+'%');
  }
  function zoomBy(factor){state.zoom=Math.max(.65,Math.min(2.4,state.zoom*factor));applyScene();}
  function fitZoom(){state.zoom=1;state.dx=0;state.dy=0;applyScene();}
  function renderGrid(){
    const container=$('gridView');
    container.innerHTML=allDims().map(d=>'<button type="button" role="listitem" class="grid-node'+(d.id===state.focused?' active':'')+(filter(d)?'':' filtered')+'" data-id="'+safe(d.id)+'"><div class="grid-top"><span>#'+safe(d.seq)+' · '+safe(domainName[d.domain])+'</span><i class="mini-status '+statusClass(d.status)+'"></i></div><b>'+safe(d.name)+'</b><span>'+safe(d.en)+'</span></button>').join('');
    container.querySelectorAll('button[data-id]').forEach(b=>b.addEventListener('click',()=>focus(b.dataset.id)));
    setText('graphCount',allDims().filter(filter).length+' / '+allDims().length+' กระบวนการ');
  }
  function renderInspector(){
    const d=find(state.focused);if(!d)return;
    setText('inspectorIndex',d.seq+' / 15');
    const value=isCertified(d,state.date)?new Intl.NumberFormat('th-TH').format(d.daily_value):'—';
    const caption=isCertified(d,state.date)?'รายการรับรอง ณ '+niceDate(state.date):'ยังไม่ได้รับรองยอดรวมประจำวัน';
    $('inspectorMain').innerHTML=
    '<div style="margin-top:14px"><span class="soft-chip '+statusClass(d.status)+'">'+safe(sourceBadge(d.status))+'</span></div>'+
    '<h3>'+safe(d.name)+'</h3><p class="english">'+safe(d.en)+' · '+safe(domainName[d.domain])+'</p>'+
    '<div class="block-question">'+safe(d.question)+'</div>'+
    '<div class="inspect-kpi"><div><b>'+safe(d.metric_label)+'</b><small>'+safe(caption)+'</small></div><strong>'+safe(value)+'</strong></div>'+
    '<dl><div class="inspect-field"><dt>JDE / Report</dt><dd>'+safe(d.applications)+'</dd></div>'+
    '<div class="inspect-field"><dt>Join / Grain</dt><dd>'+safe(d.grain)+'</dd></div>'+
    '<div class="inspect-field"><dt>Data Owner</dt><dd>'+safe(d.owner)+'</dd></div></dl>'+
    '<div class="detail-divider"></div><p class="note-inspect"><b>สิ่งที่ต้องตรวจ:</b> '+safe(d.note)+'</p>'+
    '<div class="owner">รายงานของวันที่ <b>'+niceDate(state.date)+'</b> · Certification: <b>'+safe(d.records_certified?'ผ่าน':'ยังไม่ผ่าน')+'</b></div>'+
    '<a class="source-link pivot-entry" href="pivot.html?node='+encodeURIComponent(d.id)+'"><span>▤ เปิด Pivot · วันกำหนดส่ง × ส่วนงานที่ค้าง</span><span>→</span></a>'+
    (d.evidence||[]).map(e=>'<a class="source-link" href="'+safe(e.url)+'" target="_blank" rel="noopener noreferrer"><span>↗ '+safe(e.label)+'</span><span>›</span></a>').join('')+privateInspector(d);
  }
  function privateInspector(d){
    const priv=state.privateSnapshot;
    if(!priv||d.id!=='receipt'||priv.date!==state.date)return '';
    const fmt=new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
    const r=priv.rows.slice(0,43).map(row=>'<tr><td>'+safe(row.receipt)+'</td><td>'+safe(row.po)+'</td><td>'+safe(row.item)+'</td><td>'+safe(row.branch)+'</td><td>'+safe(row.qty)+'</td><td>'+fmt.format(row.amount_thb)+'</td></tr>').join('');
    return '<div class="private-details"><b>NB PRIVATE · P55432A4 ('+safe(niceDate(priv.date))+')</b>'+
       '<small>'+priv.summary.receipt_lines+' Receipt lines · '+priv.summary.distinct_po+' PO · ฿'+fmt.format(priv.summary.amount_thb)+' · อ่านครบทุกหน้าที่ Inquiry ส่งคืน แต่ยังรอรับรอง Scope</small>'+
       '<div class="private-table"><table><thead><tr><th>Receipt</th><th>PO</th><th>Item</th><th>Branch</th><th>Qty</th><th>THB</th></tr></thead><tbody>'+r+'</tbody></table></div></div>';
  }
  function renderPrivate(){
    const priv=state.privateSnapshot;
    const show=Boolean(priv&&priv.date===state.date);
    $('privatePreview').classList.toggle('hidden',!show);
    if(!show)return;
    const fmt=new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
    setText('privateTitle','JDE Inquiry '+safe(niceDate(priv.date))+' · 43 แถวครบ Pagination · ยังรอ Owner Sign-off');
    setText('privateLines',String(priv.summary.receipt_lines));
    setText('privatePO',String(priv.summary.distinct_po));
    setText('privateItems',String(priv.summary.distinct_items));
    setText('privateAmount','฿'+fmt.format(priv.summary.amount_thb));
  }
  function renderEvidence(){
    $('evidenceList').innerHTML=(state.dataset.source_evidence||[]).map((e,i)=>'<a class="source-row" href="'+safe(e.url)+'" target="_blank" rel="noopener noreferrer"><span class="source-index">'+String(i+1).padStart(2,'0')+'</span><span class="source-content"><b>'+safe(e.label)+'</b><small>'+safe(e.status)+' · '+safe(e.date)+' · GitHub Private SoT</small></span><span class="source-arrow">↗</span></a>').join('');
  }
  function renderVisual(){
    if(!state.dataset)return;
    renderMap();renderGrid();renderInspector();
  }
  function setView(v){
    state.view=v;
    $('mapMode').classList.toggle('chosen',v==='map');$('gridMode').classList.toggle('chosen',v==='grid');
    $('mapMode').setAttribute('aria-pressed',v==='map');$('gridMode').setAttribute('aria-pressed',v==='grid');
    $('mapViewport').classList.toggle('hidden',v!=='map');$('gridView').classList.toggle('hidden',v!=='grid');
    $('canvasTools').classList.toggle('hidden',v!=='map');
    renderVisual();
  }
  function render(){renderSummary();renderVisual();renderEvidence();renderPrivate();}
  async function load(){
    try{
      const res=await fetch(API+'?t='+Date.now(),{cache:'no-store'});
      if(!res.ok)throw Error('HTTP '+res.status);
      const ds=await res.json();
      if(ds.data_classification!=='PUBLIC_SAFE_METADATA_ONLY'||!Array.isArray(ds.dimensions)||ds.dimensions.length!==15||new Set(ds.dimensions.map(d=>d.id)).size!==15)throw Error('Data Pool schema or publication classification mismatch');
      state.dataset=ds;
      try{const pr=await fetch('public-pivot.json?t='+Date.now(),{cache:'no-store'});if(pr.ok){const pi=await pr.json();if(pi.scope==='PUBLIC_APPROVED_PROJECT_CUSTOMER_NAMES'&&pi.domains?.wip)state.pivot=pi;}}catch(e){console.warn('Named pivot metadata not available',e.message)}
      // Private transaction rows are loaded ONLY by the NB-local loopback preview.
      // GitHub Pages never requests the private file.
      const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      if(local){
        try{
          const privateRes=await fetch('private-daily.json?t='+Date.now(),{cache:'no-store'});
          if(privateRes.ok){
            const priv=await privateRes.json();
            if(priv.schema_version==='private-local-v1'&&priv.scope==='PRIVATE_LOCALHOST_ONLY_DO_NOT_COMMIT'&&priv.classification==='INTERNAL'&&Array.isArray(priv.rows)&&priv.pagination_complete===true&&priv.rows.length===priv.summary.receipt_lines){
              state.privateSnapshot=priv;
              state.private=true;
              const status=document.querySelector('.top-right');if(status){status.innerHTML='<span class="indicator"></span><span>NB PRIVATE · READ ONLY</span>';}
              if(!new URLSearchParams(location.search).has('date'))setDate(priv.date);
            }
          }
        }catch(e){console.warn('Private snapshot unavailable',e.message)}
      }
      render();
      setText('footerSource',state.private?'NB PRIVATE read-only snapshot · not published to GitHub':'JDE sample '+ds.last_live_jde_proof+' · WIP Source Snapshot '+(state.pivot?.source_snapshot||'pending')+' · No certified daily totals');
    }catch(e){
      setText('truthTitle','ไม่สามารถอ่าน Data Pool ได้');
      setText('truthText','กรุณาตรวจการเผยแพร่ไฟล์ daily-status.json ('+e.message+')');
      toast('ไม่สามารถโหลดข้อมูล: '+e.message);
    }
  }
  function wire(){
    $('refreshData').addEventListener('click',()=>{load();toast('รีโหลด Data Pool แล้ว · ไม่ได้เรียก ERP สดจากเว็บสาธารณะ')});
    $('datePrev').addEventListener('click',()=>dateDelta(-1));
    $('dateNext').addEventListener('click',()=>dateDelta(1));
    $('focusDate').addEventListener('change',e=>setDate(e.target.value));
    document.querySelectorAll('[data-domain]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.domain)));
    $('findDim').addEventListener('input',e=>{state.query=e.target.value.trim();const selected=find(state.focused);if(selected&&!filter(selected))state.focused=allDims().find(filter)?.id||state.focused;renderVisual()});
    $('mapMode').addEventListener('click',()=>setView('map'));
    $('gridMode').addEventListener('click',()=>setView('grid'));
    $('zoomIn').addEventListener('click',()=>zoomBy(1.2));
    $('zoomOut').addEventListener('click',()=>zoomBy(1/1.2));
    $('zoomFit').addEventListener('click',fitZoom);
    const vp=$('mapViewport');
    vp.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY>0?.91:1.09)},{passive:false});
    vp.addEventListener('pointerdown',e=>{if(e.target.closest?.('.flow-node'))return;vp.setPointerCapture(e.pointerId);state.dragging={x:e.clientX,y:e.clientY,dx:state.dx,dy:state.dy,moved:false};vp.classList.add('dragging')});
    vp.addEventListener('pointermove',e=>{
      if(!state.dragging)return;
      const dr=state.dragging;const box=vp.getBoundingClientRect();
      if(Math.abs(e.clientX-dr.x)+Math.abs(e.clientY-dr.y)>4)dr.moved=true;
      state.dx=dr.dx+(e.clientX-dr.x)*(1220/box.width);state.dy=dr.dy+(e.clientY-dr.y)*(805/box.height);applyScene();
    });
    const end=()=>{vp.classList.remove('dragging');if(state.dragging){setTimeout(()=>{state.dragging=null},100)}};
    vp.addEventListener('pointerup',end);vp.addEventListener('pointercancel',end);
    $('privateExport').addEventListener('click',()=>{
      const p=state.privateSnapshot;
      if(!state.private||!p||p.date!==state.date)return;
      const fields=['receipt','po','item','supplier','supplier_name','branch','receipt_date','amount_thb','qty','uom','unit_cost_thb','currency','cost_rule'];
      const escapeCell=v=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
      const csv='\uFEFF'+fields.join(',')+'\r\n'+p.rows.map(r=>fields.map(k=>escapeCell(r[k])).join(',')).join('\r\n');
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download='JDE_PRIVATE_receipts_'+p.date+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
      toast('ส่งออก CSV ลงเครื่อง NB แล้ว · ห้ามเผยแพร่ข้อมูลดิบ');
    });
    $('downloadTemplate').addEventListener('click',()=>{
      const payload={schema_version:'1.0.0',as_of:state.date,source:'CERTIFIED_PRIVATE_EXPORT',data_classification:'PRIVATE_DO_NOT_PUBLISH',dimensions:allDims().map(d=>({id:d.id,source:d.applications,grain:d.grain,record_count:null,daily_value:null,unit:null,extracted_at:null,records_certified:false,quality:{passed:false},owner_approved:false,public_release_approved:false}))};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='practika-daily-erp-data-contract-'+state.date+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast('ดาวน์โหลด Data Contract · ห้ามอัปโหลดข้อมูลดิบขึ้น Public GitHub');
    });
  }
  wire();
  const q=new URLSearchParams(location.search);
  if(q.has('date')&&/^\d{4}-\d{2}-\d{2}$/.test(q.get('date')))setDate(q.get('date'));
  load();
})();