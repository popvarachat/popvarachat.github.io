/* CAR embedded evidence twin: only sanitized metadata is loaded on public GitHub Pages. */
(function(){
"use strict";
const D=window.PTK_ATTACHMENT_TWIN;
const A=window.PTK_AUDITOR_DATA;
const ROOT=document.getElementById("attachmentView");
if(!ROOT||!D||!A)return
const CASE_CAR={1:"CXD-017",4:"CXD-025",5:"CXD-026",6:"CXD-027",7:"CXD-031",8:"CXD-030",9:"CXD-097",10:"CXD-089",11:"AMD-124",12:"CXD-088",13:"COO-073",14:"CXD-144",15:"CXD-149"};
const CAT={WHY_WHY:"Why-Why / RCA",WI:"Work Instruction",CHECKLIST:"Checklist / FORM",TRAINING:"Training / KYT",ACCEPTANCE:"Acceptance",CORRECTIVE:"Corrective Action",REGISTER:"Shared Register",PRESENTATION:"Presentation",IMAGE:"Photographic Evidence",DOCUMENT:"Other Evidence"};
const fmt={main:"CAR หลัก",closure:"ไฟล์ปิด CAR",extension:"ไฟล์ต่ออายุ"};

const FOCUSED_AUDIT_FINDINGS={
  1:"CXD-017: มีขั้นตอน Supplier/ติดตั้งเดิม แต่ยังต้องพิสูจน์จุดอนุมัติเปลี่ยนทีมและ Fastener Check; QPFM-25-036 อยู่ในโฟลเดอร์เอกสารยกเลิกตามการตรวจ W: ล่าสุด",
  5:"CXD-026: PDF CAR แนบ WI-SCD-001 Rev.17 เป็นประวัติการแก้ไข แต่ DCC ฉบับที่ตรวจคือ Rev.18; ต้องดูธุรกรรมจริงหลังประกาศใช้",
  6:"CXD-027: ผลโลหะตัวอย่างสอดคล้อง AISI 304 แต่ยังไม่พิสูจน์ว่าสารเคมีเป็นต้นเหตุ ต้องมีข้อมูลตรวจต้นเหตุและการป้องกันระหว่างติดตั้ง",
  8:"CXD-030: PDF CAR มี FileAttachment ซ้อนที่เป็น WI-M1S-027 Rev.5 และ Rev.6; เอกสารควบคุมที่ตรวจคือ Rev.6 หน้า 13 ซึ่งระบุ Test Fit ก่อนส่งต่อ แต่ยังขาด Record งานใหม่",
  9:"CXD-097: Top หินแอ่นเกี่ยวกับการคำนวณ Load; ต้องมีเกณฑ์ออกแบบและทดสอบก่อนปล่อยงานใหม่ อย่าใช้ CAR งานผิว CXD-089 มาแทน",
  10:"CXD-089: เป็นปัญหางานผิวคนละเหตุการณ์กับ CXD-097 แม้แนบสำเนาทะเบียน Complaint ที่เหมือนกัน การแนบซ้ำไม่ใช่หลักฐานตรวจผิวผ่าน",
  13:"COO-073: PDF แนบซ้อนถึง PowerPoint Why-Why และภาพประกอบ; ช่วยยืนยันการวิเคราะห์ แต่ต้องตรวจ Ticket รถแดงและการส่งต่องานจริง",
  14:"CXD-144: ทะเบียนรวมกับชีตกันยายนผูก CAR ไม่ตรงกัน ต้องตรวจความสัมพันธ์กับเหตุการณ์ก่อนนำไฟล์แนบไปอ้างเป็นการปิดเคส",
  15:"CXD-149: อยู่ใน Summary26 แล้ว แต่ยังไม่อยู่ในชุด CAR PDF 21 ฉบับที่สแกน; ต้องตรวจแฟ้มจริงและเพิ่มดัชนีหลังยืนยัน"
};
const qp=x=>String(x==null?"":x);
const esc=x=>qp(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const el=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const rel=(car,variant)=>"http://127.0.0.1:8769/car/"+encodeURIComponent(car)+"/"+encodeURIComponent(variant);
const emb=n=>"http://127.0.0.1:8769/attachment/"+encodeURIComponent(n.car)+"/"+encodeURIComponent(n.variant)+"/"+encodeURIComponent(n.id);
const caseOf=n=>A.cases.find(x=>x.n===Number(n));
const carOf=n=>CASE_CAR[n]||null;
const nameOf=n=>{const c=caseOf(n);return c?"#"+pad(n)+" · "+(c.project||c.id):"#"+pad(n)};
const rootsFor=car=>D.root_nodes.filter(x=>x.car===car);
const nodesFor=(car,variant)=>D.nodes.filter(x=>x.car===car&&x.variant===variant);
let num=+((location.hash.match(/^#twin-(\d{1,2})$/)||[])[1]||8);
if(!caseOf(num))num=8;
let car=carOf(num);
let variant=(rootsFor(car).find(x=>x.variant==="main")||rootsFor(car)[0]||{}).variant||null;
let selected=null;
let filter="ALL",search="";
for(const [id,key,unit] of [["kpiSources","pdf_sources","ไฟล์ PDF ต้นฉบับ"],["kpiAttachments","attachment_occurrences","ไฟล์แนบทุกชั้น"],["kpiUnique","distinct_sha256","เนื้อหา SHA ไม่ซ้ำ"],["kpiDepth","max_nesting_depth","ชั้นหลัง CAR PDF"],["kpiVisual","images_pending_visual_review","ภาพที่ต้องตรวจ"]]){
  el(id).textContent=D.scope[key];
}
el("dataPeriod").textContent="สแกนต้นฉบับ: "+D.as_of+" · W: Read-only · ไม่ใช่ผลรับรอง CAR";
el("caseSelect").innerHTML=A.cases.map(c=>'<option value="'+c.n+'">'+esc(nameOf(c.n))+'</option>').join("");
el("caseSelect").value=num;
function tag(txt,cls=""){return '<span class="tag '+cls+'">'+esc(txt)+'</span>'}
function goCase(n){
 num=Number(n);car=carOf(num);
 variant=(rootsFor(car).find(x=>x.variant==="main")||rootsFor(car)[0]||{}).variant||null;
 selected=null;
 filter="ALL";search="";
 el("caseSelect").value=num;
 if(location.hash!=="#twin-"+pad(num))location.hash="#twin-"+pad(num);
 ROOT.scrollTop=0;
 draw();
}
function goVariant(x){variant=x;selected=null;draw()}
function match(n){
 if(filter==="NESTED"&&n.depth<2)return false;
 if(filter==="SHARED"&&!n.shared_across_cars)return false;
 if(!["ALL","NESTED","SHARED"].includes(filter)&&n.category!==filter)return false;
 if(search && ![n.label,n.kind,n.category,n.variant,"ชั้น "+n.depth].join(" ").toLowerCase().includes(search.toLowerCase()))return false;
 return true;
}
function visibleNodes(items){
 const wanted=new Set(items.filter(match).map(n=>n.id));
 if(filter==="ALL"&&!search)return items;
 const m=new Map(items.map(x=>[x.id,x]));
 for(const id of [...wanted]){let node=m.get(id);let tries=0;while(node&&tries++<6){if(node.parent_id&&m.has(node.parent_id))wanted.add(node.parent_id);node=m.get(node.parent_id)}}
 return items.filter(n=>wanted.has(n.id));
}
function drawVariants(){
 const roots=rootsFor(car);
 if(!car){el("variants").innerHTML='<div class="empty">เคสนี้ยังจับคู่ CAR กับเหตุการณ์ได้ไม่มั่นใจ จึงไม่ดึงไฟล์แนบจาก CAR อื่นมาอ้างแทน</div>';return}
 if(!roots.length){el("variants").innerHTML='<div class="empty">CAR '+esc(car)+' ยังไม่ได้รวมอยู่ในดัชนี PDF 21 ฉบับที่ตรวจ ไม่ได้หมายความว่าไม่มีไฟล์แนบในเอกสารต้นฉบับ</div>';return}
 el("variants").innerHTML=roots.map(r=>{
   const items=nodesFor(car,r.variant);
   return '<button type="button" class="variant '+(variant===r.variant?"active":"")+'" data-variant="'+r.variant+'"><span class="vicon">▣</span><span><strong>'+esc(fmt[r.variant]||r.variant)+'</strong><small>'+esc(car)+' / '+esc(r.variant)+'</small></span><span class="vcount">'+items.length+'</span></button>';
 }).join("")+'<div class="variant-actions">'+roots.map(r=>'<a href="'+rel(car,r.variant)+'" target="_blank" rel="noopener noreferrer">เปิด '+esc(fmt[r.variant]||r.variant)+' ↗</a>').join("")+'</div>'+
 '<div class="hint">เอกสาร CAR เปิดได้เฉพาะเครื่องที่มี Local Gateway และสิทธิ์ W: เท่านั้น ไม่ใช่ไฟล์ที่ฝากไว้บน GitHub</div>';
}
function drawTree(){
 const nodes=nodesFor(car,variant),shown=visibleNodes(nodes);
 el("treeCount").textContent=shown.length+" / "+nodes.length+" Nodes";
 if(!nodes.length){el("tree").innerHTML='<div class="empty">ไม่พบไฟล์แนบแบบฝังใน PDF ฉบับนี้ หรือยังไม่มีข้อมูลสแกนสำหรับ CAR นี้ ข้อความ/รูปที่อยู่บนหน้า PDF ปกติอาจยังมีหลักฐานอยู่</div>';return}
 if(!shown.length){el("tree").innerHTML='<div class="empty">ไม่พบ Node ตรงเงื่อนไขที่เลือก ลองเลือกทุกประเภท</div>';return}
 if(!selected||!nodes.some(x=>x.id===selected))selected=shown[0].id;
 const sourceNode=rootsFor(car).find(x=>x.variant===variant);
 const root='<div class="twin-node active" style="cursor:default;border-left-color:#3d799a"><span class="step">0</span><span class="entry"><strong>▣ '+esc(car)+' · '+esc(fmt[variant]||variant)+'</strong><small>Original CAR PDF · Authorized W: Document</small></span></div>';
 el("tree").innerHTML=root+shown.map((n,i)=>{
  const deeper=n.depth>=2;
  const cls="twin-node"+(deeper?" depth2":"")+(n.id===selected?" active":"");
  const meta='ชั้น '+n.depth+' · '+n.kind+' · '+n.size_kb.toLocaleString("en-US")+" KB";
  return '<button class="'+cls+'" data-node="'+esc(n.id)+'" data-cat="'+esc(n.category)+'" title="ดูข้อมูลและลิงก์ไฟล์แนบจริง"><span class="step">'+esc(deeper?"L2":"L1")+'</span><span class="entry"><strong>'+esc(CAT[n.category]||n.label)+'</strong><small>'+esc(meta)+(n.shared_across_cars?" · ใช้ร่วมหลาย CAR":"")+'</small></span><span class="pill">'+esc(n.kind)+'</span></button>'
 }).join("");
}
function statusLabel(n){
 if(!n)return "";
 if(n.state==="VISUAL_REVIEW_REQUIRED"||n.kind==="JPG"||n.kind==="PNG")return tag("รอตรวจบริบทภาพ","warn");
 if(n.state==="DUPLICATE_IN_VARIANT")return tag("เนื้อหาซ้ำใน CAR ฉบับนี้","warn");
 if(n.state==="TEXT_PRESENT"||n.state==="OFFICE_PACKAGE")return tag("สกัด Metadata ได้","ok");
 return tag(n.state,"warn");
}
function drawDetails(){
 let n=D.nodes.find(x=>x.id===selected);
 if(!n||n.car!==car||n.variant!==variant){
  el("details").innerHTML='<div class="empty">เลือกไฟล์แนบในสายหลักฐานเพื่อดูรายละเอียดและเปิดต้นฉบับ</div>';
  return;
 }
 let ancestry=[];let cur=n,all=new Map(D.nodes.map(x=>[x.id,x]));
 while(cur){ancestry.unshift(cur);cur=all.get(cur.parent_id)}
 const pathLabels=[car+" / "+variant,...ancestry.map(x=>(x.depth===2?"L2 ":"L1 ")+(CAT[x.category]||x.kind))].join(" → ");
 const shared=n.shared_group?D.shared_groups.find(x=>x.group===n.shared_group):null;
 const notes=[
   n.category==="REGISTER"?"ไฟล์นี้เป็นทะเบียน Complaint ที่ใช้อ้างร่วม ไม่ใช่หลักฐานว่ามาตรการแก้ไขสำเร็จ":null,
   n.category==="WI"?"พบ WI ที่ฝังอยู่ในแฟ้ม CAR แต่ต้องเทียบ Revision กับ DCC ปัจจุบัน":null,
   n.category==="WHY_WHY"?"เป็นผู้สมัครหลักฐาน RCA ต้องตรวจว่าผลวิเคราะห์เชื่อมไปยังจุดควบคุมที่เปลี่ยนจริง":null,
   n.category==="PRESENTATION"?"สไลด์สรุปหรือการอบรมไม่ใช่ผลพิสูจน์ว่ามีการใช้งานจริง":null,
   n.category==="IMAGE"?"ภาพถ่ายต้องยืนยันวันที่ จุดถ่าย ผู้ถ่าย และงานที่แสดง":null,
   n.shared_across_cars?"พบเนื้อหาเดียวกันแนบอยู่ต่าง CAR จึงควรพิจารณาว่าเป็นเอกสารกลาง ไม่ใช่หลักฐานเฉพาะเคส":null
 ].filter(Boolean);
 el("details").innerHTML='<div class="detail-main"><div class="tags">'+tag("Attachment ชั้น "+n.depth)+tag(n.kind)+statusLabel(n)+'</div><h3>'+esc(CAT[n.category]||n.label)+'</h3><p>ประเภทไฟล์แนบที่จำแนกจากชื่อและโครงสร้างไฟล์ (ยังไม่ใช่ข้อสรุปเชิง Audit)</p>'+
 '<div class="rowdetail"><span>CAR / ฉบับ</span><strong>'+esc(car+" / "+variant)+'</strong></div>'+
 '<div class="rowdetail"><span>ลำดับความลึก</span><strong>'+esc("L"+n.depth)+'</strong></div>'+
 '<div class="rowdetail"><span>ขนาด</span><strong>'+n.size_kb.toLocaleString("en-US")+' KB</strong></div>'+
 '<div class="rowdetail"><span>หลักฐานข้าม CAR</span><strong>'+esc(shared?shared.group+" ("+shared.cars.join(", ")+")":"ไม่พบซ้ำข้าม CAR ในชุดที่ตรวจ")+'</strong></div>'+
 '<div class="rowdetail"><span>สายสัมพันธ์</span><strong>'+esc(pathLabels)+'</strong></div>'+
 (n.openable?'<a class="open-doc" href="'+emb(n)+'" target="_blank" rel="noopener noreferrer">เปิดไฟล์แนบต้นฉบับจาก NB ↗</a>':'<span class="open-doc disabled">ไฟล์ยังไม่พร้อมเปิดตามเกณฑ์ความปลอดภัย</span>')+
 '<div class="hint">ไฟล์จริงไม่ได้อยู่บนเว็บ: ต้องเปิดบน Notebook ที่มีตัวอ่านเอกสารที่ 127.0.0.1:8769 และเข้าถึง W: หากเปิดจาก PC/มือถือเครื่องอื่น ลิงก์ localhost จะไม่ชี้มาที่ NB</div>'+
 (notes.length?'<div class="caution">'+notes.map(x=>'<div>• '+esc(x)+'</div>').join("")+'</div>':'')+
 '</div>';
}
function drawAnalysis(){
 const c=caseOf(num),items=D.nodes.filter(n=>n.car===car);
 const categoryCounts={};items.forEach(n=>{categoryCounts[n.category]=(categoryCounts[n.category]||0)+1});
 const hasWI=(categoryCounts.WI||0)>0,hasRCA=(categoryCounts.WHY_WHY||0)>0,hasImages=(categoryCounts.IMAGE||0)>0;
 const hasNested=items.some(n=>n.depth>1),caseHold=c?.car_identity==="CONFLICT"||!car;
 const summary=car?"พบ "+items.length+" ไฟล์แนบจาก "+rootsFor(car).length+" PDF ฉบับ (ไฟล์แนบซ้อน "+items.filter(n=>n.depth>1).length+")":"ยังไม่ยืนยันความสัมพันธ์เคสกับ CAR";
 el("analysis").innerHTML='<h3>'+esc(nameOf(num))+'</h3><p>'+esc(c?.event||"")+'</p><div class="tags">'+tag(c?.review_level||"UNKNOWN",caseHold?"danger":"warn")+(car?tag(car):tag("CAR identity HOLD","danger"))+tag(summary)+'</div>'+
 (caseHold?'<div class="caution">เลข CAR/เหตุการณ์มีข้อขัดแย้ง หรือยังไม่ยืนยัน ห้ามนำไฟล์แนบจาก CAR นี้ไปยืนยันการแก้ Complaint โดยอัตโนมัติ</div>':'')+
 (FOCUSED_AUDIT_FINDINGS[num]?'<div class="hint" style="margin:10px 0"><b>ข้อค้นพบจากไฟล์แนบในรอบตรวจเดิม:</b><p>'+esc(FOCUSED_AUDIT_FINDINGS[num])+'</p><small>ตรวจ 15–16 ต.ค. 2569 · ต้องทวน Revision และงานจริงกับ DCC/QMR</small></div>':'')+
 '<div class="compare"><div><h4>Root Cause ที่ทีมเคยวิเคราะห์</h4><p>'+esc(c?.cause||"ต้องตรวจ CAR จริง")+'</p><h4>Candidate Attachments</h4><p>'+(hasRCA?"พบไฟล์ที่ชื่อเข้าข่าย Why-Why/RCA · ยังต้องตรวจเนื้อหา":"ไม่พบชื่อไฟล์แนบที่จัดเป็น Why-Why ในชุดนี้ ไม่แปลว่า CAR ไม่มี RCA")+'</p><p>'+(hasWI?"มี WI ฝังอยู่ · เทียบกับฉบับควบคุมล่าสุด":"ไม่พบชื่อไฟล์ฝังที่จัดเป็น WI")+'</p><p>'+(hasImages?"มีภาพประกอบ · ต้องดูบริบท":"ไม่พบภาพไฟล์แนบ")+'</p></div>'+
 '<div><h4>มาตรการระดับระบบที่ต้องพิสูจน์</h4><p>'+esc(c?.required_control||"ต้องกำหนด")+'</p><h4>Evidence Gap</h4><p>'+esc(c?.blocked_by||"หลักฐานยังไม่ครบ")+'</p></div></div>'+
 '<h4>การพิสูจน์ผลหลังแก้ (ISO 9001 ข้อ 10.2)</h4><p>'+esc(c?.test_required||"ตรวจการนำมาตรการไปใช้ในงานถัดไป")+'</p>'+
 '<div class="caution"><b>ผลตรวจ:</b> การมีไฟล์แนบ, WI หรือภาพไม่เท่ากับ CAPA Effective. ต้องพิสูจน์การใช้จริง ข้อมูลหลังเปลี่ยน และผู้อนุมัติ QMR</div>';
}
function drawCross(){
 const peers=new Set();
 for(const grp of D.shared_groups||[]){
  if(!car||!grp.cars.includes(car))continue;
  grp.cars.filter(x=>x!==car).forEach(x=>peers.add(x));
 }
 const cids=A.cases.filter(x=>peers.has(carOf(x.n)));
 const groups=(D.shared_groups||[]).filter(x=>x.cars.includes(car));
 const cluster=A.groups.filter(x=>x.ids.includes(num));
 el("crossCase").innerHTML='<h3>ความสัมพันธ์ของไฟล์แนบและจุดควบคุมร่วมกัน</h3>'+
 '<p>ตรวจ SHA-256 ภายในเพื่อหาการแนบไฟล์เนื้อหาเดียวกันข้าม CAR โดยไม่เผยค่า Hash หรือชื่อไฟล์ต้นฉบับ</p>'+
 (groups.length?groups.map(g=>'<div class="caution"><b>'+esc(g.group)+'</b> · แนบซ้ำ '+g.occurrences+' occurrences ใน '+g.cars.length+' CAR: '+esc(g.cars.join(" / "))+'<div>จัดเป็นทะเบียนอ้างอิงร่วม — ยังใช้ยืนยันการแก้ไขเฉพาะเคสไม่ได้</div></div>').join(""):'<p class="hint">ไม่พบเนื้อหาไฟล์แนบที่ใช้ร่วมกับ CAR อื่นในชุดที่ตรวจ</p>')+
 (cids.length?'<h4>เปิดเคสที่มีไฟล์เหมือนกัน</h4>'+cids.map(c=>'<button class="relatedcase" data-case="'+c.n+'">'+esc(nameOf(c.n))+'</button>').join(""):'')+
 (cluster.length?'<h4>Related process-control clusters</h4>'+cluster.map(g=>'<div class="hint" style="margin:8px 0"><b>'+esc(g.label)+'</b><p>เกี่ยวข้องกับ: '+g.ids.map(i=>esc("#"+pad(i))).join(" · ")+' (ความคล้ายไม่เท่ากับ Root Cause เดียวกัน)</p></div>').join(""):'');
}

function drawVerification(){
 const c=caseOf(num),all=rootsFor(car);
 if(!c)return;
 const identityHold=!car||c.car_identity==="CONFLICT"||[2,3].includes(c.n);
 const documents=c.docs||[];
 const directed=documents.filter(d=>d.linkage==="CONTROLLED_REVISION_RELEVANT");
 const gates=[
  {id:"G0",title:"Complaint / KPI identity",state:"SOURCE_REGISTERED",tone:"verified",desc:"มีเหตุการณ์ในทะเบียนรวม 15 เรื่อง / Summary26; KPI PTK_06 ต้องรับรองวิธีนับแยก COO-073"},
  {id:"G1",title:"Complaint ↔ CAR identity",state:identityHold?"IDENTITY HOLD":"CASE MATCH CANDIDATE",tone:identityHold?"hold":"pending",desc:identityHold?"ต้องสอบกลับลูกค้า/เหตุการณ์/วันที่จากแฟ้ม CAR และทะเบียนก่อนอ้างว่าตรงเรื่อง":"จับคู่รหัส CAR จากหลักฐานเดิมได้ แต่ต้องยืนยันเลขและ Revision ปัจจุบัน"},
  {id:"G2",title:"CAR + Embedded evidence",state:all.length?"SOURCE PDF FOUND":"PDF NOT IN SCAN",tone:all.length?"verified":"hold",desc:all.length?"ยืนยันว่ามี CAR PDF ตามรายการอนุญาตและไฟล์แนบที่อ่านได้ ไม่ยืนยันข้อสรุปในเอกสาร":"ไม่มี CAR ในดัชนี PDF ที่ตรวจ; ห้ามยืมผลของ CAR อื่น"},
  {id:"G3",title:"Root Cause + Control change",state:directed.length?"CONTROLLED WI OBSERVED":c.review_level==="L1"?"ACTION PROPOSED":"NEEDS VERIFICATION",tone:directed.length?"pending":"hold",desc:directed.length?"พบเอกสาร WI ที่สัมพันธ์กับสาเหตุจากการตรวจเดิม; ต้องตรวจการใช้ฉบับล่าสุด":"มีข้อวิเคราะห์หรือแผนบางส่วน แต่ยังไม่พบหลักฐานการบังคับใช้ครบ"},
  {id:"G4",title:"Applied implementation / record",state:"ACTUAL JOB EVIDENCE MISSING",tone:"hold",desc:"ต้องเปิดฟอร์มที่ใช้จริง ผู้ตรวจ/ผู้รับรอง ล็อตหรือ WO ที่ตรวจ และหลักฐานหลังเปลี่ยนมาตรการ"},
  {id:"G5",title:"Recurrence + QMR approval",state:"EFFECTIVENESS NOT VERIFIED",tone:"hold",desc:"ต้องมีช่วงติดตามผลตรวจซ้ำและ QMR/DCC ยืนยัน; สถานะปิด CAR ไม่เท่ากับ Effective"}
 ];
 const cards=gates.map(g=>'<article class="twin-gate '+g.tone+'"><div class="twin-gate-top"><strong>'+g.id+'</strong><span>'+esc(g.state)+'</span></div><h4>'+esc(g.title)+'</h4><p>'+esc(g.desc)+'</p></article>').join("");
 const docBrief=documents.length?documents.map(d=>'<button type="button" data-twin-docs="'+num+'" title="เปิดหน้า WI/FORM ของเคสนี้">'+esc(d.code)+'</button>').join(""):'<span>ไม่พบเอกสารเชื่อมโยงในการตรวจเดิม</span>';
 const claim=c.review_level==="L2"?"มีหลักฐาน Controlled WI ที่เกี่ยวข้องในรอบตรวจเดิม แต่ยังไม่มีการรับรองผลใช้จริง":"ยังต้องพิสูจน์ว่ามาตรการทำให้ขั้นตอนปฏิบัติเปลี่ยนจริง";
 el("twinVerification").innerHTML=
  '<div class="twin-gates">'+cards+'</div>'+
  '<div class="twin-verify-bottom">'+
  '<section><h3>เอกสารควบคุมที่สัมพันธ์กับเคส (เปิดภายในระบบเดียว)</h3><div class="twin-doc-codes">'+docBrief+'</div><p>'+esc(claim)+'</p></section>'+
  '<section><h3>วิธีพิสูจน์การป้องกันซ้ำ</h3><p>'+esc(c.test_required||"ต้องตรวจงานที่เกิดหลังปรับมาตรการ")+'</p><p><b>เจ้าภาพ:</b> '+esc(c.owner||"รอ QMR ยืนยัน")+'</p><div class="twin-action-links"><button data-twin-docs="'+num+'">เปิด WI/FORM</button><button data-twin-auditor="'+num+'">คำถาม ISO Auditor</button><button data-twin-case="'+num+'">ย้อนดู Root Cause</button></div></section>'+
  '</div><div class="twin-verify-alert">สถานะนี้เป็นผลตรวจสอบจากแหล่งข้อมูลที่เข้าถึงได้ ณ 18 พ.ย. 2569 — ไม่ใช่การลงนามรับรองแทน DCC / QMR</div>';
}
function draw(){
 el("filterSelect").value=filter;el("searchInput").value=search;
 if(!variant&&rootsFor(car).length)variant=rootsFor(car)[0].variant;
 drawVariants();drawTree();drawDetails();drawAnalysis();drawCross();drawVerification();
}
el("caseSelect").addEventListener("change",e=>goCase(e.target.value));
el("filterSelect").addEventListener("change",e=>{filter=e.target.value;selected=null;draw()});
el("searchInput").addEventListener("input",e=>{search=e.target.value;selected=null;draw()});
ROOT.addEventListener("click",e=>{
 const v=e.target.closest("[data-variant]");if(v){goVariant(v.dataset.variant);return}
 const n=e.target.closest("[data-node]");if(n){selected=n.dataset.node;drawTree();drawDetails();return}
 const c=e.target.closest("[data-case]");if(c){goCase(c.dataset.case);return}
 const button=e.target.closest("[data-twin-docs],[data-twin-auditor],[data-twin-case]");
 if(button){const n=Number(button.dataset.twinDocs||button.dataset.twinAuditor||button.dataset.twinCase);if(button.dataset.twinDocs)location.hash="#docs-"+pad(n);else if(button.dataset.twinAuditor)location.hash="#auditor-"+pad(n);else location.hash="#case-"+pad(n);}
});
window.PTK_RENDER_TWIN=function(n){
 const next=Number(n)||8;
 if(!caseOf(next))return;
 if(next!==num){num=next;car=carOf(num);variant=(rootsFor(car).find(x=>x.variant==="main")||rootsFor(car)[0]||{}).variant||null;selected=null;filter="ALL";search="";el("caseSelect").value=num;ROOT.scrollTop=0;}
 draw();
};
draw();
})();