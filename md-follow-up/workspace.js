/* Landing reads ONLY read-only source receipts from a local NB; never rescans. */
(function(){
"use strict";
const find=id=>document.getElementById(id);
const statusText={recent:"ล่าสุดตามเกณฑ์",stale:"ข้อมูลตรวจเก่า",error:"อ่านล้มเหลว",unavailable:"ยังไม่มีใบยืนยัน",unknown:"ยังไม่ยืนยัน"};
const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function check(){
 const button=find("healthCheck");if(button)button.disabled=true;
 const title=find("healthText"),detail=find("healthDetails"),dot=find("healthDot");
 title.textContent="ตรวจใบยืนยันที่ NB…";
 try{
  const r=await fetch("http://127.0.0.1:8766/source-audit.json",{cache:"no-store",mode:"cors",signal:AbortSignal.timeout(4500)});
  if(!r.ok)throw Error("Local Viewer "+r.status);
  const j=await r.json();
  if(j.read_only!==true||j.new_scan_triggered!==false||!Array.isArray(j.sources))throw Error("invalid receipt");
  const recent=j.counts?.recent||0,total=j.total||j.sources.length;
  const issues=j.sources.filter(x=>x.status!=="recent");
  title.textContent=issues.length?"ตรวจ Source ล่าสุดตามเกณฑ์ "+recent+"/"+total+" · มี "+issues.length+" แหล่งต้องตรวจเพิ่ม":"ตรวจ Source ล่าสุดตามเกณฑ์ครบ "+total+" แหล่ง";
  detail.textContent="เวลาอ่านใบยืนยัน "+new Date(j.checked_at).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})+" · ไม่เรียก Graph, Excel หรือ D1 ใหม่";
  dot.className="health-dot "+(issues.length?"warn":"ok");
  const container=find("healthOverview");container.hidden=false;
  container.innerHTML=issues.length?issues.map(x=>'<div><strong>'+html(x.label)+'</strong>'+
    '<span>'+html(statusText[x.status]||x.status)+'</span>'+
    (x.last_verified?'<div>ตรวจล่าสุด '+html(new Date(x.last_verified).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}))+'</div>':"")+
    '</div>').join(""):'<div><strong>'+recent+'/'+total+'</strong>ไม่มีแหล่งใดเกินเกณฑ์ที่กำหนดไว้</div>';
 }catch(e){
  title.textContent="ยังยืนยันสถานะทุก Source จาก NB ไม่ได้";
  detail.textContent="หน้านี้ไม่สามารถเข้าถึง Private Viewer จาก Browser ปัจจุบัน · เปิดบน NB ที่เชื่อมต่อ หรือใช้ MD Pivot เพื่อตรวจใบยืนยันจริง";
  dot.className="health-dot warn";
  find("healthOverview").hidden=true;
 }finally{if(button)button.disabled=false}
}
document.addEventListener("DOMContentLoaded",()=>{find("healthCheck")?.addEventListener("click",check);check()},{once:true});
})();
