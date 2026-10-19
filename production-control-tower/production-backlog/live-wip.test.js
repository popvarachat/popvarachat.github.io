'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const live=require('./live-wip');
const now=Date.parse('2026-10-19T05:00:00Z');
function valid(){
 return {schema_version:'1.0',kind:'AIS_SIGNED_WIP_AGGREGATE',status:'CERTIFIED_SNAPSHOT',privacy:'AGGREGATE_ONLY',
  source:{mode:'JDE_AIS_READ_ONLY',scope:'FULL_FACTORY',reconciled:true,business_rules_approved:true,owner_approval_ref:'ERP-QMR-20261019',as_of_utc:'2026-10-19T04:30:00Z',fresh_until_utc:'2026-10-20T04:30:00Z'},
  totals:{source_count:9,open_wip:7,closed_or_transferred:2,overdue:3,hold:1},
  departments:[{name:'ผลิต1',count:2,overdue:1,hold:0},{name:'ผลิต2',count:1,overdue:0,hold:0},{name:'ผลิต3',count:0,overdue:0,hold:0},{name:'ผลิต4',count:3,overdue:2,hold:1},{name:'ผลิต5',count:1,overdue:0,hold:0}]};
}
test('pending gate never displays certified live values',()=>{
 assert.equal(live.accept({schema_version:'1.0',status:'PENDING_ADMIN_GATE'},now).state,'PENDING_ADMIN_GATE');
 assert(live.render({schema_version:'1.0',status:'PENDING_ADMIN_GATE'},now).includes('ยังไม่พร้อมรับรอง'));
});
test('valid aggregate with five lines and reconciliation displays WIP',()=>{
 const d=valid();assert.equal(live.accept(d,now).state,'CERTIFIED_SNAPSHOT');
 const html=live.render(d,now);assert(html.includes('WIP จาก MCP–AIS'));assert(html.includes('ผลิต4'));assert(html.includes('ERP-QMR-20261019'));
});
test('expired snapshot must be blocked',()=>assert.equal(live.accept(valid(),now+25*3600000).state,'STALE_OR_INVALID_TIME'));
test('unverified source must be blocked',()=>{const d=valid();d.source.mode='BROWSER_SNAPSHOT';assert.notEqual(live.accept(d,now).state,'CERTIFIED_SNAPSHOT')});
test('miscounted total and factory line must be blocked',()=>{
 const d=valid();d.totals.open_wip=8;d.totals.source_count=10;assert.equal(live.accept(d,now).state,'RECONCILIATION_FAILED');
 const c=valid();c.departments[0].name='ผลิต4';assert.equal(live.accept(c,now).state,'DEPARTMENT_INVALID');
});
test('private cutting number field must not be displayed',()=>{
 const d=valid();d.cutting_id='SENSITIVE_RECORD';assert.equal(live.accept(d,now).state,'PRIVATE_FIELDS_REJECTED');
});
