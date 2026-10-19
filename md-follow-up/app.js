"use strict";
const lanes={
executive:{code:"01",name:"Executive Tasks",sub:"To Do / Planner",color:"#8daafa",status:"Assignment & intake gaps",summary:"คำสั่งบริหาร งานนัดหมาย คำสั่งข้ามฝ่าย และการติดตามเฉพาะกิจอยู่ในสายนี้ โดย To Do และ Planner มีขอบเขตข้อมูลต่างกัน ไม่ใช่ทะเบียนที่เอาจำนวนมาบวกกันได้",scope:"Planner ล่าสุด 38 งาน: 9 ปิด, 24 กำลังทำ, 5 ยังไม่เริ่ม; 29 ยังเปิด; 13 เกินกำหนดก่อน 19 ต.ค. และ 1 ครบกำหนด 19 ต.ค.; 35 ไม่มี Assignments ส่วน Microsoft To Do ของบัญชีที่ตรวจพบ 10 งาน ซึ่งไม่ใช่ภาพรวมองค์กร",handoff:"LINE / MD → Task Classification → Existing Planner / To Do → Next Action → Evidence Verification → Executive Closure",gap:"ไม่พบทะเบียนกลางที่พิสูจน์ว่าทุกคำสั่ง MD ถูกผูกกับงานต้นทางแล้ว; งานที่บันทึก Notes อาจมีเจ้าภาพแต่ไม่ได้ใส่ Assignment ในระบบ; Todo Agent Lab รายงานล่าสุดที่ตรวจคือ 5 ต.ค. ไม่ใช่ Live",proof:"รหัสคำสั่ง, ชื่อผู้รับผิดชอบหลัก, วันรับงาน, วันส่ง, หลักฐานผลลัพธ์, ผู้รับรองปิดงาน",metrics:["38 Planner tasks","29 still open","13 overdue before Oct 19","35 without Planner assignments"],tags:["Planner is not Microsoft To Do","Human Gate","Read-only"]},
development:{code:"02",name:"Product Development",sub:"ICS / ICF / ICE",color:"#bba8ff",status:"Gate-level reconciliation",summary:"ควบคุมวงจรงานผลิตภัณฑ์จาก Drawing / Memo / Engineering / ต้นแบบ / ทดสอบ ไปสู่ QP-40 โดยเก็บ Gate และผู้รับผิดชอบรายขั้นตอน การสำเร็จหนึ่ง Gate ไม่ได้แปลว่าสินค้าทั้งชิ้นปิดงาน",scope:"ICS 850 แถว (284 สำเร็จ, 77 กำลังทำ, 489 ว่าง); ICF 564 แถว (196/57/311); ICE 216 แถว (101/19/96). รวม 1,630 แถวขั้นตอน มิใช่จำนวนโครงการ",handoff:"Product Concept → Drawing → Memo → Engineering → Prototype → Gate Approval → QP-40 / PPI",gap:"กระทบยอดเลข Order กลุ่มเดียวกันกับ CB ได้ 54/56 รายการ; อีกสองรายการต้องตรวจเส้นทางข้ามกลุ่มหรือเลขอ้างอิง; Gate ส่ง QP-40 บางรายการยังว่าง แม้ CB ระบุเข้าระบบแล้ว",proof:"Order/Mockup ID, Drawing Revision, ผลทดสอบ, Gate Owner, วันที่อนุมัติ, หลักฐานส่งต่อ",metrics:["ICS · 850 rows","ICF · 564 rows","ICE · 216 rows","54 / 56 matched to CB"],tags:["Do not count blank gates as overdue","3 sub-streams","CB reconciliation"]},
innovation:{code:"03",name:"Innovation Programs",sub:"SharePoint Innovation Follow-up",color:"#eabb87",status:"Executive escalation missing",summary:"โครงการนวัตกรรมและเทคนิคการผลิตอยู่ในตารางออนไลน์ มี Project Manager, กิจกรรม, กำหนด, สถานะ และประวัติปิดงาน พร้อม Sheet Check Board list และงานที่จบแล้ว",scope:"Dashboard ไฟล์ SharePoint ออนไลน์รายงาน 98 เรื่อง: เปิด 12, ปิด 86; สำรวจหัวโครงการที่มีเลขกำกับพบ 22 ใน Sheet ติดตามงาน และ 68 ใน Sheet งานที่จบแล้ว ตัวเลข 90 กลุ่มยังต้อง reconcile กับยอดสรุป 98",handoff:"Research / Trial → Action Plan → Owner & Due Date → Test Result → Manufacturing / Development → Close & Learn",gap:"งานราคาวัสดุสามประเภทพบอยู่ในทะเบียนแล้ว: เทียบราคาวัสดุสำเร็จ แต่ Gate คิดราคาสุดท้ายเลยกำหนดตามไฟล์; 13/14 ขั้นตอนที่ระบุ 'กำลังดำเนินการ' ไม่มีเจ้าภาพระดับแถว แม้มีผู้จัดการโครงการ",proof:"Project ID, แผนงานจริง, เจ้าภาพระดับกิจกรรม, กำหนด, เวอร์ชันผลทดลอง, ผลรับรองขั้นสุดท้าย",metrics:["98 dashboard items","12 open / 86 closed","14 in-progress steps","13 / 14 no row-level owner"],tags:["SharePoint downloaded 19 Oct","3 worksheets","Executive follow-up"]},
checkboard:{code:"04",name:"Check Board",sub:"CB V13 / Production",color:"#65d6c1",status:"Board completeness & gate owners",summary:"ควบคุมสินค้าพิเศษที่อยู่ในขั้นผลิต/ตรวจรับ โดยใช้เลข Order, สินค้า, เจ้าภาพ, วันที่โอน และสถานะ เป็นหลักฐานต้นทาง ไม่ต้องเปิด To Do ซ้ำทุกงาน",scope:"CB V13 มี 88 รายการ; PowerPoint Tracking แสดง 66 รายการ — ผลต่าง 22 ต้องพิสูจน์ขอบเขต; 50 รายการสถานะ 'อยู่ในแผน' โดย 38 มีวันที่โอนก่อน 19 ต.ค. แต่ยังไม่ได้ยืนยันว่าโอนล่าช้าจริงทั้งหมด",handoff:"CB Order → Engineering / Production → QC → Owner Acceptance → Photo Handoff → Transfer → QP-40 if applicable",gap:"การระบุเจ้าภาพสินค้าไม่เท่ากับการระบุผู้เริ่มแจ้งถ่ายภาพ; ต้องดู CB ฉบับบังคับใช้และผู้รับผิดชอบ Handoff อย่างเป็นทางการ; CB Excel กับ PPT ไม่ครบตรงกัน",proof:"เลข Order, เจ้าภาพสินค้า, QC Pass, ผลตรวจรับเจ้าภาพ, ภาพที่สัมพันธ์กับ SKU, หลักฐานโอนจริง",metrics:["88 CB V13 entries","66 PPT entries","22 presentation gap","38 scheduled dates require review"],tags:["CB is operation master","QC ≠ transfer","Photo request owner unresolved"]},
product:{code:"05",name:"Product Master",sub:"QP-40 / PPI",color:"#82d2ee",status:"Commercialization handoff",summary:"แยกงานหลังพัฒนาและรับรองต้นแบบ: แก้ Drawing, บันทึก PPI, ภาพ Catalog, ทบทวนราคา และประกาศขาย ต้องไม่ปะปนกับขั้นตอนถ่ายภาพก่อนส่งของใน CB",scope:"ใน ICS/ICF/ICE พบแถว Gate QP-40 รวม 164 (ICS 85, ICF 55, ICE 24). ใน SharePoint Innovation Sheet Check Board list มี 24 Order ที่จับคู่ CB V13 ได้ทั้งหมด แต่คอลัมน์ PPI/QP-40 เป็น 0 ทั้ง 24; ต้องตรวจความหมายรหัส 0/1 และความสดของ Sheet ก่อนสรุป",handoff:"Prototype Gate → Approved Drawing & BOM → Images / Catalog → Cost Review → Final Price → PPI → Sales Announcement",gap:"เป้าหมายงานบางเอกสารระบุ 1 เดือน ขณะที่เอกสารอีกฉบับกล่าวถึง 45 วัน: จำเป็นต้องแยกจุดเริ่ม SLA; หลักฐาน PPI จริงและผลประกาศขายยังไม่ครบ",proof:"Approved Drawing, Revision/BOM, PPI Record, รูปสินค้าที่รับรอง, Final Price Approval, Sales Publication",metrics:["164 QP40 gate rows","24 / 24 CB IDs matched","PPI flags need decoding","SLA definitions differ"],tags:["Product Master ≠ Production CB","No assumed 0/1 meaning","SLA validation"]},
commercial:{code:"06",name:"Commercial / SCD",sub:"Pricing / Sourcing / Customer",color:"#f0cd89",status:"Registry access pending",summary:"งานจัดหา Supplier/Hardware รายละเอียด Specification และข้อเสนอราคาลูกค้า ต้องมีระบบเจ้าของงานและกำหนดส่งที่ยืนยันได้ โดยไม่ถือว่า To Do เป็นทะเบียนต้นทางโดยอัตโนมัติ",scope:"พบขั้นราคาในนวัตกรรมและ ICS/ICF/ICE; งานเทียบวัสดุ 3 ชนิดมีทะเบียนในนวัตกรรม แต่รายการฮาร์ดแวร์สีดำยังไม่พบผลลัพธ์เฉพาะในแหล่งที่เข้าตรวจ ทะเบียน SCD หลักยังไม่ได้ยืนยันทั้งฉบับ",handoff:"Request → SCD Sourcing → Supplier Quote / Material Data → Costing → Commercial Offer → Customer Confirmation",gap:"ต้องยืนยันทะเบียน SCD ปัจจุบันและหลักฐานส่งราคา ไม่ควรสรุปว่าไม่มีการดำเนินงานเพียงเพราะไม่พบใน Planner; งานบางประเภทมีวันครบกำหนดแต่ยังไม่พบผู้รับรองปิด",proof:"Request/Inquiry ID, RFQ, Supplier Quote, Specification, Approved Comparison, วันส่งข้อเสนอ, การตอบรับลูกค้า",metrics:["SCD register unverified","Pricing steps exist","1 MD sourcing result unresolved","No proven end-to-end SLA"],tags:["Commercial scope under review","Pricing evidence private","Do not invent delivery date"]}
};
const concerns=[
{title:"รับคำสั่ง MD แล้วตามจนจบได้จริงหรือไม่",state:"partial",answer:"พบ Planner, To Do และทะเบียนสายงาน แต่ยังไม่มีการรับรองความครอบคลุมข้ามระบบ",missing:"ทะเบียนคำสั่งกลางที่ไม่ซ้ำ พร้อมผู้รับผิดชอบหลักและการยืนยันปิดจากผลลัพธ์",lane:"executive"},
{title:"ราคาเปรียบเทียบวัสดุสามชนิดเสร็จเมื่อไร",state:"partial",answer:"พบรายการในตารางนวัตกรรมแล้ว: Gate เปรียบเทียบสำเร็จ แต่ราคาสุดท้ายยังแสดงกำลังดำเนินการหลังวันกำหนด",missing:"ราคาอนุมัติจริง วันส่งข้อเสนอ และหลักฐานลูกค้าได้รับ",lane:"innovation"},
{title:"ข้อมูลและราคาชุดอุปกรณ์เฉพาะสรุปทันกำหนดไหม",state:"unknown",answer:"พบคำสั่งจาก MD แต่ยังไม่พบผลลัพธ์ที่จับคู่กับทะเบียนปัจจุบันได้",missing:"ทะเบียน SCD, Supplier/SKU Specification, ราคา และหลักฐานการนำส่ง",lane:"commercial"},
{title:"การแก้ Defect ผลิตภัณฑ์พิเศษปิดแล้วหรือยัง",state:"partial",answer:"มีหลักฐานฝ่ายผลิตแก้ไขและ QC ตรวจผ่าน พร้อม CB ระบุเจ้าภาพสินค้า",missing:"เจ้าภาพตรวจรับขั้นสุดท้าย ผลโอนงานจริง และ evidence linkage",lane:"checkboard"},
{title:"ใครเป็นผู้เริ่มแจ้งช่างภาพตาม Check Board",state:"partial",answer:"ทราบผู้ประสานจริงและเจ้าภาพสินค้า แต่ผู้มีหน้าที่เริ่มแจ้งตามขั้นตอนอนุมัติยังต้องยืนยัน",missing:"RACI / Gate owner ที่บังคับใช้ และการแจ้งงานตาม SLA",lane:"checkboard"},
{title:"ต้นแบบส่งต่อ QP-40/PPI จนประกาศขายแล้วหรือยัง",state:"partial",answer:"พบ Gate ใน ICS/ICF/ICE และตารางสถานะหลังส่ง แต่ข้อมูลบางรุ่น/สถานะไม่ตรงกัน",missing:"หลักฐานส่งเข้า PPI, Price Approval, Publication, เวอร์ชัน SLA",lane:"product"},
{title:"งานเดิมของ MD ถูกติดตามครบทุกเรื่องจริงหรือไม่",state:"partial",answer:"พบงานใน Planner และระบบปฏิบัติการหลายสาย รวมถึงงานที่ปิดแล้ว",missing:"reconcile รายคำสั่งย้อนหลังและตรวจส่งต่อจาก LINE ไป Source of Truth",lane:"executive"}
];
const sources=[
["Executive Planner","38 tasks","13 overdue before Oct 19; 29 open","Planner snapshot / 2026-10-19","สิทธิ์/Assignment ไม่ครบ"],
["Microsoft To Do","10 visible tasks","Different personal scope","Account view / 2026-10-19","ไม่ใช่ทะเบียนรวมองค์กร"],
["Check Board","88 entries","50 in-plan; 38 dated before review","CB V13 / edited 2026-10-14","PPT only 66"],
["Innovation","98 on dashboard","12 open; 86 closed per sheet","SharePoint online / 2026-10-19","detail headings 22+68 ≠ 98"],
["ICS","850 gate rows","284 done / 77 active / 489 blank","Macro workbook / scan 2026-10-19","Gate blanks ≠ overdue"],
["ICF","564 gate rows","196 done / 57 active / 311 blank","Macro workbook / scan 2026-10-19","Confirm dates and handoffs"],
["ICE / EDU","216 gate rows","101 done / 19 active / 96 blank","Macro workbook / scan 2026-10-19","Main sheet named ICF"],
["QP-40 / PPI","164 gate references","Count spans ICS+ICF+ICE","Cross-source audit / 2026-10-19","Not 164 distinct products"],
["Commercial / SCD","Not certified","Direct register pending","Sourcing source / access incomplete","Do not claim coverage"],
["LINE Evidence","Event archive","Some archived media missing","Read-only incident audit / 2026-10-17","Source files not published"]
];
const el=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let active=null,mode="overview";
function renderDetail(id){
 active=id;
 document.querySelectorAll(".arch-node").forEach(n=>{n.classList.toggle("active",n.dataset.id===id);n.setAttribute("aria-pressed",String(n.dataset.id===id))});
 const d=lanes[id];if(!d)return;
 el("detail").innerHTML='<div class="detail-head"><div><div class="eyebrow">SELECTED STREAM / '+d.code+'</div><h3 style="color:'+d.color+'">'+safe(d.name)+'</h3><p style="margin:0">'+safe(d.sub)+' · '+safe(d.summary)+'</p></div><span class="pill">'+safe(d.status)+'</span></div><div class="detail-grid"><div class="detail-cell"><strong>WHAT IS TRACKED</strong><p>'+safe(d.scope)+'</p></div><div class="detail-cell"><strong>HANDOFF WORKFLOW</strong><p>'+safe(d.handoff)+'</p></div><div class="detail-cell"><strong>OPEN CONTROL GAP</strong><p>'+safe(d.gap)+'</p></div></div><div class="chipline">'+d.metrics.map(x=>'<span>'+safe(x)+'</span>').join("")+'</div><p style="margin:17px 0 0;color:#a5d5d5;font-size:12px"><strong>Completion evidence:</strong> '+safe(d.proof)+'</p>';
 drawLines();
}
function renderSummary(){
 active=null;document.querySelectorAll(".arch-node").forEach(n=>{n.classList.remove("active");n.setAttribute("aria-pressed","false")});
 el("detail").innerHTML='<div class="detail-head"><div><div class="eyebrow">CONTROL CENTER / PRIMARY DESIGN RULE</div><h3>หนึ่งคำสั่ง · หนึ่งเจ้าภาพหลัก · หลายระบบสนับสนุน</h3></div><span class="pill">SINGLE RESPONSIBILITY, MULTI-SOURCE EVIDENCE</span></div><p>ใช้ Task/Order/Project ID จากระบบต้นทางเป็นหลัก แล้วเชื่อมเพียง Reference, Gate, Owner และ Evidence Status เข้ากลางโดยไม่คัดลอกเนื้อหาที่มีความอ่อนไหวไปยังเว็บสาธารณะ ทุกสายตรวจ Exception ส่งกลับมายัง MD Control เฉพาะเรื่องที่ต้องตัดสินใจ</p><div class="chipline"><span>Source Registry</span><span>Cross-system Identity</span><span>Owner Resolution</span><span>Freshness Check</span><span>Evidence-backed Closure</span><span>Human Gate</span></div>';
 drawLines();
}
function renderConcerns(){
 el("concerns").innerHTML=concerns.map((x,i)=>'<div class="audit-entry"><button class="concern" data-no="'+i+'" aria-expanded="false"><span class="audit-number">'+String(i+1).padStart(2,"0")+'</span><span class="audit-title">'+safe(x.title)+'</span><span class="status '+(x.state==="unknown"?"unknown":"")+'">'+(x.state==="unknown"?"ยังตอบไม่ได้":"ตอบได้บางส่วน")+'</span><span>⌄</span></button><div class="audit-detail" id="concern-'+i+'" hidden><div><strong>ผลตรวจ:</strong> '+safe(x.answer)+'</div><div><strong>ยังขาด:</strong> '+safe(x.missing)+'</div><button class="goto-stream" data-id="'+x.lane+'">ดูสายงานที่เกี่ยวข้อง ↗</button></div></div>').join("");
 el("concerns").addEventListener("click",e=>{const a=e.target.closest(".concern");if(a){const n=+a.dataset.no;const panel=el("concern-"+n);panel.hidden=!panel.hidden;a.setAttribute("aria-expanded",String(!panel.hidden))}const btn=e.target.closest(".goto-stream");if(btn){activate(btn.dataset.id);el("detail").scrollIntoView({behavior:"smooth",block:"start"})}});
}
function renderSources(){
 el("sources").innerHTML='<table><thead><tr><th>DATA SOURCE</th><th>UNIT / COUNT</th><th>FINDINGS</th><th>EVIDENCE AGE</th><th>OPEN LIMITATION</th></tr></thead><tbody>'+sources.map(s=>'<tr><td><strong>'+safe(s[0])+'</strong></td><td><span class="tiny">'+safe(s[1])+'</span></td><td>'+safe(s[2])+'</td><td><small>'+safe(s[3])+'</small></td><td><span class="warn">'+safe(s[4])+'</span></td></tr>').join("")+'</tbody></table>';
}

const W=1300,H=940;
const nodes=[
{id:"intent",title:"MD / Human Direction",cat:"INTENT & GOAL",caption:"Command · Scope · Priority",hint:"INPUT · human origin",kind:"input",x:30,y:65},
{id:"signals",title:"LINE / Meeting Signals",cat:"SOURCE EVENTS",caption:"Message · Decision · Follow-up",hint:"READ-ONLY capture",kind:"input",x:30,y:241},
{id:"sources",title:"Business Data Sources",cat:"SOURCE REGISTRY",caption:"Planner · SharePoint · CB · ERP",hint:"MULTI-SOURCE",kind:"input",x:30,y:420},
{id:"human",title:"Human Approval Gate",cat:"STOP / APPROVE",caption:"Authority · Data Access · Writeback",hint:"NO AUTO WRITE",kind:"exception",x:30,y:743},
{id:"orchestrator",title:"MD Orchestrator",cat:"CONTROL PLANE",caption:"RDC · Intake · Trace ID",hint:"CONTROL",kind:"control",x:272,y:82},
{id:"router",title:"Stream Classifier",cat:"INTELLIGENCE ROUTER",caption:"Match issue to primary stream",hint:"6 STREAMS",kind:"control",x:272,y:265},
{id:"owner",title:"Owner / RACI Resolver",cat:"ACCOUNTABILITY",caption:"One owner · Handoff owner",hint:"RULE ENFORCEMENT",kind:"control",x:272,y:447},
{id:"registry",title:"Source Link Registry",cat:"CANONICAL REFERENCES",caption:"No duplicate tasks · Stable IDs",hint:"SOURCE OF TRUTH",kind:"control",x:272,y:626},
{id:"shadow",title:"RDC / JEV Shadow Review",cat:"INDEPENDENT REVIEW",caption:"Suggestions · Contradictions",hint:"ADVISORY ONLY",kind:"validator",x:272,y:802},
{id:"executive",title:"Executive Tasks",cat:"STREAM 01 · TODO / PLANNER",caption:"MD requests · Cross-functional",hint:"38 PLANNER ITEMS",kind:"stream",x:532,y:39},
{id:"development",title:"Product Development",cat:"STREAM 02 · ICS / ICF / ICE",caption:"Drawing · Memo · Prototype",hint:"1,630 GATE ROWS",kind:"stream",x:532,y:176},
{id:"innovation",title:"Innovation Programs",cat:"STREAM 03 · INNOVATION",caption:"Projects · Experiments · Costing",hint:"98 PROJECT SUMMARY",kind:"stream",x:532,y:313},
{id:"checkboard",title:"Check Board",cat:"STREAM 04 · CB V13",caption:"Production · QC · Photo Gate",hint:"88 CB ENTRIES",kind:"stream",x:532,y:450},
{id:"product",title:"Product Master",cat:"STREAM 05 · QP-40 / PPI",caption:"Catalog · Final Price · Publish",hint:"164 GATE REFERENCES",kind:"stream",x:532,y:587},
{id:"commercial",title:"Commercial / SCD",cat:"STREAM 06 · SOURCING",caption:"Supplier · Quote · Customer",hint:"SOURCE TO VERIFY",kind:"stream",x:532,y:724},
{id:"status",title:"Status Collector",cat:"OBSERVE / NORMALIZE",caption:"Owner · Deadline · Gate Status",hint:"READ-ONLY",kind:"validator",x:799,y:80},
{id:"cross",title:"Cross-System Resolver",cat:"MATCH / RECONCILE",caption:"Order · Task · Product lineage",hint:"VERSION-CHECK",kind:"validator",x:799,y:270},
{id:"exception",title:"Exception Detector",cat:"FAILURE & RISK ENGINE",caption:"Overdue · Missing Owner · Gap",hint:"AUTO-DETECT",kind:"exception",x:799,y:455},
{id:"evidence",title:"Evidence Ledger",cat:"PROVENANCE RECORD",caption:"Source file · Timestamp · Proof",hint:"TRACEABLE",kind:"validator",x:799,y:631},
{id:"validator",title:"Closure Validator",cat:"INDEPENDENT QA",caption:"DONE ≠ message · Verify outcome",hint:"HUMAN GATE",kind:"validator",x:799,y:805},
{id:"action",title:"Action Required",cat:"NEXT BEST ACTION",caption:"Named owner · Due · Next step",hint:"OPEN CASE",kind:"exception",x:1070,y:94},
{id:"escalation",title:"Escalation / Decision",cat:"MD ATTENTION",caption:"Delay · Conflict · Authority",hint:"DECISION NEEDED",kind:"exception",x:1070,y:275},
{id:"gap",title:"Evidence Gap",cat:"UNCERTIFIED RESULT",caption:"Missing photo · Signoff · Quote",hint:"PROOF REQUIRED",kind:"exception",x:1070,y:455},
{id:"done",title:"Verified Closed",cat:"OUTCOME & ACCEPTANCE",caption:"Proof · Acknowledged · Trace",hint:"VERIFIED",kind:"done",x:1070,y:634},
{id:"brief",title:"MD Executive Brief",cat:"MANAGEMENT VIEW",caption:"What · Who · When · Action",hint:"SINGLE EXEC VIEW",kind:"done",x:1070,y:811}
];
const detailText={
intent:["คำสั่งจากผู้บริหารหรือการตัดสินใจเชิงธุรกิจ", "ข้อความต้นทาง / เวลา / ระดับความสำคัญ","Trace ID และเกณฑ์ความสำเร็จ", "ต้องไม่อนุมานว่างานปิดจากข้อความตอบรับ"],
signals:["สัญญาณจาก LINE การประชุม และการติดตามงาน","ข้อความ/ข้อสั่งการจากแหล่งที่ได้รับอนุญาต","Action draft ที่ต้องตรวจเทียบทะเบียนก่อน","LINE Bot ไม่มีสิทธิ์โพสต์ตอบโดยอัตโนมัติ"],
sources:["ข้อมูลสถานะจากระบบต้นทางหลายประเภท","Task/Order/Project ID และสิทธิ์อ่าน","Reference ที่ระบุแหล่งข้อมูลจริง","ไม่เผยแพร่ข้อมูลบุคคลหรือไฟล์ต้นฉบับบนเว็บสาธารณะ"],
human:["จุดที่ต้องมีคนอนุมัติก่อนแก้ข้อมูลหรือสื่อสารออก","ข้อเสนอพร้อมผลตรวจและผู้มีอำนาจ","Approved / Rejected / Require evidence","หน้าเว็บนี้เป็น Read-only ไม่มี Writeback"],
orchestrator:["รวมเหตุการณ์ให้มีรหัสติดตามและบริบทเดียวกัน","MD Command / Business Signals","Routing plan / Trace / Review trigger","ยังไม่ติดตั้งระบบรันอัตโนมัติบนหน้า Public Web"],
router:["จำแนกเจ้าของงานหลักใน 6 สาย","Intent และบริบทของรายการเดิม","Primary stream + Secondary references","ต้องตรวจงานซ้ำก่อนเปิดทะเบียนใหม่"],
owner:["แยกเจ้าภาพหลักออกจากผู้รับผิดชอบขั้นตอนและผู้เริ่มแจ้งงาน","Order/Task + RACI / Rule","Named primary owner + Handoff owner","คำถามว่าใครต้องแจ้งช่างภาพยังรอเอกสารบังคับใช้"],
registry:["เชื่อมงานด้วยรหัสต้นทาง ไม่คัดลอกงานใหม่เป็นเงา","Planner ID / CB Order / Innovation Project","Canonical link / Version / Source age","เลขอ้างอิงตรงกันไม่ได้แปลว่าสถานะสำเร็จตรงกัน"],
shadow:["ให้ RDC/JEV เป็นผู้ช่วยตรวจทานข้อสรุปเมื่อเชื่อมได้","Evidence และข้อเสนอการตัดสินใจ","ความเห็นเพิ่มเติม / Conflict / Confidence","Shadow ไม่ใช่อำนาจดำเนินการและยังไม่มี Live integration"],
status:["อ่านสถานะและกำหนดส่งจากระบบเจ้าของงาน","Source records และหลักฐานที่ได้รับอนุญาต","Normalized snapshot + Freshness labels","ไฟล์แต่ละระบบอัปเดตไม่พร้อมกัน"],
cross:["เปรียบเทียบข้อมูลข้ามระบบตามเลขอ้างอิงจริง","Order, Project, Gate และ Revision","Matched references + Inconsistency","CB กับ PPT และ QP-40 ยังต้องตรวจรุ่นและความหมายของสถานะ"],
exception:["ตรวจหางานเลยกำหนด ขาดเจ้าภาพ ขาดหลักฐาน หรือส่งต่อไม่ได้","Status + RACI + Source age","Priority queue พร้อมเหตุผล","ต้องไม่ตีความช่องว่างเป็นงานผิดกำหนดโดยอัตโนมัติ"],
evidence:["จัดเก็บที่มาและความน่าเชื่อถือของการปิดงาน","Original reference + Evidence timestamp","Proof ledger + Link to private source","ไม่โฮสต์ LINE, ราคา, ลูกค้า และไฟล์ภายในบน GitHub Pages"],
validator:["แยก 'ทำแล้ว' ออกจาก 'ตรวจรับและปิดได้จริง'","Evidence + Acceptance criteria","Verified / Hold / Reopen","ไม่ประกาศปิดถ้าไม่มีผลตรวจรับหรือสิทธิ์ผู้อนุมัติ"],
action:["สิ่งที่ต้องตามทันทีโดยไม่รอ MD ทวง","Exceptions with named owner","งานที่ต้องทำต่อและกำหนดตอบ","เป็น Architecture Design ยังไม่ส่งงานจริง"],
escalation:["ส่งเรื่องที่ต้องใช้อำนาจตัดสินใจกลับ MD","Blocked process / SLA breach / Conflicting owner","Decision request พร้อมทางเลือก","ต้องผ่าน Human Approval ก่อนเปลี่ยนงานต้นทาง"],
gap:["ระบุว่าขาดอะไรโดยไม่เดาข้อเท็จจริง","Source status ที่ยังไม่มีหลักฐานปิด","Evidence request / Uncertified label","เช่น QC ผ่านแต่ยังไม่มีเจ้าภาพรับโอน"],
done:["ปิดงานด้วยหลักฐานผลลัพธ์และผู้รับรอง","Validator pass + Owner acceptance","Verified closure + Audit trace","ยังไม่มีการรับรองว่าข้อกังวล MD ทั้ง 7 ปิดครบ"],
brief:["สรุปเฉพาะงานที่ MD ต้องตัดสินใจและงานที่ใกล้พลาด","Action / Escalation / Gap / Closed evidence","What · Who · Due · Blocker · Decision","Snapshot ปัจจุบันไม่ใช่รายงานสดโดยอัตโนมัติ"]
};
const edges=[
["intent","orchestrator","intake"],["signals","orchestrator","intake"],["sources","router","intake"],
["orchestrator","router","logic"],["orchestrator","owner","logic"],["router","owner","logic"],["human","owner","exception"],["owner","registry","logic"],["owner","shadow","logic"],
["router","executive","logic"],["router","development","logic"],["router","innovation","logic"],["router","checkboard","logic"],["router","product","logic"],["router","commercial","logic"],
["registry","cross","logic"],["executive","status","stream"],["innovation","status","stream"],["development","cross","stream"],["checkboard","cross","stream"],["product","evidence","stream"],["commercial","evidence","stream"],
["status","cross","proof"],["status","exception","proof"],["cross","exception","proof"],["cross","evidence","proof"],
["exception","action","exception"],["exception","escalation","exception"],["exception","gap","exception"],
["evidence","validator","proof"],["shadow","validator","proof"],["validator","done","proof"],
["action","brief","exception"],["escalation","brief","exception"],["gap","brief","exception"],["done","brief","proof"]
];
const colors={intake:"#76a8ec",logic:"#91b3fd",stream:"#6ad9c8",exception:"#e7bb7d",proof:"#81d6c5"};
const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
let selectedNode=null,zoom=1,panX=0,panY=0,dragState=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function buildArch(){
 el("archNodes").innerHTML=nodes.map(n=>'<button class="arch-node kind-'+safe(n.kind)+'" style="left:'+n.x+'px;top:'+n.y+'px" data-id="'+safe(n.id)+'" aria-label="เปิดรายละเอียด '+safe(n.title)+'" aria-pressed="false"><span class="node-category">'+safe(n.cat)+'</span><strong class="node-title">'+safe(n.title)+'</strong><span class="node-caption">'+safe(n.caption)+'</span><span class="node-bottom">'+safe(n.hint)+'</span></button>').join("");
 document.querySelectorAll(".arch-node").forEach(b=>b.addEventListener("click",()=>activate(b.dataset.id)));
 renderWires();
}
function wire(a,b){
 const n=byId[a],m=byId[b],nw=194;
 let x0=n.x+nw,y0=n.y+49,x1=m.x,y1=m.y+49;
 if(m.x<=n.x+10 || (m.x===n.x)){
   if(m.x===n.x){x0=n.x+nw/2;y0=n.y+100;x1=m.x+nw/2;y1=m.y}
   else {x0=n.x+nw/2;y0=n.y+100;x1=m.x+nw/2;y1=m.y; }
   const travel=Math.abs(y1-y0),c=Math.max(28,Math.min(96,travel*.4));
   return 'M'+x0+' '+y0+' C '+(x0+c)+' '+(y0+travel*.23)+', '+(x1+c)+' '+(y1-travel*.23)+', '+x1+' '+y1;
 }
 const dx=x1-x0,cy=Math.abs(y1-y0),ctrl=Math.max(36,Math.min(125,dx*.56 + cy*.034));
 return 'M'+x0+' '+y0+' C '+(x0+ctrl)+' '+y0+', '+(x1-ctrl)+' '+y1+', '+x1+' '+y1;
}
function renderWires(){
 const gd=[],li=[];
 edges.forEach(([a,b,t],i)=>{
  const color=colors[t];const d=wire(a,b);
  const selected=selectedNode&&(a===selectedNode||b===selectedNode);
  const faded=selectedNode&&!selected;const o=faded?.10:(selected?1:.62);
  gd.push('<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+(selected?10:7)+'" opacity="'+(o*.15)+'" filter="url(#soft)" />');
  li.push('<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+(selected?2.2:1.3)+'" stroke-dasharray="'+(selected?"5 5":"5 7")+'" opacity="'+o+'" marker-end="url(#tip-'+t+')" />');
 });
 el("linkGlow").innerHTML=gd.join("");el("linkLines").innerHTML=li.join("");
 document.querySelectorAll(".arch-node").forEach(x=>{const active=x.dataset.id===selectedNode;x.classList.toggle("selected",active);x.setAttribute("aria-pressed",String(active));x.style.opacity=selectedNode&&!active&&!edges.some(e=>(e[0]===selectedNode&&e[1]===x.dataset.id)||(e[1]===selectedNode&&e[0]===x.dataset.id))?".67":"1"});
}
function activate(id){
 selectedNode=id;
 if(lanes[id]){renderDetail(id)}
 else{
   const n=byId[id];const parts=detailText[id];if(!n||!parts)return;
   el("detail").innerHTML='<div class="detail-head"><div><div class="eyebrow">ARCHITECTURE NODE / '+safe(n.cat)+'</div><h3>'+safe(n.title)+'</h3><p style="margin:0">'+safe(parts[0])+'</p></div><span class="pill">'+safe(n.hint)+'</span></div><div class="detail-grid"><div class="detail-cell"><strong>INPUT</strong><p>'+safe(parts[1])+'</p></div><div class="detail-cell"><strong>OUTPUT</strong><p>'+safe(parts[2])+'</p></div><div class="detail-cell"><strong>CONTROL / EVIDENCE GAP</strong><p>'+safe(parts[3])+'</p></div></div><div class="chipline"><span>Click another node to inspect</span><span>Source of Truth unchanged</span><span>Read-only architecture</span></div>';
 }
 renderWires();
}
function drawLines(){renderWires()}
function renderSummary(){
 selectedNode=null;
 el("detail").innerHTML='<div class="detail-head"><div><div class="eyebrow">CONTROL CENTER / INTELLIGENCE ARCHITECTURE V2</div><h3>Intake → Control → Six Streams → Validation → MD Decision</h3></div><span class="pill">ONE PRIMARY OWNER · MULTI-SOURCE EVIDENCE</span></div><p>ทุกคำสั่งต้องผ่านการจำแนกสายงานและหาต้นทางเจ้าของงานก่อน ระบบตรงกลางเก็บเพียง Reference/Trace, ตรวจงานเกินกำหนดหรือขาดเจ้าภาพ แล้วส่งเรื่องที่ต้องตัดสินใจขึ้น MD โดยไม่เปิด To Do ซ้ำกับ CB และไม่ตัดสินว่าปิดงานจากข้อความตอบรับ</p><div class="chipline"><span>25 Functional Nodes</span><span>6 Owner Streams</span><span>Source ID Reconciliation</span><span>Owner / RACI Gate</span><span>Independent QA</span><span>Human Approval</span><span>Evidence Closure</span></div>';
 renderWires();
}
function transformCanvas(){el("archCanvas").style.transform='translate('+panX+'px,'+panY+'px) scale('+zoom+')';el("zoomReadout").textContent=Math.round(zoom*100)+'%'}
function fitCanvas(){
 const stage=el("archStage"),w=stage.clientWidth,h=stage.clientHeight;
 zoom=Math.min((w-26)/W,(h-34)/H,1.5);
 panX=(w-W*zoom)/2;panY=(h-H*zoom)/2;transformCanvas();
}
function zoomAt(factor,x,y){
 const stage=el("archStage");
 const old=zoom;
 zoom=clamp(zoom*factor,.22,2.5);
 panX=x-(x-panX)*(zoom/old);panY=y-(y-panY)*(zoom/old);
 transformCanvas();
}
function initializePanZoom(){
 const st=el("archStage");
 st.addEventListener("wheel",e=>{e.preventDefault();const r=st.getBoundingClientRect();zoomAt(e.deltaY<0?1.10:.9,e.clientX-r.left,e.clientY-r.top)},{passive:false});
 st.addEventListener("pointerdown",e=>{if(e.target.closest(".arch-node")||e.button!==0)return;dragState={id:e.pointerId,x:e.clientX,y:e.clientY,pX:panX,pY:panY};st.setPointerCapture(e.pointerId)});
 st.addEventListener("pointermove",e=>{if(!dragState||dragState.id!==e.pointerId)return;panX=dragState.pX+e.clientX-dragState.x;panY=dragState.pY+e.clientY-dragState.y;transformCanvas()});
 const finish=e=>{if(dragState&&e.pointerId===dragState.id)dragState=null};
 st.addEventListener("pointerup",finish);st.addEventListener("pointercancel",finish);
 st.addEventListener("keydown",e=>{if(e.key==="+"||e.key==="="){zoomAt(1.15,st.clientWidth/2,st.clientHeight/2);e.preventDefault()}if(e.key==="-"){zoomAt(1/1.15,st.clientWidth/2,st.clientHeight/2);e.preventDefault()}if(e.key==="0"){fitCanvas();e.preventDefault()}});
 el("zoomIn").addEventListener("click",()=>zoomAt(1.16,st.clientWidth/2,st.clientHeight/2));
 el("zoomOut").addEventListener("click",()=>zoomAt(1/1.16,st.clientWidth/2,st.clientHeight/2));
 el("fitArch").addEventListener("click",fitCanvas);
 if(window.ResizeObserver)new ResizeObserver(fitCanvas).observe(st);
}
function setMode(m){
 mode=m;
 el("allBtn").classList.toggle("selected",m==="overview");el("issuesBtn").classList.toggle("selected",m==="exceptions");el("qualityBtn").classList.toggle("selected",m==="quality");
 if(m==="overview")renderSummary();
 else if(m==="exceptions")activate("exception");
 else activate("cross");
}
el("allBtn").addEventListener("click",()=>setMode("overview"));
el("issuesBtn").addEventListener("click",()=>setMode("exceptions"));
el("qualityBtn").addEventListener("click",()=>setMode("quality"));
el("print").addEventListener("click",()=>window.print());
buildArch();renderConcerns();renderSources();renderSummary();initializePanZoom();requestAnimationFrame(fitCanvas);

const sourceLabel={planner:'Planner / Monitor Coordinator',cb:'Check Board',ics:'ICS',icf:'ICF',ice:'ICE / EDU',innovation:'Innovation'};
async function loadSourceHealth(){
 const status=el('batchStatus'),date=el('batchDate'),area=el('connectorCards');
 try{
  const response=await fetch('./source-health.json?at='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('Snapshot HTTP '+response.status);
  const data=await response.json();
  const p=data.sources?.planner, inn=data.sources?.innovation;
  if(p?.status==='ok' && el('metricPlanner'))el('metricPlanner').textContent=Number(p.total).toLocaleString('th-TH');
  if(inn?.status==='ok' && el('metricInnovation'))el('metricInnovation').textContent=Number(inn.total).toLocaleString('th-TH');
  const dev=['ics','icf','ice'].map(n=>data.sources?.[n]);
  if(dev.every(x=>x?.status==='ok' && Number.isFinite(x.total)) && el('metricProductGates'))
    el('metricProductGates').textContent=dev.reduce((sum,x)=>sum+x.total,0).toLocaleString('th-TH');
  const batch=data.batch||{};
  const names=Object.keys(data.sources||{});
  status.textContent=names.filter(name=>data.sources[name]?.status==='ok').length+' / '+names.length+' CONNECTORS VERIFIED';
  date.textContent=data.generated_at? 'Last batch: '+new Date(data.generated_at).toLocaleString('th-TH'): 'รอผลจาก Collector ที่ได้รับอนุญาต';
  area.innerHTML=names.map(name=>{
    const item=data.sources[name]||{},state=item.status||'unavailable';
    const date=item.checked_at?new Date(item.checked_at).toLocaleString('th-TH'):'ยังไม่เชื่อม';
    const total=Number.isFinite(item.total)?Number(item.total).toLocaleString('th-TH'):'—';
    let facts='';
    if(name==='planner' && state==='ok')facts='Open: '+item.open+' · Done: '+item.completed+' · Overdue before 19 Oct: '+item.overdue_before_2026_10_19+' · Due 19 Oct: '+item.due_on_2026_10_19+' · Unassigned open: '+item.open_without_assignment;
    if(name==='innovation' && state==='ok')facts='Open: '+item.open+' · Closed: '+item.completed+' · Source updated: '+new Date(item.file_modified).toLocaleDateString('th-TH');
    return '<div class="connector"><span class="tag '+(state==='ok'?'ok':state==='stale'?'stale':'')+'">'+safe(state.toUpperCase())+'</span><h3>'+safe(sourceLabel[name]||name)+'</h3><div class="stat">'+safe(total)+'</div><div class="minor">Unit: '+safe(item.unit||'pending')+'</div><div class="minor">Last verified: '+safe(date)+'</div></div>'
  }).join('');
 }catch(err){status.textContent='SNAPSHOT UNAVAILABLE';area.textContent='ไม่สามารถโหลดผลตรวจล่าสุดจาก GitHub Pages ได้';date.textContent=String(err.message)}
}
el('checkSnapshot')?.addEventListener('click',loadSourceHealth);
loadSourceHealth();
