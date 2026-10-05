let SNAPSHOT=null, WORKFLOW=null, timer=null;
const fmt=(v,d=3)=>v===null||v===undefined?'—':Number(v).toFixed(d);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const badge=(text,kind='good')=>`<span class="pill ${kind}">${esc(text)}</span>`;

async function loadSnapshot(){
  const ts=Date.now();
  const [snapshotRes,workflowRes]=await Promise.all([
    fetch('data/executive_snapshot.json?ts='+ts,{cache:'no-store'}),
    fetch('data/workflow_status.json?ts='+ts,{cache:'no-store'})
  ]);
  if(!snapshotRes.ok) throw new Error('snapshot HTTP '+snapshotRes.status);
  if(!workflowRes.ok) throw new Error('workflow HTTP '+workflowRes.status);
  SNAPSHOT=await snapshotRes.json();
  WORKFLOW=await workflowRes.json();
  render();
  renderWorkflow();
}
function render(){
  const s=SNAPSHOT;
  document.getElementById('mode').textContent=s.system.mode;
  document.getElementById('execution').innerHTML=s.system.execution_enabled?badge('ENABLED','warn'):badge('DISABLED','off');
  document.getElementById('generated').textContent=s.generated_at_utc;
  document.getElementById('systemHealth').innerHTML=badge('HEALTHY / READ-ONLY');

  document.getElementById('marketCards').innerHTML=s.instruments.map(x=>{
    const r=x.regime||{}, a=x.aggregate||{}, d=x.decision||{}, rc=x.risk_control||{};
    const q=x.source_quality==='GOOD'?'good':'warn';
    return `
    <article class="market-card">
      <div class="market-head"><h3>${esc(x.instrument)}</h3>${badge(x.source_quality,q)}</div>
      <div class="big-action ${esc(x.final_action)}">${esc(x.final_action)}</div>
      <div class="muted">Decision hypothesis: ${esc(d.action)} · Candidate: ${esc(d.selected_candidate_id||'—')}</div>
      <div class="stats">
        <div class="stat"><span>Regime</span><b>${esc(r.label)}</b></div>
        <div class="stat"><span>Confidence</span><b>${fmt(r.confidence,3)}</b></div>
        <div class="stat"><span>Trend</span><b>${fmt(a.trend_score,3)}</b></div>
        <div class="stat"><span>Momentum</span><b>${fmt(a.momentum_score,3)}</b></div>
        <div class="stat"><span>Trend Strength</span><b>${fmt(a.trend_strength,3)}</b></div>
        <div class="stat"><span>Volatility</span><b>${fmt(a.volatility_score,3)}</b></div>
        <div class="stat"><span>News Risk</span><b>${esc(x.signal.news_risk)}</b></div>
        <div class="stat"><span>Risk Allowed</span><b>${rc.allowed?'YES':'NO'}</b></div>
      </div>
      <div class="reason"><b>Risk/Decision:</b> ${esc((rc.reasons||[]).join(' · ')||d.reason||'—')}</div>
    </article>`}).join('');

  document.getElementById('trace').innerHTML=s.instruments.map(x=>`
    <article class="panel">
      <div class="market-head"><h3>${esc(x.instrument)}</h3><span class="muted">${x.agent_core.candidate_count} candidates</span></div>
      ${x.agent_core.top_candidates.map(c=>`
        <div class="candidate">
          <div><div class="name">${esc(c.candidate_id)}</div><small>${esc(c.action)} · ${esc(c.family)}</small></div>
          <div><small>Score</small><br><b>${fmt(c.adjusted_score,3)}</b></div>
          <div><small>Conf.</small><br><b>${fmt(c.confidence,3)}</b></div>
          <div>${badge(c.accepted?'ELIGIBLE':'REJECT',c.accepted?'good':'off')}</div>
        </div>`).join('')}
    </article>`).join('');

  document.getElementById('reportText').innerHTML=buildReportHtml();
}
const WF_LABELS={
  data_input:'Data Input',
  preprocess_feature:'Preprocess & Feature',
  multi_agent_core:'Multi-Agent Core',
  decision_risk_control:'Decision & Risk',
  executive_output:'Executive Output'
};
const WF_IDS=['data_input','preprocess_feature','multi_agent_core','decision_risk_control','executive_output'];

function wfTime(s){
  if(!s) return '—';
  try{
    return new Intl.DateTimeFormat('th-TH',{
      dateStyle:'short',timeStyle:'short',timeZone:'Asia/Bangkok'
    }).format(new Date(s));
  }catch{return String(s)}
}
function wfSafe(v){
  if(v===null||v===undefined) return '—';
  if(Array.isArray(v)) return v.length?v.join(', '):'none';
  if(typeof v==='object') return JSON.stringify(v);
  return String(v);
}
function renderWorkflow(){
  const w=WORKFLOW;
  if(!w) return;
  document.getElementById('wfOverall').innerHTML=
    '<span class="flow-state '+esc(w.overall_status)+'">'+esc(w.overall_status)+'</span>';
  document.getElementById('wfUpdated').textContent=wfTime(w.generated_at_utc);

  document.getElementById('wfNodes').innerHTML=WF_IDS.map((id,i)=>{
    const x=w.layers[id]||{};
    const states=x.instrument_states||{};
    return '<article class="workflow-node" data-wf-layer="'+esc(id)+'">'+
      '<div class="node-no">LAYER 0'+(i+1)+'</div>'+
      '<h4>'+esc(WF_LABELS[id]||id)+'</h4>'+
      '<span class="flow-state '+esc(x.status||'FAILED')+'">'+esc(x.status||'FAILED')+'</span>'+
      '<div class="node-mini">BTC '+esc(states.BTCUSD||'—')+' · GOLD '+esc(states.XAUUSD||'—')+
      '<br>'+esc(wfTime(x.updated_at_utc))+'</div>'+
    '</article>';
  }).join('');

  document.getElementById('wfLanes').innerHTML=w.instruments.map(ins=>{
    return '<div class="workflow-lane"><div class="workflow-lane-name">'+esc(ins.instrument)+'</div>'+
      WF_IDS.map(id=>{
        const x=ins.layers[id]||{};
        return '<div class="workflow-cell '+esc(x.status||'FAILED')+
          '" data-wf-layer="'+esc(id)+'" data-wf-instrument="'+esc(ins.instrument)+'">'+
          '<span class="flow-state '+esc(x.status||'FAILED')+'">'+esc(x.status||'FAILED')+'</span>'+
          '<small>'+esc(x.summary||'')+'</small></div>';
      }).join('')+
    '</div>';
  }).join('');
}
function openWorkflowDetail(layerId,instrument){
  if(!WORKFLOW) return;
  const detail=document.getElementById('wfDetail');
  let rows=[];
  if(instrument){
    const ins=WORKFLOW.instruments.find(x=>x.instrument===instrument);
    if(ins&&ins.layers[layerId]) rows=[{instrument,layer:ins.layers[layerId]}];
  }else{
    rows=WORKFLOW.instruments.map(ins=>({instrument:ins.instrument,layer:ins.layers[layerId]})).filter(x=>x.layer);
  }
  detail.innerHTML=
    '<div class="workflow-detail-head"><div><div class="eyebrow">'+esc(WF_LABELS[layerId]||layerId)+
    '</div><h3 style="margin:5px 0 0">'+esc(instrument||'All instruments')+
    '</h3></div><button class="workflow-close" id="wfClose">Close</button></div>'+
    '<div class="workflow-detail-grid">'+rows.map(r=>{
      const details=r.layer.details||{};
      const items=Object.entries(details).map(([k,v])=>
        '<div><strong>'+esc(k.replace(/_/g,' '))+'</strong>: '+esc(wfSafe(v))+'</div>'
      ).join('');
      return '<div class="workflow-detail-box"><div><strong>'+esc(r.instrument)+' · '+esc(r.layer.status)+'</strong></div>'+
        '<div style="margin-top:5px">'+esc(r.layer.summary||'')+'</div>'+
        '<div style="margin-top:8px">'+items+'</div>'+
        '<div style="margin-top:8px">Updated: '+esc(wfTime(r.layer.updated_at_utc))+'</div></div>';
    }).join('')+'</div>';
  detail.classList.add('open');
  document.getElementById('wfClose').onclick=()=>detail.classList.remove('open');
}
document.getElementById('wfNodes').addEventListener('click',e=>{
  const node=e.target.closest('[data-wf-layer]');
  if(node) openWorkflowDetail(node.dataset.wfLayer,null);
});
document.getElementById('wfLanes').addEventListener('click',e=>{
  const cell=e.target.closest('[data-wf-layer]');
  if(cell) openWorkflowDetail(cell.dataset.wfLayer,cell.dataset.wfInstrument);
});

function buildReportText(){
  const lines=['GOLD / BTCUSD Executive Intelligence','Generated: '+SNAPSHOT.generated_at_utc,''];
  for(const x of SNAPSHOT.instruments){
    lines.push(`${x.instrument}: FINAL ${x.final_action}`);
    lines.push(`Regime: ${x.regime.label} | Decision: ${x.decision.action} | Candidate: ${x.decision.selected_candidate_id||'—'}`);
    lines.push(`Risk allowed: ${x.risk_control.allowed} | Reasons: ${(x.risk_control.reasons||[]).join(', ')||'none'}`);
    lines.push('');
  }
  lines.push('Execution Layer: DISABLED');
  lines.push('TradeIntent: DISABLED');
  return lines.join('\n');
}
function buildReportHtml(){
  return SNAPSHOT.instruments.map(x=>`
    <h3>${esc(x.instrument)} — Final ${esc(x.final_action)}</h3>
    <ul>
      <li>Regime: <b>${esc(x.regime.label)}</b> (confidence ${fmt(x.regime.confidence,3)})</li>
      <li>Decision hypothesis: <b>${esc(x.decision.action)}</b> via <code>${esc(x.decision.selected_candidate_id||'—')}</code></li>
      <li>Decision reason: ${esc(x.decision.reason)}</li>
      <li>Risk approval: <b>${x.risk_control.allowed?'ALLOWED':'BLOCKED'}</b></li>
      <li>Risk reasons: ${esc((x.risk_control.reasons||[]).join(', ')||'none')}</li>
      <li>Proposed volume: ${x.proposed_volume??'—'}</li>
    </ul>`).join('')+`<h3>Governance</h3><p>Execution และ TradeIntent ถูกปิดไว้ หน้านี้จบที่ Analysis / Control / Report เท่านั้น</p>`;
}
document.getElementById('refreshBtn').onclick=()=>loadSnapshot().catch(showError);
document.getElementById('autoBtn').onclick=e=>{
  if(timer){clearInterval(timer);timer=null;e.target.textContent='Auto Refresh: Off';}
  else{timer=setInterval(()=>loadSnapshot().catch(()=>{}),60000);e.target.textContent='Auto Refresh: 60s';}
};
document.getElementById('downloadBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(SNAPSHOT,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='executive_snapshot.json';a.click();URL.revokeObjectURL(a.href);
};
document.getElementById('copyBtn').onclick=async()=>{
  await navigator.clipboard.writeText(buildReportText());
  document.getElementById('copyBtn').textContent='Copied ✓';
  setTimeout(()=>document.getElementById('copyBtn').textContent='Copy Executive Summary',1500);
};
function showError(err){
  document.getElementById('reportText').innerHTML='<b>Unable to load executive snapshot:</b> '+esc(err.message);
}
loadSnapshot().catch(showError);
