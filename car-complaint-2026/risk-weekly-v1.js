/* WQ6 organization risk and balanced weekly recurrence-prevention plan.
   This is planning intelligence, NOT signed verification of performed audits. */
(function(){
"use strict";
const root=document.getElementById("riskView"),A=window.PTK_AUDITOR_DATA,S=window.PTK_SOURCE_ASSURANCE;
if(!root||!A)return;
const weeks=[
 ["W1","2–8 พ.ย.","2026-11-08"],["W2","9–15 พ.ย.","2026-11-15"],
 ["W3","16–22 พ.ย.","2026-11-22"],["W4","23–29 พ.ย.","2026-11-29"],
 ["W5","30 พ.ย.–6 ธ.ค.","2026-12-06"],["W6","7–13 ธ.ค.","2026-12-13"],
 ["W7","14–20 ธ.ค.","2026-12-20"],["W8","21–27 ธ.ค.","2026-12-27"],
 ["W9","28–31 ธ.ค.","2026-12-31"]
];
const owners=[
 {id:"production",name:"ผลิต",plan:[
  [14,"ตรวจลบคมอลูมิเนียม First Piece / Final Piece","ใบตรวจขอบคมและ Lot"],
  [4,"ตรวจสภาพใบตัด แรงกด และ Defect งานปิดขอบ","ใบตรวจเครื่องจักรและ First Piece"],
  [8,"ทดลองประกอบชิ้นส่วนก่อนส่งต่อ","บันทึก Test Fit และผู้ตรวจ"],
  [10,"ตรวจ Finish รอบโต๊ะและงานเก็บผิว","มาตรฐานผิวงานและผล Pass/Fail"]]},
 {id:"qc",name:"QC",plan:[
  [14,"ทวนผลตรวจขอบคมก่อนปล่อยงาน","Final QC Sheet + Reject Record"],
  [8,"ตรวจการประกอบจริงตาม WI-M1S-027","QC Signoff และผลทดสอบประกอบ"],
  [7,"ตรวจ Functional Test สินค้ารุ่นพิเศษ","Test Record และอนุมัติตัวอย่าง"],
  [11,"ตรวจสินค้าสาธิตก่อนนำไปแสดง","ใบตรวจสภาพและภาพก่อนออกงาน"]]},
 {id:"install",name:"จัดส่ง/ติดตั้ง",plan:[
  [1,"ตรวจสกรู จุดยึด และความมั่นคง","Fastener Checklist และผู้ตรวจ"],
  [12,"เทียบรายชื่อทีมกับผู้ผ่านอบรมไซต์ลูกค้า","Training Matrix, Crew Roster และ Approval"],
  [3,"ตรวจเส้นทาง จุดถอยรถ และผู้ให้สัญญาณ","Route/Spotter Checklist"],
  [14,"ตรวจคมจากงานตัดหน้างาน","Site Deburr/Edge Check Record"]]},
 {id:"eng",name:"Eng/แบบ",plan:[
  [9,"ทบทวน Load Calculation สำหรับงาน Top หิน","Engineering Calculation + Drawing Approval"],
  [7,"ตรวจ Prototype Buildability และ Function","อนุมัติ Prototype และ Functional Test"],
  [8,"ทวน Revision/การประกอบก่อนผลิต","Design Input, Revision และ Signoff"]]},
 {id:"scd",name:"SCD/จัดซื้อ",plan:[
  [6,"ตรวจคุณภาพ Supplier และป้องกันอ่างซิงค์","Supplier Feedback + Protection Record"],
  [13,"ตรวจการเปิดงานแก้จาก SCD","Rework Ticket พร้อม Owner/Due"],
  [5,"ตรวจการส่งข้อมูล Designer ผ่าน STS","Transaction Sample + WI Acknowledgement"]]},
 {id:"plan",name:"วางแผนผลิต",plan:[
  [13,"ตรวจการส่งต่องานแก้ถึงทุกฝ่าย","Ticket Audit Trail + SLA"],
  [8,"ตรวจการจัดเวลา Full Assembly Test","WO/Operation + QC Signoff"],
  [9,"ตรวจ Revision ที่ส่งถึงฝ่ายผลิต","Approved Drawing / Spec Handover"]]},
 {id:"cxd",name:"CXD",plan:[
  [2,"ตรวจ SLA การตอบกลับลูกค้า","Contact Log + Written Response"],
  [11,"ตรวจสินค้าสาธิตก่อนพบลูกค้า","Demo Readiness Approval"],
  [15,"ตรวจการแจ้งแผนส่งมอบและการขยายเวลา","Customer Confirmation / Acceptance"]]},
 {id:"sales",name:"ฝ่ายขาย",plan:[
  [15,"ตรวจ SO/PO และการอนุมัติขยายเวลา","SO/PO + Extension Approval"],
  [2,"ตรวจการส่งต่อ Contact Request","Customer Ticket + Time Stamp"],
  [5,"ตรวจการตอบคำถามสเปกผ่าน STS","Transaction/STS Record"]]},
 {id:"qmr",name:"Complaint/QMR",plan:[
  [14,"ตรวจทะเบียน Complaint ↔ CAR","Identity Crosswalk + DCC Confirmation"],
  [1,"ทบทวนผลการใช้มาตรการกับงานใหม่","New-job Sample + Recurrence Log"],
  [13,"ทวนสอบประสิทธิผล Ticket ข้ามฝ่าย","SCD→Plan→Delivery Audit Trail"],
  [9,"ทบทวน WQ6 และ Design Control","Approved Risk Matrix + Residual Risk"]]}
];
const risks=[
 ["R01","Defect หลุดก่อนส่งมอบ",[4,7,8,10,14],"Quality Gate / Test Fit / Edge Rejection","ผลิต/QC/ติดตั้ง","8.5.1, 8.6, 10.2"],
 ["R02","ความปลอดภัยและสิทธิ์เข้าพื้นที่",[1,12,14],"Crew/Training Gate, Fastener, Deburr","จัดส่ง/HSSE/QC","6.1, 8.4, 8.5.1"],
 ["R03","Design/Engineering Control",[7,8,9,10],"Load Calc, Design Review, Prototype Test","Eng/แบบ/นวัตกรรม","8.3, 8.6"],
 ["R04","การส่งต่อข้อมูลข้ามฝ่าย",[2,5,13,15],"Handover, Rework Ticket, SLA Escalation","Sale/CXD/SCD/Plan","8.2.1, 10.2"],
 ["R05","Supplier และผู้รับจ้างภายนอก",[1,6,12],"Supplier Control, Inspection, Crew Approval","SCD/จัดส่ง/QC","8.4, 6.1"],
 ["R06","CAR ปิดแต่ยังไม่พิสูจน์การเกิดซ้ำ",[1,4,5,6,7,8,9,10,11,12,13,14,15],"G0–G5 + Sampling + QMR Signoff","QMR/Process Owners","7.5, 10.2, 9.3"]
];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const caseName=n=>A.cases.find(c=>c.n===n)?.project||"Complaint "+n;
let chosenOwner="qmr",chosenWeek=2;
const asOf="2026-11-18";
const weekTh=weeks.map(w=>'<th>'+esc(w[0])+'<small>'+esc(w[1])+'</small></th>').join("");
const rows=owners.map(o=>'<tr><th scope="row">'+esc(o.name)+'</th>'+weeks.map((w,i)=>{
 const task=o.plan[i%o.plan.length],past=w[2]<asOf,current=i===2;
 const state=past?"ยังไม่เชื่อมหลักฐาน":current?"รอผลตรวจสัปดาห์นี้":"ตามแผน";
 return '<td><button class="wq-cell'+(past?" old":"")+(current?" current":"")+'" data-wq-owner="'+esc(o.id)+'" data-wq-week="'+i+'" title="'+esc(task[1]+' · '+state)+'"><b>'+esc(w[0])+'</b><span>'+esc(state)+'</span></button></td>';
}).join("")+'</tr>').join("");
const riskRows=risks.map(r=>'<tr><th>'+esc(r[0])+'</th><td><b>'+esc(r[1])+'</b><small>ISO '+esc(r[5])+'</small></td><td>'+r[2].map(n=>'<button data-wq-case="'+n+'">#'+pad(n)+'</button>').join("")+'</td><td>'+esc(r[3])+'</td><td>'+esc(r[4])+'</td><td><span class="wq-not-approved">รอ P×I / Residual Risk อนุมัติ</span></td></tr>').join("");
root.innerHTML='<div class="wq-container">'+
 '<div class="wq-header"><div><small>ISO 9001 / WQ6 / SYSTEMIC PREVENTION</small><h2>ป้องกันการเกิด Complaint ซ้ำในงานจริง</h2><p>แผนตรวจหมุนเวียน พ.ย.–ธ.ค. 2569: หน่วยงานหลักหนึ่งหัวข้อต่อสัปดาห์ แยกแผนงานออกจากผลตรวจที่มีหลักฐาน</p></div><span class="wq-pill">แผน PDF พบลายเซ็น · ผลตรวจยังไม่รับรอง</span></div>'+
 '<div class="wq-stats"><div><span>รายการในทะเบียน</span><strong>15</strong><small>17 พ.ย. 2569</small></div><div><span>PTK_06 เบื้องต้น</span><strong>14</strong><small>เป้าไม่เกิน 10 / รอรับรองวิธีนับ</small></div><div><span>รอบตรวจตามแผน</span><strong>81</strong><small>9 ทีม × 9 สัปดาห์</small></div><div><span>ผลรายฝ่ายที่ได้รับ</span><strong>QC 3 / SCD 3</strong><small>มีข้อมูลรายงาน แต่ QMR ยังไม่รับรอง</small></div></div>'+
 '<section class="wq-section"><header><h3>หลักฐานที่เชื่อมจริงจาก W: · 19 พฤศจิกายน 2569</h3><p>แยกผลการรายงานของหน่วยงาน ออกจากผลการตรวจรับของ QMR</p></header>'+
 '<div class="wq-source-health"><b>QC รายงานผ่าน 3 เคส · SCD รายงานไม่เกิดซ้ำ 3 เคส · จัดส่งบันทึก W1/W2 จำนวน 4 ประเด็น · ทะเบียนทวนสอบกลาง 40 รายการยังไม่ทวนสอบ</b>'+
 '<p>เอกสาร QPFM-02-001 มีเนื้อหาเปลี่ยนวันนี้และถูก Gateway พักการเปิดด้วย HTTP 409 จนกว่า DCC จะทวน Revision</p>'+
 '<div class="wq-source-links"><a href="'+esc(S.governance.approval_queue)+'" target="_blank" rel="noopener noreferrer">เปิดงานตรวจรับ QMR/DCC ↗</a>'+(S?.live_sources||[]).map(z=>'<a href="http://127.0.0.1:8769/evidence/'+encodeURIComponent(z.gateway_code)+'" target="_blank" rel="noopener noreferrer">'+esc(z.label)+' ↗</a>').join("")+'</div>'+
 '<small>เปิดต้นฉบับ Excel บน NB ที่ต่อ W: และ Local Gateway เท่านั้น · ตัวเลขรายงานไม่ใช่ผลรับรอง Effectiveness</small></div></section>'+ 
 
 '<section class="wq-section"><header><h3>Closure Control Center · งานรับรองก่อนปิด 100%</h3><p>รายการนี้เป็นคิวการตรวจรับจริง ไม่ใช่การรับรองผลแทน DCC หรือ QMR</p></header>'+
 '<div class="wq-source-health"><b>ผลในทะเบียนทวนสอบจริง '+esc(S?.source_verification?.wc_checks_with_real_outcome_in_master??0)+' / '+esc(S?.source_verification?.wc_checks_in_master??40)+' รายการ · QMR Effective '+esc(S?.source_verification?.effectiveness_qmr_verified_in_accessible_sources??0)+' / 15 เคส</b>'+
 '<p>การมี CAR PDF/ไฟล์แนบครบ ไม่ได้แปลว่ามาตรการป้องกันซ้ำมีประสิทธิผล ต้องมีตัวอย่างงานหลังแก้และลายมือชื่อผู้อนุมัติ</p>'+
 '<div class="wq-table-wrap"><table><thead><tr><th>Owner</th><th>ประเด็นค้าง</th><th>Acceptance Gate</th><th>ติดตาม</th></tr></thead><tbody>'+
 '<tr><td>DCC/QMR</td><td>CAR Identity 6 เคส</td><td>ยืนยันเหตุการณ์ / SO / Site และ Change Log</td><td><a href="https://github.com/popvarachat/practika-car-digital-twin/issues/3" target="_blank" rel="noopener noreferrer">#3 ตรวจ CAR</a></td></tr>'+
 '<tr><td>DCC</td><td>QPFM-02-001 · HTTP 409</td><td>อนุมัติ Master/Revision/Hash ก่อนปลด Hold</td><td><a href="https://github.com/popvarachat/practika-car-digital-twin/issues/4" target="_blank" rel="noopener noreferrer">#4 Document</a></td></tr>'+
 '<tr><td>Owner/DCC/QMR</td><td>Action Plan อ้างอิงผิด 4 จุด</td><td>Corrigendum หรือเอกสารควบคุมฉบับแก้</td><td><a href="https://github.com/popvarachat/practika-car-digital-twin/issues/5" target="_blank" rel="noopener noreferrer">#5 Plan</a></td></tr>'+
 '<tr><td>QC/SCD/หน่วยงาน</td><td>Verification Log 40 ประเด็น</td><td>วัน / งาน / จำนวนสุ่ม / ผู้ตรวจ / หลักฐาน</td><td><a href="https://github.com/popvarachat/practika-car-digital-twin/issues/6" target="_blank" rel="noopener noreferrer">#6 WC Result</a></td></tr>'+
 '<tr><td>QMR</td><td>Effectiveness 15 เคส + PTK_06</td><td>ผลหลังใช้จริงและคำรับรองตามเกณฑ์การนับ</td><td><a href="https://github.com/popvarachat/practika-car-digital-twin/issues/7" target="_blank" rel="noopener noreferrer">#7 Signoff</a></td></tr>'+
 '<tr><td>จัดส่ง/QC/DCC</td><td>รายงานต้นทางเลข CAR คลาดเคลื่อน 2 จุด · QC PASS ขาดหลักฐาน 3 จุด</td><td>ตรวจ G8/G9 รายงานจัดส่ง และแนบเลข Record/Link ผลตรวจ QC</td><td><a href="https://github.com/popvarachat/practika-car-digital-twin/issues/8" target="_blank" rel="noopener noreferrer">#8 Source QA</a></td></tr>'+
 '</tbody></table></div>'+
 '<small>แสดงเฉพาะ Metadata ที่เผยแพร่ได้ · เอกสารต้นฉบับคงอยู่ W:/SharePoint และ QMR เป็นผู้ตัดสินผล · ระยะติดตาม พ.ย.–ธ.ค. 2569</small></div></section>'+
 '<section class="wq-section"><header><h3>ทวนสอบเลข CAR ในแผนลงนาม · ก่อนใช้เป็น Evidence ให้ Auditor</h3><p>ไฟล์ QPFM-29-001 วันที่ 13 พ.ย. มีภาพลายเซ็น 3 ตำแหน่ง แต่บางเลขอ้างอิงยังต่างจากแฟ้ม CAR ที่ตรวจ</p></header>'+
 '<div class="wq-source-health">'+
 '<div class="wq-source-links"><a href="http://127.0.0.1:8769/evidence/QMR-SIGNED-PLAN-PDF" target="_blank" rel="noopener noreferrer">เปิด Action Plan PDF ต้นฉบับบน NB ↗</a></div>'+
 '<div class="wq-table-wrap"><table><thead><tr><th>หัวข้อ</th><th>เลขตามแผนลงนาม</th><th>หลักฐานที่ตรวจพบ</th><th>ประเด็นต้องทวนสอบ</th></tr></thead><tbody>'+
 (S?.plan_assurance?.car_crosswalk_mismatches||[]).map(x=>'<tr><td>'+esc(x.topic)+'</td><td>'+esc(x.printed)+'</td><td>'+esc(x.evidence)+'</td><td>'+esc(x.note)+'</td></tr>').join("")+
 '</tbody></table></div>'+
 '<p>ไม่แก้ PDF ที่ลงนามย้อนหลัง ระบบแสดง Crosswalk เปรียบเทียบและให้ DCC/QMR ออกฉบับทบทวนเมื่อยืนยันแล้ว</p></div></section>'+ 

 '<section class="wq-section"><header><h3>Weekly Recurrence Prevention · 9 สัปดาห์</h3><p>แผนสุ่มตรวจเสริม ไม่แทน Quality / Safety Gate ที่ต้องตรวจทุกครั้งตามมาตรฐาน</p></header><div class="wq-table-wrap"><table><thead><tr><th>หน่วยงาน</th>'+weekTh+'</tr></thead><tbody>'+rows+'</tbody></table></div><div class="wq-evidence" id="wqDetails"></div></section>'+
 '<section class="wq-section wq-risk"><header><h3>WQ6 · ความเสี่ยงระดับองค์กรและมาตรการข้ามฝ่าย</h3><p>ข้อเสนอสำหรับให้เจ้าของความเสี่ยงและ QMR ยืนยัน ไม่กำหนดคะแนน P×I แทนผู้อนุมัติ</p></header><div class="wq-table-wrap"><table><thead><tr><th>รหัส</th><th>Failure Mode</th><th>เคส</th><th>System Control</th><th>เจ้าภาพร่วม</th><th>Risk Approval</th></tr></thead><tbody>'+riskRows+'</tbody></table></div></section>'+
 '<p class="wq-foot">แหล่งข้อมูล: Summary26/ทะเบียน Complaint 17 พ.ย. + QMR Audit 15 ต.ค. + ตรวจ CAR บน W: 19 พ.ย. 2569 + รายงานฝ่าย QC/SCD/จัดส่ง · ยังไม่ใช่ทะเบียนผลการสุ่มตรวจที่ QMR ลงนามรับรอง</p></div>';
function drawDetails(){
 const o=owners.find(x=>x.id===chosenOwner)||owners[0],w=weeks[chosenWeek],task=o.plan[chosenWeek%o.plan.length];
 const n=task[0],c=A.cases.find(x=>x.n===n);
 const caseEvidence=(S?.case_evidence?.[String(n)]||[]);
 const sourceStatus=caseEvidence.map(z=>"<div class=\"wq-source-row\"><b>"+esc(z.label)+"</b><small>"+esc(z.caveat)+"</small></div>").join("");
 document.getElementById("wqDetails").innerHTML='<h4>'+esc(o.name)+' · '+esc(w[0]+' ('+w[1]+')')+'</h4>'+
 '<p><b>Action เช็คซ้ำ:</b> '+esc(task[1])+'</p><p><b>หลักฐานที่ต้องแนบ:</b> '+esc(task[2])+'</p>'+
 '<p><b>เคสอ้างอิง:</b> #'+pad(n)+' '+esc(caseName(n))+'</p>'+
 '<p><b>วิธีตรวจประสิทธิผล:</b> '+esc(c?.test_required||"สุ่มตรวจงานใหม่และบันทึกการใช้มาตรการ")+'</p>'+
 '<div class="missing">'+(caseEvidence.length?'มีรายงานจากหน่วยงานแล้ว แต่ยังขาดหลักฐานสุ่มตรวจครบชุดและ QMR อนุมัติ':'ยังไม่พบผลรายงานเฉพาะเคสนี้ในแหล่งที่เชื่อม')+' · ห้ามตีความว่าไม่มีการตรวจหรือ PASS แล้ว</div>'+sourceStatus+
 '<p><button class="wq-link" data-wq-case="'+n+'">เปิด Complaint / CAR / Attachment / Evidence Gate #'+pad(n)+'</button></p>';
}
root.addEventListener("click",event=>{
 const cell=event.target.closest("[data-wq-owner][data-wq-week]");
 if(cell){chosenOwner=cell.dataset.wqOwner;chosenWeek=Number(cell.dataset.wqWeek);drawDetails();return}
 const c=event.target.closest("[data-wq-case]");
 if(c)location.hash="#twin-"+pad(Number(c.dataset.wqCase));
});
window.PTK_WEEKLY_FOR_CASE=function(n){
 const caseNum=Number(n), rows=[];
 for(const owner of owners){
   for(let i=0;i<weeks.length;i++){
     const task=owner.plan[i%owner.plan.length];
     if(Number(task[0])===caseNum){
       const w=weeks[i];
       rows.push({owner_id:owner.id,owner:owner.name,week:w[0],period:w[1],
         deadline:w[2],action:task[1],evidence_required:task[2],
         result_state:"PLANNED_NOT_INDEPENDENTLY_VERIFIED"});
     }
   }
 }
 return rows;
};
window.PTK_RENDER_RISK=function(){drawDetails()};
drawDetails();
})();