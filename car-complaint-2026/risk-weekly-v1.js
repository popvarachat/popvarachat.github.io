/* WQ6 organization risk and balanced weekly recurrence-prevention plan.
   This is planning intelligence, NOT signed verification of performed audits. */
(function(){
"use strict";
const root=document.getElementById("riskView"),A=window.PTK_AUDITOR_DATA;
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
 '<div class="wq-header"><div><small>ISO 9001 / WQ6 / SYSTEMIC PREVENTION</small><h2>ป้องกันการเกิด Complaint ซ้ำในงานจริง</h2><p>แผนตรวจหมุนเวียน พ.ย.–ธ.ค. 2569: หน่วยงานหลักหนึ่งหัวข้อต่อสัปดาห์ แยกแผนงานออกจากผลตรวจที่มีหลักฐาน</p></div><span class="wq-pill">แผนเสนอ · ไม่ใช่ผลตรวจที่อนุมัติ</span></div>'+
 '<div class="wq-stats"><div><span>รายการในทะเบียน</span><strong>15</strong><small>17 พ.ย. 2569</small></div><div><span>PTK_06 เบื้องต้น</span><strong>14</strong><small>เป้าไม่เกิน 10 / รอรับรองวิธีนับ</small></div><div><span>รอบตรวจตามแผน</span><strong>81</strong><small>9 ทีม × 9 สัปดาห์</small></div><div><span>หลักฐานรายสัปดาห์</span><strong>รอเชื่อม</strong><small>ไม่ตีความว่าไม่มีการตรวจ</small></div></div>'+
 '<section class="wq-section"><header><h3>Weekly Recurrence Prevention · 9 สัปดาห์</h3><p>แผนสุ่มตรวจเสริม ไม่แทน Quality / Safety Gate ที่ต้องตรวจทุกครั้งตามมาตรฐาน</p></header><div class="wq-table-wrap"><table><thead><tr><th>หน่วยงาน</th>'+weekTh+'</tr></thead><tbody>'+rows+'</tbody></table></div><div class="wq-evidence" id="wqDetails"></div></section>'+
 '<section class="wq-section wq-risk"><header><h3>WQ6 · ความเสี่ยงระดับองค์กรและมาตรการข้ามฝ่าย</h3><p>ข้อเสนอสำหรับให้เจ้าของความเสี่ยงและ QMR ยืนยัน ไม่กำหนดคะแนน P×I แทนผู้อนุมัติ</p></header><div class="wq-table-wrap"><table><thead><tr><th>รหัส</th><th>Failure Mode</th><th>เคส</th><th>System Control</th><th>เจ้าภาพร่วม</th><th>Risk Approval</th></tr></thead><tbody>'+riskRows+'</tbody></table></div></section>'+
 '<p class="wq-foot">แหล่งข้อมูล: Summary26/ทะเบียน Complaint 17 พ.ย. + QMR Audit 15 ต.ค. + ตรวจ CAR บน W: 18 พ.ย. 2569 · ยังไม่ใช่ทะเบียนผลการสุ่มตรวจที่ DCC/QMR ลงนามรับรอง</p></div>';
function drawDetails(){
 const o=owners.find(x=>x.id===chosenOwner)||owners[0],w=weeks[chosenWeek],task=o.plan[chosenWeek%o.plan.length];
 const n=task[0],c=A.cases.find(x=>x.n===n);
 document.getElementById("wqDetails").innerHTML='<h4>'+esc(o.name)+' · '+esc(w[0]+' ('+w[1]+')')+'</h4>'+
 '<p><b>Action เช็คซ้ำ:</b> '+esc(task[1])+'</p><p><b>หลักฐานที่ต้องแนบ:</b> '+esc(task[2])+'</p>'+
 '<p><b>เคสอ้างอิง:</b> #'+pad(n)+' '+esc(caseName(n))+'</p>'+
 '<p><b>วิธีตรวจประสิทธิผล:</b> '+esc(c?.test_required||"สุ่มตรวจงานใหม่และบันทึกการใช้มาตรการ")+'</p>'+
 '<div class="missing">ยังไม่พบ Record รายสัปดาห์จากเจ้าภาพในแหล่งที่เชื่อม · ห้ามแสดง PASS โดยไม่มีผลตรวจ จำนวนงาน และผู้ทวนสอบ</div>'+
 '<p><button class="wq-link" data-wq-case="'+n+'">เปิด Complaint / CAR / Attachment / Evidence Gate #'+pad(n)+'</button></p>';
}
root.addEventListener("click",event=>{
 const cell=event.target.closest("[data-wq-owner][data-wq-week]");
 if(cell){chosenOwner=cell.dataset.wqOwner;chosenWeek=Number(cell.dataset.wqWeek);drawDetails();return}
 const c=event.target.closest("[data-wq-case]");
 if(c)location.hash="#twin-"+pad(Number(c.dataset.wqCase));
});
window.PTK_RENDER_RISK=function(){drawDetails()};
drawDetails();
})();