'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const INPUT=path.join(__dirname,'..','production-daily','data','historical-status-audit.json');
const OUTPUT=path.join(__dirname,'data','backlog-focus.json');
const NAMES=['ผลิต1','ผลิต2','ผลิต3','ผลิต4','ผลิต5'];
function build(input=INPUT){
 const a=JSON.parse(fs.readFileSync(input,'utf8'));
 assert.equal(a.schema_version,'1.0');assert.equal(a.kind,'PUBLIC_AGGREGATE_READ_ONLY');
 assert.equal(a.scope.factory_wip_certified,false);assert.equal(a.scope.physical_location_certified,false);
 assert.deepEqual(a.scope.statuses,['40','45','60','70']);
 const by=a.observed.year2026_wo_code_10_30_40_departments,wo=a.observed.year2026_wo_status;
 const audit=JSON.parse(fs.readFileSync(path.join(__dirname,'data','controlplan-coverage-audit.json'),'utf8'));
 assert.equal(audit.kind,'PUBLIC_AGGREGATE_CONTROLPLAN_COVERAGE_AUDIT');
 assert.equal(audit.candidate_2026_unresolved_cuttings,1235);
 assert.equal(audit.remaining_missing_controlplan,audit.candidate_2026_unresolved_cuttings-audit.overlap_with_scanned_controlplan);
 assert.equal(audit.operation_position_certified_for_1235,false);
 const cohortPath=path.join(__dirname,'..','adaptive-so-wo-timeentry','data','current-production.json');
 const cohort=JSON.parse(fs.readFileSync(cohortPath,'utf8'));
 const c=cohort.coverage||{},positions=c.production_counts||{};
 assert.equal(c.source_rows,160);assert.equal(c.open_rows,156);assert.equal(cohort.controlplan.resolved_cuttings,156);
 assert.equal(c.controlplan_coverage_pct,100);
 assert.equal(Object.values(positions).reduce((s,v)=>s+v,0),156);
 const cohortSummary={title:'Cutting40 cohort · current ControlPlan evidence',
  source_snapshot_at_utc:cohort.cutting_snapshot_at_utc,
  controlplan_verified_to_utc:cohort.controlplan.collected_to,
  captured_scope_count:c.source_rows,
  observed_open_cuttings:c.open_rows,
  transferred_9d_excluded:c.transferred_9d,
  controlplan_coverage_pct:c.controlplan_coverage_pct,
  status99_requires_review:c.status_counts['99']||0,
  production_positions:['ผลิต1','ผลิต2','ผลิต3','ผลิต4','ผลิต5','สโตร์'].map(name=>({name,count:positions[name]||0})),
  not_additive_to_2026_candidate_cohort:true,
  whole_factory_certified:false,physical_location_certified:false};
 const candidate=['10','30','40'].reduce((n,k)=>n+(wo[k]||0),0);
 const known=NAMES.reduce((n,k)=>n+(by[k]||0),0),unresolved=by['รอหลักฐาน'];
 assert(Number.isSafeInteger(candidate)&&candidate>0);
 assert.equal(candidate,known+unresolved);
 assert.equal(Object.values(wo).reduce((n,v)=>n+v,0),a.observed.created_years['2026']);
 const report={
  schema_version:'1.0',generated_at_utc:new Date().toISOString(),
  source_observed_at_utc:a.scope.source_last_at_utc,
  source:{mode:'HISTORICAL_JDE_BROWSER_AGGREGATE',system:'JD Edwards P594801C',mcp_ready:true,
   ais_live:false,ais_state:'PENDING_ERP_ADMIN',data_refresh:'STATIC_SNAPSHOT_NOT_LIVE',
   scope:'2026 Cutting creation + Cutting status 40/45/60/70 + WO status 10/30/40',
   whole_factory_certified:false,operation_location_certified:false,current_wip_certified:false,
   source_snapshot_date:'2026-10-18'},
  totals:{source_2026_cuttings:a.observed.created_years['2026'],
   candidates:candidate,classified:known,unresolved,certified_wip:null,certified_overdue:null},
  wo_codes:['10','30','40'].map(code=>({code,count:wo[code]})),
  fixed_cohort:cohortSummary,
  controlplan_audit:audit,
  departments:NAMES.map(name=>({name,count:name==='ผลิต4'?null:by[name]||0,
   reference_only:name!=='ผลิต4',physical_position_confirmed:false,
   certified_wip:null,certified_overdue:null})),
  unknown:{name:'รออ่าน Control Plan',count:unresolved,why:'CONTROLPLAN_NOT_COLLECTED_FOR_THIS_COHORT'},
  facts:[
   'จำนวนเป็น Cutting candidate ไม่ใช่ยอด WIP จริง SO หรือ WO',
   '395 Cutting จัดกลุ่มตาม Type/Status Reference เท่านั้น ยังไม่ใช่ตำแหน่ง Operation ที่รับรอง',
   '1,235 Cutting ยังไม่มีผลการอ่าน Control Plan ในชุดข้อมูลนี้ ไม่ได้หมายความว่า ERP ไม่มีรหัสสายผลิต',
   'Control Plan ระบุ L1-L6, S1-S2 แต่การระบุงานค้างต้องเลือก Operation ที่ยังไม่เสร็จ',
   'ผลิต4 ไม่มีข้อมูลที่ยืนยันได้ใน Scope นี้ ต้องแสดง — ไม่ใช่ศูนย์',
   'ยังไม่ยืนยัน Due date และเหตุค้าง จึงไม่ประกาศยอด Overdue',
   'MCP-AIS ยังไม่มี AIS Endpoint/สิทธิ์ที่รับรอง; กด Refresh เว็บจะไม่ดึง ERP สด',
   'Cutting40 cohort 160 รายการเป็นขอบเขตอีกชุด ไม่สามารถนำมาบวกกันได้'
  ]};
 const raw=JSON.stringify(report);
 for(const term of ['"Cutting Number"','"WO Number"','"Order Number"','"User ID"','"Product"','"records"','"cuttings"'])assert(!raw.includes(term),'PII leakage');
 return report;
}
if(require.main===module){
 const x=build();fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
 fs.writeFileSync(OUTPUT+'.building',JSON.stringify(x,null,2)+'\n');fs.renameSync(OUTPUT+'.building',OUTPUT);
 console.log(JSON.stringify({candidates:x.totals.candidates,classified:x.totals.classified,unresolved:x.totals.unresolved,source:x.source_observed_at_utc}));
}
module.exports={build};