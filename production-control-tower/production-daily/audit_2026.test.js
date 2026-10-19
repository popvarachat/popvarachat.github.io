'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {run}=require('./build_2026_lifecycle');
function fixture(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wip26-'));try{const summary={status:'ALL',year:2026,complete:true,distinct:2};
 const chunk={query:'(new)',filter:'',at:'2026-10-19T03:00:00Z',complete:true,next:false,rows:[
 {'Cutting Number':'PRIVATE-CUT-101','Cutting Status':'9C','วันที่ลง Cutting':'19/10/26','WO Status':'30'},
 {'Cutting Number':'PRIVATE-CUT-102','Cutting Status':'9D','วันที่ลง Cutting':'18/10/26','WO Status':'99','วันที่โอนครบ':'19/10/26'}
 ]};
 const update=fn||(()=>{});update({summary,chunk});
 fs.writeFileSync(path.join(dir,'all-2026-summary.json'),JSON.stringify(summary));fs.writeFileSync(path.join(dir,'all-2026-part-000.json'),JSON.stringify(chunk));
 return run(dir);
}finally{fs.rmSync(dir,{recursive:true,force:true})}}
test('full 2026 snapshot includes all statuses and sanitizes identifiers',()=>{const d=fixture(),raw=JSON.stringify(d);assert.equal(d.distinct_cuttings,2);assert.equal(d.cutting_status_counts['9C'],1);assert.equal(d.cutting_status_counts['9D'],1);assert.equal(d.factory_wip_certified,false);assert.equal(raw.includes('PRIVATE-CUT'),false)});
test('incomplete summary fails closed',()=>assert.throws(()=>fixture(({summary})=>summary.complete=false)));
test('wrong year fails closed',()=>assert.throws(()=>fixture(({chunk})=>chunk.rows[0]['วันที่ลง Cutting']='19/10/25')));
test('blank created date stays explicitly unverified',()=>{const d=fixture(({chunk})=>chunk.rows[0]['วันที่ลง Cutting']='');assert.equal(d.sources.unknown_created_dates,1);assert.equal(d.scope_complete_for_2026_selection,false)});
