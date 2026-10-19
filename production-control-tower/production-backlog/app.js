'use strict';
const e=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v==null?'—':new Intl.NumberFormat('th-TH').format(v);
const percent=(v,t)=>v==null?'—':(100*v/t).toFixed(1)+'%';
const stamp=s=>{const d=new Date(s);return !Number.isNaN(+d)?new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}).format(d):'ไม่ทราบ'};
let report=null,selected='ALL',live=null;
const liveView=typeof window!=='undefined' ? window.WIPLive : require('./live-wip');
function validate(d){
 if(!d||d.schema_version!=='1.0'||d.source?.ais_live!==false||d.source?.current_wip_certified!==false)throw Error('SOURCE_CONTRACT_INVALID');
 if(!Array.isArray(d.departments)||d.departments.length!==5||d.totals.classified+d.totals.unresolved!==d.totals.candidates)throw Error('SOURCE_COUNTS_INVALID');
 if(d.departments.find(x=>x.name==='ผลิต4')?.count!==null)throw Error('PRODUCTION4_MUST_BE_UNVERIFIED');
 if(d.source.mode!=='HISTORICAL_JDE_BROWSER_AGGREGATE')throw Error('UNVERIFIED_SOURCE');
 return d;
}
const metric=(name,v,description,cls)=>'<article class="metric-card"><div class="klabel">'+e(name)+'</div><div class="kvalue '+(cls||'')+'">'+fmt(v)+'</div><p>'+e(description)+'</p></article>';
function focus(d,id){
 if(id==='ALL')return {name:'ภาพรวมทุกสาย',count:d.totals.candidates,description:'ยอดทั้งหมดเป็น Cutting candidate ต้องตรวจ WO และ Current Operation ก่อนรับรอง',todo:['ตรวจ WO ว่ายังต้องผลิตจริง','จับคู่กับ Operation/ControlPlan ปัจจุบัน','ตรวจวันที่ครบกำหนดและสถานะโอน']};
 if(id==='UNKNOWN')return {name:'ยังระบุสายผลิตไม่ได้',count:d.totals.unresolved,description:'Type/Status ระบุ Work Center ไม่ได้ ต้องอ่าน ControlPlan จาก ERP',todo:['ตรวจ Cutting กับ Open Operation จาก AIS','อ่าน Current ControlPlan และ Work Center','แยก WO ที่ปิดแล้วและสถานะขัดแย้งออกจาก WIP']};
 const x=d.departments.find(a=>a.name===id);
 if(!x)return focus(d,'ALL');
 return {name:x.name+(x.count===null?' · ข้อมูลไม่พอ':' · ตาม Reference'),count:x.count,
 description:x.count===null?'ไม่มีข้อมูลเพียงพอ ห้ามตีความว่าไม่มีงาน':'จำนวนจำแนกจาก Type/Status ไม่ได้ยืนยันตำแหน่งผลิตจริง',
 todo:['ตรวจสถานะ WO และสถานะโอนจาก ERP ล่าสุด','ตรวจ Current Operation ว่าอยู่ '+id+' จริง','กระทบยอด Cutting Due Date ก่อนสรุปงานเกินกำหนด']};
}
function render(d){
 validate(d);
 const t=d.totals,f=focus(d,selected);
 const rows=[...d.departments,{name:'ยังระบุสายผลิตไม่ได้',count:t.unresolved}],mx=Math.max(...rows.map(x=>x.count||0),1);
 const tabs=[['ALL','ทุกสาย'],...d.departments.map(x=>[x.name,x.name]),['UNKNOWN','ไม่ทราบสาย']];
 const c=d.fixed_cohort;
 const cohortMax=Math.max(...c.production_positions.map(p=>p.count),1);
 const cohortBars=c.production_positions.map(p=>'<div class="line" style="cursor:default"><span class="name">'+e(p.name)+'<span class="hint">ControlPlan · Cohort เฉพาะชุด</span></span><span class="track"><span class="fill" style="width:'+(100*p.count/cohortMax)+'%"></span></span><span class="value">'+fmt(p.count)+'</span></div>').join('');
 const lineButtons=rows.map(x=>{
  const id=x.name==='ยังระบุสายผลิตไม่ได้'?'UNKNOWN':x.name;
  const cls=(id==='UNKNOWN'?' missing':'')+(x.count===null?' empty':'')+(id===selected?' selected':'');
  const hint=x.count===null?'ยังไม่มีหลักฐาน':id==='UNKNOWN'?'ต้องตรวจ Current ControlPlan':'Type/Status Reference';
  return '<button class="line'+cls+'" type="button" data-select="'+e(id)+'" aria-pressed="'+(id===selected)+'"><span class="name">'+e(x.name)+'<span class="hint">'+e(hint)+'</span></span><span class="track"><span class="fill" style="width:'+(x.count===null?0:100*x.count/mx)+'%"></span></span><span class="value">'+fmt(x.count)+'</span></button>';
 }).join('');
 const tables=rows.filter(x=>selected==='ALL'||x.name===(selected==='UNKNOWN'?'ยังระบุสายผลิตไม่ได้':selected)).map(x=>
 '<tr><td><strong>'+e(x.name)+'</strong></td><td class="num"><strong>'+fmt(x.count)+'</strong></td><td class="num">'+percent(x.count,t.candidates)+'</td><td>'+(x.count===null?'ยังไม่มีหลักฐาน':'รอ Current Operation จาก AIS')+'</td><td class="alert">ยังไม่รับรอง</td></tr>'
 ).join('');
 const pills=tabs.map(([id,name])=>'<button class="pill'+(selected===id?' active':'')+'" data-select="'+e(id)+'" type="button">'+e(name)+'</button>').join('');
 return liveView.render(live)+'<div class="strip" role="status"><strong>รายงานติดตาม ไม่ใช่ยอด WIP สดที่รับรอง</strong> · Snapshot JDE วันที่ '+e(d.source.source_snapshot_date)+' · MCP–AIS ยังรอสิทธิ์ ERP Admin</div>'+
 '<section class="metrics" aria-label="ตัวเลขภาพรวม">'+
 metric('Cutting ที่ต้องตรวจต่อ',t.candidates,'WO Code 10/30/40 ในขอบเขตนี้','cyan')+
 metric('ระบุสายตาม Reference ได้',t.classified,'ไม่ใช่ยืนยันตำแหน่งผลิตจริง','green')+
 metric('ยังไม่ทราบสายผลิต',t.unresolved,percent(t.unresolved,t.candidates)+' ของรายการติดตาม','amber')+
 metric('WIP / Overdue ที่รับรองแล้ว',null,'รอ Current Operation และ WO Reconciliation','')+'</section>'+
 '<div class="main-layout"><section class="panel"><h2>งานติดตามแยกตามสายผลิต</h2><p class="sub">คลิกที่สายผลิต เพื่อดูจำนวนและขั้นตอนตรวจสอบต่อ · นับ Cutting ไม่ใช่ WO</p>'+
 '<div class="line-list">'+lineButtons+'</div><div class="section-foot"><span>ผลิต 4 ยังไม่มีจำนวนที่ยืนยันได้ · กลุ่มรอหลักฐานยังไม่จัดสรรเข้าสายใด</span><a href="../production-daily/quality.html">ดู Audit ที่มา ↗</a></div></section>'+
 '<section class="panel"><div class="detail-title"><h2 id="selectionTitle">'+e(f.name)+'</h2><button id="reset" class="small-btn" type="button">ดูภาพรวม</button></div><p class="sub">รายละเอียดเฉพาะขอบเขตที่เลือก</p>'+
 '<div class="detail-body"><div class="detail-big'+(f.count===null?' none':'')+'">'+fmt(f.count)+'</div><p class="sub">Cutting ที่ต้องตรวจ</p><p style="font-size:12px;color:#bed1e5">'+e(f.description)+'</p></div>'+
 '<h3 style="margin-top:15px">ตรวจอะไรต่อใน ERP</h3><ol class="steps">'+f.todo.map(s=>'<li>'+e(s)+'</li>').join('')+'</ol>'+
 '<div class="mini-kv"><span>งานเกินกำหนดที่รับรอง</span><strong class="warning-text">—</strong></div><div class="mini-kv"><span>วันที่ดึงข้อมูลสดด้วย AIS</span><strong class="warning-text">รอสิทธิ์</strong></div>'+
 '<div class="section-foot"><a href="../adaptive-so-wo-timeentry/">ดู Pivot Cutting40 ชุดเดิม (ขอบเขตต่างกัน) ↗</a></div></section></div>'+
 '<section class="panel"><div class="detail-title"><div><h2>รายงานสรุปแยกสายผลิต</h2><p class="sub">เลือกดูเฉพาะสาย / ดูกลุ่มที่ยังต้องตรวจหลักฐาน</p></div><div class="pills">'+pills+'</div></div>'+
 '<div class="table-wrap"><table><thead><tr><th>สายผลิต</th><th style="text-align:right">Cutting ที่พบ</th><th style="text-align:right">สัดส่วน</th><th>ตำแหน่งผลิต</th><th>งานเกินกำหนดจริง</th></tr></thead><tbody>'+tables+'</tbody></table></div>'+
 '<p class="sub">ตัวเลขยังจัดตาม Access Reference ไม่ใช่ตำแหน่งหน้างาน และยังไม่ใช่ WIP ทั้งโรงงาน</p></section>'+
 '<section class="panel" style="border-color:#326e7b"><div class="detail-title"><h2>ตัวอย่างที่ตรวจ Current ControlPlan แล้ว · Cutting40 เท่านั้น</h2><span class="pill">แยกขอบเขต ห้ามนำยอดมาบวกกับ 1,630</span></div><p class="sub">ใน Cohort เดิม 160 Cutting พบ Open ตามเงื่อนไข 156 รายการ และมีหลักฐาน ControlPlan ครบใน Cohort 100% ณ '+e(stamp(c.controlplan_verified_to_utc))+' · ไม่ใช่ยอดทั้งโรงงาน</p><div class="main-layout"><div class="line-list">'+cohortBars+'</div><div class="detail-body"><div class="klabel">Cutting ใน Cohort ที่จัดกลุ่มได้</div><div class="detail-big">'+fmt(c.observed_open_cuttings)+'</div><p class="sub">ตรวจ ControlPlan 156 จาก 156 · ตัด 9D ออก '+fmt(c.transferred_9d_excluded)+' รายการ</p><div class="mini-kv"><span>WO/Cutting status 99 ต้องตรวจเพิ่ม</span><strong class="warning-text">'+fmt(c.status99_requires_review)+'</strong></div><p class="sub">ผลิต4 = 131 เฉพาะ Cohort นี้ ไม่ใช่ยอด WIP ทั้งโรงงานหรืองานใหม่ที่ดึงผ่าน AIS</p><a href="../adaptive-so-wo-timeentry/">ดู Cutting รายการและ Operation ของ Cohort นี้ ↗</a></div></div></section>'+
 '<div class="main-layout"><section class="panel"><h2>WO Code ของกลุ่มที่ต้องตรวจ</h2><p class="sub">ใช้คัดแยกงานสำหรับตรวจรับ ไม่ใช่การรับรองว่ายังเปิด WO ทุกใบ</p>'+
 d.wo_codes.map(x=>'<div class="mini-kv"><span>WO Code '+e(x.code)+'</span><strong>'+fmt(x.count)+'</strong></div>').join('')+
 '<p class="sub">รวม '+fmt(t.candidates)+' Cutting ในช่วงที่คัดกรอง · ไม่รวม WO Code 99 / 9C</p></section>'+
 '<section class="panel"><h2>เส้นทาง MCP–AIS ที่จะรับข้อมูลสด</h2><p class="sub">แยกสถานะการเชื่อมต่อกับคุณภาพข้อมูลให้ชัดเจน</p>'+
 '<div class="source"><span>MCP Collector <b style="color:var(--green)">พร้อม</b></span><span>AIS Read-only <b style="color:var(--amber)">รอสิทธิ์</b></span><span>Operation <b style="color:var(--amber)">รอรับรอง</b></span></div>'+
 '<p style="font-size:12px;color:#b5cadb">ต้องดึง WO, Cutting, Current Operation, Work Center, Due Date และข้อมูลโอนจริงผ่าน AIS ที่อนุญาต แล้วกระทบยอดก่อนเปลี่ยนสถานะเป็น Live</p>'+
 '<a href="https://github.com/popvarachat/practika-erp-architecture/issues/8" target="_blank" rel="noopener noreferrer">AIS Read-only Approval Gate ↗</a></section></div>'+
 '<section class="panel"><h2>ข้อจำกัดข้อมูลและเกณฑ์รับรอง</h2><ul class="footnotes">'+d.facts.map(s=>'<li>'+e(s)+'</li>').join('')+'</ul></section>';
}
function draw(){
 document.getElementById('dashboard').innerHTML=render(report);
 document.querySelectorAll('[data-select]').forEach(x=>x.addEventListener('click',()=>{selected=x.dataset.select;draw()}));
 document.getElementById('reset')?.addEventListener('click',()=>{selected='ALL';draw()});
}
async function refresh(){
 const button=document.getElementById('reload');button.disabled=true;
 try{
  const response=await fetch('./data/backlog-focus.json',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  report=validate(await response.json());
  try{const s=await fetch('./data/live-status.json',{cache:'no-store'});live=s.ok?await s.json():null}catch{live=null}
  document.getElementById('lastSeen').textContent='ข้อมูลต้นทาง '+stamp(report.source_observed_at_utc);
  document.getElementById('connection').textContent=liveView.accept(live).state==='CERTIFIED_SNAPSHOT'?'MCP–AIS: Snapshot ผ่านการรับรอง':'AIS Read-only: ยังไม่มีข้อมูล WIP สดที่รับรอง';
  draw();
 }catch(err){
  document.getElementById('dashboard').textContent='ตรวจรับรายงานไม่สำเร็จ: '+err.message+' · ไม่แสดงตัวเลขที่ไม่ผ่านการตรวจสอบ';
 }finally{button.disabled=false}
}
if(typeof document!=='undefined'){document.getElementById('reload')?.addEventListener('click',refresh);refresh()}
if(typeof module!=='undefined')module.exports={validate,render,focus,percent};
