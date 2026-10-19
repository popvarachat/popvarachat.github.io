'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {build}=require('./build_backlog'),{validate,focus,percent,render,validatedProgress,renderProgress}=require('./app');
test('Reconciled source candidate counts and WO cohort',()=>{
 const x=build();assert.equal(x.totals.candidates,1630);assert.equal(x.totals.classified,395);
 assert.equal(x.totals.unresolved,1235);assert.equal(x.totals.source_2026_cuttings,2008);
 assert.equal(x.wo_codes.reduce((n,r)=>n+r.count,0),1630);
 assert.equal(x.departments.reduce((n,x)=>n+(x.count||0),0),395);
 assert.equal(x.departments.find(x=>x.name==='ผลิต4').count,null);
 assert.equal(x.fixed_cohort.observed_open_cuttings,156);
 assert.equal(x.fixed_cohort.production_positions.find(x=>x.name==='ผลิต4').count,131);
 assert.equal(x.fixed_cohort.production_positions.reduce((n,x)=>n+x.count,0),156);
 assert.equal(x.fixed_cohort.not_additive_to_2026_candidate_cohort,true);
 assert.equal(x.source.current_wip_certified,false);assert.equal(x.source.ais_live,false);
 assert.equal(x.controlplan_audit.scanned_controlplan_cuttings,156);
 assert.equal(x.controlplan_audit.operation_rows,1061);
 assert.equal(x.controlplan_audit.candidate_2026_unresolved_cuttings,1235);
 assert.equal(x.controlplan_audit.overlap_with_scanned_controlplan,0);
 assert.equal(x.controlplan_audit.control_to_department.find(x=>x.code==='L4').department,'ผลิต4');
});
test('Public snapshot has no private cutting order or customer records',()=>{
 const x=build(),s=JSON.stringify(x);
 for(const token of ['Cutting Number','WO Number','Order Number','User ID','Product','Customer'])assert.equal(s.includes('"'+token+'"'),false);
 assert.equal(x.totals.certified_wip,null);assert.equal(x.totals.certified_overdue,null);
});
test('Reject fake AIS live flag, missing-line zero and unreconciled totals',()=>{
 const x=build();
 assert.throws(()=>validate({...x,source:{...x.source,ais_live:true}}));
 assert.throws(()=>validate({...x,departments:x.departments.map(r=>({...r,count:r.name==='ผลิต4'?0:r.count}))}));
 assert.throws(()=>validate({...x,totals:{...x.totals,unresolved:0}}));
});
test('dashboard renders every production line, source notice and review gates',()=>{
 const x=build(),html=render(x);
 for(const id of ['ผลิต1','ผลิต2','ผลิต3','ผลิต4','ผลิต5','รออ่าน Control Plan'])assert(html.includes(id));
 assert(html.includes('data-select=\"ผลิต1\"'));
 assert(html.includes('1,630')&&html.includes('1,235'));
 assert(html.includes('รายงานติดตาม ไม่ใช่ยอด WIP สด'));
 assert(html.includes('ยังไม่รับรอง'));
 assert(html.includes('Current ControlPlan แล้ว'));
 assert(html.includes('131'));
 assert(html.includes('ห้ามนำยอดมาบวกกับ 1,630'));
 assert(html.includes('L1 → ผลิต1'));
 assert(html.includes('L6 → ผลิต5'));
 assert(html.includes('Cutting ที่ต้องอ่าน Control Plan เพิ่ม'));
});
test('read-only ControlPlan progress distinguishes found, query-empty and pending',()=>{
 const x={schema_version:'1.0',kind:'CONTROLPLAN_READONLY_COLLECTION_PROGRESS',source:'P5511026/ZPTK0001',
 source_type:'JDE_BROWSER_READ_ONLY',target_cuttings:1235,checked_cuttings:12,pending_cuttings:1223,
 found_controlplan:12,verified_query_empty:0,with_reference_route_codes:12,collected_operation_rows:70,
 route_code_presence_by_cutting:{L1:9,L2:4},as_of_utc:'2026-10-19T07:00:00Z',
 current_station_certified:false,factory_wip_certified:false};
 assert.equal(validatedProgress(x).checked_cuttings,12);
 const html=renderProgress(x);
 assert(html.includes('P5511026')&&html.includes('1,223')&&html.includes('Operation'));
 assert.equal(validatedProgress({...x,found_controlplan:15}),null);
 assert.equal(validatedProgress({...x,current_station_certified:true}),null);
 assert(renderProgress(null).includes('รอผลตรวจ'));
});
test('Interactive scope selection respects unknown and no evidence',()=>{
 const x=validate(build());
 assert.equal(focus(x,'ผลิต1').count,74);assert.equal(focus(x,'ผลิต5').count,271);
 assert.equal(focus(x,'ผลิต4').count,null);assert.equal(focus(x,'UNKNOWN').count,1235);
 assert.equal(focus(x,'ALL').count,1630);assert.equal(percent(1235,1630),'75.8%');
});
