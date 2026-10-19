'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {build}=require('./build_backlog'),{validate,focus,percent,render}=require('./app');
test('Reconciled source candidate counts and WO cohort',()=>{
 const x=build();assert.equal(x.totals.candidates,1630);assert.equal(x.totals.classified,395);
 assert.equal(x.totals.unresolved,1235);assert.equal(x.totals.source_2026_cuttings,2008);
 assert.equal(x.wo_codes.reduce((n,r)=>n+r.count,0),1630);
 assert.equal(x.departments.reduce((n,x)=>n+(x.count||0),0),395);
 assert.equal(x.departments.find(x=>x.name==='ผลิต4').count,null);
 assert.equal(x.source.current_wip_certified,false);assert.equal(x.source.ais_live,false);
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
 for(const id of ['ผลิต1','ผลิต2','ผลิต3','ผลิต4','ผลิต5','ยังระบุสายผลิตไม่ได้'])assert(html.includes(id));
 assert(html.includes('data-select=\"ผลิต1\"'));
 assert(html.includes('1,630')&&html.includes('1,235'));
 assert(html.includes('รายงานติดตาม ไม่ใช่ยอด WIP สด'));
 assert(html.includes('ยังไม่รับรอง'));
});
test('Interactive scope selection respects unknown and no evidence',()=>{
 const x=validate(build());
 assert.equal(focus(x,'ผลิต1').count,74);assert.equal(focus(x,'ผลิต5').count,271);
 assert.equal(focus(x,'ผลิต4').count,null);assert.equal(focus(x,'UNKNOWN').count,1235);
 assert.equal(focus(x,'ALL').count,1630);assert.equal(percent(1235,1630),'75.8%');
});
