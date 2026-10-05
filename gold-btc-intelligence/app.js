let SNAPSHOT=null, timer=null;
const fmt=(v,d=3)=>v===null||v===undefined?'—':Number(v).toFixed(d);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const badge=(text,kind='good')=>`<span class="pill ${kind}">${esc(text)}</span>`;

async function loadSnapshot(){
  const res=await fetch('data/executive_snapshot.json?ts='+Date.now(),{cache:'no-store'});
  if(!res.ok) throw new Error('snapshot HTTP '+res.status);
  SNAPSHOT=await res.json();
  render();
}
function render(){
  const s=SNAPSHOT;
  document.getElementById('mode').textContent=s.system.mode;
  document.getElementById('execution').innerHTML=s.system.execution_enabled?badge('ENABLED','warn'):badge('DISABLED','off');
  document.getElementById('generated').textContent=s.generated_at_utc;
  document.getElementById('systemHealth').innerHTML=badge('HEALTHY / READ-ONLY');

  const names={
    data_input:'Data Input',
    preprocess_feature:'Preprocess & Feature',
    multi_agent_core:'Multi-Agent Core',
    decision_risk_control:'Decision & Risk Control',
    executive_output:'Executive Output'
  };
  document.getElementById('layers').innerHTML=Object.entries(s.system.layers).map(([k,v],i)=>`
    <article class="layer">
      <div class="num">LAYER 0${i+1}</div>
      <h3>${esc(names[k]||k)}</h3>
      ${badge(v,v==='COMPLETE'?'good':'warn')}
    </article>`).join('');

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
