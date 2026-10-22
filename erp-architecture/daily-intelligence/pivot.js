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
 const state={ds:null,pub:null,priv:null,node:'wip',grain:'day',year:'2026',month:'',query:'',scope:'open',rowMode:'date_project',collapsed:new Set(),groupDefaultApplied:false,projectFilter:'',customerFilter:'',cell:null,page:1,pageSize:35,historyYear:'',historySelected:null};
 const nodeIds=['transfer','output','material','labor','quality','rework','scrap','wip','machine','purchase','receipt','inventory','cost','delivery','gl'];
 let toastTimeout;
 function message(s){$('toast').textContent=s;$('toast').classList.add('on');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('on'),2500);}
 function dim(id){return state.ds?.dimensions.find(x=>x.id===id);}
 // Certified transfer ledger is absent; show historical WIP solely as a TRANSFER REVIEW REFERENCE.
 // This proxy must never be described as posted transfers, today's backlog, or actual transfer due.
 function transferReferenceOnly(){return state.node==='transfer'&&!state.pub?.domains?.transfer&&!state.priv?.domains?.transfer&&Array.isArray(state.pub?.domains?.wip?.rows)&&state.pub.domains.wip.rows.length>0;}
 function nodeData(){const own=isPrivate()?state.priv?.domains?.[state.node]||state.pub?.domains?.[state.node]:state.pub?.domains?.[state.node];
  if(own)return own;
  return transferReferenceOnly()?(isPrivate()?state.priv?.domains?.wip||state.pub?.domains?.wip:state.pub?.domains?.wip)||null:null;}
 function sourceMeta(){return isPrivate()&&(state.priv?.domains?.[state.node]||transferReferenceOnly()&&state.priv?.domains?.wip)?state.priv:state.pub;}
 function weight(r){return Number.isFinite(Number(r.count))&&Number(r.count)>0?Number(r.count):1;}
 function sumWeight(rows){return rows.reduce((acc,r)=>acc+weight(r),0);}
 function isPrivate(){return ['127.0.0.1','localhost'].includes(location.hostname);}
 function fmt(n){return new Intl.NumberFormat('en-US').format(n);}
 function datasetRows(){const d=nodeData();return d&&Array.isArray(d.rows)?d.rows:null;}
 function datesForNode(){const rows=datasetRows();if(!rows)return ['2026'];return [...new Set(rows.map(x=>x.due?.slice(0,4)).filter(Boolean))].sort();}
 function setOptions(id,items,selected){const el=$(id);el.innerHTML=items.map(x=>'<option value="'+escape(x[0])+'">'+escape(x[1])+'</option>').join('');el.value=selected;}
 function setupYears(){const years=datesForNode();const current=years.includes(state.year)?state.year:(years[years.length-1]||'2026');state.year=current;setOptions('year',[['','ทุกปี'],...years.map(x=>[x,x])],current);setOptions('month',[['','ทุกเดือน'],...Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),String(i+1).padStart(2,'0')])],state.month);}
 function choose(id){if(!dim(id))return;state.node=id;state.cell=null;state.page=1;state.historyYear='';state.historySelected=null;state.year='2026';state.month='';state.query='';state.projectFilter='';state.customerFilter='';state.collapsed.clear();state.groupDefaultApplied=false;$('search').value='';const url=new URL(location.href);url.searchParams.set('node',id);history.replaceState(null,'',url.pathname+url.search);renderAll(true);}
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
  const activity=Boolean(nodeData()?.activity_not_backlog);
  const projectLabel=state.node==='purchase'?'โครงการ / อ้างอิง (รอตรวจ)':activity?'โครงการ (ใบรับเข้าไม่มี)': 'ชื่อโครงการ';
  const timeLabel=activity?'วันที่รับเข้าจริง':transferReferenceOnly()?'WO Finish Due (ไม่ใช่กำหนดโอน)':'กำหนดส่ง';
  const groupName=isDateFirst?timeLabel:projectLabel,subName=isDateFirst?projectLabel:timeLabel;
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
    '">ยังไม่พบรายการที่ผูกกำหนดส่งกับแผนกที่ค้างของ Node นี้ · ข้อมูลไม่พร้อม ไม่ใช่ศูนย์งานค้าง · '+escape(state.pub?.source_audit?.items?.[state.node]?.reason||'ยังไม่มี source dataset')+'</td></tr>';
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
  $('foundLabel').textContent=rows?fmt(sumWeight(rows))+(state.node==='purchase'?' PR/PO Lines · ':nodeData()?.activity_not_backlog?' Receipt Lines · ':' Cutting · ')+fmt(sorted.length)+' Group · '+
   fmt(columns.length)+' แผนก':'ยังไม่สามารถคำนวณยอดงานของ Node นี้';
  $('axisTitle').textContent='แนวตั้ง: '+groupName+' → '+subName+' · แนวนอน: '+(activity?'สโตร์ที่รับเข้าแล้ว (ไม่ใช่แผนกค้าง)':transferReferenceOnly()?'สายผลิตเบื้องต้นจาก WIP ไม่ใช่สถานะโอนจริง':'แผนกที่สถานะค้าง');
  $('modeDateProject').textContent=activity?'วันรับเข้าจริง → โครงการ':'วันกำหนดส่ง → โครงการ';
  $('modeProjectDate').textContent=activity?'โครงการ → วันรับเข้าจริง':'โครงการ → วันกำหนดส่ง';
  $('rowMode').options[0].textContent=activity?'Group: วันรับเข้าจริง → Sub Group: โครงการ':'Group: วันที่กำหนดส่ง → Sub Group: โครงการ';
  $('rowMode').options[1].textContent=activity?'Group: โครงการ → Sub Group: วันรับเข้าจริง':'Group: โครงการ → Sub Group: วันที่';
  $('modeDateProject').classList.toggle('mode-active',isDateFirst);
  $('modeProjectDate').classList.toggle('mode-active',!isDateFirst);
  $('modeDateProject').setAttribute('aria-pressed',String(isDateFirst));
  $('modeProjectDate').setAttribute('aria-pressed',String(!isDateFirst));
  $('rowMode').value=state.rowMode;
 }
 function renderSummary(){
  const d=dim(state.node);if(!d)return;const r=filteredRows(),p=nodeData(),meta=sourceMeta(),activity=Boolean(p?.activity_not_backlog),audit=state.pub?.source_audit?.items?.[state.node];
  const date=(p?.source_snapshot||meta?.source_snapshot||meta?.due_date_source_snapshot||'ไม่ทราบ');
  const namedProject=r?sumWeight(r.filter(x=>x.project&&x.project!=='ยังไม่พบชื่อโครงการ')):0;
  const namedCustomer=r?sumWeight(r.filter(x=>Boolean(x.customer))):0;
  $('nodeTitle').textContent=d.name;
  $('metricMainLabel').textContent=transferReferenceOnly()?'WIP Open จาก Snapshot ที่ต้องตรวจสถานะโอน':activity?'รายการรับเข้าที่บันทึกแล้ว (ไม่ใช่งานค้าง)':'รายการงานค้างในผลกรอง';
  $('metricAssignedLabel').textContent=activity?'คิวค้างรับตาม PO (ยังไม่ได้เชื่อม)':'ระบุส่วนงานเบื้องต้นได้';
  $('metricUnknownLabel').textContent=activity?'ผู้รับผิดชอบที่ยังค้าง (ยังไม่ตรวจ)':'ส่วนงานยังไม่ชัด / ต้องตรวจ';
  $('metricOverdueLabel').textContent=transferReferenceOnly()?'WO Finish Due ก่อนวันนี้ (Snapshot)':activity?'งานค้างรับเกินกำหนด (ยังไม่ตรวจ)':'เกินกำหนดตามวันที่อ้างอิง';
  $('scope').querySelector('option[value="open"]').textContent=transferReferenceOnly()?'Open WO ใน Snapshot (ไม่ใช่ค้างโอน)':activity?'รายการรับเข้าแล้วในหลักฐาน':'เฉพาะงานค้าง / Open';
  $('scope').disabled=activity;
  $('matrixHeading').textContent=d.name+' · '+(transferReferenceOnly()?'WIP → ตรวจสอบการโอน: WO Finish Due × โครงการ × Stage เบื้องต้น':activity?'วันที่รับเข้าจริง × สโตร์ที่รับเข้า (ไม่ใช่แผนกค้าง)':state.node==='purchase'?'PR / PO · Request/Promise Date × จุดติดตาม (เบื้องต้น)':'วันที่ / โครงการ × แผนกที่ค้าง');
  $('sourceLine').textContent=transferReferenceOnly()?'ทะเบียน WIP จาก P5511026/P48013 · ไม่มี Transaction TS จาก P4111/P554801C · Date = WO Finish Due · Source Snapshot '+date:(activity?'P55432A4 (Actual Receipts) · ':state.node==='purchase'?'P5543007 (PR Inquiry) + P4338 (PO Detail) · ':'')+d.applications+' · '+(p?p.due_field:'ไม่มี Transaction Pivot Extract ของ Node นี้')+' · Source Snapshot '+date;
  $('dueSource').textContent=conf[state.node]?.[0]||d.grain;
  $('ownerSource').textContent=conf[state.node]?.[1]||d.owner;
  $('certification').textContent=transferReferenceOnly()?'รายการตรวจสอบจาก Open WO/Cutting เดิมเท่านั้น · รอ TS/Movement Document, Origin/Destination, Posted Date, Current Operation และ Assigned Owner':!p?'ยังไม่มี Event ที่ผูก Due Date + Pending Owner ครบ':activity?'รับเข้าแล้ว 43 Receipt Inquiry Lines วันที่ 19 ต.ค. · ยังไม่ใช่งานค้าง · ต้องเชื่อม PO Open / Promise / Receipt / Pending Owner ถึงจะสร้าง Backlog ได้':state.node==='purchase'?'P5543007 PR (ไม่มีเลข PO) และ P4338 PO (Qty Open > 0) · ไม่ใช่คิว PR Approval ที่รับรองแล้ว · PR Request Date/PO Original Promise ไม่ใช่ SLA การอนุมัติ · Buyer ไม่ใช่ Action Owner ที่ยืนยัน · ยังไม่ผูกชื่อโครงการครบ':'วันกำหนดคือ WO Finish Due ไม่ใช่ Stage Due · Current Operation / Owner ยังไม่ผ่านการรับรอง · ชื่อโครงการ/ลูกค้าเผยแพร่ตามอนุมัติ 21 ต.ค. 2026';
  $('trust').textContent=transferReferenceOnly()?'WIP REFERENCE ONLY · NOT TRANSFER LEDGER':!p?'SOURCE NOT CERTIFIED · NO DAILY PIVOT DATA':activity?'ACTUAL RECEIPTS · COMPLETED ACTIVITY · NOT BACKLOG':state.node==='purchase'?'PR/PO READ-ONLY SAMPLES · NOT CERTIFIED':isPrivate()&&state.priv?.domains?.[state.node]?'NB PRIVATE · NAMES VISIBLE · PROVISIONAL':'PROJECT/CUSTOMER APPROVED · PROVISIONAL';
  $('scopeNote').textContent=transferReferenceOnly()?'รายชื่องาน WIP ที่เคยเป็น Open ใน Snapshot '+date+' สำหรับตรวจว่ามี TS/รายการโอนหรือยังเท่านั้น · ไม่ใช่งานรอโอน ณ วันนี้ ไม่ใช่รายการโอนสำเร็จ · ยังไม่มี Posted Transfer Ledger/วันโอน/ต้นทาง-ปลายทาง/เจ้าภาพรายคนที่รับรอง':!p?'ยังไม่สามารถสร้าง Pivot งานค้างจาก JDE: '+(audit?.reason||'ไม่มีรายการธุรกรรมที่ผูกครบ')+' · หลักฐานที่พบ '+(audit?.sample_rows===null?'ยังไม่ได้ดึง Row Data ที่ใช้ยืนยัน':fmt(audit?.sample_rows||0)+' แถวตัวอย่าง')+' · ยังต้องทำ: '+(audit?.next_gate||'เชื่อม Due / Pending Department / Owner')+' · ไม่ใช่ศูนย์งานค้าง':activity?'ข้อมูลรับเข้าสตอร์จาก P55432A4 วันที่ 19 ต.ค. 2026 ครบ 43 บรรทัด (38 PO / 39 Item) ตามเงื่อนไขค้นหา; แกนนอนคือสโตร์ที่รับเข้าแล้ว ไม่ใช่ฝ่ายค้างรับ · แกนวันคือวันที่รับเข้าจริง ไม่ใช่กำหนดส่ง · ยังไม่มี Pending PO/Receiving Queue หรือชื่อโครงการที่เชื่อมยืนยัน':state.node==='purchase'?'P5543007 PR Inquiry วันที่ 20 ต.ค.: PR ไม่พบ PO 30 บรรทัด (21 เลข PR) · P4338 PO นำเข้า 10 ใบ / 14 Lines ที่มี Qty Open > 0 · ใช้ Request Date ของ PR / Original Promised Date ของ PO ไม่ใช่กำหนดอนุมัติ PR · แผนกค้างและเจ้าภาพยังไม่รับรอง · ชื่อโครงการที่จับคู่จากข้อความ PR กับทะเบียนเดิม '+fmt(p?.summary?.pr_project_candidate_lines||0)+' บรรทัด (เบื้องต้นเท่านั้น) · มี SO แต่รอชื่อโครงการอีก '+fmt(p?.summary?.pr_so_reference_only_lines||0)+' บรรทัด · ยังไม่ยืนยัน SO→Project Join · Source Updated '+date:'ERP Source Snapshot '+date+' · แสดงชื่อโครงการ '+fmt(namedProject)+' Cutting และชื่อลูกค้า '+fmt(namedCustomer)+' Cutting ในผลกรอง · ชื่อลูกค้าที่ยังจับคู่ P4210 ไม่ได้แสดงว่า “ยังไม่พบชื่อลูกค้า” · กำหนดส่งเป็น WO Finish Due ไม่ใช่กำหนดส่งราย Operation · จัดส่วนงานเบื้องต้นจาก Control Plan เท่านั้น และไม่ใช่ยอด WIP ทั้งโรงงาน';
  const total=r?sumWeight(r):null;
  $('total').textContent=r?fmt(total):'—';
  $('metricExplain').textContent=r?(transferReferenceOnly()?'Cutting จาก WIP Snapshot ไม่ใช่ยอดค้างโอนจริง':activity?'ธุรกรรมรับเข้าแล้ว 19 ต.ค. 2026; ไม่ใช่ยอดค้างรับ':state.node==='purchase'?'30 PR Lines (21 ใบ) ไม่พบ PO + 14 PO Lines Qty Open · ตัวอย่าง ไม่ใช่ยอดทั้งหมด':'จำนวน Cutting ตาม Snapshot · ยังไม่ใช่ Factory WIP Certified'):'ข้อมูลต้นทางไม่พร้อม';
  const recognized=r?sumWeight(r.filter(x=>['p1','p2','p3','p4','p5','store','purchasing_followup'].includes(x.department_code))):null;
  $('assigned').textContent=r&&!activity?fmt(recognized):'—';$('unknown').textContent=r&&!activity?fmt(total-recognized):'—';
  const now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  $('overdue').textContent=r&&!activity?fmt(sumWeight(r.filter(x=>x.due&&x.due<now))):'—';
  if(state.scope==='all'&&p&&!activity)$('scopeNote').textContent+=state.node==='purchase'?' · ชุดนี้มีเฉพาะ PR ไม่มี PO / PO Qty Open จาก Inquiry ตัวอย่าง':' · ชุดข้อมูลนี้มีเฉพาะ Open WO';
 }

 function renderDetails(){
  const r=filteredRows(),list=r?r.filter(x=>cellMatches(x,state.cell)):null;
  const purchase=state.node==='purchase',activity=Boolean(nodeData()?.activity_not_backlog);
  $('colDate').textContent=transferReferenceOnly()?'WO Finish Due (ไม่ใช่วันโอน)':activity?'วันที่รับเข้าจริง':'กำหนดส่ง';
  $('colStage').textContent=transferReferenceOnly()?'Stage จาก WIP (ยังไม่รับรอง)':activity?'สโตร์ที่รับเข้าแล้ว':'ส่วนงาน / Stage';
  $('colPrimary').textContent=activity?'PO Number':purchase?'เลข PR / PO':'WO';
  $('colSecondary').textContent=activity?'OV / PO Line':purchase?'Item / PO Line':'Cutting / เอกสาร';
  $('colCustomer').textContent=activity?'Supplier (เฉพาะ NB)':purchase?'Supplier / รายการ PR (NB)':'ลูกค้า';
  $('colQty').textContent=activity?'จำนวน Receipt Lines':purchase?'จำนวน PR / PO Lines':'จำนวน Cutting';
  $('colOwner').textContent=activity?'ผู้รับผิดชอบค้างรับ (ยังไม่ทราบ)':purchase?'PO Buyer / PR Owner (ยังไม่ยืนยัน)':'เจ้าภาพชื่อบุคคล';
  $('detailHeading').textContent=state.cell?(transferReferenceOnly()?'รายการ WIP ที่ต้องตรวจโอน · ':activity?'รายการรับเข้าแล้ว · ':'รายการค้าง · ')+niceGroupText(state.cell.group,state.rowMode==='date_project')+(state.cell.sub===null?'':' → '+niceGroupText(state.cell.sub,state.rowMode==='project_date'))+(state.cell.department===null?'':' · '+(list?.[0]?.department||state.cell.department)):'รายการงานในผลกรอง';
  $('detailScope').textContent=transferReferenceOnly()?'เปิดดู WO/Cutting จาก WIP Snapshot ที่เกี่ยวข้องกับการตรวจสอบโอน · ไม่ได้ยืนยันว่าค้างโอน · ต้องค้น TS / Posted Movement แยกต่างหาก':activity?'แสดงธุรกรรมรับเข้า P55432A4 วันที่ 19 ต.ค. 2026 เท่านั้น · ไม่ใช่รายการรับค้าง':purchase?'PR ยังไม่มี PO จาก P5543007 + PO Qty Open จาก P4338 (Sample) · ยังไม่พิสูจน์ Approval/Current Owner'+(state.cell?' · เฉพาะช่องที่เลือก':''):state.cell?'แสดงเฉพาะช่องที่เลือกจาก Pivot':'แสดงรายการตามตัวกรองและช่วงวันที่';
  const total=list?sumWeight(list):null,count=list?.length??0,pages=Math.max(1,Math.ceil(count/state.pageSize));state.page=Math.min(state.page,pages);
  const page=list?.slice((state.page-1)*state.pageSize,state.page*state.pageSize)||[];
  $('details').innerHTML=!list?'<tr><td colspan="9" class="empty">ยังไม่มีรายการ Drilldown ของ Node นี้</td></tr>':page.length?page.map(x=>'<tr>'+
    '<td>'+escape(x.due||'ไม่ระบุ')+'</td>'+
    '<td>'+escape(x.department||'ยังไม่ระบุ')+'</td>'+
    '<td>'+escape(x.wo||'—')+'</td>'+
    '<td>'+escape(x.cutting||'—')+'</td>'+
    '<td>'+escape(x.project||'ยังไม่พบชื่อโครงการ')+'</td>'+
    '<td>'+escape(activity?(x.supplier||'ไม่เผยแพร่ Supplier บนเว็บสาธารณะ'):purchase?(x.supplier||x.attachment||x.item||'ยังไม่มีรายละเอียด Supplier/PR Item บนเว็บสาธารณะ'):(x.customer||'ยังไม่พบชื่อลูกค้า'))+'</td>'+
    '<td>'+fmt(weight(x))+'</td>'+
    '<td class="'+(!x.owner?'mute':'')+'">'+escape(x.owner||'ยังไม่ยืนยันชื่อบุคคล')+'</td>'+
    '<td>'+escape(x.wo_status||'Provisional Snapshot')+'</td></tr>').join(''):'<tr><td colspan="9" class="empty">ไม่พบรายการในช่องนี้</td></tr>';
  $('detailCount').textContent=list?fmt(total)+' '+(activity?'Receipt Lines':purchase?'PR/PO Lines':'Cutting')+' / '+fmt(count)+' แถว (หน้าปัจจุบัน '+fmt(page.length)+')':'ไม่ทราบจำนวน';
  $('pageIndex').textContent=state.page+' / '+pages;$('prev').disabled=state.page===1;$('next').disabled=state.page>=pages;
 }

 const sourceStatusLabels={
  NOT_CONNECTED:'ยังไม่มีรายการธุรกรรมที่ตรวจรับ',
  SOURCE_SAMPLE_NOT_ACTION_QUEUE:'มีข้อมูลตัวอย่าง แต่ยังไม่ใช่คิวงานค้าง',
  HISTORICAL_SAMPLE_NOT_CURRENT:'พบ QC ตัวอย่างเก่า · ยังพิสูจน์ Reject ปัจจุบันไม่ได้',
  PIVOT_PROVISIONAL:'มี Pivot เบื้องต้น · ยังไม่รับรอง',
  BOUNDED_PIVOT_SAMPLE:'มี PR/PO บางส่วน · ยังไม่ครบ',
  RECORDED_ACTIVITY:'มีธุรกรรมรับเข้าแล้ว · ไม่ใช่ค้าง'
 };
 function renderAudit(){
  const a=state.pub?.source_audit||state.priv?.source_audit;
  if(!a||!a.items){$('auditSummary').textContent='ยังไม่มีผลตรวจครบ 15 Node จาก Data Pool';$('auditRows').innerHTML='';$('auditEvidence').textContent='ยังไม่มี Evidence Ledger';$('auditMissing').textContent='';$('auditDate').textContent='';return;}
  const current=a.items[state.node];
  $('auditSummary').textContent='ตรวจแล้ว '+a.audited_nodes+'/15 Node · มีชุดข้อมูล Pivot '+a.pivot_nodes+'/15 Node (รวมกิจกรรมรับเข้าสโตร์ 43 บรรทัด) · ยืนยันคิวค้าง/เจ้าภาพครบ '+a.certified_pending_nodes+'/15 · การมี Source ไม่ใช่ข้อมูลผ่านรับรอง';
  if(current){
   $('auditNodeName').textContent=current.name+' · '+(sourceStatusLabels[current.status]||current.status);
   $('auditEvidence').textContent='พบหลักฐานจาก '+current.source_app+(current.sample_rows===null?' · ยังไม่ได้ดึง Row Data ที่ใช้คำนวณ': ' · '+fmt(current.sample_rows)+' แถวใน Snapshot/ตัวอย่าง')+' · '+current.reason;
   $('auditMissing').textContent='ยังต้องพิสูจน์: '+current.next_gate;
   $('auditDate').textContent='วันที่ข้อมูลที่มี: '+(current.captured_at||'ยังไม่พบหลักฐานวันที่')+' · Pending Owner และ Due ต่อ Stage ยังไม่รับรอง';
  }
  const dims=state.ds?.dimensions||[];
  $('auditRows').innerHTML=dims.map(d=>{
   const x=a.items[d.id];if(!x)return '';
   const selected=d.id===state.node?' selected':'';
   const count=x.sample_rows===null?'—':fmt(x.sample_rows);
   return '<tr class="audit-record'+selected+'"><td><button type="button" data-audit-node="'+escape(d.id)+'">'+escape(d.name)+'</button></td>'+
     '<td>'+escape(sourceStatusLabels[x.status]||x.status)+'</td>'+
     '<td class="audit-num">'+count+'</td>'+
     '<td>'+escape(x.source_app)+'<small>'+escape(x.captured_at||'ยังไม่มีเวลา Snapshot')+'</small></td>'+
     '<td>'+escape(x.next_gate)+'</td></tr>';
  }).join('');
  $('auditRows').querySelectorAll('button[data-audit-node]').forEach(b=>b.onclick=()=>choose(b.dataset.auditNode));
 }

 function historyData(){
  const found=(isPrivate()?state.priv?.historical_evidence?.nodes?.[state.node]||state.pub?.historical_evidence?.nodes?.[state.node]:
           state.pub?.historical_evidence?.nodes?.[state.node])||null;
  if(found&&(!transferReferenceOnly()||Array.isArray(found.rows)&&found.rows.length>0))return found;
  if(!isPrivate()||!transferReferenceOnly())return found||null;
  // Private evidence references: WO FINISH dates are NEVER transfer transaction dates.
  const rows=(state.priv?.domains?.wip?.rows||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.due||''))
   .map(x=>({date:x.due,date_kind:'WO Finish Due (NOT Transfer Date)',
      reference:(x.wo?'WO '+x.wo:'WO ไม่ทราบ')+(x.cutting?' · Cutting '+x.cutting:''),
      description:x.project||'ไม่พบโครงการ'}));
  return {rows};
 }
 function publicHistory(){
  const direct=state.pub?.historical_evidence?.nodes?.[state.node];
  if(direct&&(!transferReferenceOnly()||Array.isArray(direct.rows)&&direct.rows.length>0))return direct;
  if(!transferReferenceOnly())return direct||null;
  // Expose ONLY source-approved WIP snapshot aggregates. This is NOT a transfer ledger.
  const byDate=new Map();
  for(const x of state.pub.domains.wip.rows){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(x.due||''))continue;
   byDate.set(x.due,(byDate.get(x.due)||0)+weight(x));
  }
  const kind='WO Finish Due (NOT Transfer Date)';
  return {source:'P5511026/P48013 WIP Snapshot — not P4111 Transfer Ledger',
   source_capture:state.pub.source_snapshot||state.pub.due_date_source_snapshot,
   sample_count:state.pub.domains.wip.count,
   note:'เฉพาะประวัติ WO Finish Due สำหรับตรวจงานโอนเท่านั้น ไม่ใช่เอกสาร TS หรือวันโอนจริง',
   last_event:null,rows:[...byDate.entries()].map(([date,count])=>({date,date_kind:kind,count,source:'WIP WO Finish Due (NOT Transfer)'}))};
 }
 function renderHistoryDetails(r){
  const block=$('historyDrilldown');
  if(!r){block.textContent='ยังไม่มีหลักฐานย้อนหลังของ Node นี้ในไฟล์ที่เก็บไว้ ไม่ใช่หลักฐานว่า ERP ไม่มีธุรกรรม';return;}
  const source=historyData(),privateRows=isPrivate()&&source?source.rows||[]:[];
  const refs=privateRows.filter(x=>x.date===r.date&&x.date_kind===r.date_kind&&x.reference);
  const descriptor=r.date_kind==='WO Finish Due (NOT Transfer Date)'?'กำหนดเสร็จของ WO ไม่ใช่วันโอน':r.date_kind==='Source Capture Date (not transaction date)'?'วันที่ดึงข้อมูลตัวอย่าง (ไม่มีวันที่ธุรกรรมในแถว)':'วันที่ในฟิลด์ต้นทาง';
  let html='<b>'+escape(r.date)+' · '+escape(descriptor)+' · '+fmt(r.count)+' แถวจากแหล่งตัวอย่าง</b>';
  if(!refs.length){
   html+='<p>บน GitHub แสดงเพียงจำนวนแถวและวันที่ของหลักฐาน เนื่องจากเลขเอกสาร/สินค้า/บุคคลเก็บเฉพาะ Private NB เท่านั้น</p>';
  }else{
   html+='<div class="history-private-list">'+refs.slice(0,50).map(x=>
    '<div><b>'+escape(x.reference)+'</b> · '+escape(x.description||'Source Evidence')+
    ' <span>'+escape(x.date_kind||'')+'</span></div>').join('')+'</div>';
   if(refs.length>50)html+='<p>แสดง 50/'+fmt(refs.length)+' แถว</p>';
  }
  block.innerHTML=html;
 }
 function renderHistory(){
  const heading=document.querySelector('#historicalEvidenceSection h2');
  if(heading)heading.textContent=transferReferenceOnly()?'ข้อมูลกำหนดเสร็จ WO ที่เคยบันทึกไว้ (ไม่ใช่วันโอนจริง)':'วันนี้ไม่มีรายการ? เปิดข้อมูลย้อนหลังที่ตรวจพบได้';
  const h=publicHistory(),privateH=historyData(),pubRows=h?.rows||[];
  const hasRecords=Array.isArray(pubRows)&&pubRows.length>0;
  const dates=pubRows.filter(x=>x.date).map(x=>x.date);
  const years=[...new Set(dates.map(x=>x.slice(0,4)))].sort().reverse();
  if(!state.historyYear||!years.includes(state.historyYear))state.historyYear=years[0]||'';
  setOptions('historyYear',[['','ทุกปีที่มีหลักฐาน'],...years.map(y=>[y,y])],state.historyYear);
  $('historyLatest').disabled=!hasRecords;
  $('historyBadge').textContent=hasRecords?'ปีที่พบล่าสุด: '+(years[0]||'ไม่ทราบ')+' · บางแถวเป็นวัน Snapshot ไม่ใช่วันเกิดเหตุ':'ยังไม่มีประวัติที่ดึงเป็นรายการ';
  if(!h){
   $('historySummary').textContent=transferReferenceOnly()?'ยังไม่มีธุรกรรมโอนย้อนหลังจาก P4111/P554801C ใน Data Pool · ตาราง Pivot ด้านบนเป็น WIP Snapshot ไม่ใช่ Transfer Ledger':'ยังไม่มีไฟล์ข้อมูลย้อนหลังใน Data Pool';
   $('historySource').textContent='ไม่มีข้อมูลบนเว็บ ไม่ได้หมายความว่าไม่มีใน ERP';
   $('historyRows').innerHTML='<tr><td colspan="5" class="empty">ยังไม่ได้ดึงประวัติของ Node นี้</td></tr>';
   renderHistoryDetails(null);return;
  }
  $('historySource').textContent='แหล่ง '+(h.source||'JDE')+' · '+fmt(h.sample_count||0)+' แถวจากตัวอย่าง/Snapshot · '+(h.note||'')+
  ' · วันที่เก็บหลักฐาน '+(h.source_capture||'ตาม Source ของแต่ละรายการ')+' · ไม่ใช่ยอดค้างทั้งโรงงาน';
  const actual=h.last_event;
  $('historySummary').textContent=transferReferenceOnly()?'พบ WO Finish Due จาก WIP Snapshot '+fmt(h.sample_count||0)+' Cutting เพื่อช่วยตรวจสอบการโอน · ไม่มีวันที่โอนจริงจาก P4111/P554801C ในชุดนี้':hasRecords?
   'พบหลักฐานย้อนหลัง '+fmt(h.sample_count||0)+' แถว · '+(actual?'วันธุรกรรม/สถานะที่พบล่าสุด '+actual:'ไม่พบวันที่ธุรกรรมในแถว: แสดงวัน Snapshot เท่านั้น')+
    ' · เลือกปีอื่นได้โดยไม่ต้องมีรายการของวันนี้':
   'ยังไม่พบแถวประวัติในชุดข้อมูลที่เคยดึงสำหรับ Node นี้ — ต้องค้น JDE ย้อนหลังเพิ่ม ไม่ใช่ยอดศูนย์';
  const visible=pubRows.filter(x=>!state.historyYear||x.date?.slice(0,4)===state.historyYear)
   .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!visible.length){
   $('historyRows').innerHTML='<tr><td colspan="5" class="empty">ไม่มีแถวสำหรับปีที่เลือกใน Extract ที่ตรวจไว้ — ไม่ใช่ยืนยันว่า ERP ไม่มี</td></tr>';
   renderHistoryDetails(null);return;
  }
  $('historyRows').innerHTML=visible.map((r,i)=>'<tr>'+
   '<td>'+escape(r.date||'ไม่มีวัน')+'</td>'+
   '<td>'+escape(r.date_kind||'ไม่ทราบชนิดวันที่')+'</td>'+
   '<td>'+escape(r.source||h.source||'JDE Inquiry')+'</td>'+
   '<td><strong>'+fmt(r.count||0)+'</strong></td>'+
   '<td><button type="button" data-hist="'+i+'">ดูรายละเอียดหลักฐาน</button></td></tr>').join('');
  $('historyRows').querySelectorAll('button[data-hist]').forEach(b=>b.onclick=()=>{
   const r=visible[Number(b.dataset.hist)];
   state.historySelected={date:r.date,kind:r.date_kind};
   renderHistoryDetails(r);
  });
  const wanted=visible.find(x=>x.date===state.historySelected?.date&&x.date_kind===state.historySelected?.kind)||visible[0];
  renderHistoryDetails(wanted);
 }
 function renderAll(resetYears=false){renderNav();if(resetYears){setupYears();syncFacets();}renderSummary();renderMatrix();renderDetails();renderAudit();renderHistory();}
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
 $('historyYear').onchange=e=>{state.historyYear=e.target.value;state.historySelected=null;renderHistory()};
 $('historyLatest').onclick=()=>{state.historyYear='';state.historySelected=null;renderHistory()};
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
 $('reset').onclick=()=>{state.grain='day';state.year='2026';state.month='';state.query='';state.scope='open';state.rowMode='date_project';state.collapsed.clear();state.groupDefaultApplied=false;state.projectFilter='';state.customerFilter='';state.cell=null;state.page=1;state.historyYear='';state.historySelected=null;for(const id of ['search'])$(id).value='';$('grain').value='day';$('scope').value='open';renderAll(true)};
 $('prev').onclick=()=>{state.page=Math.max(1,state.page-1);renderDetails()};
 $('next').onclick=()=>{state.page++;renderDetails()};
 load();
 setInterval(()=>{if(document.visibilityState==='visible')load(true)},300000);
})();