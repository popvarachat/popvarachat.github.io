(function(){
"use strict";
const E=id=>document.getElementById(id);
const ROOT="https://popvarachat.github.io/md-follow-up/";
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function thaiTime(s){
 if(!s)return "ยังไม่มีข้อมูล";
 const v=new Date(s);
 if(!Number.isFinite(v.getTime()))return "ยังไม่มีข้อมูล";
 return v.toLocaleString("th-TH",{timeZone:"Asia/Bangkok",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
function todayICT(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function workingDay(){const d=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Bangkok",weekday:"short"}).format(new Date());return d!=="Sat"&&d!=="Sun";}
async function read(url){
 const r=await fetch(url,{cache:"no-store"});
 if(!r.ok)throw Error("HTTP "+r.status);
 return r.json();
}
async function updateMorning(){
 const button=E("morningReadAgain");
 button.disabled=true;
 E("morningResult").textContent="กำลังอ่านใบยืนยันรอบเช้าจาก GitHub…";
 try{
  const a=await read(ROOT+"morning-refresh-status.json");
  let sp=null;
  try{sp=await read(ROOT+"sharepoint-morning-status.json")}catch{}
  if(a.schema!==1||!Array.isArray(a.sources))throw Error("source metadata invalid");
  const isToday=a.target_date===todayICT();
  const missingToday=workingDay()&&!isToday;
  const last=a.run_finished_at?thaiTime(a.run_finished_at):"ยังไม่เคยได้รับผล";
  const status=a.status||"awaiting_first_run";
  E("morningResult").textContent=missingToday
   ?"ยังไม่ได้รับผลรอบเช้าวันนี้ — คงข้อมูลที่อ่านสำเร็จครั้งสุดท้ายไว้"
   :!a.run_finished_at
    ?"ยังไม่มีรายงานการ Refresh รอบเช้าที่ตรวจยืนยันได้"
    :a.checked+"/"+a.total+" Sources มีผลยืนยัน · "+(status==="complete"?"ครบตามรอบ":"ยังไม่ครบ");
  E("morningRunTime").textContent="ผลรอบที่ได้รับล่าสุด: "+last+
    " · เป้าหมาย จันทร์–ศุกร์ ก่อน 09:00 · NB Offline ก็ยังอ่าน Last Update ได้";
  const stats=E("morningStats");stats.hidden=false;
  stats.innerHTML=
   '<div><strong>'+escapeHtml(String(a.checked??"—")+"/"+String(a.total??"—"))+'</strong>Sources ที่ยืนยันในรายงานล่าสุด</div>'+
   '<div><strong>'+escapeHtml(a.target_date||"—")+'</strong>วันที่ของผลล่าสุดที่ได้รับ</div>'+
   '<div><strong>'+escapeHtml(missingToday?"ไม่มีผลใหม่วันนี้":status==="complete"?"ครบ":"ยังไม่ครบ")+'</strong>สถานะรอบเช้า</div>';
  const md=new Map((sp?.sources||[]).map(s=>[s.key,s]));
  E("morningSources").innerHTML=a.sources.map(x=>{
   const record=md.get(x.key);
   const fileModified=record?.source_modified_at||x.source_modified_at;
   const readAt=x.last_success_at;
   const ok=x.result==="ok"&&!missingToday;
   const caption=x.key==="innovation"?"SharePoint: "+(record?.title||"ตารางรวมงานนวัตกรรม.xlsx"):
     x.key==="mm"?"SharePoint: "+(record?.title||"วาระติดตาม MM ปี 2569.xlsx"):"";
   const connector=record?.connector_read_date?"Connector อ่านต้นทางเมื่อ "+record.connector_read_date+
     (record.nb_synced_today?" · มี Snapshot บน NB":" · ยังไม่ซิงก์ข้อมูลรอบนี้เข้า NB"):"";
   return '<tr><td><strong>'+escapeHtml(x.label)+'</strong>'+(caption?'<small>'+escapeHtml(caption)+'</small>':"")+'</td>'+
    '<td><span class="morning-result-tag '+(ok?"yes":"no")+'">'+(ok?"ยืนยันแล้ว":"ยังไม่ยืนยันรอบเช้า")+'</span></td>'+
    '<td>'+escapeHtml(thaiTime(readAt))+(connector?'<small>'+escapeHtml(connector)+'</small>':"")+'</td>'+
    '<td>'+escapeHtml(thaiTime(fileModified))+'</td></tr>';
  }).join("")||'<tr><td colspan="4">ยังไม่มีข้อมูลแต่ละ Source</td></tr>';
 }catch(e){
  E("morningResult").textContent="ยังอ่านรายงาน Cloud ครั้งสุดท้ายไม่ได้ — ไม่อ้างว่าข้อมูลสด";
  E("morningRunTime").textContent="ตรวจการเชื่อมต่อ GitHub Pages หรือลองใหม่ · "+e.message;
  E("morningSources").innerHTML='<tr><td colspan="4">ไม่สามารถยืนยันวันที่ Last Update ได้</td></tr>';
 }finally{button.disabled=false}
}
document.addEventListener("DOMContentLoaded",()=>{if(!E("morningReadAgain"))return;E("morningReadAgain").addEventListener("click",updateMorning);updateMorning()},{once:true});
})();