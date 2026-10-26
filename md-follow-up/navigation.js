/* One stable navigation across MD, evidence, MM, architecture and local NB views. */
(function(){
 "use strict";
 function init(){
  if(document.querySelector(".md-global-shell"))return;
  const current=location.pathname.split("/").pop()||"index.html";
  const isNB=["127.0.0.1","localhost"].includes(location.hostname);
  const base=isNB?"/":"./";
  const home=isNB?"https://popvarachat.github.io/md-follow-up/":"./";
  const sections=[
   {key:"index.html",title:"ภาพรวม",href:home},
   {key:"pivot.html",title:"งาน MD",href:base+"pivot.html"},
   {key:"line-audit.html",title:"รายงาน LINE / หลักฐาน",href:base+"line-audit.html#md-progress"},
   {key:"mm.html",title:"วาระ MM",href:base+"mm.html"}
  ];
  const captions={
   "index.html":"เลือกเรื่องที่จะติดตามก่อนเจาะหลักฐาน · ไม่มีข้อมูลภายในเก็บบนเว็บสาธารณะ",
   "pivot.html":"งาน MD → เจ้าภาพ → กำหนดส่ง → เจาะงาน → เปิดรายงาน LINE",
   "line-audit.html":"ห้องสมาคมนักนวัตกรรมเท่านั้น · ข้อความที่ตรวจพบไม่ใช่หลักฐานปิดงานโดยอัตโนมัติ",
   "mm.html":"วาระประชุม MM อยู่คนละทะเบียนกับ MD · ผลรวมไม่ปะปนกัน",
   "architecture.html":"รายละเอียด Architecture และกฎการรับรองงาน · เอกสารประกอบ"
  };
  const map=sections.map(x=>'<a href="'+x.href+'" '+(x.key===current?'aria-current="page"':'')+'>'+x.title+'</a>').join("");
  const nav=document.createElement("div");
  nav.className="md-global-shell";
  nav.setAttribute("role","navigation");
  nav.setAttribute("aria-label","เมนูหลัก MD Control Workspace");
  nav.innerHTML='<div class="md-global-inner"><a class="md-global-brand" href="'+home+'"><span class="md-global-brand-mark">P</span><span>MD CONTROL<small>One workspace · Separate MM</small></span></a>'+
    '<div class="md-global-links">'+map+'</div>'+
    '<details class="md-global-more"><summary aria-label="เมนูเพิ่มเติม">เพิ่มเติม ▾</summary><div class="md-global-more-menu">'+
    '<a href="'+home+'#source-status">สถานะและความสดของ Sources</a>'+
    '<a href="'+(isNB?"https://popvarachat.github.io/md-follow-up/architecture.html":"./architecture.html")+'">Architecture / ผังระบบ</a>'+
    '<a href="https://popvarachat.github.io/">Apps Portal</a>'+
    (isNB?'<a href="'+home+'">หน้าเริ่มต้น GitHub Web</a>':'<a href="http://127.0.0.1:8766/pivot.html">Private Viewer บน NB</a>')+
    '</div></details></div><div class="md-global-context"><b>'+({ "index.html":"ภาพรวม","pivot.html":"ติดตามงาน MD","line-audit.html":"LINE Evidence","mm.html":"MM Agenda","architecture.html":"Architecture" }[current]||"MD Control")+'</b> / '+(captions[current]||captions["index.html"])+'</div>';
  document.body.insertBefore(nav,document.body.firstChild);
  const more=nav.querySelector(".md-global-more");
  document.addEventListener("pointerdown",e=>{if(more.open&&!more.contains(e.target))more.open=false});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&more.open)more.open=false});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
