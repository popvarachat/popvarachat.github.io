'use strict';
const esc=v=>String(v??'Unknown').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(d){
 if(d.schema_version!=='2.0'||!Array.isArray(d.departments)||!d.coverage||'cuttings' in d)throw Error('Unsupported aggregate schema');
 const complete=d.scope.complete===true&&!d.preview_only;
 return `<div class="notice">${complete?'Partition coverage complete within stated scope':'PROVISIONAL — incomplete coverage or integrity conflicts; not certified WIP'}</div>
 <section class="panel"><h2>Scope and coverage</h2><p>${esc(d.scope.label)}</p><p>Source observations: ${esc(d.coverage.source_started_at)} to ${esc(d.coverage.source_finished_at)}</p><p>Built: ${esc(d.generated_at)} (not source freshness)</p><p>Observed distinct: ${esc(d.coverage.observed)} · Included candidates: ${esc(d.coverage.wip)} · Unknown department: ${esc(d.coverage.unresolved)} · Integrity conflicts: ${esc(d.flags.source_conflicts)}</p><ul>${d.coverage.partitions.map(p=>`<li>Status ${esc(p.status)}: ${p.complete?'complete':'INCOMPLETE — totals may be understated'}; reported distinct ${esc(p.distinct)}</li>`).join('')}</ul></section>
 <section class="panel"><h2>Production departments</h2><p>Counts of distinct Cutting candidates in the selected lifecycle partitions. Business classification does not certify physical location.</p><div class="comparison">${d.departments.map(p=>`<article class="department"><h3>${esc(p.id)}</h3><p>Observed candidates: <strong>${esc(p.wip)}</strong></p><p>Past finish due date: ${esc(p.overdue)}</p><p>Unknown finish due date: ${esc(p.unknown_due)}</p><p>Incoming / outgoing / hold / subcontract: unknown</p></article>`).join('')}</div></section>
 <section class="panel"><h2>Limitations</h2><ul>${d.scope.limitations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>No verified cause, responsibility or allocation evidence. This snapshot is not a factory-wide census or a daily movement report.</p></section>`;
}
if(typeof document!=='undefined'){
 const refresh=()=>fetch('data/report.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Report unavailable');return r.json();}).then(d=>{document.getElementById('report').innerHTML=render(d);}).catch(()=>{document.getElementById('report').textContent='Report unavailable or invalid. No counts are certified.';});
 const button=document.createElement('button');button.textContent='Refresh snapshot';button.onclick=refresh;document.querySelector('header').appendChild(button);
 refresh();setInterval(refresh,60000);
}
if(typeof module!=='undefined')module.exports={render};
