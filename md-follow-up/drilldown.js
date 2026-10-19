"use strict";
/* Public-safe source drilldown. Per-record names, orders and owners live only on
   authenticated local NB; GitHub Pages receives aggregate statistics only. */
(function(){
 const host=document.getElementById("connectorCards"),pane=document.getElementById("connectorDetail");
 if(!host||!pane)return;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const names={cb:"Check Board",ics:"ICS",icf:"ICF",ice:"ICE / EDU",planner:"Planner / Monitor Coordinator",innovation:"Innovation"};
 const notes={
  cb:"สถานะมาจากทะเบียน CB V13; คำว่า ‘อยู่ในแผน’ แม้วันโอนผ่านแล้วไม่ยืนยันว่าโอนล่าช้าจริง ต้องดูหลักฐานในต้นทาง",
  ics:"สถานะระดับขั้นตอน ไม่ใช่จำนวนสินค้าไม่ซ้ำกัน และยังไม่รับรองการคิดวันเลยกำหนดจากไฟล์นี้",
  icf:"สถานะระดับขั้นตอน ไม่ใช่จำนวนสินค้าไม่ซ้ำกัน และยังไม่รับรองการคิดวันเลยกำหนดจากไฟล์นี้",
  ice:"สถานะระดับขั้นตอน ไม่ใช่จำนวนสินค้าไม่ซ้ำกัน และยังไม่รับรองการคิดวันเลยกำหนดจากไฟล์นี้",
  planner:"สถานะงานจาก Planner ส่วนรายการบุคคล/คำสั่งรายละเอียดจะไม่เผยแพร่ในเว็บสาธารณะ",
  innovation:"ยอด 98 เป็น Dashboard รวม; รายละเอียดขั้นตอนของไฟล์ SharePoint ต้องกระทบยอดจำนวนหัวโครงการแยกต่างหาก"
 };
 let snap=null,selected=null;
 const labels=x=>({status:"สถานะ",name:"รายการ",open:"ยังเปิด",completed:"เสร็จ",in_progress:"กำลังดำเนินการ",not_started:"ยังไม่เริ่ม",open_without_assignment:"งานเปิดที่ไม่มี Assignment"}[x]||x);
 const when=x=>x?new Date(x).toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short"}):"ยังไม่ยืนยัน";
 function breakdown(key,x){
   if(x.status_counts&&Object.keys(x.status_counts).length)return Object.entries(x.status_counts).map(([label,n])=>[label,Number(n)]);
   if(key==="planner")return [["สำเร็จ",Number(x.completed||0)],["กำลังดำเนินการ",Number(x.in_progress||0)],["ยังไม่เริ่ม",Number(x.not_started||0)]];
   if(key==="innovation")return [["เปิดตาม Dashboard",Number(x.open||0)],["ปิดตาม Dashboard",Number(x.completed||0)]];
   return [];
 }
 function render(){
   if(!snap||!selected)return;
   const item=snap.sources[selected]||{},rows=breakdown(selected,item).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...rows.map(x=>x[1]));
   const bar=rows.map(([label,n])=>'<div class="source-status"><div class="status-line"><span>'+esc(label)+'</span><strong>'+n.toLocaleString("th-TH")+'</strong></div><div class="status-track"><div style="width:'+Math.max(0,100*n/max)+'%"></div></div></div>').join("");
   const local="http://127.0.0.1:8766/?source="+encodeURIComponent(selected);
   let special="";
   if(selected==="planner"){
     special='<p class="source-alert">งานยังเปิด '+esc(item.open??"—")+' · เกินกำหนดก่อน 19 ต.ค. '+esc(item.overdue_before_2026_10_19??"ไม่ระบุ")+' · ไม่มี Assignment ในงานเปิด '+esc(item.open_without_assignment??"ไม่ระบุ")+'</p>';
   }
   if(selected==="cb"){
     special='<p class="source-alert">กรุณาตรวจวันโอนจริงและผู้รับมอบ ก่อนสรุปว่าเป็นงานล่าช้า</p>';
   }
   pane.innerHTML='<div class="drilltop"><div><span class="eyebrow">SOURCE DRILL-DOWN / '+esc(selected.toUpperCase())+'</span><h3>'+esc(names[selected]||selected)+' · '+esc(item.total??"—")+' '+esc(item.unit||"")+'</h3><p>ตรวจไฟล์ล่าสุด '+esc(when(item.checked_at))+' · ไฟล์ต้นทางแก้ไข '+esc(when(item.file_modified))+'</p></div><button id="closeSourceDrill" aria-label="ปิด">✕ ปิด</button></div><div class="drillgrid"><div><strong>สถานะที่ตรวจพบ</strong>'+bar+'</div><div><strong>การเข้าดูรายการจริง</strong><p>'+esc(notes[selected]||"")+'</p>'+special+'<a class="private-drill-link" href="'+esc(local)+'" target="_blank" rel="noopener noreferrer">เปิดรายการจริงบน Notebook ↗</a><div class="private-note">เปิดได้เฉพาะ Browser ที่ใช้งานบน NB ซึ่งติดตั้ง Private Viewer และมีสิทธิ์เข้าถึงข้อมูล หากอยู่บน PC ต้องเข้าผ่าน NB หรือใช้ทะเบียนต้นทางขององค์กร</div></div></div>';
   pane.hidden=false;
   host.querySelectorAll(".connector").forEach((el,i)=>{const name=Object.keys(snap.sources)[i];el.classList.toggle("selected",name===selected);el.setAttribute("aria-expanded",String(name===selected));});
   document.getElementById("closeSourceDrill").addEventListener("click",()=>{pane.hidden=true;selected=null;host.querySelectorAll(".connector").forEach(c=>{c.classList.remove("selected");c.setAttribute("aria-expanded","false")})});
   pane.scrollIntoView({behavior:"smooth",block:"nearest"});
 }
 function openCard(card){
   const list=Array.from(host.querySelectorAll(".connector"));
   const i=list.indexOf(card);
   if(i<0)return;
   selected=Object.keys(snap.sources)[i];
   render();
 }
 host.addEventListener("click",e=>{const card=e.target.closest(".connector");if(card)openCard(card)});
 host.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const card=e.target.closest(".connector");if(card){e.preventDefault();openCard(card)}});
 function bind(){
   Array.from(host.querySelectorAll(".connector")).forEach(x=>{x.tabIndex=0;x.setAttribute("role","button");x.setAttribute("aria-label","ดูรายละเอียดกลุ่ม "+x.querySelector("h3")?.textContent+" และเปิดรายการจริงบน NB");x.setAttribute("aria-expanded","false");x.title="คลิกเพื่อเจาะสถานะและเปิดรายการจริง"});
 }
 new MutationObserver(bind).observe(host,{childList:true});
 fetch("./source-health.json?drill="+Date.now(),{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("No source snapshot");return r.json()}).then(d=>{snap=d;bind()}).catch(()=>{pane.textContent="รายละเอียดอัปเดตล่าสุดยังไม่พร้อม";});
})();
