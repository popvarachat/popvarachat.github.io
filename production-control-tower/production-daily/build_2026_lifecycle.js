'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const date=process.argv[2]||'20261019';
assert(/^[0-9]{8}(-[0-9]{6})?$/.test(date),'invalid collection date');
const source=path.join(process.env.USERPROFILE||'','Documents','Practika-ERP-Architecture','collector','runtime','raw','daily-census-'+date);
const target=path.join(__dirname,'data','2026-all-status-audit.json');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
function run(dir=source){
 const summary=read(path.join(dir,'all-2026-summary.json'));
 assert(summary.status==='ALL'&&summary.year===2026&&summary.complete===true,'SOURCE_INCOMPLETE');
 const files=fs.readdirSync(dir).filter(f=>/^all-2026-part-[0-9]+[.]json$/.test(f)).sort();assert(files.length>0,'NO_FILES');
 const rows=new Map(),times=[],conflicts=[],blank=[],status={},wo={},months={};let missingYear=0,closedDate=0,transferredDate=0;
 for(let i=0;i<files.length;i++){
  const f=files[i];assert(f==='all-2026-part-'+String(i).padStart(3,'0')+'.json','CHUNK_GAP');
  const p=read(path.join(dir,f));assert(p.query==='(new)'&&p.filter==='','WRONG_FILTER');
  assert(!Number.isNaN(Date.parse(p.at)),'BAD_OBSERVATION_TIME');times.push(p.at);
  if(i===files.length-1)assert(p.complete===true&&p.next===false,'INCOMPLETE_PAGINATION');
  for(const row of p.rows){
   const id=String(row['Cutting Number']||'').trim(); assert(id,'NO_ID');
   const created=String(row['วันที่ลง Cutting']||'').trim(),y=created.split('/').at(-1);
   assert(!created||['26','2026','69','2569'].includes(y),'OUT_OF_SCOPE_DATE');
   if(rows.has(id)){
    if(JSON.stringify(rows.get(id))!==JSON.stringify(row))conflicts.push(id);
   }else rows.set(id,row);
  }
 }
 assert(rows.size===summary.distinct,'DISTINCT_SUMMARY_MISMATCH');
 assert(conflicts.length===0,'CHANGED_RECORD_DURING_READ');
 for(const row of rows.values()){
  const s=String(row['Cutting Status']||'UNKNOWN'),w=String(row['WO Status']||'UNKNOWN');
  const created=String(row['วันที่ลง Cutting']||'').trim();
  if(!created)missingYear++;
  else {const parts=created.split('/');const month=parts[1]||'??';months[month]=(months[month]||0)+1;}
  status[s]=(status[s]||0)+1;wo[w]=(wo[w]||0)+1;
  if(row['วันที่ปิด Cutting'])closedDate++;
  if(row['วันที่โอนครบ'])transferredDate++;
 }
 const timesSorted=times.sort();
 return {schema_version:'1.0',kind:'PUBLIC_AGGREGATE',generated_at_utc:new Date().toISOString(),source_selection:'Cutting created >= 01/01/2026; ALL lifecycle statuses',
    source_system:'JDE P594801C/PTK0002/W594801CE; read-only Playwright',
    selection_capture_complete:true,scope_complete_for_2026_selection:missingYear===0,factory_wip_certified:false,
    sources:{started_at_utc:timesSorted[0],finished_at_utc:timesSorted.at(-1),parts:files.length,unknown_created_dates:missingYear,quality:['Grid terminal reached with pagination checkpoints','Date QBE selected 2026; each nonempty returned created date verified','ERP authoritative total count and physical ControlPlan remain unverified']},
    distinct_cuttings:rows.size,cutting_status_counts:Object.fromEntries(Object.entries(status).sort((a,b)=>a[0].localeCompare(b[0]))),
    wo_status_counts:Object.fromEntries(Object.entries(wo).sort((a,b)=>b[1]-a[1])),month_of_cutting_counts:Object.fromEntries(Object.entries(months).sort()),
    completed_transfer_date_count:transferredDate,cutting_closed_date_count:closedDate,scope_note:'Covers Cutting created 2026 only; older genuinely open Cutting are not covered. Status codes are literal, not certified physical WIP.'};
}
if(require.main===module)try{
 const data=run();const str=JSON.stringify(data,null,2)+'\n';
 for(const field of ['"Cutting Number"','"WO Number"','"Order Number"','"Product"','"User ID"'])assert(!str.includes(field),'PRIVATE_FIELD');
 fs.writeFileSync(target+'.building',str,'utf8');fs.renameSync(target+'.building',target);
 console.log(JSON.stringify({status:'ALL_2026_AUDIT_BUILT',cuttings:data.distinct_cuttings,statuses:data.cutting_status_counts,missing_date:data.sources.unknown_created_dates,source:data.sources.finished_at_utc}));
}catch(e){console.error('STOP_'+e.message);process.exitCode=1;}
module.exports={run};
