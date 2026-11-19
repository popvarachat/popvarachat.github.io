/* One case → all evidence surfaces in main Customer Complaint Web.
   Sanitized source/status data; no QMR approval inferred, no private bytes on GitHub.
*/
(function(){
"use strict";
const ROOT=document.getElementById("attachmentView");
const A=window.PTK_AUDITOR_DATA;
const T=window.PTK_ATTACHMENT_TWIN;
const S=window.PTK_SOURCE_ASSURANCE;
if(!ROOT||!A||!T||!S)return;
const inner=ROOT.querySelector(".twin-inner");
const hero=inner?.querySelector(".hero");
const verification=inner?.querySelector("#twin-verification-section");
if(!inner||!hero||!verification)return;
const carMap={1:"CXD-017",2:"CXD-022",3:"CXD-024",4:"CXD-025",5:"CXD-026",6:"CXD-027",7:"CXD-031",8:"CXD-030",9:"CXD-097",10:"CXD-089",11:"AMD-124",12:"CXD-088",13:"COO-073",14:"CXD-144",15:"CXD-149"};
const formatNumber=v=>String(v==null?"—":v);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const aCase=n=>A.cases.find(x=>Number(x.n)===Number(n));
const loc=id=>"http://127.0.0.1:8769/evidence/"+encodeURIComponent(id);
function currentCase(){
 const m=location.hash.match(/^#twin-(\d{1,2})$/);
 return m?Number(m[1]):8;
}
const section=document.createElement("section");
section.className="qmr-dossier";
section.id="oneCaseDossier";
section.setAttribute("aria-label","One Case ISO 9001 Evidence Dossier");
hero.insertAdjacentElement("afterend",section);
const weekSection=document.createElement("section");
weekSection.className="qmr-weekly-case";
weekSection.id="oneCaseWeekly";
weekSection.setAttribute("aria-label","Case-specific recurring prevention and real verification");
verification.insertAdjacentElement("beforebegin",weekSection);
const statusLabel=(key)=>({
 QC_REPORTED_PASS:"หน่วยงาน QC รายงาน PASS",
 SCD_REPORTED_CLOSED_NO_REPEAT:"ฝ่าย SCD รายงานไม่เกิดซ้ำ",
 MARKED_W1_W2:"มีการทำเครื่องหมายติดตาม W1/W2"
}[key]||"รอตรวจ");
function sourceById(id){return (S.live_sources||[]).find(x=>x.id===id)}
function weeklyByCase(n){
 const fn=window.PTK_WEEKLY_FOR_CASE;
 return typeof fn==="function"?fn(n):[];
}
function evidenceClaim(n){
 const list=S.case_evidence?.[String(n)]||[];
 if(!list.length)return '<div class="qmr-proof-alert">ยังไม่พบผลตรวจรายเคสจาก 3 รายงานหน่วยงานที่เชื่อมในรอบนี้ · ไม่ได้แปลว่าไม่เคยตรวจ</div>';
 return '<ul class="qmr-mini-list">'+list.map(x=>{
  const src=sourceById(x.source);
  return '<li><strong>'+esc(statusLabel(x.state))+'</strong><div>'+esc(x.label)+'</div>'+
    '<p class="qmr-inline-status">'+esc(x.caveat)+'</p>'+
    (src?'<a class="qmr-source-link" href="'+loc(src.gateway_code)+'" target="_blank" rel="noopener noreferrer">เปิดไฟล์ต้นทาง '+esc(src.label)+' บน NB ↗</a>':'')+'</li>';
 }).join("")+'</ul>';
}
function docChanges(c){
 const docs=c.docs||[];
 const revised=docs.filter(x=>x.local_source_status==="REVISION_DETECTED_AFTER_AUDIT");
 const retired=docs.filter(x=>x.local_source_status==="RETIRED_NO_CURRENT_SOURCE");
 const changed=docs.filter(x=>x.code===S.source_verification.gateway_source_exception);
 let arr=[];
 if(revised.length)arr.push('<div>พบเอกสารออกฉบับใหม่หลังรอบ CAR Audit: '+revised.map(x=>esc(x.code)).join(", ")+'</div>');
 if(retired.length)arr.push('<div>ฟอร์มยกเลิกจากชุดใช้งาน: '+retired.map(x=>esc(x.code)).join(", ")+'</div>');
 if(changed.length)arr.push('<div><b>'+esc(S.source_verification.gateway_source_exception)+'</b> เปลี่ยนเนื้อหาเมื่อ 19 พ.ย. · Gateway HTTP 409 · ต้องให้ DCC ตรวจ Revision</div>');
 return arr.length?'<div class="qmr-proof-alert">'+arr.join("")+'</div>':'<div class="qmr-valid-note">ไม่พบรหัสเอกสารในเคสนี้อยู่ในรายการ SHA-256 ที่เปลี่ยนในการตรวจครั้งล่าสุด</div>';
}
function caseProof(n){
 const c=aCase(n);
 const code=carMap[n]||null;
 const roots=code?T.root_nodes.filter(x=>x.car===code):[];
 const embedded=code?T.nodes.filter(x=>x.car===code):[];
 const src=S.source_verification;
 const caseHold=c.car_identity==="CONFLICT"||c.car_identity==="REGISTERED_EVIDENCE_PENDING";
 const selfClaims=S.case_evidence?.[String(n)]||[];
 const groups=A.groups.filter(x=>x.ids.includes(n));
 const docs=(c.docs||[]);
 const sourceProof=code?'<dl>'+
   '<div><dt>CAR ที่ใช้เจาะข้อมูล</dt><dd>'+esc(code)+'</dd></div>'+
   '<div><dt>ต้นฉบับ PDF ที่พบ</dt><dd>'+roots.length+' ฉบับ</dd></div>'+
   '<div><dt>FileAttachment ภายใน</dt><dd>'+embedded.length+' รายการ</dd></div>'+
   '<div><dt>เอกสาร QP/WI/FORM ที่เชื่อม</dt><dd>'+docs.length+' รหัส</dd></div>'+
   '</dl>':'<div class="qmr-proof-alert">ยังไม่จับคู่เหตุการณ์กับ CAR ตัวจริงได้ จึงไม่ดึงไฟล์แนบของเคสอื่นมาใช้แทน</div>';
 const link=(key,title)=>'<button type="button" data-dossier-view="'+key+'" data-dossier-case="'+n+'">'+esc(title)+'</button>';
 section.innerHTML=
  '<div class="qmr-dossier-head"><div><span class="qmr-overline">ALL-IN-ONE CASE DOSSIER · ISO 9001:2015 / SOURCE VERIFIED</span>'+
   '<h2>#'+pad(n)+' · '+esc(c.project||c.id)+'</h2><p>'+esc(c.event)+'</p></div>'+
   '<aside><span class="qmr-mark">ทะเบียนกลาง 17 พ.ย. 69 · ตรวจต้นทาง 19 พ.ย.</span>'+
   '<span class="qmr-mark '+(caseHold?"warn":"")+'">'+(caseHold?"CAR / Event mapping ต้องสอบกลับ":"CAR source มีหลักฐานที่จับคู่ได้")+'</span>'+
   '<span class="qmr-mark warn">Effective ยังไม่รับรองโดย QMR</span>'+
   '<span class="qmr-mark warn">Local Gateway QA: '+src.gateway_expected_results+'/'+src.gateway_requests_checked+' · 1 ฉบับต้อง DCC ทวนสอบ</span></aside></div>'+
  '<div class="qmr-stat-strip">'+
   '<div class="qmr-stat"><span>Complaint ทั้งองค์กร</span><b>'+src.events_registered+'</b><small>Summary26 = '+src.events_in_summary+'</small></div>'+
   '<div class="qmr-stat"><span>PTK_06 เบื้องต้น</span><b>'+src.kpi_preliminary+'</b><small>เป้า ≤ '+src.target+' / รอวิธีนับ QMR</small></div>'+
   '<div class="qmr-stat"><span>CAR / Original PDF</span><b>'+roots.length+'</b><small>ตามเคสที่เลือก</small></div>'+
   '<div class="qmr-stat"><span>FileAttachment L1/L2</span><b>'+embedded.length+'</b><small>อ่านจากไฟล์บน W:</small></div>'+
   '<div class="qmr-stat"><span>สถานะ QMR Effectiveness</span><b>HOLD</b><small>ไม่อนุมัติจากปุ่มบนเว็บ</small></div>'+
  '</div>'+
  '<div class="qmr-evidence-cards">'+
   '<section class="qmr-case-card"><h3>1 · Complaint / CAR Identity</h3><dl>'+
    '<div><dt>ทะเบียนรวม</dt><dd>'+esc(c.register_car||"ยังไม่ระบุ")+'</dd></div>'+
    '<div><dt>ชีตรายเดือน</dt><dd>'+esc(c.month_detail_car||"ไม่มีเลขยืนยัน")+'</dd></div>'+
    '<div><dt>แฟ้ม CAR ที่ตรวจ</dt><dd>'+esc(c.audited_car||"ยังไม่พบแฟ้มจับคู่")+'</dd></div>'+
    '<div><dt>ระดับวิเคราะห์เดิม</dt><dd>'+esc(c.review_level)+'</dd></div></dl>'+
    (c.identity_discrepancy?'<p class="qmr-caution"><b>ตรวจ CAR PDF ต้นฉบับ:</b> '+esc(c.original_pdf_event_summary)+'<div>'+esc(c.identity_discrepancy)+'</div></p>':'')+
    (caseHold?'<p class="qmr-caution">'+esc(c.needs_review||"หมายเลข CAR ไม่ตรงกับต้นทาง ต้องยืนยันก่อนใช้รับรอง")+'</p>':
    '<p class="qmr-positive">เลข CAR จับคู่ในระดับทะเบียน/แหล่งที่ตรวจได้ แต่ยังไม่แทนการอนุมัติ QMR</p>')+
    '<h3 style="margin-top:12px">Failure Mode / Risk ที่เกี่ยวข้อง</h3>'+
    '<ul class="qmr-mini-list">'+(groups.length?groups.map(g=>'<li>'+esc(g.label)+'</li>').join(""):'<li>ยังไม่ได้จัดกลุ่มความเสี่ยง</li>')+'</ul></section>'+
   '<section class="qmr-case-card"><h3>2 · CAR / WI / FORM / Embedded Evidence</h3>'+sourceProof+
    '<h3 style="margin-top:12px">จุดควบคุมที่ต้องพิสูจน์</h3><p>'+esc(c.required_control||"ต้องวิเคราะห์จาก CAR ที่ตรงเหตุการณ์")+'</p>'+docChanges(c)+'</section>'+
   '<section class="qmr-case-card"><h3>3 · Records & Effectiveness</h3>'+
    evidenceClaim(n)+
    '<h3 style="margin-top:12px">QMR Effectiveness Gate</h3><p>หากไม่มี WO/ล็อตงานจริง, วันที่ตรวจ, ผล PASS/FAIL, ผู้ตรวจ, การปิดความเสี่ยง และผู้อนุมัติ QMR จะยังไม่รับรองว่าไม่เกิดซ้ำ</p>'+
    '<div class="qmr-proof-alert"><b>หลักฐานที่ยังขาด:</b> '+esc(c.blocked_by||"ยังไม่ครบ")+'</div></section>'+
  '</div>'+
  '<div class="qmr-proof-alert" style="margin:0 13px 12px"><b>Source-verified signed plan:</b> QPFM-29-001 Rev.08 วันที่ 13 พ.ย. มีภาพลายเซ็นในช่องจัดทำ/ทบทวน/อนุมัติ 3 ตำแหน่ง; ยังมี 4 จุดที่เลข CAR/KPI อ้างอิงต้องแก้ไขและออกฉบับทบทวนตามขั้นตอน DCC · <a class="qmr-source-link" href="http://127.0.0.1:8769/evidence/QMR-SIGNED-PLAN-PDF" target="_blank" rel="noopener noreferrer">เปิด Action Plan PDF บน NB ↗</a> · QC Workbook มีภาพกิจกรรมตรวจ 6 ภาพ และ Delivery Workbook อีก 3 ภาพ (หลักฐานกิจกรรม ไม่เท่ากับ Effectiveness)</div>'+
   '<div class="qmr-dossier-nav">'+
    link("case","เหตุและ Root Cause")+
    link("docs","เปิด WI / FORM")+
    link("auditor","แนวตอบ External Auditor")+
    link("risk","WQ6 / Weekly Matrix")+
    '<a href="'+esc(A.register_url)+'" target="_blank" rel="noopener noreferrer">ทะเบียน SharePoint (สิทธิ์องค์กร) ↗</a>'+
    '<a href="'+esc(S.governance.private_report)+'" target="_blank" rel="noopener noreferrer">Source Reconciliation (Private) ↗</a>'+
    '</div>'+
   '<div class="qmr-dossier-foot">ทุกหลักฐานอยู่ในเส้นทางเดียวกันภายใน Web นี้ · ไฟล์ PDF/Excel จริงเปิดจาก localhost บน NB เท่านั้น · ข้อความ PASS ของฝ่ายไม่ใช่ผลรับรอง QMR</div>';
}
function drawCaseWeeks(n){
 const c=aCase(n),rows=weeklyByCase(n);
 const list=rows.map(x=>
  '<article class="qmr-weekly-item"><div><b>'+esc(x.owner)+' · '+esc(x.week)+'</b><small>'+esc(x.period)+'</small></div>'+
   '<p>'+esc(x.action)+'</p><p><b>หลักฐานที่จะใช้:</b> '+esc(x.evidence_required)+'</p>'+
   '<span class="qmr-unverified">แผนตรวจ · ยังไม่พบหลักฐานทวนสอบครบในทะเบียนกลาง</span></article>').join("");
 weekSection.innerHTML='<header><div><h3>4 · Weekly Recurrence Prevention ที่ตรงกับเคส #'+pad(n)+'</h3>'+
 '<small>เชื่อมแผน WQ6 Nov–Dec 2569 จาก 9 หน่วยงาน · ไม่สร้างผล PASS จากเครื่องหมายในแผน</small></div>'+
 '<small>'+rows.length+' รอบที่อ้างถึงเคสนี้</small></header>'+
 '<div class="qmr-weekly-body">'+(rows.length?'<div class="qmr-weekly-grid">'+list+'</div>':
 '<div class="qmr-proof-alert">ยังไม่มีหัวข้อแผนแบบเจาะเคสนี้ใน Gantt 81 รอบ · ต้องมอบหมายเจ้าภาพตามระดับความเสี่ยง</div>')+
 '<div class="qmr-proof-alert"><b>ทะเบียน WC01–WC14:</b> 40 ประเด็นยังไม่แสดงผลตรวจจริงในช่องบันทึกทวนสอบกลาง · '+'<a class="qmr-source-link" href="'+loc("WC-CENTRAL")+'" target="_blank" rel="noopener noreferrer">เปิดทะเบียนตรวจกลางบน NB ↗</a></div></div>';
}
function draw(n){
 const c=aCase(n);if(!c)return;
 caseProof(n);drawCaseWeeks(n);
}
ROOT.addEventListener("click",function(event){
 const target=event.target.closest("[data-dossier-view]");
 if(!target)return;
 const n=Number(target.dataset.dossierCase)||currentCase();
 const t=target.dataset.dossierView;
 if(t==="risk")location.hash="#risk";
 else if(["case","docs","auditor"].includes(t))location.hash="#"+t+"-"+pad(n);
});
const original=window.PTK_RENDER_TWIN;
window.PTK_RENDER_TWIN=function(n){
 if(typeof original==="function")original(n);
 draw(Number(n)||currentCase());
};
draw(currentCase());
})();