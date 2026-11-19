/* ISO 9001 Auditor Traceability overlay — source-grounded, public-safe, same-page navigation. */
(function(){
"use strict";
var DATA=window.PTK_AUDITOR_DATA;
var panel=document.getElementById("auditorView");
var button=document.getElementById("auditorBtn");
if(!DATA||!panel||!button)return;
var selected=8,mode="case";
function e(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]})}
function pad(n){return String(n).padStart(2,"0")}
function item(n){return DATA.cases.find(function(x){return x.n===Number(n)})}
function nam(x){return "#"+pad(x.n)+" "+(x.project||"")}
function t(v){return e(v||"ยังไม่พบข้อมูล")}
function card(label,value,sub,kind){return '<div class="au-metric '+(kind||"")+'"><span>'+e(label)+'</span><strong>'+e(value)+'</strong><small>'+e(sub)+'</small></div>'}
function isoList(c){var basic=["10.2","7.5"];if([1,3,6,12,14].includes(c.n))basic.push("8.4","8.5.1");if([4,7,8,9,10].includes(c.n))basic.push("8.3","8.6");if([2,5,11,13,15].includes(c.n))basic.push("8.2.1","9.1.2");return Array.from(new Set(basic))}
function identity(c){if(c.car_identity==="CONFLICT")return {s:"HOLD · หมายเลขขัดกัน",cls:"hold"};if(c.car_identity==="REGISTERED_EVIDENCE_PENDING")return {s:"ลงทะเบียนแล้ว · รอแฟ้ม CAR",cls:"pending"};return {s:"จับคู่ระดับทะเบียน",cls:"ok"}}
function docState(c){if(c.review_level==="L2")return {s:"พบเอกสารควบคุมที่เกี่ยวข้อง",cls:"ok"};if(c.review_level==="L1")return {s:"มีแนวทาง / ยังไม่พิสูจน์บังคับใช้",cls:"pending"};return {s:"ยังไม่ยืนยันมาตรการควบคุม",cls:"hold"}}
function pill(text,cls){return '<span class="au-pill '+(cls||"")+'">'+e(text)+'</span>'}
function caseLink(n){var c=item(n);return c?'<button type="button" class="au-case-chip" data-aud-case="'+n+'">'+e(nam(c))+'</button>':""}
function sourceLinks(){return '<div class="au-sources"><a href="'+e(DATA.register_url)+'" target="_blank" rel="noopener noreferrer">ทะเบียน SharePoint (สิทธิ์องค์กร) ↗</a><a href="'+e(DATA.sources.carAudit)+'" target="_blank" rel="noopener noreferrer">QMR CAR Audit (Private) ↗</a><a href="'+e(DATA.sources.docs)+'" target="_blank" rel="noopener noreferrer">WI/FORM Lineage (Private) ↗</a><a href="'+e(DATA.sources.reconciliation)+'" target="_blank" rel="noopener noreferrer">กระทบยอด 18 พ.ย. (Private) ↗</a><a href="'+e(DATA.sources.docGatewayReindex)+'" target="_blank" rel="noopener noreferrer">สถานะ QP/WI/FORM 18 พ.ย. (Private) ↗</a><a href="'+e(DATA.sources.evidenceAssuranceLedger)+'" target="_blank" rel="noopener noreferrer">Evidence Assurance 15 เคส (Private) ↗</a><a href="'+e(DATA.sources.effectivenessEvidenceScreen)+'" target="_blank" rel="noopener noreferrer">ผลสแกน CAR 27 ฉบับ (18 พ.ย.) · ขยายล่าสุด 32 ฉบับใน CAR Original ↗</a><a href="'+e(DATA.sources.evidenceReconciliation)+'" target="_blank" rel="noopener noreferrer">ผลทวนสอบ QC / SCD / จัดส่ง · 19 พ.ย. (Private) ↗</a><a href="'+e(DATA.sources.carIdentityReview)+'" target="_blank" rel="noopener noreferrer">CAR ต้นฉบับ 15 รหัส / ข้อมูลขัดกัน 6 เคส (Private) ↗</a></div>'}
var questions=[
{id:"scope",cl:"9.1.2 · 9.1.3 · 9.3",q:"จำนวนข้อร้องเรียนและเหตุผลที่ KPI PTK_06 ไม่ผ่านคืออะไร?",a:"ทะเบียนรวมและ Summary26 ที่แก้ไขล่าสุด 17 พ.ย. 2569 แสดง 15 เหตุการณ์ รวมเคส CXD-149 แล้ว โดยมี COO-073 ที่แยกนับตามเกณฑ์เดิม จึงคาดว่าเข้า PTK_06 จำนวน 14 เคส เทียบเป้าหมายไม่เกิน 10 เคส/ปี ต้องให้ QMR ยืนยันยอดทางการก่อนใช้ลงนาม",pending:"มติวิธีนับ COO-073, หลักฐานรับรองยอด PTK_06 และการวิเคราะห์แนวโน้มที่มีตัวหารสอดคล้อง",ids:[13,15]},
{id:"response",cl:"8.2.1 · 9.1.2",q:"เมื่อได้รับ Complaint บริษัทควบคุมการสื่อสารกับลูกค้าอย่างไร?",a:"พบ WI-OFM-001 เป็นกระบวนการรับและติดตามข้อร้องเรียนเดิม โดยกรณีไม่ติดต่อกลับลูกค้าต้องตรวจว่ามีการใช้ขั้นตอนจริงหรือไม่ ไม่ควรอ้างเพียงว่ามี WI แล้วถือว่าลูกค้าพอใจ",pending:"เวลาแจ้งรับเรื่อง, เจ้าของเคส, หลักฐานแจ้งความคืบหน้า, การยอมรับผลแก้ไขจากลูกค้า",ids:[2,5,13,15]},
{id:"cause",cl:"10.2",q:"พิสูจน์ Root Cause และป้องกันปัญหาคล้ายกันในแผนกอื่นอย่างไร?",a:"QMR แยกประเด็นข้ามฝ่าย เช่น งานผลิต งานออกแบบ การควบคุม Supplier และการส่งต่อข้อมูล แล้วเชื่อมกับการแก้จุดควบคุม แต่ Root Cause ที่มีใน CAR ไม่เท่ากับพิสูจน์ว่าใช้งานใหม่แล้ว",pending:"Evidence chain: RCA ที่ยืนยัน → WI/FORM/Gate ที่ประกาศใช้ → Record ของงานใหม่ → ข้อมูลเกิดซ้ำ/ไม่เกิดซ้ำ",ids:[1,4,7,8,9,13]},
{id:"docs",cl:"7.5 · 10.2",q:"แสดงหลักฐานว่าเปลี่ยน WI/FORM ที่ตรงสาเหตุจริงได้หรือไม่?",a:"ยืนยันความเกี่ยวข้องของ WI-SCD-001 ใน CXD-026 และ WI-M1S-027 Rev.6 หน้า 13 ใน CXD-030 จากการตรวจเอกสารควบคุมถึง 15 ต.ค. 2569 แต่เอกสารที่เกี่ยวข้องอื่นเป็นเพียงจุดควบคุมที่ต้องตรวจ ไม่ใช่ข้อพิสูจน์ว่าแก้ WI เพราะ CAR ทุกฉบับ",pending:"DCC approval, revision history, training acknowledgement, usage record และ next-job verification",ids:[5,8]},
{id:"release",cl:"8.5.1 · 8.6",q:"ทำอย่างไรไม่ให้ Defect หลุดถึงลูกค้าอีก?",a:"เสนอการตรวจ First Piece / Test Fit / Surface Finish / Sharp Edge / Pre-delivery hold point โดยเลือกงานจริงที่มีลักษณะเดียวกับเคสที่เคยเกิด แล้วตรวจเอกสารและผู้อนุมัติปล่อยงาน ไม่ใช้การสุ่มปลายทางแทนมาตรฐานที่จำเป็นต้องตรวจทุกครั้ง",pending:"QCC หรือ checklist ที่ลงชื่อ, ภาพหลักฐาน, ปริมาณงานตรวจ, FPY, rework และ customer escape",ids:[4,8,10,14]},
{id:"external",cl:"8.4 · 8.5.1",q:"ควบคุม Supplier ทีมติดตั้ง และบุคคลที่เข้าพื้นที่ลูกค้าอย่างไร?",a:"ประเด็นประตูล้มและ Toyota สะท้อนความจำเป็นของ Crew Approval / Fastener Check / Training Matrix × Roster ก่อนเข้าพื้นที่ มีเอกสารเดิมบางส่วน แต่ยังไม่พบหลักฐานว่าจุดควบคุมใหม่บังคับทำงานได้จริง",pending:"รายชื่อทีมและคุณสมบัติ, ความถูกต้องจุดยึด, การอนุมัติเปลี่ยนทีม, ผลสุ่มตรวจหน้างาน",ids:[1,6,12,14]},
{id:"effectiveness",cl:"10.2.1(d) · 10.2.2",q:"CAR ที่ปิดแล้วพิสูจน์ได้อย่างไรว่าไม่เกิดซ้ำ?",a:"ผลตรวจ 19 พ.ย. พบ QC ลง PASS 3 เคส และ SCD รายงานไม่เกิดซ้ำ 3 เคส พร้อมภาพกิจกรรมตรวจจากไฟล์จริง แต่ทะเบียน WC กลาง 40 ประเด็นยังไม่มีผลทวนสอบครบ และยังไม่พบตัวอย่าง WO/ล็อตงานหลังแก้ที่ตรวจรับอย่างเป็นอิสระและอนุมัติโดย QMR จึงห้ามยกระดับเป็น Effectiveness Verified",pending:"กำหนดช่วงตรวจซ้ำอย่างมีเหตุผล, จำนวนงานที่ตรวจ, ความถี่ defect, ผู้อนุมัติ, หลักฐานลูกค้าและความเสี่ยงคงเหลือ",ids:[5,8,9,12]},
{id:"risk",cl:"6.1 · 9.3 · 10.2",q:"ผู้บริหารทบทวนความเสี่ยงจากข้อร้องเรียนในภาพรวมอย่างไร?",a:"ประเด็นความเสี่ยง WQ6 ต้องโยงจากเหตุการณ์จริงไปสู่ความเสี่ยงข้ามฝ่าย และติดตาม Leading Indicators ควบคู่ผล Complaint โดยไม่สรุปว่าไม่มีเคสในเดือนใหม่หากทะเบียนยังไม่ครบ",pending:"แผนลงนาม QPFM-29-001 ที่มีภาพลายเซ็นแล้วแต่เลข CAR อ้างอิงบางจุดยังไม่ตรง, Risk Register อนุมัติ, ผลตรวจ W1/W2 ที่ผูกหลักฐานจริง และ Residual Risk",ids:[1,9,13,15]}
];
function nav(){return '<div class="au-top"><div><span class="au-overline">ISO 9001:2015 / AUDITOR READINESS · READ ONLY</span><h2>ข้อร้องเรียน → CAR → Root Cause → WI/FORM → Record → ตรวจเกิดซ้ำ</h2><p>เส้นทางหลักฐานฉบับอ่านง่ายบนหน้าเดียว แสดงสิ่งที่ตรวจพบและสิ่งที่ยังพิสูจน์ไม่ได้แยกกัน</p></div><div class="au-proof">'+pill("CAR/WI analysis 15 ต.ค. 2569","pending")+pill("ทะเบียนล่าสุด 17 พ.ย. 2569","ok")+pill("CAR ต้นฉบับ 32 ฉบับ / 91 Attachment · 19 พ.ย.","ok")+'</div></div>'+
'<div class="au-stats">'+card("เหตุการณ์ในทะเบียน",DATA.totals.register,"Summary26 = "+DATA.totals.summary26)+card("PTK_06 เบื้องต้น",DATA.totals.provisional_eligible,"เป้าหมาย ≤ "+DATA.totals.target,"au-warn")+card("CAR identity ต้องสอบกลับ",DATA.totals.identity_conflicts,"เคสที่มีข้อมูลต่างแหล่ง","au-warn")+card("Effectiveness รับรอง",DATA.totals.effectiveness_verified,"จาก 15 เคสที่ติดตาม","au-warn")+'</div>'+
'<div class="au-modes"><button class="'+(mode==="case"?"active":"")+'" data-aud-mode="case">01 · ไล่หลักฐานรายเคส</button><button class="'+(mode==="questions"?"active":"")+'" data-aud-mode="questions">02 · คำถาม External Auditor</button><button class="'+(mode==="connections"?"active":"")+'" data-aud-mode="connections">03 · จุดเสี่ยงข้ามกระบวนการ</button><span class="au-stretch"></span><button class="au-outline" data-aud-print="1">พิมพ์ Evidence Brief</button></div>'}
function chain(c){
var idState=identity(c),doc=docState(c);
var steps=[
["01","Incident","REGISTERED","พบในทะเบียนรวม","ok"],
["02","CAR identity",idState.s,"จับคู่เหตุการณ์กับเอกสาร",idState.cls],
["03","Root Cause",c.review_level==="HOLD"?"WAIT":"ANALYZED","มีข้อความวิเคราะห์ แต่ต้องสอบหลักฐาน","pending"],
["04","WI / FORM",doc.s,"เอกสาร ≠ การใช้งานจริง",doc.cls],
["05","Implementation","NOT VERIFIED","ไม่มีหลักฐานงานใหม่ครบพอ","hold"],
["06","Effectiveness","NOT VERIFIED","สแกน PDF 27 ฉบับแล้ว แต่ยังไม่พบผลตรวจซ้ำจากงานจริงที่ตรวจสอบและอนุมัติครบ","hold"]
];
return '<div class="au-chain">'+steps.map(function(st,i){return '<div class="au-step '+st[4]+'"><span class="au-stepn">'+st[0]+'</span><strong>'+e(st[1])+'</strong><b>'+e(st[2])+'</b><small>'+e(st[3])+'</small></div>'}).join("")+'</div>'}
function docRows(c){
 if(!c.docs.length)return '<div class="au-empty">ยังไม่พบ controlled document lineage ที่ตรวจสอบสำหรับเคสนี้ · ต้องขอ DCC ยืนยันรหัสและ Revision</div>';
 return '<div class="au-docgrid">'+c.docs.map(function(d){
   var status='';
   if(d.local_source_status==="REVISION_DETECTED_AFTER_AUDIT")
     status='<small style="padding:5px;background:#e8f6f5;border-radius:5px;color:#276d73">W: พบฉบับใหม่ประกาศใช้ '+e(d.local_source_release)+' · ใหม่กว่าหลักฐาน CAR/WI Audit เดิม ต้องทบทวน DCC</small>';
   if(d.local_source_status==="RETIRED_NO_CURRENT_SOURCE")
     status='<small style="padding:5px;background:#fff1e9;border-radius:5px;color:#914735">พบฉบับเก่าในโฟลเดอร์ยกเลิก · ห้ามใช้เป็นแบบฟอร์มปัจจุบัน</small>';
   return '<div class="au-doc"><div><strong>'+e(d.code)+'</strong>'+pill(d.kind,'small')+'</div><div>ประกาศใช้ตามชุดที่ตรวจ 15 ต.ค.: '+e(d.release)+'</div><small>'+
    (d.linkage==="CONTROLLED_REVISION_RELEVANT"?"หลักฐานเอกสารควบคุมที่เกี่ยวข้องกับสาเหตุ (L2)":"เอกสารเกี่ยวข้องที่ค้นพบ — ยังไม่ยืนยันเป็น Revision จาก CAR")+'</small>'+status+'</div>';
 }).join("")+'</div>';
}
function casePanel(){
var c=item(selected)||DATA.cases[0],ic=identity(c);
var docs=docRows(c);
var notes=(c.doc_notes||[]).length?'<ul class="au-notes">'+c.doc_notes.map(function(x){return '<li>'+t(x)+'</li>'}).join("")+'</ul>':'<div class="au-empty">ยังไม่มีบันทึกตรวจ CAR/PDF ที่ยืนยันสำหรับกรณีนี้</div>';
var answer="เหตุการณ์ "+nam(c)+" ("+c.id+")\nทะเบียนรวม CAR: "+(c.register_car||"ยังไม่ระบุ")+
"\nผลตรวจแฟ้ม CAR ถึง 15 ต.ค.: "+(c.audited_car||"ยังไม่จับคู่")+"\nRoot Cause/ข้อวิเคราะห์: "+c.cause+
"\nมาตรการควบคุมที่ต้องพิสูจน์: "+c.required_control+"\nหลักฐานที่ยังขาด: "+c.blocked_by+
"\nการทวนสอบ: "+c.test_required+"\nข้อจำกัด: ไม่รับรอง Effectiveness จนมีหลักฐานการใช้จริงและอนุมัติโดย QMR.";
window.__auditCopyCase=answer;
var others=(c.related||[]).map(function(g){return '<div class="au-connect-row"><strong>'+e(g.label)+'</strong><div>'+g.ids.map(caseLink).join("")+'</div></div>'}).join("");
return '<div class="au-section-head"><div><span class="au-overline">COMPLAINT IDENTITY: '+e(c.id)+'</span><h3>'+e(nam(c))+'</h3><p>'+t(c.event)+'</p></div><div class="au-case-controls"><label for="auSelect">เลือกเคส</label><select id="auSelect" aria-label="เลือกเคส">'+DATA.cases.map(function(y){return '<option value="'+y.n+'" '+(y.n===c.n?"selected":"")+'>'+e(nam(y))+'</option>'}).join("")+'</select></div></div>'+
'<div class="au-tags">'+pill("ISO "+isoList(c).join(" / "),"ok")+pill("ทะเบียน: "+(c.register_status||"-"),"pending")+pill("QMR level: "+c.review_level,c.review_level==="L2"?"ok":"pending")+pill(ic.s,ic.cls)+'</div>'+
chain(c)+
'<div class="au-layout"><div class="au-maincol"><section class="au-box"><h4>เหตุการณ์และที่มาของหมายเลข CAR</h4><div class="au-pair"><div><span>CAR ในทะเบียนรวม (17 พ.ย.)</span><strong>'+t(c.register_car)+'</strong></div><div><span>CAR ในชีตรายเดือน</span><strong>'+t(c.month_detail_car||"ไม่พบรายการยืนยัน")+'</strong></div><div><span>CAR ตาม PDF ต้นฉบับที่ตรวจ (15 ต.ค.–19 พ.ย.)</span><strong>'+t(c.audited_car)+'</strong></div></div><p class="au-info '+(c.car_identity==="CONFLICT"?"hold":"")+'">'+t(c.needs_review)+'</p>'+(c.original_pdf_event_summary?'<div class="au-info"><b>เหตุการณ์ตาม CAR PDF ต้นฉบับ:</b> '+t(c.original_pdf_event_summary)+'</div>':'')+(c.identity_discrepancy?'<div class="au-info hold">'+t(c.identity_discrepancy)+'</div>':'')+'<div class="au-control-row"><button data-aud-original="'+c.n+'">เปิดหน้าวิเคราะห์เคสเดิม</button><button data-aud-docs="'+c.n+'">เปิด WI/FORM Intelligence</button><button data-aud-twin="'+c.n+'">CAR + Attachments L1/L2</button></div></section>'+
'<section class="au-box"><h4>Root Cause / ปัญหาที่ควบคุมไม่อยู่</h4><p>'+t(c.cause)+'</p><div class="au-inline-head">สิ่งที่พบในหลักฐาน</div><p>'+t(c.evidence_summary)+'</p><div class="au-inline-head">ประเด็นจากการตรวจ CAR (Snapshot 15 ต.ค.)</div>'+notes+'</section>'+
'<section class="au-box"><h4>มาตรการที่ต้องบังคับใช้ในระบบ</h4><p>'+t(c.required_control)+'</p><div class="au-inline-head">เจ้าภาพข้ามฝ่ายที่ต้องร่วมตรวจ</div><p>'+t(c.owner)+'</p></section>'+
'<section class="au-box"><h4>WI / FORM / QP ที่โยงกับเคส</h4><p class="au-help">คลิกดูรหัสและวันประกาศใช้ได้ทันที แต่รายการ “เกี่ยวข้อง” ไม่ได้หมายความว่าแก้ WI จาก CAR แล้ว</p>'+docs+'</section></div>'+
'<div class="au-sidecol"><section class="au-box au-critical"><h4>Audit Gate · อะไรยังขาด</h4><p>'+t(c.blocked_by)+'</p><div class="au-inline-head">ทดสอบงานถัดไปเพื่อพิสูจน์</div><p>'+t(c.test_required)+'</p><div class="au-no-pass">NOT EFFECTIVE VERIFIED · ห้ามสรุปว่าผ่าน</div></section>'+
'<section class="au-box"><h4>คำตอบที่ใช้คุยกับ Auditor</h4><p>มีทะเบียนและบันทึก CAR ที่ตรวจสอบย้อนหลัง พร้อมระบุจุดเปลี่ยนระบบและช่องว่างหลักฐานอย่างโปร่งใส <b>สถานะ DONE ของ CAR ไม่ใช่การรับรองผลป้องกันซ้ำ</b></p><button class="au-copy" data-aud-copy="case">คัดลอก Evidence Brief รายเคส</button></section>'+
'<section class="au-box"><h4>เคสอื่นที่ใช้ Failure Mode / Gate ร่วมกัน</h4>'+(others||'<p>ยังไม่จัดเข้า Cross-case Cluster</p>')+'</section>'+
'<section class="au-box"><h4>Source Authority</h4><p class="au-help">หลักฐาน PDF/WI/FORM ต้นฉบับต้องเปิดจากระบบองค์กรโดยผู้มีสิทธิ์; URL Private อาจต้องล็อกอิน ไม่เผยเอกสารควบคุมบนเว็บสาธารณะ</p>'+sourceLinks()+'</section></div></div>'}
function questionPanel(){return '<div class="au-section-head"><div><span class="au-overline">AUDITOR QUESTIONS / EVIDENCE-BASED ANSWERS</span><h3>คำถามที่ Auditor อาจถาม และคำตอบที่ตรวจสอบกลับได้</h3><p>คำตอบนี้เป็นแนวทางอธิบายจากหลักฐานที่มีจริง ไม่ใช่ผลการรับรองหรือการแทนคำตอบของ Process Owner</p></div></div>'+
'<div class="au-qgrid">'+questions.map(function(q,i){return '<article class="au-q"><span class="au-qno">Q'+pad(i+1)+' · ISO '+e(q.cl)+'</span><h4>'+e(q.q)+'</h4><div class="au-ans"><b>ตอบได้จากหลักฐาน</b><p>'+e(q.a)+'</p></div><div class="au-need"><b>ผู้ตรวจอาจขอเพิ่ม</b><p>'+e(q.pending)+'</p></div><div class="au-qa-footer"><div>'+q.ids.map(caseLink).join("")+'</div><button type="button" data-aud-copy-question="'+e(q.id)+'">คัดลอกคำตอบ</button></div></article>'}).join("")+'</div>'}
function connectionsPanel(){return '<div class="au-section-head"><div><span class="au-overline">CROSS-FUNCTIONAL CONTROL INTELLIGENCE</span><h3>ปัญหาคล้ายกันต้องตรวจข้ามเคส — ไม่ใช่เปิด CAR แยกแล้วจบ</h3><p>การจัดกลุ่มด้านล่างเป็นข้อสังเกตเพื่อกำหนดจุดควบคุมร่วม ยังไม่ใช่ข้อสรุปว่า Root Cause เหมือนกันทั้งหมด</p></div></div>'+
'<div class="au-clusters">'+DATA.groups.map(function(g,i){return '<article class="au-cluster"><div class="au-cluster-head"><span>CLUSTER '+pad(i+1)+'</span><h4>'+e(g.label)+'</h4><small>'+g.ids.length+' เหตุการณ์ร่วมประเด็น</small></div><div class="au-cluster-items">'+g.ids.map(function(n){var c=item(n);return '<button data-aud-case="'+n+'"><b>#'+pad(n)+'</b><span>'+e(c.project)+'</span><small>'+e(c.event)+'</small></button>'}).join("")+'</div></article>'}).join("")+'</div>'+
'<section class="au-box"><h4>วิธีใช้ผล Cross-case กับ ISO 10.2</h4><p>เลือกเคสในกลุ่ม → ตรวจว่ามี Failure Mode และ Process Control ที่ต้องใช้ร่วมกันจริงหรือไม่ → ให้เจ้าภาพลงหลักฐานมาตรการในงานใหม่ → ประเมินความเสี่ยงและวัดผลซ้ำ ก่อนให้ QMR รับรอง</p></section>'}
function draw(){panel.innerHTML='<div class="au-wrap">'+nav()+(mode==="questions"?questionPanel():mode==="connections"?connectionsPanel():casePanel())+
'<footer class="au-footer"><span>PUBLIC SANITIZED VIEW · Original evidence & personal records stay internal · No automatic CAR closure</span><span>QMR/DCC is the decision authority</span></footer></div>'}
function sync(){var h=window.location.hash,m=h.match(/^#auditor(?:-(\d{1,2}))?$/);
 if(!m){panel.hidden=true;button.classList.remove("primary");return}
 if(m[1]){var n=Number(m[1]);if(item(n))selected=n}
 panel.hidden=false;button.classList.add("primary");
 document.getElementById("summaryView").hidden=true;
 document.getElementById("intelView").hidden=true;
 var vp=document.getElementById("viewport");if(vp)vp.hidden=true;
 var title=document.getElementById("pageTitle");if(title)title.textContent="ISO 9001 Auditor · Evidence Traceability";
 var sub=document.getElementById("pageSub");if(sub)sub.textContent="คลิกจากเหตุการณ์ → CAR → WI/FORM → การตรวจซ้ำในหน้าเดียว";
 draw();
}
button.addEventListener("click",function(){mode="case";var h=window.location.hash.match(/^#(?:case|docs|twin|auditor)-(\d{1,2})$/);var n=h?Number(h[1]):(selected||8);if(!item(n))n=8;selected=n;window.location.hash="#auditor-"+pad(n);sync()});
panel.addEventListener("change",function(ev){if(ev.target.id==="auSelect"){selected=Number(ev.target.value);mode="case";window.location.hash="#auditor-"+pad(selected);sync()}});
panel.addEventListener("click",function(ev){var el=ev.target.closest("[data-aud-case],[data-aud-mode],[data-aud-original],[data-aud-docs],[data-aud-twin],[data-aud-copy],[data-aud-copy-question],[data-aud-print]");if(!el)return;
if(el.dataset.audCase){selected=Number(el.dataset.audCase);mode="case";window.location.hash="#auditor-"+pad(selected);sync();panel.scrollTop=0;return}
if(el.dataset.audMode){mode=el.dataset.audMode;draw();panel.scrollTop=0;return}
if(el.dataset.audOriginal){window.location.hash="#case-"+pad(Number(el.dataset.audOriginal));return}
if(el.dataset.audDocs){window.location.hash="#docs-"+pad(Number(el.dataset.audDocs));return}
if(el.dataset.audTwin){window.location.hash="#twin-"+pad(Number(el.dataset.audTwin));return}
if(el.dataset.audPrint){window.print();return}
var value="";
if(el.dataset.audCopy)value=window.__auditCopyCase||"";
if(el.dataset.audCopyQuestion){var q=questions.find(function(z){return z.id===el.dataset.audCopyQuestion});if(q)value="ISO "+q.cl+" — "+q.q+"\n"+q.a+"\nต้องยืนยัน: "+q.pending}
if(value&&navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(value).then(function(){el.textContent="คัดลอกแล้ว"}).catch(function(){el.textContent="คัดลอกไม่ได้ — ใช้เลือกข้อความ"})}else if(value){el.textContent="โปรดเลือกและคัดลอกข้อความ"}
});
window.addEventListener("hashchange",sync);
sync();
})();