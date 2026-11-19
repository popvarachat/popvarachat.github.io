/* Customer Complaint Intelligence — continuously recomputable exception rules.
 * PUBLIC-SAFE: input only sanitized metadata; rules indicate candidate evidence
 * gaps and management risks, NOT formally certified ISO nonconformities.
 */
(function(){
"use strict";
const A=window.PTK_AUDITOR_DATA,S=window.PTK_SOURCE_ASSURANCE,P=window.PTK_PLATFORM_CONTEXT||{};
const root=document.getElementById("riskView");
if(!A||!S||!root)return;
const e=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cases=A.cases||[];
const pad=n=>String(n).padStart(2,"0");
const privateRepo="https://github.com/popvarachat/practika-car-digital-twin/issues/";
function buildAlerts(){
 const out=[];
 const put=(id,severity,kind,summary,owner,iso,action,measure,issue,caseNumber=null,affected=1)=>out.push(
  {id,severity,kind,summary,owner,iso,action,measure,issue,caseNumber,affected,
   state:"OPEN_EVIDENCE_GAP_NOT_FORMAL_NONCONFORMITY"});
 const sv=S.source_verification||{};
 const mismatches=S.source_event_reconciliation||{};
 const doc=S.document_revision_ambiguity||{};
 if((sv.gateway_409_hold||0)>0){
  put("DOC-HASH", "critical","Document Control",
    "เอกสารควบคุม "+(doc.code||sv.gateway_source_exception)+" มี Revision/Hash ขัดแย้ง", "DCC / ISO",
    "7.5", "เทียบไฟล์ Master กับ Revision History และอนุมัติก่อนปลด Hold",
    "Master SHA ที่อนุมัติ + Change Log + Gateway retest",4,null,Number(sv.gateway_409_hold));
 }
 Object.keys(mismatches).sort((a,b)=>Number(a)-Number(b)).forEach(key=>{
  const n=Number(key),data=mismatches[key]||{},code=cases.find(c=>c.n===n)?.audited_car||"CAR";
  put("CAR-"+pad(n),"high","Traceability",
    "เคส #"+pad(n)+" ข้อมูลเหตุการณ์/เลข CAR ยังไม่ตรงกัน ("+code+")",
    "DCC / QMR","7.5, 10.2",
    "จับคู่เหตุการณ์ ลูกค้า SO หน้างาน และวันที่จาก CAR ต้นฉบับ ก่อนแก้ทะเบียน",
    "Approved OLD→NEW Crosswalk + Change Log",3,n);
 });
 for(const item of S.plan_assurance?.car_crosswalk_mismatches||[]){
  put("PLAN-"+item.topic,"medium","Controlled Plan",
   item.topic+" อ้างอิง CAR/KPI ในแผนลงนามไม่ตรงกับต้นทาง",
   "Process Owner / DCC / QMR","7.5, 10.2",
   "ออก Controlled Corrigendum หรือ Rev ใหม่ ไม่แก้ PDF ลงนามย้อนหลัง",
   "Approved plan reference correction",5);
 }
 const qcMissing=Number(P.secondary_report?.qc_pass_without_evidence_link ?? sv.qc_pass_reported ??0);
 if(qcMissing>0){
  put("QC-CLAIM","high","Evidence Gap",
   "QC รายงาน PASS "+qcMissing+" เคส แต่ยังไม่มี Link/Record ของผลสุ่มงานจริงครบ",
   "QC / Process Owner","8.6, 9.1, 10.2",
   "เชื่อม WO/LOT, วันตรวจ, จำนวนที่สุ่ม, ผู้ตรวจ และ WI/FORM ฉบับใช้งาน",
   "Objective inspection records + sample/exposure",8,null,qcMissing);
 }
 const secondary=Number(P.secondary_report?.delivery_car_mismatches||0);
 if(secondary>0){
  put("DELIVERY-CAR","high","Traceability",
   "รายงานฝ่ายจัดส่งอ้างอิง CAR ต่างจากเหตุการณ์ "+secondary+" จุด",
   "Delivery / DCC","7.5, 10.2",
   "ยืนยัน G8/G9 กับ CAR/PDF และแก้ผ่านขั้นตอนควบคุมเอกสาร",
   "Secondary report controlled correction + record link",8,null,secondary);
 }
 const completed=Number(sv.wc_checks_with_real_outcome_in_master||0),total=Number(sv.wc_checks_in_master||0);
 if(total>completed){
  put("WC-RECHECK","high","Monitoring",
   "ทะเบียนสุ่มทวนสอบมีผลที่ตรวจรับได้ "+completed+"/"+total+" รายการ",
   "QC / SCD / Production / Delivery","9.1.3, 10.2",
   "เก็บผลจากงานหลังใช้มาตรการจริงและผู้ตรวจ พร้อมตัวหารการสุ่ม",
   "Verification Log + inspected WO/LOT/inspector",6,null,total-completed);
 }
 const qmr=Number(sv.effectiveness_qmr_verified_in_accessible_sources||0);
 if(cases.length>qmr){
  put("QMR-APPROVAL","medium","Approval Queue",
   "QMR รับรอง Effectiveness "+qmr+"/"+cases.length+" เคส — เป็นคิวอนุมัติ ไม่ใช่ NC โดยตัวมันเอง",
   "QMR / Process Owner","10.2",
   "พิจารณา G1–G5 ทีละเคสหลังมี Objective Record และช่วงติดตาม",
   "Signed QMR decision + post-change recurrence data",7,null,cases.length-qmr);
 }
 const kpi=Number(sv.kpi_preliminary),target=Number(sv.target);
 if(Number.isFinite(kpi)&&Number.isFinite(target)&&kpi>target){
  put("KPI-PTK06","high","Performance",
   "PTK_06 เบื้องต้น "+kpi+" สูงกว่าเป้าหมาย "+target+" ("+(kpi-target)+" เคส)",
   "QMR / MD / Process Owners","9.1.2, 9.1.3, 9.3",
   "ทบทวน Pareto สาเหตุข้ามฝ่าย วาง Preventive Control และรับรองเกณฑ์นับ",
   "Approved KPI rule + action effectiveness trend",7,null,kpi-target);
 }
 const feed=P.ingestion||{};
 if(feed.source_quality_status==="REQUIRES_OWNER_REVIEW"||
    feed.source_months_reconcile===false||feed.register_complete===false){
  const n=Number(feed.pending_incomplete_count||0);
  put("INTAKE-SOURCE-QUALITY","high","Input Reconciliation",
    "Complaint Intake สำเร็จ แต่มี "+n+" แถวข้อมูลยังไม่ครบ หรือ PMO/ทะเบียนยังไม่กระทบยอด",
    "CXD / PMO / QMR","7.5, 9.1.3",
    "รับเรื่องเข้าคิว Pending ก่อน แล้วให้เจ้าของแก้เดือน/รายละเอียดและจัดสรร PMO โดยไม่เขียนทับทะเบียน",
    "Controlled source row + month-weight crosscheck + reviewer receipt",9,null,Math.max(1,n));
 }
 const known=Number(feed.audited_case_count??cases.length),source=Number(feed.register_count??known);
 if(source>known){
  put("INTAKE-UNCLASSIFIED","high","New Intake",
   "มี Complaint ใหม่ "+(source-known)+" เรื่องที่ยังไม่เข้าสู่ Verified Case Dossier"+(feed.unclassified_case_ids?.length?" · "+feed.unclassified_case_ids.slice(0,8).join(", "):""),
   "CXD / QMR","8.2.1, 10.2",
   "สร้าง Complaint ID, มอบหมาย Owner, กำหนด SLA และเข้าคิวเชื่อม CAR โดยไม่เดาเลข",
   "New case queue + source event key + audit receipt",2,null,source-known);
 }
 const lastDate=Date.parse(feed.last_auto_success||"");
 const daysWithoutPoll=Number.isFinite(lastDate)?(Date.now()-lastDate)/86400000:Infinity;
 if(feed.last_sync_status==="FAILED"||feed.monitor_status==="STALE"||daysWithoutPoll>2.5){
  put("INGESTION-HEALTH","critical","Source Sync",
   "การรับข้อมูลอัตโนมัติไม่ผ่านหรือไม่มีผล Poll สำเร็จนานเกิน 2 วัน",
   "IT / QMR","7.5, 9.1.3",
   "ตรวจ Log ของ Sync, ความสดของ Summary26 และ Source SHA ห้ามนำ cache เก่าทับข้อมูลใหม่",
   "Last successful source snapshot + job result + reconciliation",2);
 }
 return out;
}
window.PTK_BUILD_ALERTS=buildAlerts;
const alertButton=document.getElementById('riskBtn');
if(alertButton){const n=buildAlerts().length;alertButton.textContent='⚠ Alerts ('+n+') / WQ6';alertButton.title=n+' source-backed exception candidates and prevention targets';}
let selected="all",query="";
function init(){
 const shell=root.querySelector(".wq-container");if(!shell)return;
 if(document.getElementById("ptkPlatformAlerts"))return;
 const section=document.createElement("section");section.id="ptkPlatformAlerts";section.className="wq-section ptk-alerts";
 const after=shell.querySelector(".wq-stats");
 if(after)after.insertAdjacentElement("afterend",section);else shell.prepend(section);
 section.addEventListener("click",evt=>{
   const chip=evt.target.closest("button[data-ptk-filter]");
   if(chip){selected=chip.dataset.ptkFilter;render();return;}
   const inbox=evt.target.closest("button[data-ptk-intake]");
   if(inbox){showPendingDossier(inbox.dataset.ptkIntake);return;}
   const goto=evt.target.closest("button[data-ptk-case]");
   if(goto)location.hash="#auditor-"+pad(Number(goto.dataset.ptkCase));
 });
 section.addEventListener("input",evt=>{
   if(evt.target.id==="ptkAlertSearch"){query=evt.target.value;renderRows();}
 });
 render();
}
function render(){
 const section=document.getElementById("ptkPlatformAlerts");if(!section)return;
 const alerts=buildAlerts();
 const n=kind=>alerts.filter(a=>a.severity===kind).length;
 const impacted=alerts.reduce((sum,a)=>sum+a.affected,0);
 section.innerHTML='<header><h3>Intelligence Alerts · Exception & Action Targeting</h3>'+
 '<p>กฎตรวจหลักฐานและความเสี่ยงจาก Snapshot ล่าสุด ไม่ใช่การออก NC ตาม ISO โดย AI</p></header>'+
 '<div class="ptk-alert-body"><div class="ptk-alert-metrics">'+
 [['Open Findings',alerts.length],['Critical',n("critical")],['High',n("high")],['Affected items',impacted]].map(x=>
 '<div><small>'+e(x[0])+'</small><strong>'+e(x[1])+'</strong></div>').join("")+'</div>'+
 '<div class="ptk-alert-notice"><b>การตัดสิน:</b> Evidence Gap / Potential Nonconformity เท่านั้น ไม่สรุปเป็น Official NC จนกว่า Auditor/QMR จะตรวจ'+
 ' · CAR 32/32 และ Attachment 91/91 เป็น Traceability QA ไม่ใช่ผลป้องกันซ้ำ</div>'+
 ((P.ingestion?.unclassified_case_ids||[]).length?
 '<div class="ptk-intake-inbox"><b>New Complaint Intake · รอจำแนกและเชื่อม CAR</b>'+
 (P.ingestion.unclassified_case_ids||[]).map(id=>
 '<button type="button" data-ptk-intake="'+e(id)+'">'+e(id)+' · Open Pending Dossier</button>').join("")+
 '<small>รับเข้าระบบได้ก่อนมี CAR; CXD/QMR เป็นผู้จับคู่และรับรองเลขเอกสาร</small></div>'+
 '<div id="ptkPendingDossier" aria-live="polite"></div>':"")+
 '<div class="ptk-alert-tools"><input id="ptkAlertSearch" aria-label="ค้นหา Alert" placeholder="ค้นหาเลขเคส / เจ้าภาพ / ประเด็น" value="'+e(query)+'">'+
 ['all','critical','high','medium'].map(k=>'<button type="button" data-ptk-filter="'+k+'" class="'+(selected===k?"active":"")+'">'+
 e(k==="all"?"ทั้งหมด":k.toUpperCase())+'</button>').join("")+'</div>'+
 '<div id="ptkAlertList"></div>'+
 '<div class="ptk-alert-foot">ข้อมูลอ้างอิง: Source Assurance '+e(S.assessed_at||"—")+
 ' · ต้นทาง SharePoint '+e((S.live_register_modified_at||"").slice(0,10))+
 ' · เจ้าภาพแก้ไฟล์ต้นฉบับและรับรองผลเอง · รายการจะคำนวณใหม่เมื่อมีการเผยแพร่ Snapshot ชุดใหม่</div></div>';
 renderRows();
}
function showPendingDossier(id){
 const box=document.getElementById("ptkPendingDossier");
 const safe=String(id||"");
 if(!box||!/^CC-2026-\d{3,}$/.test(safe))return;
 const steps=[
  ["01","Complaint Intake","DETECTED"],
  ["02","CXD Owner / SLA","PENDING REVIEW"],
  ["03","Correct CAR Identity","PENDING SOURCE"],
  ["04","Root Cause / Risk","PENDING ANALYSIS"],
  ["05","WI/FORM / Hard Gate","PENDING CONTROL"],
  ["06","Field Evidence / QMR","HUMAN GATE"]
 ];
 box.innerHTML='<div class="ptk-intake-dossier"><h4>Intake Lifecycle · '+e(safe)+'</h4>'+
 '<p>พบรหัสเหตุการณ์จากทะเบียนต้นทางแล้ว แต่ยังไม่เปิดเผยข้อมูลลูกค้า และยังไม่ถือว่า CAR/Root Cause ผ่านการทวนสอบ</p>'+
 '<div class="ptk-intake-steps">'+steps.map(s=>'<div><b>'+e(s[0])+' · '+e(s[1])+'</b><small>'+e(s[2])+'</small></div>').join("")+'</div>'+
 '<p><b>Next target:</b> CXD ยืนยันเรื่อง/เจ้าของ/SLA → DCC เชื่อม CAR ต้นฉบับ → QMR ตรวจมาตรการและผลเกิดซ้ำ</p>'+
 '<div class="ptk-alert-actions"><a href="https://github.com/popvarachat/practika-car-digital-twin/issues?q='+encodeURIComponent(safe)+'" target="_blank" rel="noopener noreferrer">เปิด Intake Issue (Private)</a>'+
 '<a href="'+e(A.register_url)+'" target="_blank" rel="noopener noreferrer">เปิดต้นทาง SharePoint (สิทธิ์องค์กร)</a></div></div>';
}
function renderRows(){
 const node=document.getElementById("ptkAlertList");if(!node)return;
 const alerts=buildAlerts().filter(a=>(selected==="all"||a.severity===selected)&&
  (!query||JSON.stringify([a.id,a.summary,a.owner,a.iso,a.action]).toLowerCase().includes(query.trim().toLowerCase())));
 node.innerHTML=alerts.length?alerts.map(a=>'<article class="ptk-alert-row" data-severity="'+e(a.severity)+'">'+
 '<div class="ptk-alert-rowhead"><strong>'+e(a.id)+' · '+e(a.kind)+'</strong><span class="ptk-alert-sev">'+e(a.severity.toUpperCase())+'</span></div>'+
 '<h4>'+e(a.summary)+'</h4>'+
 '<dl><div><dt>เจ้าภาพ</dt><dd>'+e(a.owner)+'</dd></div><div><dt>ข้อกำหนดที่ควรทวนสอบ</dt><dd>ISO 9001: '+e(a.iso)+'</dd></div>'+
 '<div><dt>แนวทางแก้/ป้องกัน</dt><dd>'+e(a.action)+'</dd></div>'+
 '<div><dt>หลักฐานที่ต้องใช้</dt><dd>'+e(a.measure)+'</dd></div></dl>'+
 '<div class="ptk-alert-actions"><a href="'+privateRepo+e(a.issue)+'" target="_blank" rel="noopener noreferrer">เปิดงานเจ้าภาพ #'+e(a.issue)+'</a>'+
 (a.caseNumber?'<button data-ptk-case="'+a.caseNumber+'" type="button">ดูเหตุการณ์ #'+pad(a.caseNumber)+'</button>':"")+
 '</div></article>').join(""):'<p class="ptk-alert-empty">ไม่พบ Alert ตามตัวกรองนี้</p>';
}
const last=window.PTK_RENDER_RISK;
window.PTK_RENDER_RISK=function(){if(typeof last==="function")last();init();render();};
init();
})();
