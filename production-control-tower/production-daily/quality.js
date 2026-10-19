'use strict';const fmt=n=>new Intl.NumberFormat('th-TH').format(n||0),esc=v=>String(v??'ไม่ทราบ').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bar=(name,n,max)=>'<div class="bar-row"><div class="bar-label"><span>'+esc(name)+'</span><strong>'+fmt(n)+'</strong></div><div class="track"><div class="fill" style="width:'+Math.max(1,100*n/Math.max(max,1))+'%"></div></div></div>';
function render(d){
 if(d.schema_version!=='1.0'||d.scope.factory_wip_certified!==false||!d.observed)throw Error('Invalid audit contract');
 const q=d.observed.quality,years=Object.entries(d.observed.created_years).sort((a,b)=>a[0].localeCompare(b[0])),wo=Object.entries(d.observed.wo_status).sort((a,b)=>b[1]-a[1]),src=d.scope,coverage=d.observed.per_status;
 const kpi=(label,value,sub)=>'<div class="kpi"><small>'+esc(label)+'</small><b>'+fmt(value)+'</b><small>'+esc(sub)+'</small></div>';
 return '<h2>ข้อมูลจาก ERP ที่ตรวจพบ</h2><p class="muted">เวลารวบรวม: '+esc(src.source_first_at_utc)+' ถึง '+esc(src.source_last_at_utc)+' (UTC) · Generated: '+esc(d.generated_at_utc)+' (UTC)</p><div class="kpi-grid">'+
 kpi('Cutting ไม่ซ้ำ',d.observed.distinct_cuttings,'เฉพาะสถานะ 40/45/60/70')+
 kpi('ลง Cutting ในปี 2026',q.created_2026,'ไม่ใช่ยอด WIP ปี 2026')+
 kpi('WO Status = 99 หรือ 9Z',q.wo_code_99_or_9Z,'ต้องกระทบยอดก่อนนับค้าง')+
 kpi('ลง Cutting ก่อนปี 2024',q.created_before_2024,'มีงานย้อนหลังจำนวนมาก')+'</div>'+
 '<h2>กระจายตาม Cutting Status</h2><div class="comparison"><div>'+Object.entries(coverage).map(([k,v])=>bar('Status '+k,v.cuttings,d.observed.distinct_cuttings)).join('')+'</div><div><p class="muted">แต่ละสถานะเป็นผลจากการกรอง JDE แบบ All Records</p><p>Pagination: ถึงหน้าสุดท้ายทั้ง 4 ชุด</p><p>การรับรองยอด ERP ทั้งโรงงาน: ยังไม่ผ่าน</p><p>Completed transfer date: '+fmt(q.completed_transfer_date_present)+' · Cutting close date: '+fmt(q.cutting_close_date_present)+'</p></div></div>'+
 '<h2>Cutting ปี 2026: แผนกจาก Reference</h2><p class="muted">ข้อมูลที่ลง Cutting ปี 2026 ภายใต้สถานะ 40/45/60/70 เท่านั้น; ไม่ใช่ตำแหน่งผลิตจริงหรือ WIP ทั้งโรงงาน</p>'+Object.entries(d.observed.access_reference_2026_departments||{}).sort((a,b)=>b[1]-a[1]).map(([k,n])=>bar(k,n,d.observed.quality.created_2026)).join('')+
 '<h2>แผนกตาม Access Reference (ไม่ใช่ตำแหน่งจริง)</h2><p class="muted">เฉพาะ Type/Status ที่ Reference ให้คำตอบเดียว; รายการอื่นรอ ControlPlan จาก ERP</p><div class="comparison"><div>'+Object.entries(d.observed.access_reference_departments||{}).sort((a,b)=>b[1]-a[1]).map(([k,n])=>bar(k,n,d.observed.distinct_cuttings)).join('')+'</div><div><p class="muted">ยังไม่ใช่ WIP ปัจจุบันหรือการติดตามตำแหน่งทางกายภาพ มี WO Code ที่ต้องกระทบยอดและรายการแผนกไม่ทราบจำนวนมาก</p></div></div>'+
 '<h2>กระจายตามปีที่ลง Cutting</h2><div class="comparison"><div>'+years.map(([k,n])=>bar(k,n,Math.max(...years.map(x=>x[1])))).join('')+'</div><div><h3>สถานะ WO ที่พบ</h3>'+wo.map(([k,n])=>bar('WO '+k,n,d.observed.distinct_cuttings)).join('')+'</div></div>'+
 '<h2>เหตุผลที่ยังไม่รับรอง WIP</h2><ul>'+src.limitations.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+
 '<p class="muted">Source: '+esc(src.source)+'. การเปิดหน้าเว็บไม่ใช่การดึง ERP สด และไม่มีข้อมูลรายตัวในไฟล์นี้</p>';
}
fetch('data/historical-status-audit.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(x=>document.getElementById('audit').innerHTML=render(x)).catch(e=>document.getElementById('audit').textContent='ยังเปิดข้อมูลตรวจสอบไม่ได้: '+e.message);