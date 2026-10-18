'use strict';
const fs=require('node:fs'),path=require('node:path');
const PRIVATE=path.join(process.env.USERPROFILE||process.env.HOME||'', 'Documents','Practika-ERP-Architecture','collector','runtime','normalized');
const ids=['L1','L2','L3','L4','L5','UNKNOWN'];
function aggregate(raw,now){
 const rows=raw.cuttings;
 const departments=ids.map(id=>{
  const selected=rows.filter(r=>(ids.includes(r.department)?r.department:'UNKNOWN')===id);
  return {id,wip:selected.length,overdue:selected.filter(r=>r.late_days>0).length,unknown_due:selected.filter(r=>r.due_date==null).length,incoming:null,outgoing:null,hold:null,subcontract:null};
 });
 const conflicts=raw.checks.source_conflicts;
 const incomplete=!raw.scope.extraction_complete;
 return {schema_version:'2.0',generated_at:now.toISOString(),scope:{label:'Observed ERP lifecycle partitions 40/45/60/70; all years',complete:!incomplete&&conflicts===0,full_erp_census:false,limitations:['Partition coverage is limited to lifecycle statuses 40/45/60/70; never a full ERP census.','Business department classification is not certified physical location.','Cached routing evidence covers only a prior cohort; remaining assignments may be unknown.','Overdue uses finish due date; unknown due dates are excluded from overdue counts.','Flow, hold, subcontract and responsibility are unverified; null means unknown.','Static snapshot: refresh reads existing local exports only; ERP collection is not run.']},flags:{incomplete,unresolved:raw.coverage.unresolved>0,conflicting:conflicts>0,source_conflicts:conflicts},coverage:{observed:raw.coverage.source_distinct,wip:rows.length,unresolved:raw.coverage.unresolved,transferred_excluded:raw.coverage.transferred_excluded,repeated_observations:raw.coverage.repeated_page_observations,source_started_at:raw.coverage.extraction_started_at||null,source_finished_at:raw.coverage.extraction_finished_at||null,partitions:raw.coverage.partitions.map(p=>({status:p.status,complete:p.complete===true,distinct:Number.isSafeInteger(p.distinct)?p.distinct:null}))},departments};
}
function atomic(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.building',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.building',file);}
function writeOutputs(result,{allowPartial=false}={}){
 const blocked=!result.report.scope.complete;
 if(blocked&&!allowPartial)throw Error('Missing, incomplete or conflicting partition; outputs unchanged');
 if(allowPartial){
  result.report.scope.complete=false;
  result.report.preview_only=true;
  atomic(path.join(__dirname,'.local-preview/report.json'),result.report);
  return;
 }
 // Fixed destination, never configurable and never a public fallback. Write private first.
 const real=fs.realpathSync(PRIVATE);
 if(path.resolve(real).toLowerCase()!==path.resolve(PRIVATE).toLowerCase())throw Error('Private directory must not be redirected');
 atomic(path.join(real,'production-daily-details.json'),result.details);
 atomic(path.join(__dirname,'data/report.json'),result.report);
}
module.exports={aggregate,writeOutputs};
