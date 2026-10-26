(()=>{
"use strict";
const E=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function at(value){
 if(!value)return "ยังไม่พบเวลา";
 const date=new Date(value);
 return Number.isFinite(date.getTime())
  ?date.toLocaleString("th-TH",{timeZone:"Asia/Bangkok",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})
  :String(value);
}
const statusMap={
 recent:{text:"ตรวจล่าสุดตามเกณฑ์",cls:"recent"},
 stale:{text:"ข้อมูลตรวจเก่า",cls:"stale"},
 error:{text:"ตรวจล้มเหลว",cls:"error"},
 unavailable:{text:"ยังไม่มีใบยืนยัน",cls:"unavailable"},
 unknown:{text:"ยังยืนยันไม่ได้",cls:"unknown"}
};
const modeMap={
 deep_scanned:"อ่านไฟล์จริงในรอบล่าสุด",
 signature_cached:"เทียบขนาด/เวลา ไม่อ่าน Excel ซ้ำ",
 previous_receipt:"อ้างอิงผลตรวจครั้งก่อน",
 external_receipt:"ใบยืนยันจากระบบเชื่อมต่อ",
 connector_snapshot_not_auto_sync:"Snapshot SharePoint (ไม่ Auto-Sync)",
 incremental_room_only:"อ่านเพิ่มเฉพาะห้อง LINE เป้าหมาย"
};
function render(data){
 const rows=Array.isArray(data.sources)?data.sources:[];
 const fresh=data.counts?.recent||0,total=data.total||rows.length;
 const issues=rows.filter(x=>x.status!=="recent");
 E("auditSummary").textContent=issues.length
  ?"ยังไม่ยืนยันครบทุก Source — ล่าสุด "+fresh+"/"+total+" แหล่ง · ต้องตรวจสอบอีก "+issues.length+" แหล่ง"
  :"ตรวจยืนยันตามเกณฑ์ครบ "+fresh+"/"+total+" แหล่ง (บางแหล่งใช้ Snapshot ไม่ใช่ Live Sync)";
 const batch="ชุด W ล่าสุด "+at(data.w_batch_checked_at)+" · ผ่าน "+(data.w_batch_success??"?")+"/"+(data.w_batch_total??"?")+" · Pivot สร้างล่าสุด "+at(data.pivot_built_at);
 E("auditReceipt").textContent=batch;
 E("auditCounts").innerHTML=[
 ["Source รวม",total],["ตรวจล่าสุดตามเกณฑ์",fresh],
 ["ต้องตรวจใหม่",total-fresh],["W ตรวจผ่าน",String(data.w_batch_success??"?")+"/"+String(data.w_batch_total??"?")]
 ].map(([label,value])=>'<div class="audit-pill"><strong>'+esc(value)+'</strong>'+esc(label)+'</div>').join("");
 E("auditRows").innerHTML=rows.map(row=>{
  const tag=statusMap[row.status]||statusMap.unknown;
  const extra=[];
  if(row.note)extra.push(row.note);
  if(row.needs_manual_permission)extra.push("ยังไม่มี Refresh อัตโนมัติจากต้นทาง");
  if(row.last_attempt)extra.push("ลองตรวจล่าสุด: "+at(row.last_attempt));
  return '<tr><td><strong>'+esc(row.label)+'</strong><div class="desc">'+esc(row.provider)+'</div></td>'+
    '<td><span class="audit-chip '+esc(tag.cls)+'">'+esc(tag.text)+'</span></td>'+
    '<td>'+esc(at(row.last_verified))+'</td><td>'+esc(at(row.source_modified))+'</td>'+
    '<td>'+esc(modeMap[row.verification]||row.verification||"ไม่ระบุ")+
    (extra.length?'<div class="desc">'+esc(extra.join(" · "))+'</div>':"")+
    '</td></tr>';
 }).join("");
}
async function refresh(){
 const label=E("auditSummary");
 if(!label)return;
 label.textContent="กำลังอ่านใบยืนยันเดิมจาก NB (ไม่มีการสแกน Source ใหม่)…";
 try{
  const response=await fetch("/source-audit.json",{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  if(data.read_only!==true||data.new_scan_triggered!==false)throw Error("source audit contract invalid");
  render(data);
 }catch(error){
  label.textContent="ยังตรวจสถานะ Source ไม่ได้: "+error.message+" · ไม่ถือว่าตรวจครบ";
  E("auditRows").innerHTML='<tr><td colspan="5">ไม่มีใบยืนยันล่าสุด โปรดตรวจ Private Viewer</td></tr>';
 }
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!E("sourceAuditPanel"))return;
 E("auditReadAgain").addEventListener("click",refresh);
 refresh();
});
})();