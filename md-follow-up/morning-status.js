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

const REFRESHABLE=new Set(["cb","ics","icf","ice","cb_edu","cb_icf","cb_ics","cb_new","cb_abdul","planner","innovation_line","innovation","mm"]);
const PRIVATE_PAGE="http://127.0.0.1:8766/workspace.html";
const PRIVATE_API="http://127.0.0.1:8766";
const SOURCE_ACTION_NAME={mm:"1. เปิดต้นฉบับ",innovation:"1. เปิดต้นฉบับ"};
const MANUAL_INFO={};
const windows={cb:26,ics:26,icf:26,ice:26,cb_edu:26,cb_icf:26,cb_ics:26,cb_new:26,cb_abdul:26,planner:5,innovation_line:2.5,innovation:30,mm:30};
const linkFor={mm:"http://127.0.0.1:8766/manual-open-sharepoint?source=mm",
 innovation:"http://127.0.0.1:8766/manual-open-sharepoint?source=innovation"};
let latestRows=[],showAll=false,activeManual=null;
const isLocal=()=>["127.0.0.1","localhost"].includes(location.hostname);
function freshness(row){
 if(["mm","innovation"].includes(row.key)){
   const last=MANUAL_INFO[row.key]?.last_success_at;
   return {needs:true,reason:last?"Manual Sync เข้า Dashboard สำเร็จ "+dt(last)+" · ยังไม่มี Auto-Sync แบบไม่พึ่ง Chrome":
     "ยังไม่มี Auto-Sync แบบอิสระ · กดอ่านข้อมูลอีกครั้งผ่าน Chrome ที่ลงชื่อเข้าใช้อยู่"};
 }
 const time=MANUAL_INFO[row.key]?.last_success_at||row.last_success_at||null;
 if(!time)return {needs:true,reason:"ยังไม่มีหลักฐานอ่านสำเร็จ"};
 const age=(Date.now()-Date.parse(time))/3600000;
 if(!Number.isFinite(age)||age>=(windows[row.key]||24))return {needs:true,reason:"Last Update เกินเกณฑ์ "+(windows[row.key]||24)+" ชั่วโมง"};
 if(age<-.5)return {needs:true,reason:"เวลาอัปเดตผิดปกติ"};
 return {needs:false,reason:"มี Last Update ภายในเกณฑ์"};
}
function action(row){
 const note=freshness(row);
 const manual=MANUAL_INFO[row.key];
 const flagged=note.needs;
 const isSharePoint=row.key==="mm"||row.key==="innovation";
 const openButton=isSharePoint?'<a class="manual-source-button manual-link" href="'+safe(linkFor[row.key])+'" target="_blank" rel="noopener noreferrer">'+safe(SOURCE_ACTION_NAME[row.key])+'</a>':"";
 const refreshButton='<button type="button" class="manual-source-button" data-manual-source="'+safe(row.key)+'"'+
   (activeManual&&activeManual!==row.key?' disabled':'')+'>'+
   (activeManual===row.key?"กำลังตรวจ…":isSharePoint?"2. อ่านข้อมูลเข้าเว็บอีกครั้ง":"Manual Refresh")+'</button>';
 const btn=openButton+refreshButton;
 return '<div class="manual-cell" data-source-action="'+safe(row.key)+'">'+
   (flagged?'<small class="manual-problem">'+safe(note.reason)+'</small>':'<small class="manual-healthy">ข้อมูลสดตามเกณฑ์</small>')+
   (flagged||showAll?btn:'')+
   (isSharePoint&&flagged?'<small>ระบบใช้ Chrome/Playwright ที่ลงชื่อเข้าใช้แล้วอ่านไฟล์และอัปเดต Dashboard เอง หากไม่มีสิทธิ์หรือ NB ปิดอยู่จะเก็บ Last Update เดิม</small>':'')+
   (manual?.result==="manual_verified"?'<small class="manual-healthy">อ่านเข้า Dashboard สำเร็จ: '+safe(dt(manual.last_success_at))+'</small>':'')+
 '</div>';
}
function drawRows(rows){
 latestRows=rows;
 const show=showAll?rows:rows.filter(x=>freshness(x).needs);
 const control=document.getElementById("manualFilter");
 if(control)control.textContent=showAll?"ดูเฉพาะ Source ที่ต้องแก้":"ดูทั้ง 13 Source";
 const counter=document.getElementById("manualNeedsCount");
 const n=rows.filter(x=>freshness(x).needs).length;
 if(counter)counter.textContent="Source ต้องตรวจ/แก้ไข "+n+" แหล่ง · กด Manual แยกบรรทัด";
 E("morningSources").innerHTML=(show.length?show.map(x=>{
  const manual=MANUAL_INFO[x.key];
  const newer=manual?.last_success_at&&Date.parse(manual.last_success_at)>Date.parse(x.last_success_at||0)?manual.last_success_at:x.last_success_at;
  const modified=manual?.source_modified_at||x.last_source_modified_at||x.source_modified_at;
  const connector=x.last_connector_read_date?"Connector อ่านวันที่ "+x.last_connector_read_date:"";
  const extra=x.last_nb_integrated_at?" · NB Snapshot "+dt(x.last_nb_integrated_at):"";
  const flags=freshness(x);
  const status=flags.needs?chip(false,"ต้องดำเนินการ"):chip(true,"มีผลตรวจที่ยังสด");
  return '<tr data-source-key="'+safe(x.key)+'"><td><strong>'+safe(x.label)+'</strong></td>'+
     '<td>'+status+'</td><td>'+safe(dt(newer))+(connector||extra?'<small>'+safe(connector+extra)+'</small>':'')+'</td>'+
     '<td>'+safe(dt(modified))+'</td><td>'+action(x)+'</td></tr>';
 }).join(""):'<tr><td colspan="5">ไม่มี Source เกินเกณฑ์ · กด “ดูทั้ง 13 Source” เพื่อสั่งตรวจเอง</td></tr>');
}
async function loadManualIndex(){
 try{
  const receipt=await read("https://raw.githubusercontent.com/popvarachat/popvarachat.github.io/main/md-follow-up/manual-source-status.json");
  Object.assign(MANUAL_INFO,receipt.sources||{});
 }catch{}
 try{
  if(isLocal()){
   const receipt=await read(PRIVATE_API+"/manual-refresh-status");
   Object.assign(MANUAL_INFO,receipt.sources||{});
   const progress=receipt.latest;
   if(progress?.state==="running"||progress?.state==="queued")activeManual=progress.source;
  }
 }catch{}
 if(latestRows.length)drawRows(latestRows);
}
const MANUAL_ERRORS={
 BROWSER_SHAREPOINT_AUTH_OR_READ_FAILED:"Chrome/Playwright หรือสิทธิ์ SharePoint ใช้ไม่ได้ กรุณาเปิดต้นฉบับเพื่อตรวจสิทธิ์",
 DOWNLOADED_WORKBOOK_NOT_VERIFIED:"อ่าน Excel ไม่ครบหรือโครงสร้างไฟล์ผิด ระบบเก็บข้อมูลเดิมไว้",
 LAN_SOURCE_NOT_AVAILABLE:"ยังเข้า W:/S: ไม่ได้ โปรดเชื่อมเครือข่ายบริษัทหรือ VPN",
 MM_SHEETS_CHANGED:"โครงสร้าง Sheet MM เปลี่ยน ระบบหยุดเพื่อป้องกันข้อมูลผิด",
 INNOVATION_DOWNLOAD_AMBIGUOUS:"พบไฟล์นวัตกรรมหลายชุด ต้องตรวจชื่อไฟล์ดาวน์โหลดก่อน",
 INNOVATION_FILE_TOO_SMALL:"ไฟล์นวัตกรรมไม่ครบ หรือขนาดผิดปกติ",
 SOURCE_CHECK_FAILED:"การอ่านไฟล์หรือสถานะต้นทางไม่ผ่าน",
 EXECUTION_ERROR_1:"ตัวอ่านต้นทางคืนสถานะผิดพลาด ตรวจสิทธิ์ NB",
 READER_TIMEOUT:"ตรวจต้นทางนานเกินกำหนด ข้อมูลเดิมยังอยู่"
};
function manualFeedback(text){const el=document.getElementById("manualFeedback");if(el)el.textContent=text;}
async function manualClick(key){
 if(!REFRESHABLE.has(key))return;
 if(activeManual){manualFeedback("มี Source อื่นกำลังตรวจ กรุณาดูผลให้เสร็จก่อน");return}
 activeManual=key;if(latestRows.length)drawRows(latestRows);
 manualFeedback("กำลังอ่าน "+key+" ผ่าน SharePoint/Chrome ที่ได้รับอนุญาต และตรวจสอบก่อนอัปเดต Dashboard…");
 try{
  const response=await fetch(PRIVATE_API+"/manual-refresh",{
    method:"POST",mode:"cors",credentials:"omit",cache:"no-store",
    headers:{"Content-Type":"application/json","X-MD-Manual":"user-click"},
    body:JSON.stringify({source:key}),signal:AbortSignal.timeout(10000)
  });
  const body=await response.json();
  if(response.status!==202){
   manualFeedback("ยังไม่เริ่มตรวจ: "+safe(body.message||body.state||"HTTP "+response.status));
   return;
  }
  manualFeedback("NB รับคำสั่งแล้ว ("+key+") · กำลังอ่านต้นทางจริง ไม่ใช่ Refresh หน้าเว็บ");
  for(let i=0;i<170;i++){
   await new Promise(r=>setTimeout(r,1700));
   let state;try{state=await read(PRIVATE_API+"/manual-refresh-status")}catch{continue}
   const last=state.latest||{};
   if(last.source!==key)continue;
   if(last.state==="queued"||last.state==="running")continue;
   if(last.state==="success"){
     Object.assign(MANUAL_INFO,state.sources||{});
     manualFeedback("ตรวจ "+key+" สำเร็จ: "+dt(last.last_success_at)+" · "+(last.cloud_checkpoint||"บันทึกบน NB แล้ว"));
   }else{
     manualFeedback("ตรวจ "+key+" ไม่สำเร็จ: "+(MANUAL_ERRORS[last.error_code]||last.error_code||"ไม่สามารถอ่านต้นทาง")+" · เก็บ Last Update เดิม");
   }
   return;
  }
  manualFeedback("ยังไม่พบผลยืนยันจาก NB — การสั่งงานอาจยังดำเนินอยู่ กรุณาตรวจสถานะอีกครั้ง");
 }catch(e){
  manualFeedback("เชื่อมต่อ NB ไม่ได้ — เปิด Private Workspace บนเครื่อง NB เพื่อกด Manual: "+e.message);
  const el=document.getElementById("manualOpenNB");
  if(el)el.href=PRIVATE_PAGE+"?manual="+encodeURIComponent(key)+"#morning-receipts";
 }finally{activeManual=null;if(latestRows.length)drawRows(latestRows)}
}
document.addEventListener("click",e=>{
 const b=e.target.closest?.("[data-manual-source]");
 if(b){e.preventDefault();manualClick(b.dataset.manualSource)}
 if(e.target.id==="manualFilter"){showAll=!showAll;if(latestRows.length)drawRows(latestRows)}
});

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
 drawRows(j.sources);
}
function renderFallback(j,sp){
 if(j.schema!==1||!Array.isArray(j.sources))throw Error("bad GitHub receipt");
 E("morningResult").textContent="Cloudflare ไม่พร้อม — แสดง Last Update จาก GitHub โดยยังไม่รับรองผลรอบเช้า";
 E("morningRunTime").textContent="GitHub receipt ล่าสุด: "+dt(j.run_finished_at)+" · ไม่เรียก Source ใหม่";
 E("morningStats").hidden=false;
 E("morningStats").innerHTML='<div><strong>'+safe(j.checked??0)+'/'+safe(j.total??13)+'</strong>ผลตรวจครั้งสุดท้าย</div>'+
  '<div><strong>'+safe(j.target_date||"—")+'</strong>วันที่ได้รับรายงานล่าสุด</div>'+
  '<div><strong>ไม่ได้ยืนยัน</strong>Cloudflare Cron</div>';
 const md=new Map((sp?.sources||[]).map(x=>[x.key,x]));
 drawRows(j.sources.map(x=>({...x,last_source_modified_at:md.get(x.key)?.source_modified_at||x.source_modified_at,
  last_connector_read_date:md.get(x.key)?.connector_read_date||null,
  last_nb_integrated_at:md.get(x.key)?.nb_pivot_last_success_at||null})));
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
 const intended=new URLSearchParams(location.search).get("manual");if(intended&&REFRESHABLE.has(intended)){showAll=true;manualFeedback("เลือก Source "+intended+" แล้ว กดปุ่ม Manual Refresh ในแถวเพื่อเริ่มตรวจจริง");}
},{once:true});
})();