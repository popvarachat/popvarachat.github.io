/* Cloudflare Cron+D1 first, GitHub checkpoint fallback. Reads only; no source scans. */
(function(){
"use strict";
const E=id=>document.getElementById(id);
const SITE="https://popvarachat.github.io/md-follow-up/";
const CLOUD="https://md-control-refresh-orchestrator.varachat-n.workers.dev/status";
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function dt(s){
 if(!s)return "ไม่มีผลยืนยัน";
 const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"ไม่มีผลยืนยัน";
}
function dateToday(){
 return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
const chip=(good,text)=>'<span class="morning-result-tag '+(good?"yes":"no")+'">'+safe(text)+'</span>';
async function read(url){
 const r=await fetch(url,{cache:"no-store",mode:"cors",signal:AbortSignal.timeout(5500)});
 if(!r.ok)throw Error("HTTP "+r.status);return r.json();
}
function renderCloud(j){
 if(j.schema!==1||j.controller!=="Cloudflare Cron Trigger + D1"||j.sources?.length!==13)throw Error("incomplete cloud receipt");
 const today=dateToday(),isToday=j.last_audit_date===today;
 const genuine=isToday&&j.todays_nb_result_confirmed&&j.phase!=="baseline_after_09_not_morning";
 const verified=j.sources.filter(x=>genuine&&x.status==="NB_VERIFIED_TODAY").length;
 E("morningResult").textContent=!isToday||j.phase==="baseline_after_09_not_morning"
  ?"ยังไม่มีผลยืนยันรอบก่อน 09:00 วันนี้ — แสดง Last Update ครั้งสุดท้าย"
  :!genuine?"Cloudflare ตรวจแล้ว แต่ยังไม่พบผล NB เช้าวันนี้"
  :"Cloudflare ตรวจผล NB วันนี้แล้ว "+verified+"/13 Source"+(verified<13?" · ยังไม่ครบ":" · ครบตามแหล่งที่กำหนด");
 E("morningRunTime").textContent="Cloudflare Cron ตรวจล่าสุด: "+dt(j.cloud_heartbeat_at)+
  " · Last Update เก็บถาวรใน Cloudflare D1 · ไม่สแกนซ้ำเมื่อเปิดเว็บ";
 E("morningStats").hidden=false;
 E("morningStats").innerHTML='<div><strong>'+verified+'/13</strong>แหล่งที่ยืนยันในรอบเช้า</div>'+
  '<div><strong>'+safe(j.last_audit_date||"ยังไม่มี")+'</strong>Cloudflare Audit ล่าสุด</div>'+
  '<div><strong>'+safe(genuine?"NB รายงานแล้ว":"NB ยังไม่ยืนยัน")+'</strong>สถานะเช้านี้</div>';
 E("morningSources").innerHTML=j.sources.map(x=>{
  const nbOK=genuine&&x.status==="NB_VERIFIED_TODAY";
  const connector=isToday&&j.todays_sharepoint_connector_confirmed&&x.last_connector_read_date===today;
  const state=nbOK?chip(true,"NB ตรวจวันนี้"):connector?chip(false,"Connector อ่าน / NB ยังไม่รับรอง"):chip(false,"ยังไม่ยืนยันเช้านี้");
  const extra=(x.last_connector_read_date?"Connector อ่าน "+x.last_connector_read_date:"")+
    (x.last_nb_integrated_at?" · NB Snapshot "+dt(x.last_nb_integrated_at):"");
  return '<tr><td><strong>'+safe(x.label)+'</strong></td><td>'+state+'</td>'+
    '<td>'+safe(dt(x.last_success_at))+(extra?'<small>'+safe(extra)+'</small>':"")+'</td>'+
    '<td>'+safe(dt(x.last_source_modified_at))+'</td></tr>';
 }).join("");
}
function renderFallback(j,sp){
 if(j.schema!==1||!Array.isArray(j.sources))throw Error("bad GitHub receipt");
 E("morningResult").textContent="Cloudflare ไม่พร้อม — แสดง Last Update จาก GitHub โดยยังไม่รับรองผลรอบเช้า";
 E("morningRunTime").textContent="GitHub receipt ล่าสุด: "+dt(j.run_finished_at)+" · ไม่เรียก Source ใหม่";
 E("morningStats").hidden=false;
 E("morningStats").innerHTML='<div><strong>'+safe(j.checked??0)+'/'+safe(j.total??13)+'</strong>ผลตรวจครั้งสุดท้าย</div>'+
  '<div><strong>'+safe(j.target_date||"—")+'</strong>วันที่ได้รับรายงานล่าสุด</div>'+
  '<div><strong>ไม่ได้ยืนยัน</strong>Cloudflare Cron</div>';
 const sh=new Map((sp?.sources||[]).map(x=>[x.key,x]));
 E("morningSources").innerHTML=j.sources.map(x=>{
  const meta=sh.get(x.key);
  return '<tr><td><strong>'+safe(x.label)+'</strong></td>'+
   '<td>'+chip(false,"ยังไม่ยืนยันเช้านี้")+'</td>'+
   '<td>'+safe(dt(x.last_success_at))+'</td>'+
   '<td>'+safe(dt(meta?.source_modified_at||x.source_modified_at))+'</td></tr>';
 }).join("");
}
async function update(){
 const button=E("morningReadAgain");button.disabled=true;
 E("morningResult").textContent="กำลังตรวจ Cloudflare D1 ล่าสุด (ไม่สแกนข้อมูลต้นทาง)…";
 try{renderCloud(await read(CLOUD))}
 catch{
  try{const old=await read(SITE+"morning-refresh-status.json");
   let sp=null;try{sp=await read(SITE+"sharepoint-morning-status.json")}catch{}
   renderFallback(old,sp);
  }catch{
   E("morningResult").textContent="ทั้ง Cloudflare และ GitHub ไม่ตอบสนอง — ไม่อ้างว่า Refresh สำเร็จ";
   E("morningRunTime").textContent="กรุณาตรวจการเชื่อมต่ออีกครั้ง";
  }
 }finally{button.disabled=false}
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!E("morningReadAgain"))return;
 E("morningReadAgain").addEventListener("click",update);update();
},{once:true});
})();