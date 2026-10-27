"use strict";
const $=id=>document.getElementById(id);
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names={all:"ทุกสายงาน",cb:"Check Board",ics:"ICS",icf:"ICF",ice:"ICE / EDU",innovation:"นวัตกรรม",planner:"Planner / Todo"};
const months=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
let payload=null,all=[],filtered=[],nodeMap=new Map(),roots=[],columns=[],rawCols=[],visible=[],expanded=new Set();
let axis="owner",measure="work",source="all",status="open",dueState="all",search="",currentOnly=true,columnLimit=11,opened=false;
const dateSort=(a,b)=>(a.due_iso||"9999").localeCompare(b.due_iso||"9999")||a.work_key.localeCompare(b.work_key);
const missingDept=x=>!x||/ยังไม่|ไม่ระบุ|unknown/i.test(x);
function ownerGroupLabel(r){
 if(r.owner_role==="notes_team_only"&&r.owner_team)return r.owner_team+" (ฝ่ายเจ้าภาพ)";
 return r.owner_person||"ยังไม่ระบุเจ้าภาพรายบุคคล";
}
function groupName(r){
 if(axis==="source")return names[r.source]||r.source;
 if(axis==="owner")return ownerGroupLabel(r);
 if(axis==="stage")return r.stage||"ไม่ระบุ Stage";
 return r.department||"ยังไม่ยืนยันฝ่าย";
}
function unitCount(rows){
 if(measure==="stage")return rows.length;
 return new Set(rows.map(r=>r.work_key)).size;
}
function pillStatus(r){return r.deadline_state==="ผ่านกำหนดตามตาราง"?"late":r.deadline_state==="ครบกำหนดวันนี้"?"today":r.deadline_state==="ยังไม่ถึงกำหนด"?"ok":"unknown";}
function isDueRisk(r){return r.deadline_state==="ผ่านกำหนดตามตาราง";}
function buildFilters(){
 const sources=["all","cb","planner","innovation","ics","icf","ice"];
 $("source").innerHTML=sources.map(x=>'<option value="'+x+'">'+escapeHtml(names[x])+'</option>').join("");
 $("source").value=source;
 $("axis").value=axis;$("unit").value=measure;$("stageOnly").checked=currentOnly;
}
function makeStats(){
 const live=filtered.filter(r=>!r.closed),over=live.filter(isDueRisk).length;
 const missing=live.filter(r=>!r.due_iso).length;
 const missingOwner=live.filter(r=>["missing","team_only","not_audited"].includes(r.owner_kind)).length;
 const units=[
  {title:"งาน/โครงการในผลลัพธ์",value:new Set(filtered.map(r=>r.work_key)).size,extra:"นับไม่ซ้ำภายในทะเบียน"},
  {title:"Stage ที่แสดง",value:filtered.length,extra:"แถวตามเงื่อนไข"},
  {title:"ผ่านวันกำหนดในตาราง",value:over,extra:"ไม่ใช่การรับรองผิด SLA",class:"urgent"},
  {title:"ครบกำหนดวันนี้",value:live.filter(r=>r.deadline_state==="ครบกำหนดวันนี้").length,extra:"ตามวันที่ในแหล่งข้อมูล",class:"caution"},
  {title:"ยังไม่มี Stage Due ที่ยืนยัน",value:missing,extra:"ต้องจัดทำกำหนดส่ง",class:"caution"},
  {title:"ยังไม่ระบุเจ้าภาพรายบุคคล",value:missingOwner,extra:"ต้องมอบหมายคนรับผิดชอบ",class:"caution"}];
 $("kpis").innerHTML=units.map((o,i)=>'<button type="button" class="metric kpi-clickable '+(o.class||"")+'" data-kpi="'+i+'" aria-label="เปิดรายละเอียด '+escapeHtml(o.title)+' จำนวน '+o.value+'"><span class="label">'+escapeHtml(o.title)+'</span><strong>'+o.value.toLocaleString("th-TH")+'</strong><small>'+escapeHtml(o.extra)+'</small><span class="kpi-action">ดูรายการที่นับ ↗</span></button>').join("");

 $("asof").textContent="ข้อมูลภายใน ณ "+new Date(payload.updated).toLocaleString("th-TH")+", "+filtered.length.toLocaleString("th-TH")+" Stage (ไม่ใช่จำนวนคำสั่ง MD ที่ไม่ซ้ำกัน)";
}
function refreshOwnerSelect(){
 const box=$("ownerFilter");
 if(!box)return;
 const old=box.value;
 const opts=[...new Set(all.filter(r=>(source==="all"||r.source===source)&&!r.closed).map(ownerGroupLabel).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"th"));
 box.innerHTML='<option value="">'+ "ทุกคน และยังไม่ระบุเจ้าภาพ" +'</option>'+opts.map(name=>'<option value="'+escapeHtml(name)+'">'+escapeHtml(name)+'</option>').join("");
 if(opts.includes(old))box.value=old;
}
function getRowsByFilters(){
 const q=search.toLocaleLowerCase(); const ownerSelected=$("ownerFilter")?.value||"";
 filtered=all.filter(r=>
  !r.reference_only&&
  (source==="all"||r.source===source)&&
  (!ownerSelected||ownerGroupLabel(r)===ownerSelected)&&
  (status==="all"||(status==="open"?!r.closed:r.closed))&&
  (!currentOnly||r.is_current_stage)&&
  (dueState==="all"||(dueState==="overdue"?r.deadline_state==="ผ่านกำหนดตามตาราง":dueState==="today"?r.deadline_state==="ครบกำหนดวันนี้":dueState==="future"?r.deadline_state==="ยังไม่ถึงกำหนด":!r.due_iso))&&
  (!q||[r.project,r.stage,r.owner_person,r.owner_raw,r.department,r.source,r.work_key,r.row_id,r.note].join(" ").toLocaleLowerCase().includes(q))
 ).sort(dateSort);
 if(source==="all")$("nameOfGroup").textContent="ทุกสายงาน MD";else $("nameOfGroup").textContent=names[source]||source;
}
function colDefs(){
 const hist=new Map();
 for(const r of filtered){const name=groupName(r),arr=hist.get(name)||[];arr.push(r);hist.set(name,arr);}
 let keys=[...hist.entries()].sort((a,b)=>{
   const aUnknown=(a[0]||"").includes("\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38");
   const bUnknown=(b[0]||"").includes("\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38");
   return bUnknown-aUnknown||unitCount(b[1])-unitCount(a[1])||a[0].localeCompare(b[0],"th");
  }).map(([k])=>k);
 if(keys.length>columnLimit && !(axis==="owner" && columnLimit>=60)){
  const unknown=keys.find(missingDept);
  let keep=keys.slice(0,columnLimit-1);
  if(unknown&&!keep.includes(unknown)){keep[keep.length-1]=unknown;}
  rawCols=keep;
  columns=[...keep,"อื่น ๆ ("+(keys.length-keep.length)+" กลุ่ม)"];
 }else{rawCols=keys;columns=keys;}
 $("columnNote").textContent="แสดง "+columns.length+" คอลัมน์จาก "+keys.length+" กลุ่ม · ตัวเลขในแต่ละช่อง = "+(measure==="work"?"Distinct Work ภายในแหล่ง":"จำนวน Stage");
}
function colOf(r){const name=groupName(r);return rawCols.includes(name)?name:(columns.includes(name)?name:columns[columns.length-1]);}
function createNode(key,title,depth,parent=null,order=0){const node={key,title,depth,parent,order,children:[],childIndex:new Map(),items:[],type:"group"};nodeMap.set(key,node);return node;}
function addChild(parent,key,title,depth,order,type="group"){
 let n=parent.childIndex.get(key);
 if(!n){n=createNode(key,title,depth,parent,order);n.type=type;parent.children.push(n);parent.childIndex.set(key,n);}
 return n;
}
function buildTree(){
 nodeMap=new Map();roots=[];
 const root=createNode("root","ALL",0,null,0);
 function obtain(id,label,order,type="group"){
  let n=root.childIndex.get(id);
  if(!n){n=addChild(root,id,label,0,order,type);roots.push(n);}
  return n;
 }
 for(const r of filtered){
  const date=r.due_iso;
  let path;
  if(date){
    const [y,m,d]=date.split("-"),bud=Number(y)+543;
    const yr=obtain("y:"+y,"ปี "+bud,Number(y),"year");
    const mo=addChild(yr,"m:"+y+"-"+m,months[Number(m)-1],1,Number(m),"month");
    const day=addChild(mo,"d:"+date,Number(d)+" "+months[Number(m)-1]+" "+bud,2,Number(d),"day");
    path=[yr,mo,day];
    const leaf=addChild(day,"w:"+date+":"+r.work_key,r.project||r.work_key,3,0,"work");
    path.push(leaf);
  }else{
    const unknown=obtain("unknown","ยังไม่ระบุวันกำหนดส่งราย Stage",9999,"unknown");
    const src=addChild(unknown,"unknown:"+r.source,names[r.source]||r.source,1,0,"source");
    const leaf=addChild(src,"unkwork:"+r.work_key,r.project||r.work_key,2,0,"work");
    path=[unknown,src,leaf];
  }
  for(const n of path)n.items.push(r);
 }
 const order=(n)=>n.children.sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,"th")).forEach(order);
 roots.sort((a,b)=>a.order-b.order);for(const n of roots)order(n);
 nodeMap.set("grand", {key:"grand",title:"Grand Total",depth:0,items:filtered,type:"grand"});
 if(!opened){
  expanded=new Set(roots.filter(r=>r.key!=="unknown").map(x=>x.key));
  for(const n of roots)if(n.type==="year")for(const c of n.children)if(c.key.endsWith("-10")&&c.order===10)expanded.add(c.key);
  opened=true;
 }
}
function allVisible(){
 visible=[];
 const walk=n=>{
  visible.push(n);
  if(expanded.has(n.key))for(const c of n.children)walk(c);
 };
 for(const n of roots)walk(n);
}
function cellUnits(items,k){
 const arr=k==="__all__"?items:items.filter(r=>colOf(r)===k);
 return unitCount(arr);
}
function cellHtml(items,k,node,idx){
 const subset=k==="__all__"?items:items.filter(r=>colOf(r)===k);
 const count=unitCount(subset);
 const classes=["number",k==="__all__"?"total":""];
 const hasLate=subset.some(x=>isDueRisk(x)&&!x.closed);
 const hasToday=subset.some(x=>x.deadline_state==="ครบกำหนดวันนี้"&&!x.closed);
 if(hasLate&&node.type!=="grand")classes.push("cellLate");else if(hasToday&&node.type!=="grand")classes.push("cellToday");
 const label=count?'<button type="button" class="cellbtn" data-node="'+escapeHtml(node.key)+'" data-col="'+escapeHtml(k)+'" title="คลิกดูรายการและ Stage ที่อยู่ในช่องนี้">'+count.toLocaleString("th-TH")+'</button>':"—";
 return '<td class="'+classes.join(" ")+'">'+label+'</td>';
}
function render(){
 makeStats();colDefs();buildTree();renderTree();$("drill").hidden=true;
 if(activeKpi!==null)renderKpiInspector();
}
function renderTree(){
 allVisible();
 const table=$("pivot");
 const header1='<tr><th class="dateHead" rowspan="2">ปี / เดือน / กำหนดส่ง / งาน</th><th colspan="'+Math.max(columns.length,1)+'" id="matrixAxisName">เจ้าภาพงาน (บุคคล / ฝ่าย)</th><th rowspan="2" class="totalHead">Grand Total</th></tr>';
 const header2='<tr>'+ (columns.length?columns.map(c=>'<th title="'+escapeHtml(c)+'">'+escapeHtml(c)+'</th>').join(""):'<th>ไม่พบข้อมูล</th>') +'</tr>';
 $("thead").innerHTML=header1+header2;
 const markup=visible.map((n,idx)=>{
  const exp=n.children.length>0,active=expanded.has(n.key);
  const depth=n.depth,code=exp?'<button class="exp" data-toggle="'+escapeHtml(n.key)+'" aria-label="'+(active?"ยุบ":"ขยาย")+' '+escapeHtml(n.title)+'">'+(active?"−":"+")+'</button>':'<span class="leafdot">•</span>';
  const tag=n.type==="work"?'<span class="rowtag">'+escapeHtml(names[n.items[0]?.source]||"")+'</span>':"";
  // Preserve the complete work title in the DOM. The text wraps inside the
  // sticky work column; keyboard/mouse can open the existing source drilldown.
  const text=n.type==="work"
    ?'<button type="button" class="rowlabel work-title-button" title="'+escapeHtml(n.title)+'" aria-label="ดูรายละเอียด: '+escapeHtml(n.title)+'">'+escapeHtml(n.title)+'</button>'
    :'<span class="rowlabel" title="'+escapeHtml(n.title)+'">'+escapeHtml(n.title)+'</span>';
  return '<tr class="'+escapeHtml(n.type)+'" data-node-row="'+escapeHtml(n.key)+'"><td class="left" style="--row-indent:'+(depth*20)+'px"><span class="indent" style="--depth:'+(depth*20)+'px"></span>'+code+text+tag+'</td>'+
    (columns.length?columns.map(c=>cellHtml(n.items,c,n,idx)).join(""):'<td>—</td>')+cellHtml(n.items,"__all__",n,idx)+'</tr>';
 });
 if(!markup.length)markup.push('<tr class="nodata"><td colspan="'+(columns.length+2)+'">ไม่พบรายการตามเงื่อนไขที่เลือก</td></tr>');
 const grand=nodeMap.get("grand");
 markup.push('<tr class="grand"><td class="left"><span class="rowlabel">Grand Total — '+escapeHtml(measure==="work"?"งานไม่ซ้ำภายในทะเบียน":"Stage rows")+'</span></td>'+
  (columns.length?columns.map(c=>cellHtml(filtered,c,grand,0)).join(""):'<td>—</td>')+cellHtml(filtered,"__all__",grand,0)+'</tr>');
 $("tbody").innerHTML=markup.join("");
 $("rowCount").textContent=visible.length.toLocaleString("th-TH")+" แถวแสดง · "+filtered.length.toLocaleString("th-TH")+" Stage ที่นำมาคำนวณ";
 $("columnNote").textContent="คอลัมน์ "+columns.length+" จาก "+new Set(filtered.map(groupName)).size+" กลุ่ม · นับ "+(measure==="work"?"Distinct Work ภายในแต่ละทะเบียน":"Stage Rows")+" · ยอดอาจซ้ำข้ามระบบ";
}
function assigneeLabel(r){
 if(r.owner_role==="notes_explicit_person")
  return "เจ้าภาพจาก Planner Notes" + (r.owner_assignee_person?" · ผู้รับ Assignment: "+r.owner_assignee_person:" · ไม่มี Assignment");
 if(r.owner_role==="notes_team_only")return "ระบุเจ้าภาพฝ่ายใน Planner Notes · ยังไม่ระบุชื่อบุคคล";
 if(r.owner_role==="notes_not_checked")return "ยังไม่ได้ตรวจ Planner Notes · ไม่ใช่หลักฐานว่าไม่มีเจ้าภาพ";
 if(r.owner_role==="notes_checked_no_owner")return "ตรวจ Notes แล้วไม่พบเจ้าภาพ และไม่มี Assignment";
 if(r.owner_role==="assignment_only")return "ผู้รับ Assignment เท่านั้น · ยังไม่รับรองว่าเป็นเจ้าภาพหลัก";
 if(r.owner_kind==="missing")return "ไม่ระบุเจ้าภาพรายบุคคล · ต้นทาง: "+(r.owner_raw||"ไม่ระบุ");
 if(r.owner_kind==="joint")return "ผู้รับผิดชอบร่วมตามทะเบียน · ยังไม่ระบุ Lead";
 return "เจ้าภาพจากคอลัมน์ผู้รับผิดชอบต้นทาง";
}
function individual(r){
 if(r.owner_role==="notes_team_only"&&r.owner_team)return r.owner_team+" (เจ้าภาพระดับฝ่าย)";
 return r.owner_person||"ยังไม่ยืนยันเจ้าภาพรายบุคคล";
}
function showDrill(key,col){
 const node=nodeMap.get(key);if(!node)return;
 const rows=col==="__all__"?node.items:node.items.filter(r=>colOf(r)===col);
 const dedup=measure==="work"?Array.from(new Map(rows.map(x=>[x.work_key,x])).values()):rows;
 const holder=$("drill");holder.hidden=false;
 $("drillTitle").textContent=(node.title||"")+" / "+(col==="__all__"?"ทุกฝ่าย":col);
 $("drillMeta").textContent=unitCount(rows).toLocaleString("th-TH")+" "+(measure==="work"?"งาน":"ขั้นตอน")+" · คลิกชื่อเพื่อดู Stage ทั้งสาย";
 const direct=$("sourceOpenOne");
 direct.hidden=dedup.length!==1||!originalSourceAllowed(dedup[0]);
 direct.dataset.workKey=!direct.hidden?dedup[0].work_key:"";
 $("sourceOpenFeedback").textContent="";
 $("detailBody").innerHTML='<table><thead><tr><th>กำหนดส่ง</th><th>งาน / โครงการ</th><th>Stage ที่ค้าง</th><th>เจ้าภาพ</th><th>ฝ่าย</th><th>สถานะ</th><th>ต้นฉบับ</th></tr></thead><tbody>'+
  dedup.slice(0,300).map((r,i)=>'<tr data-idx="'+i+'"><td>'+escapeHtml(r.due||"—")+'</td><td><strong>'+escapeHtml(r.project)+'</strong><div class="sub">'+escapeHtml(names[r.source]||r.source)+'</div></td><td>'+escapeHtml(r.stage)+'</td><td>'+escapeHtml(individual(r))+'<small>'+escapeHtml(assigneeLabel(r))+'</small></td><td>'+escapeHtml(r.department)+'</td><td>'+escapeHtml(r.deadline_state)+'</td><td>'+(originalSourceAllowed(r)?'<button type="button" class="original-source-button" data-original-row="'+i+'">เปิดต้นฉบับ ↗</button>':'—')+'</td></tr>').join("")+'</tbody></table>';
 window.currentDrillRows=dedup;
 $("stageTrace").innerHTML="";
 holder.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function renderTimeline(r){
 const sequence=all.filter(x=>x.work_key===r.work_key).sort((a,b)=>a.stage_index-b.stage_index);
 $("stageTrace").innerHTML=sequence.map(x=>'<div class="node '+(x.stage_index===r.stage_index?"current":"")+'"><div class="eyebrow">STAGE '+x.stage_index+'/'+x.stage_total+'</div><h4>'+escapeHtml(x.stage)+'</h4><p>เจ้าภาพ: '+escapeHtml(individual(x))+' — '+escapeHtml(assigneeLabel(x))+'</p><p>ฝ่าย: '+escapeHtml(x.department)+'</p><p>กำหนด: '+escapeHtml(x.due||"ไม่ระบุ")+'</p><p>สถานะ: '+escapeHtml(x.status)+'</p><p>'+escapeHtml(x.deadline_state)+'</p></div>').join("");
 $("stageTrace").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function renderSourceCounts(){
 const s=["all","cb","planner","innovation","ics","icf","ice"];
 $("source").innerHTML=s.map(k=>'<option value="'+k+'">'+escapeHtml(names[k])+'</option>').join("");$("source").value=source;
}
function refresh(){
 source=$("source").value;axis=$("axis").value;measure=$("unit").value;status=$("status").value;dueState=$("dueFilter").value;currentOnly=$("stageOnly").checked;columnLimit=Number($("maxCols").value)||11;search=$("query").value.trim();
 refreshOwnerSelect();getRowsByFilters();opened=false;render();
}
function setExpand(mode){
 if(mode==="all")expanded=new Set([...nodeMap.values()].filter(n=>n.children?.length).map(n=>n.key));
 if(mode==="none")expanded=new Set();
 if(mode==="month"){expanded=new Set();for(const n of roots){expanded.add(n.key);for(const c of n.children)expanded.add(c.key)}}
 renderTree();
}
function exportCsv(){
 const header=["Source","Work Key","Project","Stage","Stage index","Due","Status","Person in charge","Source owner / team","Department","Due status"];
 const quote=x=>'"'+String(x??"").replace(/"/g,'""')+'"';
 const csv="\uFEFF"+[header,...filtered.map(r=>[r.source,r.work_key,r.project,r.stage,r.stage_index,r.due,r.status,r.owner_person,r.owner_raw,r.department,r.deadline_state])].map(row=>row.map(quote).join(",")).join("\r\n");
 const b=new Blob([csv],{type:"text/csv;charset=utf-8"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="md-stage-pivot-local-"+payload.as_of+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
$("tbody").addEventListener("click",e=>{
 const toggle=e.target.closest("[data-toggle]");
 if(toggle){const k=toggle.dataset.toggle;if(expanded.has(k))expanded.delete(k);else expanded.add(k);renderTree();return;}
 const cell=e.target.closest("[data-col]");
 if(cell){showDrill(cell.dataset.node,cell.dataset.col);return;}
 const tr=e.target.closest("[data-node-row]");
 if(tr){const n=nodeMap.get(tr.dataset.nodeRow);if(n?.type==="work")showDrill(n.key,"__all__");}
});
const OPENABLE_SOURCES=new Set(["cb","ics","icf","ice","innovation","planner"]);
function originalSourceAllowed(r){return !!r&&OPENABLE_SOURCES.has(r.source)&&typeof r.work_key==="string"&&r.work_key.startsWith(r.source+"::")}
const ORIGINAL_ENDPOINT="http://127.0.0.1:8766";
let originalOpening=false;
function originalMessage(message){const el=$("sourceOpenFeedback");if(el)el.textContent=message}
async function openOriginalSource(workKey){
 if(originalOpening)return;
 originalOpening=true;
 for(const b of document.querySelectorAll(".original-source-button"))b.disabled=true;
 originalMessage("กำลังสั่งให้ NB เปิดไฟล์ต้นฉบับแบบอ่านอย่างเดียว…");
 try{
  const response=await fetch(ORIGINAL_ENDPOINT+"/open-original-source",{
    method:"POST",mode:"cors",credentials:"omit",cache:"no-store",
    headers:{"Content-Type":"application/json","X-MD-Manual":"user-click"},
    body:JSON.stringify({work_key:workKey}),signal:AbortSignal.timeout(10000)
  });
  const started=await response.json();
  if(response.status!==202){originalMessage("เปิดไม่ได้: "+(started.code||"HTTP "+response.status));return}
  for(let i=0;i<70;i++){
   await new Promise(resolve=>setTimeout(resolve,1100));
   let x;
   try{
    const state=await fetch(ORIGINAL_ENDPOINT+"/original-source-status",
      {mode:"cors",credentials:"omit",cache:"no-store",signal:AbortSignal.timeout(5000)});
    if(!state.ok)continue;
    x=await state.json();
   }catch{continue}
   if(x.work_key!==workKey||x.state==="opening")continue;
   if(x.state==="opened"){
    originalMessage(x.kind==="excel_read_only"
      ?("เปิด Excel ต้นฉบับแบบ Read-only บน NB แล้ว"+(x.sheet_confirmed?" · เปิด Sheet ที่ตรงกับงานแล้ว":" · เปิดไฟล์ต้นทาง"))
      :("เปิดต้นฉบับผ่าน Browser บน NB แล้ว · "+(x.label||"ตรวจที่แท็บใหม่")));
   }else{
    const reasons={SOURCE_OFFLINE_OR_NOT_MOUNTED:"NB ยังเชื่อม W:/S: ไม่ได้",SOURCE_SHEET_NOT_FOUND:"พบไฟล์แล้ว แต่ไม่พบ Sheet ที่เชื่อมกับงาน",SOURCE_RECORD_NOT_FOUND:"ไม่พบรายการในทะเบียนต้นฉบับ",SOURCE_LAUNCH_TIMEOUT:"Excel เปิดไม่ทันเวลาที่กำหนด"};
    originalMessage("เปิดต้นฉบับไม่สำเร็จ: "+(reasons[x.code]||x.code||"ตรวจสอบสิทธิ์บน NB"));
   }
   return;
  }
  originalMessage("NB ยังไม่ยืนยันว่าเปิดต้นฉบับได้ กรุณาดู Excel หรือแท็บที่เครื่อง NB");
 }catch{
  originalMessage("ติดต่อ NB ไม่ได้: ปุ่มนี้เปิดไฟล์ภายในบริษัทจากเครื่อง NB ที่มีสิทธิ์ W:/S: เท่านั้น · ไม่ได้ลบหรืออัปเดตข้อมูล");
 }finally{
  originalOpening=false;
  for(const b of document.querySelectorAll(".original-source-button"))b.disabled=false;
 }
}
$("sourceOpenOne").addEventListener("click",()=>{const key=$("sourceOpenOne").dataset.workKey;if(key)openOriginalSource(key)});
$("detailBody").addEventListener("click",e=>{
 const open=e.target.closest("[data-original-row]");
 if(open){e.preventDefault();e.stopPropagation();const item=window.currentDrillRows?.[Number(open.dataset.originalRow)];if(originalSourceAllowed(item))openOriginalSource(item.work_key);return}
 const row=e.target.closest("[data-idx]");if(row)renderTimeline(window.currentDrillRows[Number(row.dataset.idx)]);
});
$("closeDrill").addEventListener("click",()=>$("drill").hidden=true);
["source","axis","unit","status","dueFilter","stageOnly","maxCols","ownerFilter"].forEach(x=>$(x).addEventListener("change",refresh));
$("query").addEventListener("input",()=>{clearTimeout(window.qdeb);window.qdeb=setTimeout(refresh,150)});
$("expandAll").onclick=()=>setExpand("all");$("expandMonth").onclick=()=>setExpand("month");$("collapseAll").onclick=()=>setExpand("none");$("downloadCsv").onclick=exportCsv;

const sourceHealthEndpoint="./source-health.json";
let sourceMetadata={}, selectedSource=null, sourceDetailRows=[], sourceDetailPage=0;
const SOURCE_PAGE_SIZE=60;
const sourceTitles={cb:"Check Board",ics:"ICS",icf:"ICF",ice:"ICE / EDU",innovation:"นวัตกรรม",planner:"Planner / Todo"};
// Public Source Health is change-only metadata, not live source verification.
function publicSourceAge(key,src){
 const date=src.checked_at||src.last_verified||src.last_checked||null;
 const t=date?Date.parse(date):NaN;
 if(!Number.isFinite(t))return {state:"unknown",label:"ไม่ทราบเวลาตรวจล่าสุด",date:""};
 const hours=Math.max(0,(Date.now()-t)/3600000);
 const dateLabel=new Intl.DateTimeFormat("th-TH",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(t));
 const isCloud=key==="planner"||key==="innovation";
 if(src.status!=="ok")return {state:"stale",label:"แหล่งข้อมูลมีปัญหา",date:dateLabel};
 if(isCloud&&hours>(key==="planner"?12:48))return {state:"stale",label:"ข้อมูล Cloud เก่า · ต้องตรวจต้นทาง",date:dateLabel};
 if(isCloud)return {state:"recent",label:"Cloud Snapshot · ยังอยู่ในรอบตรวจ",date:dateLabel};
 // For W, PUBLIC checked_at only changes on meaningful content changes.
 return {state:"unchanged",label:"สรุปที่เผยแพร่ล่าสุด · NB ตรวจตามรอบ",date:dateLabel};
}
function renderPublicSnapshot(snap){
 sourceMetadata=snap.sources||{};
 const holder=$("cloudSources");
 holder.innerHTML=Object.entries(sourceMetadata).map(([key,src])=>{
  const state=publicSourceAge(key,src);
  return '<button type="button" class="source-stat source-stat-action'+(selectedSource===key?" active":"")+
   (state.state==="stale"?" source-stat-stale":"")+'" data-source-card="'+escapeHtml(key)+
   '" aria-pressed="'+(selectedSource===key)+'" title="เปิดรายการ '+escapeHtml(sourceTitles[key]||key)+'">'+
   '<b>'+escapeHtml(sourceTitles[key]||key)+'</b><strong>'+
   escapeHtml(Number.isFinite(src.total)?src.total.toLocaleString("th-TH"):"—")+'</strong>'+
   '<small>'+escapeHtml(state.label)+'</small>'+
   '<small class="source-timestamp">'+escapeHtml(state.date||"ยังไม่มี Timestamp")+'</small>'+
   '<span class="source-card-more">ดูรายละเอียด ↗</span></button>';
 }).join("");
 if(selectedSource)renderSourceDetail();
}

function sourceStageSort(a,b){
 const late=x=>x.deadline_state==="ผ่านกำหนดตามตาราง"&&!x.closed?0:x.deadline_state==="ครบกำหนดวันนี้"&&!x.closed?1:x.due_iso?2:3;
 return late(a)-late(b)||
  (a.due_iso||"9999-12-31").localeCompare(b.due_iso||"9999-12-31")||
  (a.project||"").localeCompare(b.project||"","th")||
  (a.stage_index||0)-(b.stage_index||0);
}
function renderSourceDetail(){
 if(!selectedSource)return;
 const pane=$("sourceDetail");
 pane.hidden=false;
 const rows=all.filter(r=>r.source===selectedSource);
 const health=sourceMetadata[selectedSource]||{};
 const name=sourceTitles[selectedSource]||selectedSource;
 $("sourceDetailTitle").textContent=name+" — รายการและ Stage ทั้งหมด";
 const checked=health.checked_at||health.last_verified||health.last_checked||null;
 const checkedText=checked?new Date(checked).toLocaleString("th-TH"):"ไม่มีเวลาตรวจรับล่าสุด";
 const sourceAge=publicSourceAge(selectedSource,health);
 $("sourceDetailMeta").textContent="ต้นทาง "+name+" · "+(health.total??"—")+" หน่วยนับตาม Source Health · ตรวจครั้งล่าสุด "+checkedText;
 const operational=rows.filter(x=>!x.reference_only);
 const pending=operational.filter(x=>!x.closed);
 const metrics=[
 ["Stage งานจริง (ไม่รวมแม่แบบ)",operational.length],
 ["ขั้นตอนแม่แบบอ้างอิง",rows.length-operational.length],
 ["จำนวนงานไม่ซ้ำภายในทะเบียน",new Set(operational.map(x=>x.work_key)).size],
 ["Stage ยังเปิด",pending.length],
 ["Stage ผ่านวันกำหนดในตาราง",pending.filter(x=>x.deadline_state==="ผ่านกำหนดตามตาราง").length],
 ["Stage ยังไม่มีชื่อเจ้าภาพ",pending.filter(x=>["missing","team_only","not_audited"].includes(x.owner_kind)).length]
 ];
 $("sourceDetailStats").innerHTML=metrics.map(([n,v])=>'<div class="source-stat-metric"><small>'+escapeHtml(n)+'</small><strong>'+Number(v).toLocaleString("th-TH")+'</strong></div>').join("");
 let caution=selectedSource==="cb"?"CB: ขั้นตอนจากแม่แบบเป็นเพียงงานที่ต้องตรวจ ไม่ใช่งานค้างที่ยืนยันแล้ว; วันที่โอนตามแผนไม่ใช่หลักฐานการโอนจริง":"";
 if(["ics","icf","ice"].includes(selectedSource))caution="ICS/ICF/ICE: วันที่ทำงานไม่ใช่ Stage Due ที่รับรองแล้ว จึงไม่ตัดสินว่าเลยกำหนดจากคอลัมน์นั้น";
 if(["innovation","planner"].includes(selectedSource))caution="Cloud: ใช้ Snapshot ล่าสุดที่ได้รับ ไม่ได้ตรวจไฟล์ Cloud ใหม่จากปุ่ม Scan W:";
 $("sourceDetailNote").textContent=(payload?"มีข้อมูลรายรายการจาก Private Viewer บนเครื่องนี้":"ยังไม่เชื่อมข้อมูลรายรายการ: เปิดผ่าน NB หรือเลือกไฟล์ Pivot ที่ได้รับอนุญาต")+
  " · "+sourceAge.label+" · "+caution;
 if(selectedSource==="planner"&&payload){
    const a=payload.summary?.planner_ownership_audit||{};
    $("sourceDetailNote").textContent+=" · ตรวจ Notes "+(a.notes_inspected||0)+"/38 งาน · พบเจ้าภาพใน Notes "+(a.notes_with_owner_label||0)+" งาน";
  }
 const query=$("sourceDetailSearch").value.trim().toLocaleLowerCase(),kind=$("sourceDetailStatus").value;
 sourceDetailRows=rows.filter(r=>
  (!query||[r.project,r.stage,r.owner_person,r.owner_raw,r.row_id,r.work_key].join(" ").toLocaleLowerCase().includes(query))&&
  (kind==="all"||kind==="open"&&!r.closed||kind==="closed"&&r.closed||
   kind==="late"&&!r.closed&&r.deadline_state==="ผ่านกำหนดตามตาราง"||
   ["missing","team_only","not_audited"].includes(r.owner_kind)&&!r.closed&&r.owner_kind==="missing")
 ).sort(sourceStageSort);
 renderSourceRowsPage();
 for(const card of $("cloudSources").querySelectorAll("[data-source-card]")){
  const pressed=card.dataset.sourceCard===selectedSource;
  card.classList.toggle("active",pressed);
  card.setAttribute("aria-pressed",String(pressed));
 }
}
function renderSourceRowsPage(){
 const start=sourceDetailPage*SOURCE_PAGE_SIZE;
 if(start>=sourceDetailRows.length&&start>0){sourceDetailPage=0;return renderSourceRowsPage();}
 const rows=sourceDetailRows.slice(start,start+SOURCE_PAGE_SIZE);
 $("sourceDetailRows").innerHTML=rows.length?rows.map((r,i)=>
  '<tr data-source-row="'+(start+i)+'" tabindex="0" title="คลิกดู Stage ทั้งสาย">'+
  '<td>'+escapeHtml(r.due||r.due_iso||"—")+'</td>'+
  '<td><strong>'+escapeHtml(r.project||r.work_key)+'</strong><small>'+escapeHtml(r.row_id||"")+'</small></td>'+
  '<td>'+escapeHtml(r.stage||"ยังไม่ระบุ")+'<small>Stage '+escapeHtml(r.stage_index||1)+'/'+escapeHtml(r.stage_total||1)+'</small></td>'+
  '<td><strong>'+escapeHtml(r.owner_person||"ยังไม่ระบุเจ้าภาพรายบุคคล")+'</strong>'+
    '<small>'+escapeHtml(assigneeLabel(r))+'</small></td>'+
  '<td>'+escapeHtml(r.status||"ไม่ระบุ")+'</td>'+
  '<td class="'+(r.deadline_state==="ผ่านกำหนดตามตาราง"?"source-overdue":"")+'">'+escapeHtml(r.deadline_state||"ยังไม่ตรวจรับ")+'</td></tr>'
 ).join(""):'<tr><td colspan="6" class="empty">ไม่มีรายการภายใต้เงื่อนไขนี้'+(!payload?" · ต้องเชื่อมข้อมูล Private Viewer ก่อน":"")+'</td></tr>';
 $("sourceDetailPageInfo").textContent="แสดง "+(sourceDetailRows.length?(start+1):0)+"–"+Math.min(start+SOURCE_PAGE_SIZE,sourceDetailRows.length)+" / "+sourceDetailRows.length.toLocaleString("th-TH")+" Stage";
 $("sourceDetailPrev").disabled=sourceDetailPage===0;
 $("sourceDetailNext").disabled=start+SOURCE_PAGE_SIZE>=sourceDetailRows.length;
}
const KPI_NAMES=[
 "งาน/โครงการในผลลัพธ์","Stage ที่แสดง","ผ่านวันกำหนดในตาราง",
 "ครบกำหนดวันนี้","ยังไม่มี Stage Due ที่ยืนยัน","ยังไม่ระบุเจ้าภาพรายบุคคล"];
let activeKpi=null, kpiRows=[], kpiPage=0, kpiMatches=[];
const KPI_PAGE_SIZE=60;
function rowsForKpi(k){
 const open=filtered.filter(r=>!r.closed);
 switch(k){
  case 0: return [...new Map(filtered.map(r=>[r.work_key,r])).values()];
  case 1: return [...filtered];
  case 2: return open.filter(isDueRisk);
  case 3: return open.filter(r=>r.deadline_state==="ครบกำหนดวันนี้");
  case 4: return open.filter(r=>!r.due_iso);
  case 5: return open.filter(r=>["missing","team_only","not_audited"].includes(r.owner_kind));
  default: return [];
 }
}
function kpiDeadlineComparator(a,b){
 return (a.due_iso||"9999-12-31").localeCompare(b.due_iso||"9999-12-31")||
  (a.project||"").localeCompare(b.project||"","th")||
  (a.stage_index||0)-(b.stage_index||0);
}
function renderKpiInspector(){
 if(activeKpi===null)return;
 kpiRows=rowsForKpi(activeKpi);
 const inspector=$("kpiInspector");
 inspector.hidden=false;
 $("kpiInspectorTitle").textContent=KPI_NAMES[activeKpi]+" — "+kpiRows.length.toLocaleString("th-TH")+" รายการ";
 const countInCard=$("kpis").querySelector('[data-kpi="'+activeKpi+'"] strong')?.textContent?.replace(/,/g,"");
 $("kpiInspectorContext").textContent="แสดงงานที่ถูกนับตามตัวกรอง Pivot ปัจจุบัน · จำนวนรายการ "+kpiRows.length.toLocaleString("th-TH")+
  (countInCard&&Number(countInCard)!==kpiRows.length?" · โปรดตรวจหน่วยนับของ KPI":" · ตรงกับตัวเลขบนการ์ด");
 const messages=[
  "นับงานไม่ซ้ำภายในทะเบียนตาม work_key; อาจเป็นงานเดียวกันในหลายระบบ",
  "นับ Stage ทุกแถวตามตัวกรองปัจจุบัน รวมทั้งการแสดง Stage ปัจจุบันที่ระบบเลือก",
  "วันในตารางผ่านแล้ว แต่ไม่ได้แปลว่ายืนยันผิด SLA หรือส่งงานช้าจริง",
  "ใช้สถานะวันกำหนดส่งจากแหล่งข้อมูลที่เก็บไว้ ไม่ใช่เวลาปัจจุบันของ Browser",
  "ไม่มี Stage Due ที่รับรอง; ICS/ICF/ICE ไม่ได้ใช้วันทำกิจกรรมมาเดา Stage Due",
  "ไม่มีชื่อบุคคลที่ยืนยันได้จากช่องเจ้าภาพ/หลักฐานที่ตรวจแล้ว อาจมีชื่อคนในแหล่งอื่นที่ยังไม่ได้เทียบ"
 ];
 $("kpiInspectorGuide").textContent=messages[activeKpi]+" · คลิกแถวเพื่อเปิด Stage ทั้งสายและหลักฐานผู้รับผิดชอบ";
 const requested=$("kpiSource").value;
 const sources=["all",...new Set(kpiRows.map(x=>x.source))];
 $("kpiSource").innerHTML=sources.map(k=>'<option value="'+escapeHtml(k)+'">'+escapeHtml(names[k]||k)+'</option>').join("");
 $("kpiSource").value=sources.includes(requested)?requested:"all";
 renderKpiPage();
}
function renderKpiPage(){
 if(activeKpi===null)return;
 const q=$("kpiSearch").value.trim().toLocaleLowerCase(),from=$("kpiSource").value,sort=$("kpiSort").value;
 kpiMatches=kpiRows.filter(r=>(from==="all"||r.source===from)&&
  (!q||[r.project,r.stage,r.owner_person,r.owner_raw,r.department,r.row_id,r.work_key].join(" ").toLocaleLowerCase().includes(q)));
 kpiMatches.sort((a,b)=>
  (sort==="source"?(a.source||"").localeCompare(b.source||""):0)||
  (sort==="owner"?(a.owner_person||"").localeCompare(b.owner_person||"","th"):0)||
  kpiDeadlineComparator(a,b));
 if(kpiPage*KPI_PAGE_SIZE>=kpiMatches.length)kpiPage=0;
 const start=kpiPage*KPI_PAGE_SIZE;
 const portion=kpiMatches.slice(start,start+KPI_PAGE_SIZE);
 $("kpiInspectorRows").innerHTML=portion.length?portion.map((r,i)=>
  '<tr data-kpi-row="'+(start+i)+'" tabindex="0" title="คลิกดู Stage ทั้งสาย">'+
  '<td>'+escapeHtml(r.due||r.due_iso||"—")+'</td>'+
  '<td><strong>'+escapeHtml(r.project||r.work_key)+'</strong><small>'+escapeHtml(r.work_key)+'</small></td>'+
  '<td>'+escapeHtml(names[r.source]||r.source)+'</td>'+
  '<td>'+escapeHtml(r.stage||"—")+'<small>Stage '+escapeHtml(r.stage_index||1)+'/'+escapeHtml(r.stage_total||1)+'</small></td>'+
  '<td><strong>'+escapeHtml(r.owner_person||"ยังไม่ยืนยันเจ้าภาพรายบุคคล")+'</strong>'+
    '<small>'+escapeHtml(assigneeLabel(r))+'</small></td>'+
  '<td>'+escapeHtml(r.deadline_state||r.status||"—")+'<small>'+escapeHtml(r.status||"—")+'</small></td></tr>'
 ).join(""):'<tr><td colspan="6" class="empty">ไม่มีรายการตรงกับเงื่อนไข</td></tr>';
 $("kpiInspectorPage").textContent="แสดง "+(kpiMatches.length?start+1:0)+"–"+Math.min(start+KPI_PAGE_SIZE,kpiMatches.length)+
 " / "+kpiMatches.length.toLocaleString("th-TH")+" รายการ (KPI ทั้งหมด "+kpiRows.length.toLocaleString("th-TH")+")";
 $("kpiPrev").disabled=kpiPage===0;
 $("kpiNext").disabled=start+KPI_PAGE_SIZE>=kpiMatches.length;
}
function openKpiRecord(r){
 const allStages=all.filter(x=>x.work_key===r.work_key).sort((a,b)=>(a.stage_index||0)-(b.stage_index||0));
 const key="kpi::"+r.work_key;
 nodeMap.set(key,{key,title:r.project,items:allStages.length?allStages:[r]});
 showDrill(key,"__all__");
 renderTimeline(r);
}
$("kpis").addEventListener("click",e=>{
 const card=e.target.closest("[data-kpi]");
 if(!card)return;
 activeKpi=Number(card.dataset.kpi);
 kpiPage=0;
 $("kpiSearch").value="";$("kpiSource").value="all";$("kpiSort").value="due";
 renderKpiInspector();
 $("kpiInspector").scrollIntoView({behavior:"smooth",block:"start"});
});
$("kpiInspectorClose").addEventListener("click",()=>{
 activeKpi=null;$("kpiInspector").hidden=true;
});
$("kpiSearch").addEventListener("input",()=>{kpiPage=0;renderKpiPage()});
$("kpiSource").addEventListener("change",()=>{kpiPage=0;renderKpiPage()});
$("kpiSort").addEventListener("change",()=>{kpiPage=0;renderKpiPage()});
$("kpiPrev").addEventListener("click",()=>{kpiPage=Math.max(0,kpiPage-1);renderKpiPage()});
$("kpiNext").addEventListener("click",()=>{kpiPage++;renderKpiPage()});
$("kpiInspectorRows").addEventListener("click",e=>{
 const row=e.target.closest("[data-kpi-row]");
 if(row)openKpiRecord(kpiMatches[Number(row.dataset.kpiRow)]);
});
$("kpiInspectorRows").addEventListener("keydown",e=>{
 if(e.key!=="Enter"&&e.key!==" ")return;
 const row=e.target.closest("[data-kpi-row]");
 if(row){e.preventDefault();openKpiRecord(kpiMatches[Number(row.dataset.kpiRow)]);}
});
function openSourceRecord(r){
 const n=[...nodeMap.values()].find(n=>n.type==="work"&&n.items.some(i=>i.work_key===r.work_key));
 if(n){showDrill(n.key,"__all__");renderTimeline(r);return;}
 $("sourceDetailNote").textContent="รายการนี้ไม่ได้อยู่ในแถว Pivot ตามตัวกรองปัจจุบัน กรุณาเลือกแหล่งข้อมูลอีกครั้ง";
}
function selectSourceCard(key){
 if(!["cb","ics","icf","ice","innovation","planner"].includes(key))return;
 selectedSource=key;sourceDetailPage=0;
 $("sourceDetailSearch").value="";$("sourceDetailStatus").value="all";
 $("source").value=key;$("status").value="all";$("stageOnly").checked=false;
 $("dueFilter").value="all";$("ownerFilter").value="";$("query").value="";
 if(payload)refresh();
 renderSourceDetail();
 $("sourceDetail").scrollIntoView({behavior:"smooth",block:"start"});
}
$("cloudSources").addEventListener("click",e=>{
 const card=e.target.closest("[data-source-card]");
 if(card)selectSourceCard(card.dataset.sourceCard);
});
$("sourceDetailClose").addEventListener("click",()=>{
 selectedSource=null;$("sourceDetail").hidden=true;
 $("cloudSources").querySelectorAll("[data-source-card]").forEach(x=>{x.classList.remove("active");x.setAttribute("aria-pressed","false")});
});
$("sourceDetailSearch").addEventListener("input",()=>{sourceDetailPage=0;renderSourceDetail()});
$("sourceDetailStatus").addEventListener("change",()=>{sourceDetailPage=0;renderSourceDetail()});
$("sourceDetailPrev").addEventListener("click",()=>{sourceDetailPage=Math.max(0,sourceDetailPage-1);renderSourceRowsPage()});
$("sourceDetailNext").addEventListener("click",()=>{sourceDetailPage++;renderSourceRowsPage()});
$("sourceDetailRows").addEventListener("click",e=>{
 const row=e.target.closest("[data-source-row]");
 if(row)openSourceRecord(sourceDetailRows[Number(row.dataset.sourceRow)]);
});
$("sourceDetailRows").addEventListener("keydown",e=>{
 if(e.key!=="Enter"&&e.key!==" ")return;
 const row=e.target.closest("[data-source-row]");
 if(row){e.preventDefault();openSourceRecord(sourceDetailRows[Number(row.dataset.sourceRow)])}
});

fetch(sourceHealthEndpoint,{cache:"no-store"})
  .then(r=>r.ok?r.json():Promise.reject(new Error("Source metadata unavailable")))
  .then(renderPublicSnapshot)
  .catch(()=>$("cloudSources").textContent="ยังอ่าน Source Health ไม่ได้ โปรดลองรีเฟรช");
function loadPrivatePivot(j,automatic=false){
  if(!j || j.schema!==1 || !Array.isArray(j.rows) || typeof j.updated!=="string" || !j.summary){
    throw Error("ไฟล์นี้ไม่ใช่ MD Pivot Snapshot ที่รองรับ");
  }
  if(j.rows.length>100000) throw Error("จำนวนรายการเกินขนาดที่รองรับ");
  for(const r of j.rows.slice(0,100)){
    if(typeof r!=="object" || !r.work_key || !r.source || typeof r.stage_index!=="number")
      throw Error("รูปแบบรายการ Pivot ไม่ครบถ้วน");
  }
  payload=j;all=j.rows;
  expanded=new Set();opened=false;
  renderSourceCounts();refresh();
  if(selectedSource)renderSourceDetail();
  $("dataConnection").classList.add("loaded");
  $("importStatus").textContent=(automatic?"เชื่อมข้อมูลจริงจาก Notebook อัตโนมัติแล้ว":"โหลดรายงานสำเร็จจากไฟล์")+" · "+j.rows.length.toLocaleString("th-TH")+" ขั้นตอน · ณ "+new Date(j.updated).toLocaleString("th-TH")+" · ทำงานใน Browser เท่านั้น";
  if(!automatic)$("pivotScroll").scrollIntoView({behavior:"smooth",block:"start"});
}
let privateFileSelected=false, localSyncRunning=false;
const localSource="http://127.0.0.1:8766/pivot.json";
async function syncWithNotebook(){
  if(localSyncRunning || privateFileSelected)return;
  localSyncRunning=true;
  const current=$("importStatus");
  current.textContent="กำลังเชื่อมข้อมูล Stage / กำหนดส่ง / ชื่อเจ้าภาพจาก Notebook ในเครื่องนี้…";
  try{
    const response=await fetch(localSource,{mode:"cors",credentials:"omit",cache:"no-store",signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw Error("HTTP "+response.status);
    const j=await response.json();
    if(privateFileSelected)return;
    loadPrivatePivot(j,true);
    $("connectionState").textContent="เชื่อม NB แล้ว · โหลดข้อมูลอัตโนมัติ";
    $("connectionState").classList.add("connected");
  }catch(e){
    if(!payload)current.textContent="ไม่พบ Private Viewer บนเครื่องนี้ · หากใช้ PC ให้เปิดผ่าน NB หรือใช้ปุ่มเลือกไฟล์ JSON";
    else current.textContent="ข้อมูลครั้งล่าสุดยังแสดงอยู่ · เชื่อม NB รอบนี้ไม่ได้ ("+e.name+")";
    $("connectionState").textContent="NB NOT CONNECTED · ดูเครื่องมือแก้ปัญหา";
    $("connectionState").classList.remove("connected");
  }finally{localSyncRunning=false;}
}
$("syncNow").addEventListener("click",()=>{privateFileSelected=false;syncWithNotebook()});
const localScanEndpoint="http://127.0.0.1:8766/scan-sources";
const localScanStatus="http://127.0.0.1:8766/scan-status";
let scanningSources=false;
function describeScan(d){
  const groups={cb:"CB",ics:"ICS",icf:"ICF",ice:"ICE"};
  if(d.state==="running")return "กำลังสแกนไฟล์ต้นทางบน W: … เริ่ม "+new Date(d.started_at).toLocaleTimeString("th-TH")+" (Planner/นวัตกรรมยังไม่ถูกสแกน)";
  if(d.state==="success")return "Scan W: สำเร็จ 4/4 · "+Object.entries(d.sources||{}).map(([k,v])=>(groups[k]||k)+" "+(v==="ok"?"✓":"!")).join(" · ")+" · อัปเดต Pivot แล้ว (Cloud สองแหล่งไม่ได้สแกน)";
  if(d.state==="partial_or_failed"||d.state==="error")return "Scan ยังไม่ครบ · "+(d.message||"")+". ตรวจ NB Collector Audit";
  return "พร้อมสแกน W: 4 แหล่ง · Cloud อีก 2 แหล่งติดตามแยกต่างหาก";
}
async function scanSourceFiles(){
  if(scanningSources)return;
  scanningSources=true;
  const btn=$("scanSources"),statusEl=$("scanStatus");
  statusEl.hidden=false;
  btn.disabled=true;
  privateFileSelected=false;
  statusEl.textContent="กำลังส่งคำสั่งสแกนไฟล์จริงจาก NB…";
  try{
    const start=await fetch(localScanEndpoint,{
      method:"POST",mode:"cors",credentials:"omit",
      headers:{"Content-Type":"application/json"},
      body:"{}",cache:"no-store",signal:AbortSignal.timeout(8000)});
    const begin=await start.json();
    if(start.status!==202 && start.status!==409)throw Error("Scan request "+start.status);
    statusEl.textContent=describeScan(begin);
    let final=null;
    for(let n=0;n<180;n++){
      await new Promise(r=>setTimeout(r,2000));
      const req=await fetch(localScanStatus,{mode:"cors",credentials:"omit",cache:"no-store",signal:AbortSignal.timeout(8000)});
      if(!req.ok)throw Error("Scan status "+req.status);
      const obj=await req.json();
      statusEl.textContent=describeScan(obj);
      if(obj.state!=="running"){final=obj;break;}
    }
    if(!final)throw Error("Scan still processing: timeout 6 min");
    if(final.state==="success")await syncWithNotebook();
  }catch(error){
    statusEl.textContent="สแกนต้นทางไม่ได้ ("+error.message+") · โปรดตรวจว่าเปิดเว็บบน NB และ Private Viewer ยังทำงาน";
  }finally{scanningSources=false;btn.disabled=false;}
}
$("scanSources").addEventListener("click",scanSourceFiles);
const localTodoScan="http://127.0.0.1:8766/scan-planner";
const localTodoStatus="http://127.0.0.1:8766/planner-status";
let todoScanBusy=false;
function describeTodoScan(s){
 if(s.state==="running")return "Todo: กำลังอ่าน Microsoft Graph จาก Planner ต้นทางและตรวจ Checklist (อาจใช้เวลา 30–90 วินาที)…";
 if(s.state==="success")return "Todo: Scan Microsoft Graph สำเร็จ · "+s.total+" งาน · เปิดอยู่ "+s.open+
  " · ปิดแล้ว "+s.completed+" · ตรวจรายละเอียด "+s.details_checked+"/"+s.total+
  " · อัปเดต Pivot แล้ว"+(s.public_health_published?" · Cloud Source Health ล่าสุด":" · Metadata GitHub อาจรอรอบเผยแพร่");
 if(s.state==="error")return "Todo: ยังอัปเดตไม่สำเร็จ ("+(s.message||"Graph auth/connection error")+
  ") · คง Snapshot ล่าสุดที่ผ่านการตรวจไว้";
 return "Todo: รอสั่งสแกน Microsoft Planner ต้นทาง";
}
async function refreshTodoFromGraph(){
 if(todoScanBusy)return;
 todoScanBusy=true;
 const btn=$("scanTodo"),area=$("todoScanStatus");area.hidden=false;btn.disabled=true;
 privateFileSelected=false;
 area.textContent="Todo: กำลังเริ่มสแกน Microsoft Planner บน NB…";
 try{
  const req=await fetch(localTodoScan,{method:"POST",mode:"cors",credentials:"omit",
    headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store",signal:AbortSignal.timeout(12000)});
  const data=await req.json();
  if(req.status!==202&&req.status!==409)throw Error("Graph scan HTTP "+req.status);
  area.textContent=describeTodoScan(data);
  let state=null;
  for(let n=0;n<140;n++){
    await new Promise(resolve=>setTimeout(resolve,2000));
    const status=await fetch(localTodoStatus,{mode:"cors",credentials:"omit",cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!status.ok)throw Error("Planner status HTTP "+status.status);
    const obj=await status.json();area.textContent=describeTodoScan(obj);
    if(obj.state!=="running"){state=obj;break;}
  }
  if(!state)throw Error("Planner scan timeout; check NB private viewer");
  if(state.state==="success"){
    await syncWithNotebook();
    if(state.public_health_published){
      try{const u=await fetch("./source-health.json?todo="+Date.now(),{cache:"no-store"});
        if(u.ok)renderPublicSnapshot(await u.json());}catch(_){}
    }
  }
 }catch(error){
  area.textContent="Todo: สแกนไม่ได้ ("+error.message+
    ") · ต้องเปิดจาก Notebook ที่ Azure CLI เชื่อม Microsoft 365 ไว้";
 }finally{todoScanBusy=false;btn.disabled=false;}
}
$("scanTodo").addEventListener("click",refreshTodoFromGraph);


$("pivotFile").addEventListener("change",async e=>{
  const file=e.target.files&&e.target.files[0];if(!file)return;
  const area=$("importStatus");area.textContent="กำลังอ่าน "+file.name+"…";
  try{
    if(file.size>35000000)throw Error("ไฟล์ใหญ่เกิน 35 MB");
    privateFileSelected=true;
    const txt=await file.text();
    const j=JSON.parse(txt);
    loadPrivatePivot(j);
  }catch(error){
    area.textContent="โหลดไม่สำเร็จ: "+error.message;
  }finally{e.target.value="";}
});

// On authorized NB this reads loopback only; on another device show an explicit fallback.
syncWithNotebook();
// Cost Guard: only probe local viewer on page open, manual request, or after 30 minutes.
let lastAutomaticCheck=Date.now();
function maybeSyncAfterIdle(){
 if(document.hidden||privateFileSelected||localSyncRunning)return;
 const now=Date.now();
 if(now-lastAutomaticCheck < 30*60*1000)return;
 lastAutomaticCheck=now;
 syncWithNotebook();
}
setInterval(maybeSyncAfterIdle,5*60*1000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)maybeSyncAfterIdle()});
