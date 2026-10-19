"use strict";
const $=id=>document.getElementById(id);
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names={all:"ทุกสายงาน",cb:"Check Board",ics:"ICS",icf:"ICF",ice:"ICE / EDU",innovation:"นวัตกรรม",planner:"Planner / Todo"};
const months=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
let payload=null,all=[],filtered=[],nodeMap=new Map(),roots=[],columns=[],rawCols=[],visible=[],expanded=new Set();
let axis="department",measure="work",source="all",status="open",dueState="all",search="",currentOnly=true,columnLimit=11,opened=false;
const dateSort=(a,b)=>(a.due_iso||"9999").localeCompare(b.due_iso||"9999")||a.work_key.localeCompare(b.work_key);
const missingDept=x=>!x||/ยังไม่|ไม่ระบุ|unknown/i.test(x);
function groupName(r){
 if(axis==="source")return names[r.source]||r.source;
 if(axis==="owner")return r.owner||"ไม่ระบุผู้รับผิดชอบ";
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
 const missingOwner=live.filter(r=>missingDept(r.department)).length;
 const units=[
  {title:"งาน/โครงการในผลลัพธ์",value:new Set(filtered.map(r=>r.work_key)).size,extra:"นับไม่ซ้ำภายในทะเบียน"},
  {title:"Stage ที่แสดง",value:filtered.length,extra:"แถวตามเงื่อนไข"},
  {title:"ผ่านวันกำหนดในตาราง",value:over,extra:"ไม่ใช่การรับรองผิด SLA",class:"urgent"},
  {title:"ครบกำหนดวันนี้",value:live.filter(r=>r.deadline_state==="ครบกำหนดวันนี้").length,extra:"ตามวันที่ในแหล่งข้อมูล",class:"caution"},
  {title:"ยังไม่มี Stage Due ที่ยืนยัน",value:missing,extra:"ต้องจัดทำกำหนดส่ง",class:"caution"},
  {title:"ฝ่ายยังไม่ยืนยัน",value:missingOwner,extra:"ไม่อนุมานจากชื่อเจ้าภาพ",class:"caution"}];
 $("kpis").innerHTML=units.map(o=>'<div class="metric '+(o.class||"")+'"><div class="label">'+escapeHtml(o.title)+'</div><strong>'+o.value.toLocaleString("th-TH")+'</strong><small>'+escapeHtml(o.extra)+'</small></div>').join("");
 $("asof").textContent="ข้อมูลภายใน ณ "+new Date(payload.updated).toLocaleString("th-TH")+", "+filtered.length.toLocaleString("th-TH")+" Stage (ไม่ใช่จำนวนคำสั่ง MD ที่ไม่ซ้ำกัน)";
}
function getRowsByFilters(){
 const q=search.toLocaleLowerCase();
 filtered=all.filter(r=>
  (source==="all"||r.source===source)&&
  (status==="all"||(status==="open"?!r.closed:r.closed))&&
  (!currentOnly||r.is_current_stage)&&
  (dueState==="all"||(dueState==="overdue"?r.deadline_state==="ผ่านกำหนดตามตาราง":dueState==="today"?r.deadline_state==="ครบกำหนดวันนี้":dueState==="future"?r.deadline_state==="ยังไม่ถึงกำหนด":!r.due_iso))&&
  (!q||[r.project,r.stage,r.owner,r.department,r.source,r.work_key,r.row_id,r.note].join(" ").toLocaleLowerCase().includes(q))
 ).sort(dateSort);
 if(source==="all")$("nameOfGroup").textContent="ทุกสายงาน MD";else $("nameOfGroup").textContent=names[source]||source;
}
function colDefs(){
 const hist=new Map();
 for(const r of filtered){const name=groupName(r),arr=hist.get(name)||[];arr.push(r);hist.set(name,arr);}
 let keys=[...hist.entries()].sort((a,b)=>unitCount(b[1])-unitCount(a[1])||a[0].localeCompare(b[0],"th")).map(([k])=>k);
 if(keys.length>columnLimit){
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
}
function renderTree(){
 allVisible();
 const table=$("pivot");
 const header1='<tr><th class="dateHead" rowspan="2">ปี / เดือน / กำหนดส่ง / งาน</th><th colspan="'+Math.max(columns.length,1)+'" id="matrixAxisName">ตำแหน่งงานที่ค้าง</th><th rowspan="2" class="totalHead">Grand Total</th></tr>';
 const header2='<tr>'+ (columns.length?columns.map(c=>'<th title="'+escapeHtml(c)+'">'+escapeHtml(c)+'</th>').join(""):'<th>ไม่พบข้อมูล</th>') +'</tr>';
 $("thead").innerHTML=header1+header2;
 const markup=visible.map((n,idx)=>{
  const exp=n.children.length>0,active=expanded.has(n.key);
  const depth=n.depth,code=exp?'<button class="exp" data-toggle="'+escapeHtml(n.key)+'" aria-label="'+(active?"ยุบ":"ขยาย")+' '+escapeHtml(n.title)+'">'+(active?"−":"+")+'</button>':'<span class="leafdot">•</span>';
  const tag=n.type==="work"?'<span class="rowtag">'+escapeHtml(names[n.items[0]?.source]||"")+'</span>':"";
  return '<tr class="'+escapeHtml(n.type)+'" data-node-row="'+escapeHtml(n.key)+'"><td class="left"><span class="indent" style="--depth:'+(depth*20)+'px"></span>'+code+'<span class="rowlabel" title="'+escapeHtml(n.title)+'">'+escapeHtml(n.title)+'</span>'+tag+'</td>'+
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
function showDrill(key,col){
 const node=nodeMap.get(key);if(!node)return;
 const rows=col==="__all__"?node.items:node.items.filter(r=>colOf(r)===col);
 const dedup=measure==="work"?Array.from(new Map(rows.map(x=>[x.work_key,x])).values()):rows;
 const holder=$("drill");holder.hidden=false;
 $("drillTitle").textContent=(node.title||"")+" / "+(col==="__all__"?"ทุกฝ่าย":col);
 $("drillMeta").textContent=unitCount(rows).toLocaleString("th-TH")+" "+(measure==="work"?"งาน":"ขั้นตอน")+" · คลิกชื่อเพื่อดู Stage ทั้งสาย";
 $("detailBody").innerHTML='<table><thead><tr><th>กำหนดส่ง</th><th>งาน / โครงการ</th><th>Stage ที่ค้าง</th><th>เจ้าภาพ</th><th>ฝ่าย</th><th>สถานะ</th></tr></thead><tbody>'+
  dedup.slice(0,300).map((r,i)=>'<tr data-idx="'+i+'"><td>'+escapeHtml(r.due||"—")+'</td><td><strong>'+escapeHtml(r.project)+'</strong><div class="sub">'+escapeHtml(names[r.source]||r.source)+'</div></td><td>'+escapeHtml(r.stage)+'</td><td>'+escapeHtml(r.owner)+'</td><td>'+escapeHtml(r.department)+'</td><td>'+escapeHtml(r.deadline_state)+'</td></tr>').join("")+'</tbody></table>';
 window.currentDrillRows=dedup;
 $("stageTrace").innerHTML="";
 holder.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function renderTimeline(r){
 const sequence=all.filter(x=>x.work_key===r.work_key).sort((a,b)=>a.stage_index-b.stage_index);
 $("stageTrace").innerHTML=sequence.map(x=>'<div class="node '+(x.stage_index===r.stage_index?"current":"")+'"><div class="eyebrow">STAGE '+x.stage_index+'/'+x.stage_total+'</div><h4>'+escapeHtml(x.stage)+'</h4><p>เจ้าภาพ: '+escapeHtml(x.owner)+'</p><p>ฝ่าย: '+escapeHtml(x.department)+'</p><p>กำหนด: '+escapeHtml(x.due||"ไม่ระบุ")+'</p><p>สถานะ: '+escapeHtml(x.status)+'</p><p>'+escapeHtml(x.deadline_state)+'</p></div>').join("");
 $("stageTrace").scrollIntoView({behavior:"smooth",block:"nearest"});
}
function renderSourceCounts(){
 const s=["all","cb","planner","innovation","ics","icf","ice"];
 $("source").innerHTML=s.map(k=>'<option value="'+k+'">'+escapeHtml(names[k])+'</option>').join("");$("source").value=source;
}
function refresh(){
 source=$("source").value;axis=$("axis").value;measure=$("unit").value;status=$("status").value;dueState=$("dueFilter").value;currentOnly=$("stageOnly").checked;columnLimit=Number($("maxCols").value)||11;search=$("query").value.trim();
 getRowsByFilters();opened=false;render();
}
function setExpand(mode){
 if(mode==="all")expanded=new Set([...nodeMap.values()].filter(n=>n.children?.length).map(n=>n.key));
 if(mode==="none")expanded=new Set();
 if(mode==="month"){expanded=new Set();for(const n of roots){expanded.add(n.key);for(const c of n.children)expanded.add(c.key)}}
 renderTree();
}
function exportCsv(){
 const header=["Source","Work Key","Project","Stage","Stage index","Due","Status","Owner","Department","Due status"];
 const quote=x=>'"'+String(x??"").replace(/"/g,'""')+'"';
 const csv="\uFEFF"+[header,...filtered.map(r=>[r.source,r.work_key,r.project,r.stage,r.stage_index,r.due,r.status,r.owner,r.department,r.deadline_state])].map(row=>row.map(quote).join(",")).join("\r\n");
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
$("detailBody").addEventListener("click",e=>{const row=e.target.closest("[data-idx]");if(row)renderTimeline(window.currentDrillRows[Number(row.dataset.idx)])});
$("closeDrill").addEventListener("click",()=>$("drill").hidden=true);
["source","axis","unit","status","dueFilter","stageOnly","maxCols"].forEach(x=>$(x).addEventListener("change",refresh));
$("query").addEventListener("input",()=>{clearTimeout(window.qdeb);window.qdeb=setTimeout(refresh,150)});
$("expandAll").onclick=()=>setExpand("all");$("expandMonth").onclick=()=>setExpand("month");$("collapseAll").onclick=()=>setExpand("none");$("downloadCsv").onclick=exportCsv;
fetch("./pivot.json?refresh="+Date.now(),{cache:"no-store"})
.then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();})
.then(j=>{payload=j;all=j.rows||[];renderSourceCounts();refresh();})
.catch(e=>{$("asof").textContent="ไม่สามารถโหลด Pivot ได้: "+e.message;$("tbody").innerHTML='<tr><td>ข้อมูลไม่พร้อม</td></tr>'});
