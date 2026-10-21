'use strict';
(() => {
 const $=s=>document.getElementById(s);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const STAT='daily-status.json';
 const conf={
  transfer:['วันต้องโอนงานระหว่าง Operation ตาม Control Plan','ปัจจุบันค้างฝ่ายส่งหรือฝ่ายรับหลังตรวจ TS + Operation Last Event'],
  output:['Due ของ Operation ผลิต / Scheduled Pick / Cutoff ของแผน','Last Recorded Operation + Work Center จาก WO/Control Plan'],
  material:['Required Issue Date / วันที่ต้องจ่ายวัสดุเข้า WO','Store / Requesting Production / Waiting Supplier ตาม Issue/Request Event'],
  labor:['กำหนดบันทึกเวลาผลิตของ WO/Operation','ผู้บันทึก Time Entry และหัวหน้าส่วนงานที่ต้องรับรอง'],
  quality:['กำหนดตรวจ QC ก่อนส่งขั้นตอนถัดไป','QC / Hold owner / Production ที่แก้ไข จาก Inspection Event'],
  rework:['Due Date ของ Rework Instruction / กำหนดแก้ไข','ผู้รับงาน Rework ล่าสุดตาม WO/QA Action'],
  scrap:['วันที่ต้องตัดสินใจ Scrap / Cutoff อนุมัติ','QA / Store / Accounting ตามอนุมัติและเอกสาร Adjustment'],
  wip:['วันกำหนดเสร็จ WO (เบื้องต้น; ไม่ใช่ Stage-specific Handoff Due)','Current Control Plan Operation (ยังไม่รับรอง) → สายผลิตที่ค้าง; ต้องผูกชื่อเจ้าภาพ'],
  machine:['กำหนดคืนเครื่องจักรเข้าสู่การผลิตหลังซ่อม / Planned Downtime','Maintenance / Work Center / ช่างผู้รับผิดชอบจาก Work Request'],
  purchase:['กำหนดอนุมัติราคา Quotation → PR → PO และ Required Delivery','Engineering / Purchasing / Approver ที่ค้างอนุมัติจริง'],
  receipt:['กำหนดรับของตาม PO Promise/Required Date (ไม่ใช่ Receipt Date)','Supplier / Purchasing / Receiving / Store / AP ตามสถานะคงค้าง'],
  inventory:['Due Date ของ Material Request หรือ Stock Reservation','Warehouse/Location/Receiving/Production ที่ยังรับหรือจ่ายไม่เสร็จ'],
  cost:['กำหนดปันต้นทุน / Cost Close / Landed Cost Voucher Deadline','Cost Accounting / Purchasing / AP / GL เจ้าของส่วนต่างที่ยังไม่ปิด'],
  delivery:['นัดส่งมอบ / Install Appointment / Due ของโครงการ','Delivery / Installation / Customer Confirmation ตาม Event ล่าสุด'],
  gl:['Batch Posting Cutoff / Period Close Due','Accounting / AP / Finance Approver ที่ยังไม่ Post/Reconcile']
 };
 const state={ds:null,pub:null,priv:null,node:'wip',grain:'month',year:'2026',month:'',query:'',scope:'open',rowMode:'project',projectFilter:'',customerFilter:'',cell:null,page:1,pageSize:35};
 const nodeIds=['transfer','output','material','labor','quality','rework','scrap','wip','machine','purchase','receipt','inventory','cost','delivery','gl'];
 let toastTimeout;
 function message(s){$('toast').textContent=s;$('toast').classList.add('on');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('on'),2500);}
 function dim(id){return state.ds?.dimensions.find(x=>x.id===id);}
 function nodeData(){return (isPrivate()?state.priv?.domains?.[state.node]||state.pub?.domains?.[state.node]:state.pub?.domains?.[state.node])||null;}
 function sourceMeta(){return (isPrivate()&&state.priv?.domains?.[state.node]?state.priv:state.pub)||null;}
 function weight(r){return Number.isFinite(Number(r.count))&&Number(r.count)>0?Number(r.count):1;}
 function sumWeight(rows){return rows.reduce((acc,r)=>acc+weight(r),0);}
 function isPrivate(){return ['127.0.0.1','localhost'].includes(location.hostname);}
 function fmt(n){return new Intl.NumberFormat('en-US').format(n);}
 function datasetRows(){const d=nodeData();return d&&Array.isArray(d.rows)?d.rows:null;}
 function datesForNode(){const rows=datasetRows();if(!rows)return ['2026'];return [...new Set(rows.map(x=>x.due?.slice(0,4)).filter(Boolean))].sort();}
 function setOptions(id,items,selected){const el=$(id);el.innerHTML=items.map(x=>'<option value="'+escape(x[0])+'">'+escape(x[1])+'</option>').join('');el.value=selected;}
 function setupYears(){const years=datesForNode();const current=years.includes(state.year)?state.year:(years[years.length-1]||'2026');state.year=current;setOptions('year',[['','ทุกปี'],...years.map(x=>[x,x])],current);setOptions('month',[['','ทุกเดือน'],...Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),String(i+1).padStart(2,'0')])],state.month);}
 function choose(id){if(!dim(id))return;state.node=id;state.cell=null;state.page=1;state.year='2026';state.month='';state.query='';state.projectFilter='';state.customerFilter='';$('search').value='';const url=new URL(location.href);url.searchParams.set('node',id);history.replaceState(null,'',url.pathname+url.search);renderAll(true);}
 function renderNav(){const dims=state.ds?.dimensions||[];$('nodeNav').innerHTML=dims.map(d=>'<button type="button" data-node="'+escape(d.id)+'" class="'+(d.id===state.node?'selected':'')+'" aria-current="'+(d.id===state.node?'page':'false')+'"><span>'+escape(d.seq)+'</span>'+escape(d.name)+'</button>').join('');$('nodeNav').querySelectorAll('button').forEach(x=>x.onclick=()=>choose(x.dataset.node));setOptions('nodeSelect',dims.map(x=>[x.id,x.name+' · '+x.en]),state.node)}
 function syncFacets(){
  const rows=datasetRows()||[];
  const projects=[...new Set(rows.map(x=>x.project||'ยังไม่พบชื่อโครงการ'))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'th'));
  const customers=[...new Set(rows.map(x=>x.customer||'ยังไม่พบชื่อลูกค้า'))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'th'));
  state.projectFilter=projects.includes(state.projectFilter)?state.projectFilter:'';
  state.customerFilter=customers.includes(state.customerFilter)?state.customerFilter:'';
  setOptions('projectFilter',[['','ทุกโครงการ'],...projects.map(x=>[x,x])],state.projectFilter);
  setOptions('customerFilter',[['','ทุกลูกค้า'],...customers.map(x=>[x,x])],state.customerFilter);
  $('rowMode').value=state.rowMode;
 }
 function filteredRows(){
  const data=datasetRows();if(!data)return null;const q=state.query.toLocaleLowerCase('th');
  return data.filter(x=>(!q||[x.wo,x.cutting,x.id,x.project,x.customer,x.department,x.owner,x.wo_status].join(' ').toLocaleLowerCase('th').includes(q))&&
  (!state.year||x.due?.slice(0,4)===state.year)&&(!state.month||x.due?.slice(5,7)===state.month)&&
  (!state.projectFilter||(x.project||'ยังไม่พบชื่อโครงการ')===state.projectFilter)&&
  (!state.customerFilter||(x.customer||'ยังไม่พบชื่อลูกค้า')===state.customerFilter));
 }
 function bucket(due){if(!due)return 'ไม่ระบุวัน';return state.grain==='year'?due.slice(0,4):state.grain==='month'?due.slice(0,7):due;}
 function columnList(rows){
  if(state.grain==='year'){let yrs=datesForNode();return yrs.length?yrs:['2026'];}
  if(state.grain==='month'){const yr=state.year||'2026';return Array.from({length:12},(_,i)=>yr+'-'+String(i+1).padStart(2,'0'));}
  const yr=state.year||'2026',month=state.month||'10',count=new Date(Number(yr),Number(month),0).getDate();
  return Array.from({length:count},(_,i)=>yr+'-'+month+'-'+String(i+1).padStart(2,'0'));
 }
 function rowGroupKey(r){
  const dep=r.department_code||r.department||'unknown';
  if(state.rowMode==='customer')return JSON.stringify([r.customer||'ยังไม่พบชื่อลูกค้า',r.project||'ยังไม่พบชื่อโครงการ',dep]);
  if(state.rowMode==='project')return JSON.stringify([r.project||'ยังไม่พบชื่อโครงการ',dep]);
  return dep;
 }
 function rowGroupLabel(r){
  const proj=r.project||'ยังไม่พบชื่อโครงการ',cust=r.customer||'ยังไม่พบชื่อลูกค้า',dep=r.department||'ยังไม่ระบุส่วนงาน';
  return state.rowMode==='customer'?(cust+' / '+proj+' / '+dep):state.rowMode==='project'?(proj+' / '+dep):dep;
 }
 function departmentList(rows){
  const grouped=new Map();
  for(const r of rows)grouped.set(rowGroupKey(r),rowGroupLabel(r));
  return [...grouped.entries()].sort((a,b)=>a[1].localeCompare(b[1],'th'));
 }
 function keyForCell(dep,col){return dep+'|'+col;}
 function cellMatches(row,cell){return !cell||(cell.dept===rowGroupKey(row)&&cell.bucket===bucket(row.due));}
 function renderMatrix(){
  const r=filteredRows(), cols=columnList(r), departments=r?departmentList(r):[];
  const byGroup=new Map(),byBucket=new Map(),counts=new Map();
  if(r)for(const row of r){const dep=rowGroupKey(row),day=bucket(row.due),n=weight(row);
    byGroup.set(dep,(byGroup.get(dep)||0)+n);byBucket.set(day,(byBucket.get(day)||0)+n);
    const k=keyForCell(dep,day);counts.set(k,(counts.get(k)||0)+n);
  }
  const allColumns=r&&r.some(x=>!x.due)?[...cols,'ไม่ระบุวัน']:cols;
  $('thead').innerHTML='<tr><th scope="col">'+escape(state.rowMode==='department'?'ค้างที่ส่วนงาน':state.rowMode==='customer'?'ลูกค้า / โครงการ / ส่วนงาน':'โครงการ / ส่วนงานที่ค้าง')+'</th>'+
    allColumns.map(c=>'<th scope="col">'+escape(c==='ไม่ระบุวัน'?'ไม่ระบุวัน':state.grain==='year'?c:state.grain==='month'?c.slice(5,7)+'/'+c.slice(0,4):c.slice(8,10))+'</th>').join('')+'<th scope="col">รวม</th></tr>';
  if(r&&!departments.length)$('tbody').innerHTML='<tr><td class="empty" colspan="'+(allColumns.length+2)+'">ไม่พบรายการในผลกรองนี้ (เฉพาะข้อมูลที่มีใน Snapshot)</td></tr>';
  else if(!r)$('tbody').innerHTML='<tr><td class="empty" colspan="'+(allColumns.length+2)+'">ยังไม่พบข้อมูล Due Date + Pending Department ของ Node นี้ใน Data Pool · ไม่ใช่ศูนย์งานค้าง</td></tr>';
  else {
    $('tbody').innerHTML=departments.map(([dep,label])=>'<tr><td title="'+escape(label)+'">'+escape(label)+'</td>'+
      allColumns.map(col=>{const n=counts.get(keyForCell(dep,col))||0,sel=state.cell?.dept===dep&&state.cell?.bucket===col;
      return '<td>'+(n?'<button type="button" class="cell'+(sel?' sel':'')+(dep.includes('unread')||dep.includes('review')?' unverifiable':'')+
        '" data-dep="'+escape(dep)+'" data-bucket="'+escape(col)+'" title="เปิดงาน '+escape(label)+' วันที่ '+escape(col)+'">'+fmt(n)+'</button>':'<span class="missing">·</span>')+'</td>'})
      .join('')+'<td>'+fmt(byGroup.get(dep)||0)+'</td></tr>').join('');
    $('tbody').querySelectorAll('.cell').forEach(b=>b.onclick=()=>{state.cell={dept:b.dataset.dep,bucket:b.dataset.bucket};state.page=1;renderMatrix();renderDetails()});
  }
  $('tfoot').innerHTML=r&&r.length?'<tr><th scope="row">รวมตามวันกำหนด</th>'+allColumns.map(c=>'<td>'+fmt(byBucket.get(c)||0)+'</td>').join('')+'<td>'+fmt(sumWeight(r))+'</td></tr>':'';
  $('foundLabel').textContent=r?fmt(sumWeight(r))+' Cutting / '+fmt(r.length)+' แถวกลุ่มข้อมูล':'ยังไม่มีธุรกรรมรับรองสำหรับ Node นี้';
  $('axisTitle').textContent='แนวนอน = '+(state.grain==='year'?'ปี':state.grain==='month'?'เดือน':'วัน')+'กำหนดส่ง · แนวตั้ง = '+(state.rowMode==='department'?'ส่วนงานที่ค้าง':state.rowMode==='customer'?'ลูกค้า → โครงการ → ส่วนงาน':'โครงการ → ส่วนงานที่ค้าง');
 }
 function renderSummary(){
  const d=dim(state.node);if(!d)return;const r=filteredRows(),p=nodeData(),meta=sourceMeta();
  const date=(meta?.source_snapshot||meta?.due_date_source_snapshot||'ไม่ทราบ');
  const namedProject=r?sumWeight(r.filter(x=>x.project&&x.project!=='ยังไม่พบชื่อโครงการ')):0;
  const namedCustomer=r?sumWeight(r.filter(x=>Boolean(x.customer))):0;
  $('nodeTitle').textContent=d.name;
  $('matrixHeading').textContent=d.name+' · กำหนดส่ง × ส่วนงานค้าง';
  $('sourceLine').textContent=d.applications+' · '+(p?p.due_field:'ไม่มี Transaction Pivot Extract ของ Node นี้')+' · Source Snapshot '+date;
  $('dueSource').textContent=conf[state.node]?.[0]||d.grain;
  $('ownerSource').textContent=conf[state.node]?.[1]||d.owner;
  $('certification').textContent=p?'วันกำหนดคือ WO Finish Due ไม่ใช่ Stage Due · Current Operation / Owner ยังไม่ผ่านการรับรอง · ชื่อโครงการ/ลูกค้าเผยแพร่ตามอนุมัติ 21 ต.ค. 2026':'ยังไม่มี Event ที่ผูก Due Date + Pending Owner ครบ';
  $('trust').textContent=p?(isPrivate()&&state.priv?.domains?.[state.node]?'NB PRIVATE · NAMES VISIBLE · PROVISIONAL':'PROJECT/CUSTOMER APPROVED · PROVISIONAL'):'SOURCE NOT CERTIFIED · NO DAILY PIVOT DATA';
  $('scopeNote').textContent=p?('ERP Source Snapshot '+date+' · แสดงชื่อโครงการ '+fmt(namedProject)+' Cutting และชื่อลูกค้า '+fmt(namedCustomer)+' Cutting ในผลกรอง · ชื่อลูกค้าที่ยังจับคู่ P4210 ไม่ได้แสดงว่า “ยังไม่พบชื่อลูกค้า” · กำหนดส่งเป็น WO Finish Due ไม่ใช่กำหนดส่งราย Operation · จัดส่วนงานเบื้องต้นจาก Control Plan เท่านั้น และไม่ใช่ยอด WIP ทั้งโรงงาน'):('ยังไม่ได้ผูก Due Date + Pending Department ของ '+d.name+' ใน JDE · ไม่สร้างยอดสมมติ');
  const total=r?sumWeight(r):null;
  $('total').textContent=r?fmt(total):'—';
  $('metricExplain').textContent=r?'จำนวน Cutting ตาม Snapshot · ยังไม่ใช่ Factory WIP Certified':'ข้อมูลต้นทางไม่พร้อม';
  const recognized=r?sumWeight(r.filter(x=>['p1','p2','p3','p4','p5','store'].includes(x.department_code))):null;
  $('assigned').textContent=r?fmt(recognized):'—';$('unknown').textContent=r?fmt(total-recognized):'—';
  const now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  $('overdue').textContent=r?fmt(sumWeight(r.filter(x=>x.due&&x.due<now))):'—';
  if(state.scope==='all'&&p)$('scopeNote').textContent+=' · ชุดข้อมูลนี้มีเฉพาะ Open WO';
 }
 function renderDetails(){
  const r=filteredRows(),list=r?r.filter(x=>cellMatches(x,state.cell)):null;
  $('detailHeading').textContent=state.cell?'รายการค้าง · '+(list?.[0]?.project||list?.[0]?.department||'ผลกรอง')+' · '+state.cell.bucket:'รายการงานในผลกรอง';
  $('detailScope').textContent=state.cell?'แสดงเฉพาะช่องที่เลือกจาก Pivot':'แสดงรายการตามตัวกรองและช่วงวันที่';
  const total=list?sumWeight(list):null,count=list?.length??0,pages=Math.max(1,Math.ceil(count/state.pageSize));state.page=Math.min(state.page,pages);
  const page=list?.slice((state.page-1)*state.pageSize,state.page*state.pageSize)||[];
  $('details').innerHTML=!list?'<tr><td colspan="9" class="empty">ยังไม่มีรายการ Drilldown ของ Node นี้</td></tr>':page.length?page.map(x=>'<tr>'+
    '<td>'+escape(x.due||'ไม่ระบุ')+'</td>'+
    '<td>'+escape(x.department||'ยังไม่ระบุ')+'</td>'+
    '<td>'+escape(x.wo||'—')+'</td>'+
    '<td>'+escape(x.cutting||'—')+'</td>'+
    '<td>'+escape(x.project||'ยังไม่พบชื่อโครงการ')+'</td>'+
    '<td>'+escape(x.customer||'ยังไม่พบชื่อลูกค้า')+'</td>'+
    '<td>'+fmt(weight(x))+'</td>'+
    '<td class="'+(!x.owner?'mute':'')+'">'+escape(x.owner||'ยังไม่ยืนยันชื่อบุคคล')+'</td>'+
    '<td>'+escape(x.wo_status||'Provisional Snapshot')+'</td></tr>').join(''):'<tr><td colspan="9" class="empty">ไม่พบรายการในช่องนี้</td></tr>';
  $('detailCount').textContent=list?fmt(total)+' Cutting / '+fmt(count)+' แถว (หน้าปัจจุบัน '+fmt(page.length)+')':'ไม่ทราบจำนวน';
  $('pageIndex').textContent=state.page+' / '+pages;$('prev').disabled=state.page===1;$('next').disabled=state.page>=pages;
 }
 function renderAll(resetYears=false){renderNav();if(resetYears){setupYears();syncFacets();}renderSummary();renderMatrix();renderDetails();}
 async function load(preserve=false){
  try{
    const q=new URL(location.href).searchParams.get('node'),currentNode=state.node;
    const res=await fetch('./daily-status.json?x='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('Status HTTP '+res.status);
    const ds=await res.json();if(!Array.isArray(ds.dimensions)||ds.dimensions.length!==15)throw Error('Invalid 15-node source');
    state.ds=ds;
    if(!preserve)state.node=nodeIds.includes(q)?q:'wip';
    else state.node=currentNode;
    try{const pubRes=await fetch('./public-pivot.json?x='+Date.now(),{cache:'no-store'});if(pubRes.ok){
      const pub=await pubRes.json();if(pub.schema_version==='public-named-pivot-v1'&&pub.scope==='PUBLIC_APPROVED_PROJECT_CUSTOMER_NAMES'&&pub.domains?.wip?.rows?.length)state.pub=pub;
    }}catch(e){console.warn('Published named Pivot not yet available',e.message)}
    if(isPrivate()){
      try{const pr=await fetch('./private-pivot.json?x='+Date.now(),{cache:'no-store'});if(pr.ok){
        const priv=await pr.json();if(priv.schema_version==='private-pivot-v1'&&priv.scope==='PRIVATE_LOCALHOST_ONLY_DO_NOT_COMMIT'&&priv.domains?.wip?.rows?.length===priv.domains.wip.count)state.priv=priv;
      }}catch(e){console.warn('Private snapshot not yet available',e.message)}
    }
    renderAll(true);
  }catch(e){$('scopeNote').textContent='ไม่สามารถโหลดข้อมูลได้: '+e.message;console.error(e)}
 }
 function csv(){
  const rows=filteredRows();if(!rows){message('ยังไม่มีข้อมูลธุรกรรมสำหรับ Export ของ Node นี้');return;}
  const fields=['due','department','wo','cutting','project','customer','count','owner','wo_status'];const src=rows.filter(r=>cellMatches(r,state.cell));
  const quote=v=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const csv='\uFEFF'+fields.join(',')+'\r\n'+src.map(r=>fields.map(f=>quote(r[f])).join(',')).join('\r\n');
  const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='PRIVATE_ERP_PIVOT_'+state.node+'_'+state.year+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200);message('ส่งออกข้อมูล Private เฉพาะเครื่องนี้แล้ว');
 }
 $('rowMode').onchange=e=>{state.rowMode=e.target.value;state.cell=null;state.page=1;renderMatrix();renderDetails();};
 $('projectFilter').onchange=e=>{state.projectFilter=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('customerFilter').onchange=e=>{state.customerFilter=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('refreshData').onclick=()=>load(true);
 $('nodeSelect').onchange=e=>choose(e.target.value);
 $('grain').onchange=e=>{state.grain=e.target.value;if(state.grain==='day'&&!state.month){state.month='10';$('month').value=state.month;}if(state.grain==='year'){state.year='';$('year').value='';state.month='';$('month').value='';}state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('year').onchange=e=>{state.year=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('month').onchange=e=>{state.month=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('scope').onchange=e=>{state.scope=e.target.value;if(state.scope==='all'&&nodeData()){message('ข้อมูลปัจจุบันมีเฉพาะ Open WO; ไม่รวม Closed/Cancelled');state.scope='open';$('scope').value='open';}renderSummary();};
 $('search').oninput=e=>{state.query=e.target.value.trim();state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('clearCell').onclick=()=>{state.cell=null;state.page=1;renderMatrix();renderDetails()};
 $('download').onclick=csv;
 $('reset').onclick=()=>{state.grain='month';state.year='2026';state.month='';state.query='';state.scope='open';state.rowMode='project';state.projectFilter='';state.customerFilter='';state.cell=null;state.page=1;for(const id of ['search'])$(id).value='';$('grain').value='month';$('scope').value='open';renderAll(true)};
 $('prev').onclick=()=>{state.page=Math.max(1,state.page-1);renderDetails()};
 $('next').onclick=()=>{state.page++;renderDetails()};
 load();
 setInterval(()=>{if(document.visibilityState==='visible')load(true)},300000);
})();