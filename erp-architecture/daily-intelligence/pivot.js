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
 const state={ds:null,pub:null,priv:null,node:'wip',grain:'day',year:'2026',month:'',query:'',scope:'open',rowMode:'date_project',collapsed:new Set(),groupDefaultApplied:false,projectFilter:'',customerFilter:'',cell:null,page:1,pageSize:35};
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
 function choose(id){if(!dim(id))return;state.node=id;state.cell=null;state.page=1;state.year='2026';state.month='';state.query='';state.projectFilter='';state.customerFilter='';state.collapsed.clear();state.groupDefaultApplied=false;$('search').value='';const url=new URL(location.href);url.searchParams.set('node',id);history.replaceState(null,'',url.pathname+url.search);renderAll(true);}
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

 // Vertical Group/Sub Group switch. Departments are always horizontal columns.
 const NO_DATE='ไม่ระบุวัน',NO_PROJECT='ยังไม่พบชื่อโครงการ';
 function groupParts(row){
  const date=bucket(row.due),project=row.project||NO_PROJECT;
  return state.rowMode==='date_project'?[date,project]:[project,date];
 }
 function departmentKey(row){return row.department_code||row.department||'unread';}
 function departmentList(rows){
  const all=datasetRows()||rows||[];
  const map=new Map();
  for(const r of all){
   const key=departmentKey(r);
   if(!map.has(key))map.set(key,r.department||'ยังไม่ทราบส่วนงาน');
  }
  const rank=['p1','p2','p3','p4','p5','store','operation_complete','review','unread'];
  return [...map.entries()].sort((a,b)=>{
   const ra=rank.indexOf(a[0]),rb=rank.indexOf(b[0]);
   return (ra<0?99:ra)-(rb<0?99:rb)||a[1].localeCompare(b[1],'th');
  });
 }
 function cellMatches(row,cell){
  if(!cell)return true;
  const [group,sub]=groupParts(row);
  return group===cell.group&&(cell.sub===null||sub===cell.sub)&&
    (cell.department===null||departmentKey(row)===cell.department);
 }
 function dateLabel(iso){
  if(iso===NO_DATE)return iso;
  if(state.grain==='year')return iso;
  if(state.grain==='month'&&/^\d{4}-\d{2}$/.test(iso))return iso.slice(5,7)+'/'+iso.slice(0,4);
  if(/^\d{4}-\d{2}-\d{2}$/.test(iso))return iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4);
  return iso;
 }
 function niceGroupText(s,isDate){return isDate?dateLabel(s):s;}
 function sortGroup(a,b,isDate){
  if(a===NO_DATE||a===NO_PROJECT)return 1;
  if(b===NO_DATE||b===NO_PROJECT)return -1;
  return isDate?a.localeCompare(b):a.localeCompare(b,'th');
 }
 function newCounter(){return {total:0,departments:new Map(),subs:new Map()};}
 function addCount(group,row,amount){group.total+=amount;const key=departmentKey(row);group.departments.set(key,(group.departments.get(key)||0)+amount);}
 function renderMatrix(){
  const rows=filteredRows(),columns=rows?departmentList(rows):[];
  const isDateFirst=state.rowMode==='date_project';
  const projectLabel=state.node==='purchase'?'โครงการ / อ้างอิง (รอตรวจ)':'ชื่อโครงการ';
  const groupName=isDateFirst?'กำหนดส่ง':projectLabel,subName=isDateFirst?projectLabel:'กำหนดส่ง';
  const colspan=columns.length+3;
  const groups=new Map(),grand=new Map();
  if(rows){
   for(const r of rows){
    const [groupKey,subKey]=groupParts(r),weightOfRow=weight(r);
    if(!groups.has(groupKey))groups.set(groupKey,newCounter());
    const group=groups.get(groupKey);
    addCount(group,r,weightOfRow);
    if(!group.subs.has(subKey))group.subs.set(subKey,newCounter());
    addCount(group.subs.get(subKey),r,weightOfRow);
    const dep=departmentKey(r);grand.set(dep,(grand.get(dep)||0)+weightOfRow);
   }
  }
  const sorted=[...groups.entries()].sort((a,b)=>sortGroup(a[0],b[0],isDateFirst));
  if(!state.groupDefaultApplied&&sorted.length){
   state.collapsed.clear();
   if(sorted.length>35)sorted.forEach(([group],i)=>{if(i>=14)state.collapsed.add(group)});
   state.groupDefaultApplied=true;
  }
  const thLabel='<tr><th class="group-col" scope="col">Group · '+escape(groupName)+'</th>'+
   '<th class="sub-col" scope="col">Sub Group · '+escape(subName)+'</th>'+
   columns.map(([code,label])=>'<th scope="col" title="'+escape(code)+'">'+escape(label)+'</th>').join('')+
   '<th scope="col">รวม</th></tr>';
  $('thead').innerHTML=thLabel;
  if(!rows){
   $('tbody').innerHTML='<tr><td class="empty" colspan="'+colspan+
    '">ยังไม่พบรายการที่ผูกกำหนดส่งกับแผนกที่ค้างของ Node นี้ · ข้อมูลไม่พร้อม ไม่ใช่ศูนย์งานค้าง</td></tr>';
   $('tfoot').innerHTML='';
  }else if(!rows.length){
   $('tbody').innerHTML='<tr><td class="empty" colspan="'+colspan+'">ไม่พบรายการในเงื่อนไขที่เลือกจาก Snapshot นี้</td></tr>';
   $('tfoot').innerHTML='';
  }else{
   const cell=(amount,g,sub,dep)=>{
    if(!amount)return '<td><span class="missing">·</span></td>';
    const chosen=state.cell&&state.cell.group===g&&state.cell.sub===sub&&state.cell.department===dep;
    return '<td><button type="button" class="cell'+(chosen?' sel':'')+
     '" data-group="'+escape(g)+'" data-sub="'+escape(sub??'')+'" data-level="'+(sub===null?'group':'sub')+
     '" data-dept="'+escape(dep??'')+'" title="คลิกเจาะรายการ '+fmt(amount)+' งาน">'+fmt(amount)+'</button></td>';
   };
   const html=[];
   for(const [groupNameValue,g] of sorted){
    const collapsed=state.collapsed.has(groupNameValue);
    const subgroupList=[...g.subs.entries()].sort((a,b)=>sortGroup(a[0],b[0],!isDateFirst));
    html.push('<tr class="group-row"><td class="group-col group-label"><button type="button" class="group-toggle" data-group="'+escape(groupNameValue)+
     '" aria-expanded="'+(!collapsed)+'"><span aria-hidden="true">'+(collapsed?'▸':'▾')+'</span> '+escape(niceGroupText(groupNameValue,isDateFirst))+
     '<span class="count-badge">'+subgroupList.length+'</span></button></td>'+
     '<td class="sub-col group-caption">รวม '+escape(subName)+' · '+fmt(g.total)+' '+(state.node==='purchase'?'PR/PO Lines':'Cutting')+'</td>'+
     columns.map(([dep])=>cell(g.departments.get(dep)||0,groupNameValue,null,dep)).join('')+
     cell(g.total,groupNameValue,null,null)+'</tr>');
    if(!collapsed){
     for(const [subValue,sub] of subgroupList){
      html.push('<tr class="sub-row"><td class="group-col child-marker">↳ '+escape(niceGroupText(groupNameValue,isDateFirst))+'</td>'+
       '<td class="sub-col child-label"><span class="sub-name" title="'+escape(niceGroupText(subValue,!isDateFirst))+'">'+escape(niceGroupText(subValue,!isDateFirst))+'</span></td>'+
       columns.map(([dep])=>cell(sub.departments.get(dep)||0,groupNameValue,subValue,dep)).join('')+
       cell(sub.total,groupNameValue,subValue,null)+'</tr>');
     }
    }
   }
   $('tbody').innerHTML=html.join('');
   $('tbody').querySelectorAll('button.group-toggle').forEach(button=>{
    button.onclick=()=>{
     const group=button.dataset.group;
     if(state.collapsed.has(group))state.collapsed.delete(group);else state.collapsed.add(group);
     renderMatrix();
    };
   });
   $('tbody').querySelectorAll('button.cell').forEach(button=>{
    button.onclick=()=>{
     state.cell={
      group:button.dataset.group,
      sub:button.dataset.level==='group'?null:button.dataset.sub,
      department:button.dataset.dept||null
     };
     state.page=1;
     renderMatrix();renderDetails();
    };
   });
   $('tfoot').innerHTML='<tr><th class="group-col pivot-grand" scope="row">รวมทั้งหมด</th>'+
    '<th class="sub-col pivot-grand">'+fmt(sorted.length)+' Group</th>'+
    columns.map(([dep])=>'<td class="pivot-grand">'+fmt(grand.get(dep)||0)+'</td>').join('')+
    '<td class="pivot-grand">'+fmt(sumWeight(rows))+'</td></tr>';
  }
  $('foundLabel').textContent=rows?fmt(sumWeight(rows))+(state.node==='purchase'?' PR/PO Lines · ':' Cutting · ')+fmt(sorted.length)+' Group · '+
   fmt(columns.length)+' แผนก':'ยังไม่สามารถคำนวณยอดงานของ Node นี้';
  $('axisTitle').textContent='แนวตั้ง: '+groupName+' → '+subName+' · แนวนอน: แผนกที่สถานะค้าง';
  $('modeDateProject').classList.toggle('mode-active',isDateFirst);
  $('modeProjectDate').classList.toggle('mode-active',!isDateFirst);
  $('modeDateProject').setAttribute('aria-pressed',String(isDateFirst));
  $('modeProjectDate').setAttribute('aria-pressed',String(!isDateFirst));
  $('rowMode').value=state.rowMode;
 }
 function renderSummary(){
  const d=dim(state.node);if(!d)return;const r=filteredRows(),p=nodeData(),meta=sourceMeta();
  const date=(p?.source_snapshot||meta?.source_snapshot||meta?.due_date_source_snapshot||'ไม่ทราบ');
  const namedProject=r?sumWeight(r.filter(x=>x.project&&x.project!=='ยังไม่พบชื่อโครงการ')):0;
  const namedCustomer=r?sumWeight(r.filter(x=>Boolean(x.customer))):0;
  $('nodeTitle').textContent=d.name;
  $('matrixHeading').textContent=d.name+' · '+(state.node==='purchase'?'PR / PO · Request/Promise Date × จุดติดตาม (เบื้องต้น)':'วันที่ / โครงการ × แผนกที่ค้าง');
  $('sourceLine').textContent=(state.node==='purchase'?'P5543007 (PR Inquiry) + P4338 (PO Detail) · ':'')+d.applications+' · '+(p?p.due_field:'ไม่มี Transaction Pivot Extract ของ Node นี้')+' · Source Snapshot '+date;
  $('dueSource').textContent=conf[state.node]?.[0]||d.grain;
  $('ownerSource').textContent=conf[state.node]?.[1]||d.owner;
  $('certification').textContent=!p?'ยังไม่มี Event ที่ผูก Due Date + Pending Owner ครบ':state.node==='purchase'?'P5543007 PR (ไม่มีเลข PO) และ P4338 PO (Qty Open > 0) · ไม่ใช่คิว PR Approval ที่รับรองแล้ว · PR Request Date/PO Original Promise ไม่ใช่ SLA การอนุมัติ · Buyer ไม่ใช่ Action Owner ที่ยืนยัน · ยังไม่ผูกชื่อโครงการครบ':'วันกำหนดคือ WO Finish Due ไม่ใช่ Stage Due · Current Operation / Owner ยังไม่ผ่านการรับรอง · ชื่อโครงการ/ลูกค้าเผยแพร่ตามอนุมัติ 21 ต.ค. 2026';
  $('trust').textContent=!p?'SOURCE NOT CERTIFIED · NO DAILY PIVOT DATA':state.node==='purchase'?'PR/PO READ-ONLY SAMPLES · NOT CERTIFIED':isPrivate()&&state.priv?.domains?.[state.node]?'NB PRIVATE · NAMES VISIBLE · PROVISIONAL':'PROJECT/CUSTOMER APPROVED · PROVISIONAL';
  $('scopeNote').textContent=!p?'ยังไม่ได้ผูก Due Date + Pending Department ของ '+d.name+' ใน JDE · ไม่สร้างยอดสมมติ':state.node==='purchase'?'P5543007 PR Inquiry วันที่ 20 ต.ค.: PR ไม่พบ PO 30 บรรทัด (21 เลข PR) · P4338 PO นำเข้า 10 ใบ / 14 Lines ที่มี Qty Open > 0 · ใช้ Request Date ของ PR / Original Promised Date ของ PO ไม่ใช่กำหนดอนุมัติ PR · แผนกค้างและเจ้าภาพยังไม่รับรอง · ยังไม่มี Project/SO Join · Source Updated '+date:'ERP Source Snapshot '+date+' · แสดงชื่อโครงการ '+fmt(namedProject)+' Cutting และชื่อลูกค้า '+fmt(namedCustomer)+' Cutting ในผลกรอง · ชื่อลูกค้าที่ยังจับคู่ P4210 ไม่ได้แสดงว่า “ยังไม่พบชื่อลูกค้า” · กำหนดส่งเป็น WO Finish Due ไม่ใช่กำหนดส่งราย Operation · จัดส่วนงานเบื้องต้นจาก Control Plan เท่านั้น และไม่ใช่ยอด WIP ทั้งโรงงาน';
  const total=r?sumWeight(r):null;
  $('total').textContent=r?fmt(total):'—';
  $('metricExplain').textContent=r?(state.node==='purchase'?'30 PR Lines (21 ใบ) ไม่พบ PO + 14 PO Lines Qty Open · ตัวอย่าง ไม่ใช่ยอดทั้งหมด':'จำนวน Cutting ตาม Snapshot · ยังไม่ใช่ Factory WIP Certified'):'ข้อมูลต้นทางไม่พร้อม';
  const recognized=r?sumWeight(r.filter(x=>['p1','p2','p3','p4','p5','store','purchasing_followup'].includes(x.department_code))):null;
  $('assigned').textContent=r?fmt(recognized):'—';$('unknown').textContent=r?fmt(total-recognized):'—';
  const now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  $('overdue').textContent=r?fmt(sumWeight(r.filter(x=>x.due&&x.due<now))):'—';
  if(state.scope==='all'&&p)$('scopeNote').textContent+=state.node==='purchase'?' · ชุดนี้มีเฉพาะ PR ไม่มี PO / PO Qty Open จาก Inquiry ตัวอย่าง':' · ชุดข้อมูลนี้มีเฉพาะ Open WO';
 }

 function renderDetails(){
  const r=filteredRows(),list=r?r.filter(x=>cellMatches(x,state.cell)):null;
  const purchase=state.node==='purchase';
  $('colPrimary').textContent=purchase?'เลข PR / PO':'WO';
  $('colSecondary').textContent=purchase?'Item / PO Line':'Cutting / เอกสาร';
  $('colCustomer').textContent=purchase?'Supplier / รายการ PR (NB)':'ลูกค้า';
  $('colQty').textContent=purchase?'จำนวน PR / PO Lines':'จำนวน Cutting';
  $('colOwner').textContent=purchase?'PO Buyer / PR Owner (ยังไม่ยืนยัน)':'เจ้าภาพชื่อบุคคล';
  $('detailHeading').textContent=state.cell?'รายการค้าง · '+niceGroupText(state.cell.group,state.rowMode==='date_project')+(state.cell.sub===null?'':' → '+niceGroupText(state.cell.sub,state.rowMode==='project_date'))+(state.cell.department===null?'':' · '+(list?.[0]?.department||state.cell.department)):'รายการงานในผลกรอง';
  $('detailScope').textContent=purchase?'PR ยังไม่มี PO จาก P5543007 + PO Qty Open จาก P4338 (Sample) · ยังไม่พิสูจน์ Approval/Current Owner'+(state.cell?' · เฉพาะช่องที่เลือก':''):state.cell?'แสดงเฉพาะช่องที่เลือกจาก Pivot':'แสดงรายการตามตัวกรองและช่วงวันที่';
  const total=list?sumWeight(list):null,count=list?.length??0,pages=Math.max(1,Math.ceil(count/state.pageSize));state.page=Math.min(state.page,pages);
  const page=list?.slice((state.page-1)*state.pageSize,state.page*state.pageSize)||[];
  $('details').innerHTML=!list?'<tr><td colspan="9" class="empty">ยังไม่มีรายการ Drilldown ของ Node นี้</td></tr>':page.length?page.map(x=>'<tr>'+
    '<td>'+escape(x.due||'ไม่ระบุ')+'</td>'+
    '<td>'+escape(x.department||'ยังไม่ระบุ')+'</td>'+
    '<td>'+escape(x.wo||'—')+'</td>'+
    '<td>'+escape(x.cutting||'—')+'</td>'+
    '<td>'+escape(x.project||'ยังไม่พบชื่อโครงการ')+'</td>'+
    '<td>'+escape(purchase?(x.supplier||x.attachment||x.item||'ยังไม่มีรายละเอียด Supplier/PR Item บนเว็บสาธารณะ'):(x.customer||'ยังไม่พบชื่อลูกค้า'))+'</td>'+
    '<td>'+fmt(weight(x))+'</td>'+
    '<td class="'+(!x.owner?'mute':'')+'">'+escape(x.owner||'ยังไม่ยืนยันชื่อบุคคล')+'</td>'+
    '<td>'+escape(x.wo_status||'Provisional Snapshot')+'</td></tr>').join(''):'<tr><td colspan="9" class="empty">ไม่พบรายการในช่องนี้</td></tr>';
  $('detailCount').textContent=list?fmt(total)+' '+(purchase?'PR/PO Lines':'Cutting')+' / '+fmt(count)+' แถว (หน้าปัจจุบัน '+fmt(page.length)+')':'ไม่ทราบจำนวน';
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
 function switchMode(next){
  if(next!=='date_project'&&next!=='project_date')return;
  state.rowMode=next;state.cell=null;state.page=1;state.collapsed.clear();state.groupDefaultApplied=false;
  renderMatrix();renderDetails();
 }
 $('rowMode').onchange=e=>switchMode(e.target.value);
 $('modeDateProject').onclick=()=>switchMode('date_project');
 $('modeProjectDate').onclick=()=>switchMode('project_date');
 $('collapseAll').onclick=()=>{for(const row of filteredRows()||[]){state.collapsed.add(groupParts(row)[0]);}state.groupDefaultApplied=true;renderMatrix();};
 $('expandAll').onclick=()=>{state.collapsed.clear();state.groupDefaultApplied=true;renderMatrix();};
 $('projectFilter').onchange=e=>{state.projectFilter=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('customerFilter').onchange=e=>{state.customerFilter=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('refreshData').onclick=()=>load(true);
 $('nodeSelect').onchange=e=>choose(e.target.value);
 $('grain').onchange=e=>{
  state.grain=e.target.value;state.cell=null;state.page=1;
  state.collapsed.clear();state.groupDefaultApplied=false;renderSummary();renderMatrix();renderDetails();
 };
 $('year').onchange=e=>{state.year=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('month').onchange=e=>{state.month=e.target.value;state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('scope').onchange=e=>{state.scope=e.target.value;if(state.scope==='all'&&nodeData()){message(state.node==='purchase'?'ข้อมูลนี้มีเฉพาะ PR ไม่พบ PO กับ PO Qty Open ตัวอย่าง ยังไม่ครบ PR/PO ทั้งระบบ':'ข้อมูลปัจจุบันมีเฉพาะ Open WO; ไม่รวม Closed/Cancelled');state.scope='open';$('scope').value='open';}renderSummary();};
 $('search').oninput=e=>{state.query=e.target.value.trim();state.cell=null;state.page=1;renderSummary();renderMatrix();renderDetails();};
 $('clearCell').onclick=()=>{state.cell=null;state.page=1;renderMatrix();renderDetails()};
 $('download').onclick=csv;
 $('reset').onclick=()=>{state.grain='day';state.year='2026';state.month='';state.query='';state.scope='open';state.rowMode='date_project';state.collapsed.clear();state.groupDefaultApplied=false;state.projectFilter='';state.customerFilter='';state.cell=null;state.page=1;for(const id of ['search'])$(id).value='';$('grain').value='day';$('scope').value='open';renderAll(true)};
 $('prev').onclick=()=>{state.page=Math.max(1,state.page-1);renderDetails()};
 $('next').onclick=()=>{state.page++;renderDetails()};
 load();
 setInterval(()=>{if(document.visibilityState==='visible')load(true)},300000);
})();