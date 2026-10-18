const fs=require('fs'),path=require('path'),assert=require('assert');
const {aggregate,writeOutputs}=require('./safe_report');
function build({folder,ref,known={controlplan:{collected_from:null,collected_to:null}},now=new Date()}) {
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').trimStart());
const cpCache=new Map(); // Never join the prior fixed cohort.
const observed=new Map(),divergent=new Set(),times=[],summaries=[],statuses=['40','45','60','70'];
let repeated=0,observationRows=0;
for(const status of statuses){
 const summaryPath=path.join(folder,'status-'+status+'-summary.json');
 const summary=fs.existsSync(summaryPath)?read(summaryPath):{status,complete:false,distinct:null};
 assert(summary.status===status,'Summary partition mismatch');summaries.push(summary);
 const partitionIds=new Set();
 for(const name of fs.readdirSync(folder).filter(n=>new RegExp('^status-'+status+'-part-\\d+\\.json$').test(n)).sort()){
  const batch=read(path.join(folder,name));assert(batch.filter===status,'Filter mismatch');assert(typeof batch.at==='string'&&!Number.isNaN(Date.parse(batch.at)),'Invalid source timestamp');times.push(batch.at);
  const audit=summaries.at(-1),range=String(batch.record).match(/^Records (\d+) - (\d+)$/);
  audit._pages=(audit._pages||0)+1;
  audit._valid=audit._valid!==false && Number(name.match(/part-(\d+)/)[1])===audit._pages-1 && !!range && +range[1]>=1 && +range[2]-+range[1]+1===batch.rows.length && !audit._terminal && typeof batch.at==='string' && !Number.isNaN(Date.parse(batch.at)) && Date.parse(batch.at)<=Date.parse(audit.finished_at);
  audit.observation_rows=(audit.observation_rows||0)+batch.rows.length;
  audit._terminal=batch.complete===true && batch.next===false;
  for(const r of batch.rows){observationRows++;const id=r['Cutting Number'];assert(typeof id==='string'&&id.trim()===id&&id&&r['Cutting Status']===status,'Invalid source identity/status');partitionIds.add(id);
   const canonical=x=>JSON.stringify(Object.keys(x).sort().map(k=>[k,x[k]]));
   if(observed.has(id)){repeated++;if(canonical(observed.get(id))!==canonical(r))divergent.add(id);}else observed.set(id,r);
  }
 }
 summary.observed_distinct=partitionIds.size;
}
assert(observed.size,'No ERP records');
const parse=s=>{const m=String(s||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(!m)return null;let y=+m[3];if(y<100)y+=2000;if(y>2400)y-=543;const t=Date.UTC(y,+m[2]-1,+m[1]),d=new Date(t);return d.getUTCFullYear()===y&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[1]?d.toISOString().slice(0,10):null;};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const day=iso=>Date.parse(iso+'T00:00:00Z');
const normal=s=>s==='Store'||s==='สโตร์'?'สโตร์':String(s||'');
const group=s=>(normal(s).match(/^ผลิต[1-5](?=\s|$)/)||[])[0]||normal(s);
const cuttings=[],pending=[],quality=[],transferred=[];
for(const [id,r] of observed){
 if(!divergent.has(id)&&(r['วันที่โอนครบ']||r['Cutting Status'].toUpperCase()==='9D')){transferred.push(id);continue;}
 const type=r['Cutting Type'],status=r['Cutting Status'],cached=cpCache.get(id),control=cached?.control_plan||null;
 let candidates=[],basis='UNRESOLVED';
 if(control){candidates=[...new Set(ref.CuttingStatus.filter(x=>x.Type===type&&x.Status===status&&x.LastControlPlan===control).map(x=>group(x.StatusNow)).filter(Boolean))];if(candidates.length===1)basis='ERP lifecycle + Access reference + ControlPlan snapshot';}
 if(candidates.length!==1){candidates=[...new Set(ref.CuttingStatus.filter(x=>x.Type===type&&x.Status===status).map(x=>group(x.StatusNow)).filter(Boolean))];if(candidates.length===1)basis='ERP Type/Status + reference gives one department for all ControlPlans';}
 let label=candidates.length===1?candidates[0]:null,exception=[];
 if(divergent.has(id)){exception.push('Conflicting versions observed during extraction');label=null;}
 const close=parse(r['วันที่ปิด Cutting']);if(close&&Number(status)<99){exception.push('Cutting status '+status+' conflicts with recorded close date '+close);quality.push(id);label=null;}
 if(!label||!/^ผลิต[1-5]$/.test(label)){label=null;pending.push({cutting:id,wo:r['WO Number'],type,status,candidates,reason:exception.length?'SOURCE_CONFLICT':'CONTROLPLAN_REQUIRED'});}
 const department=label&&/^ผลิต[1-5]$/.test(label)?'L'+label.slice(-1):label==='สโตร์'?'STORE':label;
 const due=parse(r['วันที่ กำหนดเสร็จ']),late=due?Math.max(0,Math.floor((day(today)-day(due))/86400000)):null;
 if(!due)exception.push('Missing or invalid ERP Cutting finish due date');
 if(String(r['รายละเอียด การตรวจ']||r['Status Description']||'').trim())exception.push('ERP note exists; not verified as delay cause or responsibility');
 const next=cached?.next_open_operation;
 cuttings.push({cutting:id,wo:r['WO Number'],so:r['Order Number'],type,status,department:department||null,department_label:label||null,classification_basis:basis,control_plan:control,current_operation:next?next.seq+' / '+next.business_unit+' / '+next.description:null,due_date:due,late_days:late,product:r.Product,exception:exception.join('; ')||null,cutting_created_date:parse(r['วันที่ลง Cutting']),recorded_receive_date:parse(r['วันที่ รับ']),cutting_closed_date:close,transfer_due_date:parse(r['วันกำหนดโอน']),controlplan_observed_at:cached?.controlplan_verified_at||null});
}
const departments=['L1','L2'].map(id=>{
 const rows=cuttings.filter(c=>c.department===id),months=new Map();for(const c of rows){const key=c.due_date?.slice(0,7)||'UNKNOWN_DUE';months.set(key,(months.get(key)||0)+1);}
 return {id,label:'ผลิต'+id.slice(-1),wip:rows.length,overdue:rows.filter(c=>c.late_days>0).length,incoming:null,outgoing:null,subcontract:null,hold:null,due_buckets:[...months].sort().map(([month,count])=>({month,count})),availability:{incoming:'UNVERIFIED',outgoing:'UNVERIFIED',subcontract:'UNVERIFIED',hold:'UNVERIFIED'},no_due_date:rows.filter(c=>c.due_date==null).length};
});
for(const s of summaries){s.complete=s.complete===true&&s._valid===true&&s._terminal===true&&Number.isSafeInteger(s.distinct)&&s.distinct===s.observed_distinct&&typeof s.finished_at==='string'&&!Number.isNaN(Date.parse(s.finished_at));}
const extractionComplete=summaries.every(s=>s.complete),unresolved=cuttings.filter(c=>!c.department).length;
const notes=['WIP is an ERP/reference business classification, not certified physical location.','Overdue uses ERP Cutting finish due date; transfer due date is separate.','Incoming/outgoing, subcontract, hold and responsibility are unavailable until event/field semantics are certified.','No manual report counts or manually allocated blame were imported.','All-years query; older open records retained unless transferred. Closed-date/status contradictions are quarantined, not silently counted as WIP.','ControlPlan/operation evidence for matched existing cohort is from '+known.controlplan.collected_from+' to '+known.controlplan.collected_to+'. Other routing remains unknown.','Repeated observations across overlapping fetched pages are deduplicated; conflicting versions are quarantined.'];
const report={schema_version:'1.0',generated_at:new Date().toISOString(),scope:{label:'ERP production1/2 candidates: Cutting status40/45/60/70, all years',complete:extractionComplete&&unresolved===0,extraction_complete:extractionComplete,source:'JDE P594801C/PTK0002/W594801CE + original Access reference; cached P5511026 evidence only where stated',filters:'All Records; exact lifecycle partitions40,45,60,70; no WO-status, project or created-date exclusions',limitations:[!extractionComplete?'One or more lifecycle partitions are not completely fetched':null,unresolved+' records cannot be assigned a verified department',quality.length+' status/close-date contradictions quarantined','Department figures count only classified, non-conflicting records within this selection','Not a certified factory-wide physical WIP census; no unattended refresh configured'].filter(Boolean)},coverage:{cuttings:cuttings.length,unresolved,operations_verified:cuttings.filter(c=>c.current_operation!=null).length,history_available:false,source_distinct:observed.size,transferred_excluded:transferred.length,extraction_started_at:times.sort()[0],extraction_finished_at:times.sort().at(-1),partitions:summaries.map(s=>({status:s.status,complete:s.complete,distinct:s.distinct})),repeated_page_observations:repeated},departments,cuttings:cuttings.sort((a,b)=>(b.late_days||0)-(a.late_days||0)||a.cutting.localeCompare(b.cutting)),flow:{incoming:[],outgoing:[]},checks:{duplicates:0,source_conflicts:divergent.size+quality.length,notes}};
assert(new Set(report.cuttings.map(c=>c.cutting)).size===report.cuttings.length);
for(const d of departments){assert(d.due_buckets.reduce((s,b)=>s+b.count,0)===d.wip);assert(d.overdue<=d.wip);}
return {report:aggregate(report,now),details:{generated_at:now.toISOString(),cuttings:report.cuttings,pending}};
}
module.exports={build};
if(require.main===module)require('./run_build').run(build);
