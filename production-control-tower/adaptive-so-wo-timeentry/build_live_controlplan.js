const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(process.env.USERPROFILE,'Documents','Practika-ERP-Architecture','collector');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').trimStart());
function enrich(base){
 assert(base&&Array.isArray(base.cuttings),'Missing lifecycle stage');
const ref=read(path.join(root,'reference','access_controlplan_reference_verified.json'));
const resolved=read(path.join(root,'runtime','raw','controlplan-live-resolved.json'));
const route=new Map(),times=[];
for(const name of fs.readdirSync(path.join(root,'runtime','normalized','controlplan-20261018')).filter(n=>/^batch-\d+\.json$/.test(n))){
 const b=read(path.join(root,'runtime','normalized','controlplan-20261018',name));times.push(b.collected_at);
 for(const c of b.out){assert(c.verified&&c.complete,'Unverified '+c.cutting);route.set(c.cutting,c.rows);}
}
const ace=new Map(resolved.rows.map(r=>[r['Group Number'],r]));
const normal=s=>s==='Store'?'สโตร์':s==='Finish'?'Finish':String(s||'');
const counts={},anomalies=[];
const operation=r=>({seq:Number(r['Oper Seq#']),business_unit:r['Business Unit'],description:r.Description,code:r['Operation Code'],status:r['Operation Status'],begin_date:r['Begin Date'],end_date:r['Ending Date'],complete_date:r['Complete Date']});
for(const c of base.cuttings){
 const rows=route.get(c.cutting);assert(rows,'Missing route '+c.cutting);
 const statuses=[...new Set(rows.map(r=>r['Cuttiing Status']).filter(Boolean))];
 const types=[...new Set(rows.map(r=>r['Do Ty']).filter(Boolean))];
 assert(statuses.length<=1&&types.length<=1,'Mixed lifecycle '+c.cutting);
 delete c.source_status_conflict;
 if(c.lifecycle_source!=='CUTTING_FRESH'){if(statuses[0])c.status=statuses[0];if(types[0])c.cutting_type=types[0];}
 else if(statuses[0]&&statuses[0]!==c.status){c.source_status_conflict={monitor_status:statuses[0],cutting_status:c.status};anomalies.push({cutting:c.cutting,reason:'STATUS_SOURCE_CONFLICT',monitor_status:statuses[0],cutting_status:c.status});}
 const a=ace.get(c.cutting),control=a?.['LastOfBusiness Unit2']||null;
 const matched=ref.CuttingStatus.filter(r=>r.Type===c.cutting_type&&r.Status===c.status&&r.LastControlPlan===control);
 let candidates=[...new Set(matched.map(r=>normal(r.StatusNow)).filter(Boolean))],method='ACCESS_CONTROLPLAN';
 if(!candidates.length){candidates=[...new Set(ref.StatusNoControlPlan.filter(r=>r.Type===c.cutting_type&&r.Status===c.status).map(r=>normal(r.Statusnow2)).filter(Boolean))];method='ACCESS_FALLBACK';}
 const label=candidates.length===1?candidates[0]:'รอตรวจสอบ';
 const position=(label.match(/^ผลิต[1-5](?=\s|$)/)||[])[0]||label;
 c.position_detail=label;
 const ops=rows.map(operation).sort((a,b)=>a.seq-b.seq);
 const unfinished=ops.filter(o=>o.code!=='90'&&!/Move Complete/i.test(o.status||'')&&o.business_unit!=='99-RWK');
 const next=unfinished[0]||null;
 Object.assign(c,{position,production:position,control_plan:control,resolution_method:candidates.length===1?method:'AMBIGUOUS',production_candidates:candidates,
  controlplan_business_unit:a?.['LastOfBusiness Unit']?.trim()||null,max_operation_seq:a?.['MaxOfOper Seq#']??null,
  operations:ops,next_open_operation:next,controlplan_verified_at:times.filter(Boolean).sort().at(-1),
  location_basis:'Access original SQL + reference; next open operation shown separately',
  status_desc:c.status==='99'?'จบ Cutting / ตรวจ 9D':c.status==='70'?'Cutting status 70':c.status==='60'?'Cutting status 60':c.status});
 counts[position]=(counts[position]||0)+1;
 if(candidates.length!==1)anomalies.push({cutting:c.cutting,reason:'AMBIGUOUS_REFERENCE',candidates});
 if(!rows.length)anomalies.push({cutting:c.cutting,reason:'NO_OPERATION_ROWS'});
}
assert(new Set(base.cuttings.map(c=>c.cutting)).size===base.cuttings.length,'Duplicate Cutting');
for(const wo of base.rows){const cs=base.cuttings.filter(c=>c.wo===wo.id);wo.current_stage=[...new Set(cs.map(c=>c.position))].join(' | ');wo.s60=cs.filter(c=>c.status==='60').length;wo.s70=cs.filter(c=>c.status==='70').length;wo.s99=cs.filter(c=>c.status==='99').length;}
base.cutting_snapshot_at_utc=base.cutting_snapshot_at_utc||base.generated_at_utc;
base.generated_at_utc=new Date().toISOString();base.schema_version='3.0.0';
base.source='JDE P594801C/PTK0002 + P5511026/ZPTK0001 + Access reference';
base.controlplan={engine:resolved.engine,sql_verified:true,collected_from:times.sort()[0],collected_to:times.sort().at(-1),queried_cuttings:route.size,operation_rows:[...route.values()].reduce((n,r)=>n+r.length,0),resolved_cuttings:base.cuttings.filter(c=>c.resolution_method!=='AMBIGUOUS').length,anomalies,production_counts:counts,scope:'Cutting 40 selection, not all factory WIP',refresh_mode:'ERP extraction snapshot; no unattended refresh configured'};
base.coverage.production_counts=counts;base.coverage.controlplan_coverage_pct=+(base.controlplan.resolved_cuttings/base.cuttings.length*100).toFixed(1);
base.coverage.status_counts=Object.fromEntries(['60','70','99'].map(s=>[s,base.cuttings.filter(c=>c.status===s).length]));
return base;
}
function writeAtomic(base){
 assert(base.controlplan?.sql_verified,'Missing ControlPlan enrichment');
 assert(base.cuttings.every(c=>!c.date_9d&&c.status.toUpperCase()!=='9D'),'9D gate failed');
 assert(new Set(base.cuttings.map(c=>c.cutting)).size===base.coverage.open_rows,'Distinct total mismatch');
 assert(Object.values(base.coverage.production_counts).reduce((a,n)=>a+n,0)===base.cuttings.length,'Production total mismatch');
 const target=path.join(__dirname,'data','current-production.json'),temp=target+'.building';
 fs.writeFileSync(temp,JSON.stringify(base,null,2),'utf8');JSON.parse(fs.readFileSync(temp,'utf8'));fs.renameSync(temp,target);
 return base;
}
module.exports={enrich,writeAtomic};
if(require.main===module){require('./build_cutting40_web.js');}
