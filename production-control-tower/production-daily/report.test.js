'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {build}=require('./build_report'),{writeOutputs}=require('./safe_report'),{render}=require('./app');
const now=new Date('2026-10-18T12:00:00Z');
function fixture(fn){const folder=fs.mkdtempSync(path.join(__dirname,'.test-'));try{
 const ref={CuttingStatus:[]};
 for(const [i,status] of ['40','45','60','70'].entries()){
  const rows=[{'Cutting Number':'PRIVATE-'+status,'Cutting Status':status,'Cutting Type':'T','WO Number':'SECRET-WO',Product:'SECRET-PRODUCT','วันที่ กำหนดเสร็จ':'17/10/2026'}];
  ref.CuttingStatus.push({Type:'T',Status:status,StatusNow:'ผลิต'+(i+1)});
  fs.writeFileSync(path.join(folder,`status-${status}-part-000.json`),JSON.stringify({filter:status,at:now.toISOString(),record:'Records 1 - 1',complete:true,next:false,rows}));
  fs.writeFileSync(path.join(folder,`status-${status}-summary.json`),JSON.stringify({status,complete:true,distinct:1,finished_at:now.toISOString()}));
 }
 fn({folder,ref,now});
 }finally{fs.rmSync(folder,{recursive:true});}}
function change(o,file,fn){const p=path.join(o.folder,file),v=JSON.parse(fs.readFileSync(p));fn(v);fs.writeFileSync(p,JSON.stringify(v));}
test('deterministic counts, statuses, privacy, source time and aggregate UI',()=>fixture(o=>{
 const a=build(o),b=build(o);assert.deepEqual(a,b);assert.equal(a.report.scope.complete,true);assert.equal(a.report.coverage.observed,4);
 assert.deepEqual(a.report.departments.map(d=>d.wip),[1,1,1,1,0,0]);assert.equal(a.report.departments[0].overdue,1);
 const json=JSON.stringify(a.report);for(const secret of ['PRIVATE-','SECRET-','17/10/2026','2026-10-17','due_date','cuttings','product','customer','raw'])assert.equal(json.includes(secret),false,secret);
 assert.equal(a.details.cuttings.length,4);assert.match(render(a.report),/Source observations/);assert.doesNotMatch(render(a.report),/SECRET/);
}));
test('missing partition blocks default output without changing public file',()=>fixture(o=>{
 fs.unlinkSync(path.join(o.folder,'status-70-summary.json'));const a=build(o);assert.equal(a.report.flags.incomplete,true);
 const file=path.join(__dirname,'data/report.json'),before=fs.readFileSync(file);assert.throws(()=>writeOutputs(a),/outputs unchanged/);assert.deepEqual(fs.readFileSync(file),before);
}));
test('pagination count mismatch and missing terminal fail closed',()=>fixture(o=>{
 change(o,'status-40-part-000.json',b=>b.record='Records 1 - 2');assert.equal(build(o).report.scope.complete,false);
 change(o,'status-45-part-000.json',b=>b.next=true);assert.equal(build(o).report.coverage.partitions[1].complete,false);
}));
test('summary distinct mismatch fails closed',()=>fixture(o=>{change(o,'status-40-summary.json',s=>s.distinct=2);assert.equal(build(o).report.scope.complete,false);}));
test('cross-partition identity conflicts block publication',()=>fixture(o=>{
 change(o,'status-45-part-000.json',b=>b.rows[0]['Cutting Number']='PRIVATE-40');const a=build(o);assert.equal(a.report.flags.conflicting,true);assert.throws(()=>writeOutputs(a));
}));
test('unknown classification and invalid due date are explicit',()=>fixture(o=>{
 o.ref.CuttingStatus=[];change(o,'status-40-part-000.json',b=>b.rows[0]['วันที่ กำหนดเสร็จ']='31/02/2026');const a=build(o);assert.equal(a.report.coverage.unresolved,4);assert.equal(a.report.departments.at(-1).wip,4);assert.equal(a.report.departments.at(-1).unknown_due,1);
}));
test('invalid status and missing identity reject input',()=>fixture(o=>{change(o,'status-40-part-000.json',b=>delete b.rows[0]['Cutting Number']);assert.throws(()=>build(o));}));
