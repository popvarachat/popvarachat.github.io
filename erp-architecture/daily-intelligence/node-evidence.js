"use strict";
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString("en-US"):"—";
const ids=["transfer","output","material","labor","quality","rework","scrap","wip","machine","purchase","receipt","inventory","cost","delivery","gl"];
const questions={
transfer:"วันนี้โอนจาก Stage ใดไป Stage ไหน ค้างรับที่ใคร?",output:"ผลิตเสร็จจริงกี่หน่วย เทียบแผนและ Due ราย Operation?",material:"วัสดุเบิกจริง คืนจริง ยังไม่ Post เท่าไร?",labor:"บันทึกชั่วโมงจริงและแรงงานต่อ Operation ครบหรือไม่?",quality:"วันนี้ตรวจ Pass/Fail/Hold/Reject/Release อย่างไร?",rework:"งานแก้ไขเกิดจาก WO ไหน ใครรับและใช้ต้นทุนเพิ่มเท่าไร?",scrap:"ตัด Scrap อะไร จำนวนเท่าไร สาเหตุและผู้อนุมัติ?",wip:"งานค้างผลิตตาม Project/WO/Cutting/Due/Stage อยู่ตรงไหน?",machine:"เครื่องไหน Run/Down นานเท่าไร กระทบ WO ใด?",purchase:"PR ค้าง PO เปิด ราคาเปลี่ยนและผู้อนุมัติรายใด?",receipt:"รับเข้าจริงเท่าไร PO ใดยังค้างรับ?",inventory:"Stock อยู่ที่ใด อายุค้างเท่าไร เบิก/คืนไปแล้วหรือไม่?",cost:"ต้นทุนจริง DM/DL/OH/Dep/GL ต่างจาก Standard เท่าไร?",delivery:"ส่ง/ติดตั้งเสร็จจริงเมื่อไร ลูกค้ารับรองหรือยัง?",gl:"Batch ไหนยังไม่ Post และยอดบัญชีตรงกับ WIP หรือไม่?"};
const names={transfer:"โอนงาน",output:"ผลิตได้จริง",material:"เบิกวัตถุดิบ",labor:"เวลา/ค่าแรง",quality:"QC / Reject",rework:"งานแก้ไข",scrap:"ของเสีย",wip:"WIP",machine:"เวลาเครื่อง",purchase:"PR / PO",receipt:"รับเข้าสตอร์",inventory:"สต็อกเคลื่อนไหว",cost:"ต้นทุน",delivery:"จัดส่ง/ติดตั้ง",gl:"GL"};
const human={output:"Operation 8 แถวไม่ใช่ Completion Event ที่รับรอง",material:"Parts List 35 แถวเป็นแผนวัสดุ ไม่ใช่ Issue/Return Ledger",labor:"Operation 8 แถวไม่ใช่ Time Booking จริง",quality:"Lot Status Sample ไม่ใช่ Pass/Fail รายวัน",machine:"Operation 8 แถวไม่ใช่ Runtime เครื่อง",inventory:"Item Position 10 แถวไม่ใช่ Stock Movement",delivery:"SO Inquiry 4 แถวไม่ใช่ POD/Install Complete",receipt:"43 Receipt คือรับเข้าแล้ว ไม่ใช่ PO ค้างรับ",purchase:"PR/PO 44 Lines เป็นตัวอย่างที่ยังไม่ได้รับรองครบ",wip:"2,383 Cutting คือ WIP Snapshot ไม่ใช่ Current Operation ที่รับรอง",cost:"ไม่มี Actual Cost–Posted GL ที่ Join ได้ครบ",gl:"ไม่มี Posted/Unposted GL ที่รับรอง",rework:"ไม่มี Rework WO Transaction Extract ที่รับรอง",scrap:"ไม่มี Scrap Adjustment และ Approval Ledger ที่รับรอง",transfer:"ไม่มี TS/Transfer Posted Ledger ที่รับรอง"};
let pub=null,health=null;
const fetchJSON=async file=>{try{const r=await fetch("./"+file+"?v=node-evidence-r1",{cache:"no-store"});return r.ok?await r.json():null}catch{return null}};
function render(node){
 if(!pub||!ids.includes(node))return;
 const domain=pub.domains?.[node],hist=pub.historical_evidence?.nodes?.[node]||{},audit=pub.source_audit?.items?.[node]||{};
 const nh=health?.nodes?.find(x=>x.id===node),sample=hist.sample_count??audit.sample_rows;
 const live=!!domain?.rows?.length,quality=node==="quality",mode=live?"evidence-live":quality?"quality-focus":"evidence-focus";
 document.body.classList.remove("evidence-live","evidence-focus");
 if(!quality)document.body.classList.add(mode);
 const root=$("evidenceStudio");
 if(!root)return;
 root.hidden=quality;
 if(quality)return;
 let dates=[];
 if(live){
  const m=new Map();for(const r of domain.rows){const date=r.due||"ไม่มีวันที่",v=m.get(date)||{date,n:0,source:new Set()};v.n+=Number(r.count)||0;if(r.department)v.source.add(r.department);m.set(date,v)}
  dates=[...m.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,24).map(v=>[v.date,node==="wip"?"WO Finish Due":node==="receipt"?"Actual Receipt Date":"PR Request / PO Promise",v.n,fmt(v.source.size)+" กลุ่ม"]);
 }else dates=(hist.rows||[]).slice(0,24).map(r=>[r.date,r.date_kind,r.count,r.source]);
 const rows=dates.length?dates.map(r=>"<tr>"+r.map((v,i)=>"<td"+(i===2?' class="evnumber"':"")+">"+esc(v)+"</td>").join("")+"</tr>").join(""):'<tr><td colspan="4">ยังไม่มี Transaction Row สำหรับ Node นี้ (ไม่ใช่ไม่มีงาน)</td></tr>';
 const has=sample!==null&&sample!==undefined,kind=live?"มี Pivot จำกัดขอบเขต":has&&sample>0?"มีหลักฐานตัวอย่าง":"ยังไม่มี Transaction Extract";
 const refNode=node==="material"||node==="inventory"?"material":node==="purchase"||node==="receipt"?"purchase":"wip";
 const wip=pub.domains?.wip?.rows||[],yearRows=wip.filter(r=>String(r.due||"").startsWith("2026"));
 const groups=new Map();for(const r of yearRows){const key=r.department||"ไม่ระบุสายผลิต";groups.set(key,(groups.get(key)||0)+(+r.count||0))}
 const related=[...groups].sort((a,b)=>b[1]-a[1]).slice(0,7),denom=yearRows.reduce((a,r)=>a+(+r.count||0),0);
 root.innerHTML='<div class="evtop"><div><small>ERP EVIDENCE INVESTIGATION / READ-ONLY</small><h2>'+esc(names[node])+' · วิเคราะห์ข้อมูลต้นทาง</h2><p><b>คำถาม:</b> '+esc(questions[node])+'</p></div><span class="evkind">'+esc(kind)+'</span></div>'+
 '<div class="evstats"><article><small>จำนวนจากแหล่งที่ตรวจ</small><strong>'+(live?fmt(domain.count):has?fmt(sample):"—")+'</strong><span>'+(live?"Snapshot / Query Scope":has?"Source Sample ไม่ใช่ Backlog":"ไม่พบ Row Data")+'</span></article><article><small>วันเก็บหลักฐาน</small><strong class="evdate">'+esc(hist.source_capture||pub.source_snapshot||"ไม่ทราบ")+'</strong><span>ไม่ใช่วันที่เกิดเหตุการณ์เสมอไป</span></article><article><small>ความพร้อมรายวัน</small><strong>ยังไม่รับรอง</strong><span>ไม่มี Live Event/Owner ที่ตรวจครบ</span></article><article><small>แหล่ง ERP</small><strong class="evdate">'+esc(hist.source_app||audit.source||"ERP Source Audit")+'</strong><span>รายละเอียดใน Evidence Table</span></article></div>'+
 '<div class="evalert"><b>ตรวจพบ:</b> '+esc(human[node])+'<p><b>ต้องทำต่อ:</b> '+esc(audit.next_gate||"ต้องตรวจ Transaction Date, Status, Document Line และ Named Owner")+'</p></div>'+
 '<div class="evcols"><div class="evsection"><h3>01 · ข้อมูลที่พบจริงตามวันที่อ้างอิง</h3><p>แยกวันที่จากเอกสารจริงกับวันที่ Capture เสมอ · ไม่ใช่รายงานงานค้างปัจจุบัน</p><div class="evscroll"><table><thead><tr><th>วันที่</th><th>ความหมายของวันที่</th><th class="evnumber">รายการ</th><th>แหล่ง/กลุ่ม</th></tr></thead><tbody>'+rows+'</tbody></table></div></div><div class="evsection"><h3>02 · เจาะสาเหตุ / Source ที่ขาด</h3><p><b>Source Audit:</b> '+esc(audit.reason||"ยังไม่มีการรับรอง Source")+'</p><p><b>Data Contract:</b> '+esc(audit.next_gate||"Event Date → Document Line → Current Status → Owner → Posted/Voided")+'</p><p><b>สถานะ:</b> '+esc(nh?.source_state||"ยังไม่ทราบ")+'</p><p><a href="node-health.html">Data Health ↗</a>　<a href="lineage.html">Lineage Audit ↗</a></p></div></div>'+
 '<div class="evsection"><h3>03 · Operational Reference แยกจากธุรกรรม Node นี้</h3><p><b>WIP Reference ปี 2026:</b> '+fmt(denom)+' Cutting จาก WO Finish Due Snapshot 18 ต.ค. 2569 <b>ไม่ใช่</b> จำนวนงาน '+esc(names[node])+' ที่ค้างจริง</p>'+
 related.map(([a,b])=>'<div class="evbarrow"><span>'+esc(a)+'</span><div class="evbar"><i style="width:'+Math.max(1,100*b/Math.max(1,denom)).toFixed(1)+'%"></i></div><b>'+fmt(b)+'</b></div>').join("")+
 (node==="material"?'<p><b>Material Posting Investigation:</b> พบ Posted 49, Complete 26 และ Closed 42 ในหนึ่งกรณีที่ตรวจสอบ ไม่ใช่ยอดทั้งโรงงาน · <a href="https://github.com/popvarachat/practika-erp-architecture/blob/main/docs/77_wo466146_cutting_issue_posting_reversion_rca_20261022.md">RCA Private ↗</a></p>':"")+
 '<p><a href="pivot.html?node='+refNode+'">เปิด Pivot ข้อมูลอ้างอิง ↗</a>　<a href="pim-decision-hub.html">Pim Cost Decision Hub ↗</a></p></div>'+
 '<p class="evfoot">Source-as-of: '+esc(pub.source_snapshot)+' · Source Coverage ไม่ครบทั้งโรงงาน · ตัวเลขประวัติและข้อมูลคนละ Node ไม่สามารถนำมารวมเป็นงานค้างปัจจุบันได้</p>';
}
function statusNav(){
 const el=$("evidenceNav");if(!el)return;
 el.innerHTML=ids.map(k=>{const hi=pub.historical_evidence?.nodes?.[k],d=pub.domains?.[k],tag=d?.rows?.length?"pivot":hi?.sample_count>0?"sample":"missing";return '<button data-ev="'+k+'" class="'+tag+'">'+esc(names[k])+' <small>'+(tag==="pivot"?"Snapshot":tag==="sample"?"Sample":"No Ledger")+'</small></button>'}).join("");
 el.querySelectorAll("button").forEach(b=>b.onclick=()=>document.querySelector('#nodeNav button[data-node="'+b.dataset.ev+'"]')?.click());
}
async function init(){
 const [a,b,c]=await Promise.all([fetchJSON("public-pivot.json"),fetchJSON("public-pivot.stable.json"),fetchJSON("node-health.json")]);
 const good=x=>x?.schema_version==="public-named-pivot-v1"&&x?.scope==="PUBLIC_APPROVED_PROJECT_CUSTOMER_NAMES"&&x?.source_audit?.audited_nodes===15&&x?.domains?.wip?.rows?.length>0;
 pub=good(a)?a:good(b)?b:null;health=c?.nodes?.length===15?c:null;
 if(!pub){$("evidenceStudio").innerHTML='<div class="evalert">Data Pool ปัจจุบันและ Backup ไม่พร้อม · ไม่แสดงข้อมูลสมมติ</div>';return}
 statusNav();
 window.ERP_RENDER_EVIDENCE=render;render(new URL(location.href).searchParams.get("node")||"wip");
}
document.addEventListener("DOMContentLoaded",init);
})();