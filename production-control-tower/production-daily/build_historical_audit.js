'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(process.env.USERPROFILE||'', 'Documents','Practika-ERP-Architecture','collector','runtime','raw','daily-census-20261018');
const statuses=['40','45','60','70'];
function read(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function yearOf(value){const parts=String(value||'').split('/');if(parts.length!==3)return 'UNKNOWN';let y=Number(parts[2]);if(!Number.isInteger(y)||y<1)return 'UNKNOWN';if(y<100)y+=2000;if(y>=2400)y-=543;return y>=2010&&y<=2026?String(y):'UNKNOWN';}
function build(folder=root){
 const rows=new Map(),sources=[],recTimes=[],perStatus={},sourceConflicts=[];
 const refPath=path.join(process.env.USERPROFILE||'','Documents','Practika-ERP-Architecture','collector','reference','access_controlplan_reference_verified.json');
 const ref=read(refPath),lookup=new Map();
 for(const record of ref.StatusNoControlPlan){const key=record.Type+'|'+record.Status;if(!lookup.has(key))lookup.set(key,new Set());lookup.get(key).add(String(record.Statusnow2||'').trim());}
 const normalizeDepartment=name=>{const s=String(name||'').trim();const m=s.match(/^ผลิต([1-5])/);return m?'ผลิต'+m[1]:s==='Store'?'สโตร์':s||'รอหลักฐาน';};
 for(const status of statuses){
  const fileNames=fs.readdirSync(folder).filter(n=>new RegExp('^status-'+status+'-part-[0-9]+[.]json$').test(n)).sort();
  assert(fileNames.length>0,'MISSING_'+status);
  const summary=read(path.join(folder,'status-'+status+'-summary.json'));
  assert(summary.complete===true,'INCOMPLETE_'+status);
  const subset=new Map();
  fileNames.forEach((name,i)=>{
   assert(name==='status-'+status+'-part-'+String(i).padStart(3,'0')+'.json','CHUNK_GAP_'+status);
   const chunk=read(path.join(folder,name));assert(chunk.filter===status,'FILTER_MISMATCH_'+status);
   assert(chunk.query==='(new)','QUERY_MISMATCH_'+status);
   assert(!Number.isNaN(Date.parse(chunk.at)),'BAD_TIME_'+status);
   recTimes.push(chunk.at);
   for(const r of chunk.rows){
    const id=String(r['Cutting Number']||'').trim();
    assert(id&&r['Cutting Status']===status,'ROW_INVALID_'+status);
    if(subset.has(id)&&JSON.stringify(subset.get(id))!==JSON.stringify(r))sourceConflicts.push(status);
    subset.set(id,r);
    if(rows.has(id)&&JSON.stringify(rows.get(id))!==JSON.stringify(r))sourceConflicts.push(status);
    else if(!rows.has(id))rows.set(id,r);
   }
   if(i===fileNames.length-1)assert(chunk.complete===true&&chunk.next===false,'NO_TERMINAL_'+status);
  });
  assert(subset.size===summary.distinct,'SUMMARY_MISMATCH_'+status);
  perStatus[status]={cuttings:subset.size,terminal_reached:true,summary_finished_at:summary.finished_at,chunk_count:fileNames.length};
 }
 assert(sourceConflicts.length===0,'SOURCE_VERSION_CONFLICT');
 const years={},yearStatus={},wo={},wo2026={},departments={},departments2026={},dept2026CodeCandidates={},deptUnknownByStatus={},risk={cutting_close_date_present:0,completed_transfer_date_present:0,wo_code_99_or_9Z:0,created_2026:0,created_before_2024:0,missing_cutting_created_date:0};
 for(const row of rows.values()){
  const y=yearOf(row['วันที่ลง Cutting']),status=String(row['Cutting Status']),ws=String(row['WO Status']||'UNKNOWN');
  years[y]=(years[y]||0)+1;
  if(!yearStatus[y])yearStatus[y]={};yearStatus[y][status]=(yearStatus[y][status]||0)+1;
  wo[ws]=(wo[ws]||0)+1;
  const possible=lookup.get(String(row['Cutting Type'])+'|'+status);
  const dept=possible?.size===1?normalizeDepartment([...possible][0]):'รอหลักฐาน';
  departments[dept]=(departments[dept]||0)+1;
  if(y==='2026'){
   departments2026[dept]=(departments2026[dept]||0)+1;
   wo2026[ws]=(wo2026[ws]||0)+1;
   if(['10','30','40'].includes(ws))dept2026CodeCandidates[dept]=(dept2026CodeCandidates[dept]||0)+1;
  }
  if(dept==='รอหลักฐาน')deptUnknownByStatus[status]=(deptUnknownByStatus[status]||0)+1;
  if(y==='2026')risk.created_2026++;
  if(y==='UNKNOWN')risk.missing_cutting_created_date++;
  else if(Number(y)<2024)risk.created_before_2024++;
  if(ws==='99'||ws==='9Z')risk.wo_code_99_or_9Z++;
  if(row['วันที่ปิด Cutting'])risk.cutting_close_date_present++;
  if(row['วันที่โอนครบ'])risk.completed_transfer_date_present++;
 }
 const sorted=recTimes.sort();
 return {schema_version:'1.0',generated_at_utc:new Date().toISOString(),kind:'PUBLIC_AGGREGATE_READ_ONLY',
   title:'JDE Cutting lifecycle evidence quality by status; not factory WIP',
   scope:{statuses,selection:'All Records, Cutting statuses 40/45/60/70, all created years',source:'JDE P594801C/PTK0002/W594801CE',factory_wip_certified:false,physical_location_certified:false,current_status_verification:'COLLECTED_TERMINAL_NOT_RECONCILED',source_first_at_utc:sorted[0],source_last_at_utc:sorted.at(-1),
   limitations:['WO Status 99/9Z needs business-rule reconciliation; not assumed completed','Unchanged legacy lifecycle codes from older years cannot establish real current work','Other Cutting statuses including 10/15/25/30/54/65/99/9C/9D are not included','JDE grid pagination labels were inconsistent with chunk contents; ERP row totals remain independently unverified','ControlPlan current operation and physical work center are not certified in this aggregate']},
   observed:{distinct_cuttings:rows.size,per_status:perStatus,created_years:Object.fromEntries(Object.entries(years).sort((a,b)=>a[0].localeCompare(b[0]))),year_status:yearStatus,wo_status:wo,access_reference_departments:departments,access_reference_2026_departments:departments2026,year2026_wo_status:wo2026,year2026_wo_code_10_30_40_departments:dept2026CodeCandidates,unresolved_by_status:deptUnknownByStatus,quality:risk},
   checks:{source_version_conflicts:sourceConflicts.length,all_terminal:true,distinct_sum_matches:statuses.reduce((s,k)=>s+perStatus[k].cuttings,0)===rows.size}
 };
}
if(require.main===module){try{
 const out=build(),target=path.join(__dirname,'data','historical-status-audit.json');
 const payload=JSON.stringify(out,null,2)+'\n';
 assert(!payload.includes('"Cutting Number"')&&!payload.includes('"WO Number"')&&!payload.includes('"Order Number"'));
 fs.writeFileSync(target+'.building',payload,'utf8');fs.renameSync(target+'.building',target);
 console.log(JSON.stringify({status:'AGGREGATE_AUDIT_WRITTEN',distinct:out.observed.distinct_cuttings,quality:out.observed.quality,source:out.scope.source_last_at_utc},null,2));
 }catch(e){console.error('AUDIT_REJECTED '+e.message);process.exitCode=1;}}
module.exports={build,yearOf};
