'use strict';
// Public presentation contract: only certified, recent, reconciled aggregate may show as WIP.
(function(){
 const NAMES=['ผลิต1','ผลิต2','ผลิต3','ผลิต4','ผลิต5'];
 const ok=n=>Number.isSafeInteger(n)&&n>=0;
 const escape=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>n==null?'—':new Intl.NumberFormat('th-TH').format(n);
 function accept(source,now=Date.now()){
  if(!source||source.schema_version!=='1.0')return {state:'NOT_READY'};
  if(source.status==='PENDING_ADMIN_GATE')return {state:'PENDING_ADMIN_GATE'};
  if(source.status!=='CERTIFIED_SNAPSHOT'||source.kind!=='AIS_SIGNED_WIP_AGGREGATE'||source.privacy!=='AGGREGATE_ONLY')return {state:'CONTRACT_INVALID'};
  const s=source.source||{},t=source.totals||{},d=source.departments||[];
  if(s.mode!=='JDE_AIS_READ_ONLY'||s.scope!=='FULL_FACTORY'||s.reconciled!==true||s.business_rules_approved!==true||
    !/^ERP-[A-Z0-9-]{6,80}$/.test(s.owner_approval_ref||''))return {state:'NOT_APPROVED'};
  const at=Date.parse(s.as_of_utc),expires=Date.parse(s.fresh_until_utc);
  if(!Number.isFinite(at)||!Number.isFinite(expires)||at>now+60000||expires<=now||expires>at+24*3600000+1000)return {state:'STALE_OR_INVALID_TIME'};
  if(![t.source_count,t.open_wip,t.closed_or_transferred,t.overdue,t.hold].every(ok)||t.open_wip+t.closed_or_transferred!==t.source_count)return {state:'TOTALS_INVALID'};
  if(!Array.isArray(d)||d.length!==5||new Set(d.map(v=>v.name)).size!==5||!NAMES.every(name=>d.some(v=>v.name===name)))return {state:'DEPARTMENT_INVALID'};
  if(d.some(v=>![v.count,v.overdue,v.hold].every(ok)||v.overdue>v.count||v.hold>v.count))return {state:'DEPARTMENT_INVALID'};
  if(d.reduce((n,v)=>n+v.count,0)!==t.open_wip||d.reduce((n,v)=>n+v.overdue,0)!==t.overdue||d.reduce((n,v)=>n+v.hold,0)!==t.hold)return {state:'RECONCILIATION_FAILED'};
  if(JSON.stringify(source).match(/"(cutting_id|wo_id|current_operation_id|Order Number|Customer|User ID)"\s*:/))return {state:'PRIVATE_FIELDS_REJECTED'};
  return {state:'CERTIFIED_SNAPSHOT',data:source};
 }
 function render(source,now=Date.now()){
  const r=accept(source,now);
  if(r.state!=='CERTIFIED_SNAPSHOT')return '<section class="panel" aria-label="งานค้าง ERP ที่รับรอง" style="border-color:#997444">'+
   '<h2>WIP ปัจจุบันจาก MCP–AIS · ยังไม่พร้อมรับรอง</h2><p class="sub">สถานะ '+escape(r.state)+' · ไม่มีข้อมูล ERP สดที่ตรวจรับครบทุกสายผลิต</p>'+
   '<p class="warning-text">ตัวเลขจาก Snapshot ด้านล่างเป็นรายการที่ต้องตรวจ ไม่ใช่งานค้างจริงทั้งโรงงาน</p>'+
   '<a href="https://github.com/popvarachat/practika-erp-architecture/issues/8" target="_blank" rel="noopener noreferrer">ดูขั้นตอนเปิดสิทธิ์ AIS ↗</a></section>';
  const a=r.data;
  return '<section class="panel" aria-label="งานค้าง ERP ที่รับรอง" style="border-color:#3d8b72"><h2>WIP จาก MCP–AIS · Snapshot ผ่านการรับรอง</h2>'+
   '<p class="sub">ข้อมูล ณ '+escape(new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}).format(new Date(a.source.as_of_utc)))+
   ' · เป็น Snapshot ไม่ใช่การ Streaming · อ้างอิงผู้รับรอง '+escape(a.source.owner_approval_ref)+'</p>'+
   '<div class="metrics"><div class="metric-card"><div class="klabel">WIP 5 สาย</div><div class="kvalue green">'+fmt(a.totals.open_wip)+'</div></div>'+
   '<div class="metric-card"><div class="klabel">เกินกำหนด</div><div class="kvalue amber">'+fmt(a.totals.overdue)+'</div></div>'+
   '<div class="metric-card"><div class="klabel">พักงาน HOLD</div><div class="kvalue">'+fmt(a.totals.hold)+'</div></div>'+
   '<div class="metric-card"><div class="klabel">ปิดหรือโอนแล้ว</div><div class="kvalue">'+fmt(a.totals.closed_or_transferred)+'</div></div></div>'+
   '<div class="table-wrap"><table><thead><tr><th>สายผลิต</th><th style="text-align:right">WIP</th><th style="text-align:right">เกินกำหนด</th><th style="text-align:right">HOLD</th></tr></thead><tbody>'+
   a.departments.map(x=>'<tr><td>'+escape(x.name)+'</td><td class="num">'+fmt(x.count)+'</td><td class="num">'+fmt(x.overdue)+'</td><td class="num">'+fmt(x.hold)+'</td></tr>').join('')+
   '</tbody></table></div></section>';
 }
 const API={accept,render};
 if(typeof window!=='undefined')window.WIPLive=API;
 if(typeof module!=='undefined')module.exports=API;
})();
