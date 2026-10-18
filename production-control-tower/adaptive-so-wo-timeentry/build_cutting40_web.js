const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(process.env.USERPROFILE,'Documents','Practika-ERP-Architecture','collector');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').trimStart());
const outPath=path.join(__dirname,'data','current-production.json'),cohort=read(path.join(__dirname,'data','cutting40-cohort.json'));
const folder=path.join(root,'runtime','normalized','cutting-refresh-20261018');
const source=new Map(),times=[];
for(const file of fs.readdirSync(folder).filter(n=>/^batch-\d+\.json$/.test(n))){const b=read(path.join(folder,file));times.push(b.collected_at);for(const c of b.out){assert(c.verified&&c.complete,'Unverified lifecycle '+c.cutting);assert(c.rows.length===1,'Nonunique Cutting '+c.cutting);assert(!source.has(c.cutting),'Duplicate lifecycle source '+c.cutting);assert(c.rows[0]['Cutting Number']===c.cutting,'Lifecycle identity mismatch');source.set(c.cutting,c.rows[0]);}}
const date=s=>{const m=String(s||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(!m)return null;let y=+m[3];if(y<100)y+=2000;if(y>2400)y-=543;const t=Date.UTC(y,+m[2]-1,+m[1]);const d=new Date(t);return d.getUTCFullYear()===y&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[1]?t:null;};
const today=date(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()));
let newlyTransferred=0;
const details=[];
for(const cutting of cohort.cutting_numbers){
 const old={};const r=source.get(cutting);assert(r,'Missing fresh cutting '+cutting);
 assert(['วันกำหนดโอน','วันที่ปิด Cutting','วันที่โอนครบ'].every(k=>Object.hasOwn(r,k)),'Date headers changed');
 const due=r['วันกำหนดโอน'],dueDate=date(due),done=r['วันที่โอนครบ'],status=r['Cutting Status'];
 if(done||status.toUpperCase()==='9D'){newlyTransferred++;continue;}
 const late=dueDate==null?0:Math.max(0,Math.floor((today-dueDate)/86400000));
 details.push({...old,wo:r['WO Number'],so:r['Order Number'],cutting:r['Cutting Number'],cutting_type:r['Cutting Type'],status,status_desc:r['Cutting Status Description'],due_transfer:due,due_delivery:r['วันกำหนดส่ง'],date_closed:r['วันที่ปิด Cutting'],date_9d:done,product:r.Product,project_code:r['โครงการ'],late_days:late,delivery_state:dueDate==null?'NO_DUE_DATE':late?'LATE':dueDate-today<=2*86400000?'AT_RISK':'OPEN',lifecycle_source:'CUTTING_FRESH'});
}
const grouped=new Map();
for(const c of details){if(!grouped.has(c.wo))grouped.set(c.wo,[]);grouped.get(c.wo).push(c);}
const rows=[...grouped].map(([wo,cs])=>({id:wo,so:[...new Set(cs.map(c=>c.so))].join(','),cuttings:cs.length,s60:cs.filter(c=>c.status==='60').length,s70:cs.filter(c=>c.status==='70').length,s99:cs.filter(c=>c.status==='99').length,current_stage:'CONTROLPLAN_PENDING',due_transfer:[...new Set(cs.map(c=>c.due_transfer))].join(' | '),late_cuttings:cs.filter(c=>c.delivery_state==='LATE').length,max_late_days:Math.max(...cs.map(c=>c.late_days)),value_thb:null,value_status:'SO_VALUE_LOOKUP_PENDING',delivery_state:cs.some(c=>c.delivery_state==='LATE')?'LATE':'OPEN'}));
const transferred=newlyTransferred;
const out={schema_version:'3.0.0',mode:'CURRENT_CUTTING40_COHORT_WIP',generated_at_utc:new Date().toISOString(),cutting_snapshot_at_utc:times.sort().at(-1),cutting_collection_from:times.sort()[0],source:'JDE P594801C/PTK0002/W594801CE exact Cutting selection refresh',selection_scope:'Refresh the established Cutting 40 baseline; not a complete factory WIP census',coverage:{source_rows:details.length+transferred,open_rows:details.length,transferred_9d:transferred,unique_work_orders:rows.length,unique_sales_orders:new Set(details.map(c=>c.so)).size,unique_cuttings:details.length,status_counts:Object.fromEntries(['60','70','99'].map(s=>[s,details.filter(c=>c.status===s).length])),late_cuttings:details.filter(c=>c.delivery_state==='LATE').length,no_due_date:details.filter(c=>c.delivery_state==='NO_DUE_DATE').length,value_coverage_pct:0},rows,cuttings:details};
const {enrich,writeAtomic}=require('./build_live_controlplan.js');
const final=writeAtomic(enrich(out));
console.log(JSON.stringify({fresh_cuttings:source.size,newly_transferred:newlyTransferred,coverage:final.coverage,controlplan:final.controlplan}));
