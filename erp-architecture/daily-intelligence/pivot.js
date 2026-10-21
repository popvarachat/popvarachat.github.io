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
 const state={ds:null,priv:null,node:'wip',grain:'month',year:'2026',month:'',query:'',scope:'open',cell:null,page:1,pageSize:35};
 const nodeIds=['transfer','output','material','labor','quality','rework','scrap','wip','machine','purchase','receipt','inventory','cost','delivery','gl'];
 let toastTimeout;
 function message(s){$('toast').textContent=s;$('toast').classList.add('on');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('on'),2500);}
 function dim(id){return state.ds?.dimensions.find(x=>x.id===id);}
 function nodeData(){return state.priv?.domains?.[state.node]||null;}
 function isPrivate(){return ['127.0.0.1','localhost'].includes(location.hostname);}
 function fmt(n){return new Intl.NumberFormat('en-US').format(n);}
 function datasetRows(){const d=nodeData();return d&&Array.isArray(d.rows)?d.rows:null;}
 function datesForNode(){const rows=datasetRows();if(!rows)return ['2026'];return [...new Set(rows.map(x=>x.due?.slice(0,4)).filter(Boolean))].sort();}
 function setOptions(id,items,selected){const el=$(id);el.innerHTML=items.map(x=>'<option value="'+escape(x[0])+'">'+escape(x[1])+'</option>').join('');el.value=selected;}
 function setupYears(){const years=datesForNode();const current=years.includes(state.year)?state.year:(years[years.length-1]||'2026');state.year=current;setOptions('year',[['','ทุกปี'],...years.map(x=>[x,x])],current);setOptions('month',[['','ทุกเดือน'],...Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),String(i+1).padStart(2,'0')])],state.month);}
 function choose(id){if(!dim(id))return;state.node=id;state.cell=null;state.page=1;state.year='2026';state.month='';state.query='';$('search').value='';const url=new URL(location.href);url.searchParams.set('node',id);history.replaceState(null,'',url.pathname+url.search);renderAll(true);}
 function renderNav(){const dims=state.ds?.dimensions||[];$('nodeNav').innerHTML=dims.map(d=>'<button type="button" data-node="'+escape(d.id)+'" class="'+(d.id===state.node?'selected':'')+'" aria-current="'+(d.id===state.node?'page':'false')+'"><span>'+escape(d.seq)+'</span>'+escape(d.name)+'</button>').join('');$('nodeNav').querySelectorAll('button').forEach(x=>x.onclick=()=>choose(x.dataset.node));setOptions('nodeSelect',dims.map(x=>[x.id,x.name+' · '+x.en]),state.node)}
 function filteredRows(){let data=datasetRows();if(!data)return null;const q=state.query.toLowerCase();return data.filter(x=>(!q||[x.wo,x.cutting,x.id,x.project,x.department,x.owner,x.wo_status].join(' ').toLowerCase().includes(q))&&(!state.year||x.due?.slice(0,4)===state.year)&&(!state.month||x.due?.slice(5,7)===state.month));}
 function bucket(due){if(!due)return 'ไม่ระบุวัน';return state.grain==='year'?due.slice(0,4):state.grain==='month'?due.slice(0,7):due;}
 function columnList(rows){
  if(state.grain==='year'){let yrs=datesForNode();return yrs.length?yrs:['2026'];}
  if(state.grain==='month'){const yr=state.year||'2026';return Array.from({length:12},(_,i)=>yr+'-'+String(i+1).padStart(2,'0'));}
  const yr=state.year||'2026',month=state.month||'10',count=new Date(Number(yr),Number(month),0).getDate();
  return Array.from({length:count},(_,i)=>yr+'-'+month+'-'+String(i+1).padStart(2,'0'));
 }
 function departmentList(rows){const priority={p1:1,p2:2,p3:3,p4:4,p5:5,store:6,operation_complete:7,review:8,unread:9};return [...new Map(rows.map(r=>[r.department_code||r.department,r.department])).entries()].sort((a,b)=>(priority[a[0]]||99)-(priority[b[0]]||99));}
 function keyForCell(dept,col){return dept+'|'+col;}
 function cellMatches(row,cell){return !cell||cell.dept===row.department_code&&cell.bucket===bucket(row.due);}
 function renderMatrix(){
  const r=filteredRows();const cols=columnList(r),departments=r?departmentList(r):[];
  let rows=departments;
  const allByDept=new Map(),byBucket=new Map(),counts=new Map();
  if(r){for(const row of r){const dept=row.department_code,day=bucket(row.due);allByDept.set(dept,(allByDept.get(dept)||0)+1);byBucket.set(day,(byBucket.get(day)||0)+1);const k=keyForCell(dept,day);counts.set(k,(counts.get(k)||0)+1)}}
  const h=['<tr><th scope="col">ค้างที่ส่วนงาน</th>',...cols.map(c=>'<th scope="col">'+escape(state.grain==='year'?c:state.grain==='month'?c.slice(5,7)+'/'+c.slice(0,4):c.slice(8,10))+'</th>'),'<th scope="col">รวม</th></tr>'];
  $('thead').innerHTML=h.join('');
  if(r&&!rows.length){$('tbody').innerHTML='<tr><td class="empty" colspan="'+(cols.length+2)+'">ไม่พบรายการในผลกรองนี้ (เฉพาะข้อมูลที่มีใน Snapshot)</td></tr>';}
  else if(!r){$('tbody').innerHTML='<tr><td class="empty" colspan="'+(cols.length+2)+'">ยังไม่พบข้อมูลที่จับคู่ทั้ง Due Date และ Pending Department ของ Node นี้ใน Data Pool · ยังนับงานค้างไม่ได้</td></tr>';}
  else {
   $('tbody').innerHTML=rows.map(([dep,label])=>'<tr><td title="'+escape(dep)+'">'+escape(label)+'</td>'+cols.map(col=>{
     const n=counts.get(keyForCell(dep,col))||0,sel=state.cell?.dept===dep&&state.cell.bucket===col;
     return '<td>'+(n?'<button type="button" class="cell'+(sel?' sel':'')+(dep==='unread'||dep==='review'?' unverifiable':'')+'" data-dep="'+escape(dep)+'" data-bucket="'+escape(col)+'" title="กดดูงาน '+escape(label)+' ใน '+escape(col)+'">'+fmt(n)+'</button>':'<span class="missing">·</span>')+'</td>';
   }).join('')+'<td>'+fmt(allByDept.get(dep)||0)+'</td></tr>').join('');
   $('tbody').querySelectorAll('.cell').forEach(b=>b.onclick=()=>{state.cell={dept:b.dataset.dep,bucket:b.dataset.bucket};state.page=1;renderMatrix();renderDetails()});
  }
  $('tfoot').innerHTML=r&&r.length?'<tr><th scope="row">รวมตามวันกำหนด</th>'+cols.map(c=>'<td>'+fmt(byBucket.get(c)||0)+'</td>').join('')+'<td>'+fmt(r.length)+'</td></tr>':'';
  $('foundLabel').textContent=r?fmt(r.length)+' Cutting / ขอบเขต Snapshot':'ยังไม่มีชุดธุรกรรมสำหรับ Node นี้';
  $('axisTitle').textContent='แนวนอน = '+(state.grain==='year'?'ปี':state.grain==='month'?'เดือน':'วัน')+'กำหนดส่ง · แนวตั้ง = ส่วนงานที่ค้าง';
 }
 function renderSummary(){
  const d=dim(state.node);if(!d)return;const r=filteredRows(),p=nodeData();
  $('nodeTitle').textContent=d.name;
  $('matrixHeading').textContent=d.name+' · กำหนดส่ง × ส่วนงานค้าง';
  $('sourceLine').textContent=d.applications+' · '+(p?p.due_field:'ไม่มี Transaction Pivot Extract ของ Node นี้');
  $('dueSource').textContent=conf[state.node]?.[0]||d.grain;
  $('ownerSource').textContent=conf[state.node]?.[1]||d.owner;
  $('certification').textContent=p?'ระบุ Stage เบื้องต้นเท่านั้น · Current Operation / Owner ยังไม่รับรอง · ไม่ใช่ Factory-wide WIP':'ยังไม่มีรายการต้นทางที่ผูก Stage Due + Pending Owner ครบ; ไม่สร้างข้อมูลสมมติ';
  $('trust').textContent=p?'PRIVATE · PROVISIONAL · NOT CERTIFIED':'SOURCE NOT CERTIFIED · NO DAILY PIVOT DATA';
  $('scopeNote').textContent=p?('NB PRIVATE SNAPSHOT '+state.priv.source_snapshot+' · ดึง Open WO-filtered Cutting เท่านั้น · วันที่กำหนดคือ WO Finish Due ไม่ใช่กำหนดส่งระหว่าง Stage · ส่วนงานที่ค้างเป็นการจำแนกเบื้องต้น ยังไม่ผ่าน Control Plan Current Operation และไม่มีชื่อเจ้าภาพยืนยัน'):('ยังไม่ได้เชื่อม Due Date และ Pending Department ตามธุรกรรมของ Node '+d.name+' จาก JDE · การเปิดหน้าจอ '+d.applications+' ได้ยังไม่เพียงพอ ต้องอ่านระดับรายการและแยก Owner ก่อนแสดง Pivot');
  $('total').textContent=r?fmt(r.length):'—';
  $('metricExplain').textContent=r?'นับ Cutting ไม่ซ้ำ · ไม่ใช่ WIP ทั้งโรงงาน':'ข้อมูลต้นทางไม่พร้อม';
  const recognized=r?r.filter(x=>['p1','p2','p3','p4','p5','store'].includes(x.department_code)).length:null;
  const missing=r?r.length-recognized:null;
  $('assigned').textContent=r?fmt(recognized):'—';$('unknown').textContent=r?fmt(missing):'—';
  const asof='2026-10-21'; // temporary reference until a certified system date is available
  $('overdue').textContent=r?fmt(r.filter(x=>x.due&&x.due<asof).length):'—';
  if(state.scope==='all'&&p){$('scopeNote').textContent+=' · ขอบเขต All ใช้ไม่ได้: ชุดนี้มี Open เท่านั้น';}
 }
 function renderDetails(){
  const r=filteredRows();const list=r?r.filter(x=>cellMatches(x,state.cell)):null;
  $('detailHeading').textContent=state.cell?'รายการค้าง · '+(list?.[0]?.department||state.cell.dept)+' · '+state.cell.bucket:'รายการงานในผลกรอง';
  $('detailScope').textContent=state.cell?'จากช่องที่คลิก · Due Bucket '+state.cell.bucket:'ยังไม่เลือกช่อง; แสดงตามผลกรองเวลาของ Node';
  const count=list?.length??0,pages=Math.max(1,Math.ceil(count/state.pageSize));state.page=Math.min(state.page,pages);
  const page=list?.slice((state.page-1)*state.pageSize,state.page*state.pageSize)||[];
  $('details').innerHTML=!list?'<tr><td colspan="7" class="empty">ยังไม่มีรายการ Drilldown ที่ตรวจสอบได้ของ Node นี้</td></tr>':page.length?page.map(x=>'<tr><td>'+escape(x.due||'ไม่ระบุ')+'</td><td>'+escape(x.department)+'</td><td>'+escape(x.wo)+'</td><td>'+escape(x.cutting)+'</td><td>'+escape(x.project||'ไม่พบชื่อโครงการ')+'</td><td class="'+(!x.owner?'mute':'')+'">'+escape(x.owner||'ยังไม่ยืนยันชื่อบุคคล')+'</td><td>'+escape(x.wo_status||'ไม่ระบุ')+' · Provisional</td></tr>').join(''):'<tr><td colspan="7" class="empty">ไม่พบรายการในช่องนี้</td></tr>';
  $('detailCount').textContent=list?fmt(count)+' รายการในผลกรอง / '+fmt(page.length)+' รายการหน้าปัจจุบัน':'ไม่ทราบจำนวน';
  $('pageIndex').textContent=state.page+' / '+pages;$('prev').disabled=state.page===1;$('next').disabled=state.page>=pages;
 }
 function renderAll(resetYears=false){renderNav();if(resetYears)setupYears();renderSummary();renderMatrix();renderDetails();}
 async function load(){
  try {
   const q=new URL(location.href).searchParams.get('node');
   const resp=await fetch('./daily-status.json?x='+Date.now(),{cache:'no-store'});if(!resp.ok)throw Error('Status HTTP '+resp.status);
   const ds=await resp.json();if(!Array.isArray(ds.dimensions)||ds.dimensions.length!==15)throw Error('Invalid 15-node source');
   state.ds=ds;state.node=nodeIds.includes(q)?q:'wip';
   if(isPrivate()){
     try {const pr=await fetch('./private-pivot.json?x='+Date.now(),{cache:'no-store'});if(pr.ok){const priv=await pr.json();if(priv.schema_version==='private-pivot-v1'&&priv.scope==='PRIVATE_LOCALHOST_ONLY_DO_NOT_COMMIT'&&priv.classification==='INTERNAL'&&priv.domains?.wip?.rows?.length===priv.domains.wip.count)state.priv=priv;}}catch(e){console.warn('Private dataset unavailable',e.message)}
   }
   renderAll(true);
  }catch(e){$('scopeNote').textContent='ไม่สามารถโหลด Data Pool ได้: '+e.message;console.error(e)}
 }
 function csv(){
  const rows=filteredRows();if(!rows){message('ยังไม่มีข้อมูลธุรกรรมสำหรับ Export ของ Node นี้');return;}
  const fields=['due','department','wo','cutting','project','owner','wo_status'];const src=rows.filter(r=>cellMatches(r,state.cell));
  const quote=v=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const csv='\uFEFF'+fields.join(',')+'\r\n'+src.map(r=>fields.map(f=>quote(r[f])).join(',')).join('\r\n');
  const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='PRIVATE_ERP_PIVOT_'+state.node+'_'+state.year+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200);message('ส่งออกข้อมูล Private เฉพาะเครื่องนี้แล้ว');
 }
 $('nodeSelect').onchange=e=>choose(e.target.value);
 $('grain').onchange=e=>{state.grain=e.target.value;if(state.grain==='day'&&!state.month){state.month='10';$('month').value=state.month;}if(state.grain==='year'){state.year='';$('year').value='';state.month='';$('month').value='';}state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('year').onchange=e=>{state.year=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('month').onchange=e=>{state.month=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('scope').onchange=e=>{state.scope=e.target.value;if(state.scope==='all'&&nodeData()){message('ข้อมูลปัจจุบันมีเฉพาะ Open WO; ไม่รวม Closed/Cancelled');state.scope='open';$('scope').value='open';}renderSummary();};
 $('search').oninput=e=>{state.query=e.target.value.trim();state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('clearCell').onclick=()=>{state.cell=null;state.page=1;renderMatrix();renderDetails()};
 $('download').onclick=csv;
 $('reset').onclick=()=>{state.grain='month';state.year='2026';state.month='';state.query='';state.scope='open';state.cell=null;state.page=1;for(const id of ['search'])$(id).value='';$('grain').value='month';$('scope').value='open';renderAll(true)};
 $('prev').onclick=()=>{state.page=Math.max(1,state.page-1);renderDetails()};
 $('next').onclick=()=>{state.page++;renderDetails()};
 load();
})();