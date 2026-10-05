let SNAPSHOT=null, WORKFLOW=null, timer=null;

const byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=(v,d=3)=>v===null||v===undefined||Number.isNaN(Number(v))?'—':Number(v).toFixed(d);
const badge=(text,kind='good')=>`<span class="pill ${kind}">${esc(text)}</span>`;
const safeSet=(id,html)=>{const el=byId(id); if(el) el.innerHTML=html;};
const safeText=(id,text)=>{const el=byId(id); if(el) el.textContent=text;};

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
  try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(s));}
  catch{return String(s)}
}
function wfSafe(v){
  if(v===null||v===undefined) return '—';
  if(Array.isArray(v)) return v.length?v.join(', '):'none';
  if(typeof v==='object') return JSON.stringify(v);
  return String(v);
}

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
  renderAll();
}

function renderAll(){
  renderHeader();
  renderWorkflow();
  renderAgentSquad();
  renderMarkets();
  renderTrace();
  renderReport();
}

function renderHeader(){
  const s=SNAPSHOT;
  safeText('mode',s.system.mode);
  safeSet('execution',s.system.execution_enabled?badge('ENABLED','warn'):badge('DISABLED','off'));
  safeText('generated',s.generated_at_utc);
  safeSet('systemHealth',badge('HEALTHY / READ-ONLY'));
}

function renderWorkflow(){
  const w=WORKFLOW;
  if(!w) return;
  safeSet('wfOverall','<span class="flow-state '+esc(w.overall_status)+'">'+esc(w.overall_status)+'</span>');
  safeText('wfUpdated',wfTime(w.generated_at_utc));

  safeSet('wfNodes',WF_IDS.map((id,i)=>{
    const x=w.layers[id]||{}, states=x.instrument_states||{};
    return '<article class="workflow-node" data-wf-layer="'+esc(id)+'">'+
      '<div class="node-no">LAYER 0'+(i+1)+'</div>'+
      '<h4>'+esc(WF_LABELS[id]||id)+'</h4>'+
      '<span class="flow-state '+esc(x.status||'FAILED')+'">'+esc(x.status||'FAILED')+'</span>'+
      '<div class="node-mini">BTC '+esc(states.BTCUSD||'—')+' · GOLD '+esc(states.XAUUSD||'—')+
      '<br>'+esc(wfTime(x.updated_at_utc))+'</div>'+
    '</article>';
  }).join(''));

  safeSet('wfLanes',w.instruments.map(ins=>
    '<div class="workflow-lane"><div class="workflow-lane-name">'+esc(ins.instrument)+'</div>'+
    WF_IDS.map(id=>{
      const x=ins.layers[id]||{};
      return '<div class="workflow-cell '+esc(x.status||'FAILED')+'" data-wf-layer="'+esc(id)+'" data-wf-instrument="'+esc(ins.instrument)+'">'+
        '<span class="flow-state '+esc(x.status||'FAILED')+'">'+esc(x.status||'FAILED')+'</span>'+
        '<small>'+esc(x.summary||'')+'</small></div>';
    }).join('')+'</div>'
  ).join(''));
}

const AGENT_META=[
  {id:'orchestrator',cls:'orchestrator',icon:'⌘',title:'Agent Orchestrator',role:'Command & Coordination',power:'จัดคิวงาน ประสานผลจาก Agent ทั้ง 4 และรักษา boundary ระหว่าง analysis กับ decision control'},
  {id:'search',cls:'search',icon:'⌕',title:'Agent 1 · Search Engine',role:'Scenario Hunter',power:'ค้นหา candidate BUY / SELL / WAIT หลายเส้นทางจาก regime และ multi-timeframe state'},
  {id:'evaluator',cls:'evaluator',icon:'◈',title:'Agent 2 · NNUE-style Evaluator',role:'Fast State Scoring',power:'ให้ EV, Confidence, Risk และ State Fit อย่างรวดเร็วบน structured feature vector'},
  {id:'heuristics',cls:'heuristics',icon:'⧨',title:'Agent 3 · Heuristics Filter',role:'Rule Guardian',power:'ใช้ hard gate และ soft penalty คัด candidate ที่ไม่เหมาะออกแบบ fail-closed'},
  {id:'endgame',cls:'endgame',icon:'♜',title:'Agent 4 · Endgame Control',role:'Exit Defense',power:'วาง stop / target / trailing / partial exit / emergency exit และ expiry ของแต่ละ candidate'}
];

function getAgentVersion(x,id){
  const ac=x.agent_core||{};
  if(id==='orchestrator') return ac.orchestrator_version||'agent-core-v1';
  const v=ac.agent_versions||{};
  return id==='search'?v.search:id==='evaluator'?v.evaluator:id==='heuristics'?v.heuristics:id==='endgame'?v.endgame:'—';
}
function bestEvaluated(x){
  const rows=x.agent_core?.evaluated_candidates||[];
  if(!rows.length) return null;
  return [...rows].sort((a,b)=>(Number(b.ev_score)||0)-(Number(a.ev_score)||0))[0];
}
function liveAgentText(x,id){
  const ac=x.agent_core||{};
  if(id==='orchestrator') return (ac.candidate_count??0)+' candidates → '+(ac.accepted_ids?.length??0)+' eligible';
  if(id==='search') return (ac.candidate_count??0)+' scenarios';
  if(id==='evaluator'){const b=bestEvaluated(x); return b?b.candidate_id+' · EV '+fmt(b.ev_score):'No evaluation';}
  if(id==='heuristics') return (ac.accepted_ids?.length??0)+' pass / '+(ac.rejected_ids?.length??0)+' reject';
  if(id==='endgame') return (ac.endgame_plan_count??0)+' terminal plans';
  return '—';
}
function renderAgentSquad(){
  if(!SNAPSHOT) return;
  safeSet('agentSquad',AGENT_META.map(meta=>{
    const version=getAgentVersion(SNAPSHOT.instruments[0]||{},meta.id);
    return '<article class="agent-card '+meta.cls+'" data-agent-id="'+meta.id+'">'+
      '<div class="agent-icon">'+meta.icon+'</div>'+
      '<div class="agent-role">'+esc(meta.role)+'</div>'+
      '<h4>'+esc(meta.title)+'</h4>'+
      '<div class="agent-power">'+esc(meta.power)+'</div>'+
      '<span class="agent-version">'+esc(version||'—')+'</span>'+
      '<div class="agent-live">'+SNAPSHOT.instruments.map(x=>'<div class="agent-live-row"><span>'+esc(x.instrument)+'</span><b>'+esc(liveAgentText(x,meta.id))+'</b></div>').join('')+'</div>'+
      '<div class="agent-deep-link">Deep Dive →</div></article>';
  }).join(''));
}
function candidateListHtml(rows,mode){
  if(!rows?.length) return '<div class="agent-callout">No data in current snapshot</div>';
  if(mode==='search') return '<ul class="agent-detail-list">'+rows.map(r=>'<li><b>'+esc(r.candidate_id)+'</b> · '+esc(r.action)+' · '+esc(r.strategy_family)+'<br>'+esc((r.rationale||[]).join(' · '))+' · entry '+fmt(r.entry_bias_atr,2)+' ATR · SL '+fmt(r.stop_distance_atr,2)+' · TP '+fmt(r.target_distance_atr,2)+'</li>').join('')+'</ul>';
  if(mode==='eval') return '<ul class="agent-detail-list">'+rows.map(r=>'<li><b>'+esc(r.candidate_id)+'</b> · EV '+fmt(r.ev_score)+' · Conf '+fmt(r.confidence)+' · Risk '+fmt(r.risk_score)+' · Fit '+fmt(r.state_fit)+'<br>'+esc((r.notes||[]).join(' · '))+'</li>').join('')+'</ul>';
  if(mode==='heur') return '<ul class="agent-detail-list">'+rows.map(r=>'<li><b>'+esc(r.candidate_id)+'</b> · '+(r.accepted?'PASS':'REJECT')+' · score '+fmt(r.adjusted_score)+(r.hard_reasons?.length?'<br>Hard: '+esc(r.hard_reasons.join(', ')):'')+(r.soft_penalties?.length?'<br>Penalty: '+esc(r.soft_penalties.join(', ')):'')+'</li>').join('')+'</ul>';
  if(mode==='end') return '<ul class="agent-detail-list">'+rows.map(r=>'<li><b>'+esc(r.candidate_id)+'</b> · '+esc(r.mode)+' · SL '+fmt(r.stop_atr,2)+' ATR · TP '+fmt(r.target_atr,2)+' ATR'+(r.trail_activation_r!=null?' · Trail '+fmt(r.trail_activation_r,2)+'R':'')+(r.partial_exit_r!=null?' · Partial '+fmt(r.partial_exit_r,2)+'R':'')+' · Expiry '+esc(r.expiry_bars??'—')+' bars<br>Emergency: '+esc((r.emergency_conditions||[]).join(', '))+'</li>').join('')+'</ul>';
  return '';
}
function openAgentDeepDive(id){
  if(!SNAPSHOT) return;
  const meta=AGENT_META.find(x=>x.id===id), box=byId('agentDeepDive');
  if(!meta||!box) return;
  const markets=SNAPSHOT.instruments.map(x=>{
    const ac=x.agent_core||{}; let inner='';
    if(id==='orchestrator'){
      inner='<div class="metric-grid"><div class="metric"><span>Candidates</span><b>'+esc(ac.candidate_count??0)+'</b></div><div class="metric"><span>Eligible</span><b>'+esc(ac.accepted_ids?.length??0)+'</b></div><div class="metric"><span>Rejected</span><b>'+esc(ac.rejected_ids?.length??0)+'</b></div></div><div class="agent-callout"><b>Flow:</b> Search → Evaluate → Filter → Endgame<br><b>Decision boundary:</b> Layer 4 handles final selection; Orchestrator itself does not send orders.</div>';
    }else if(id==='search'){
      inner='<div class="metric-grid"><div class="metric"><span>Scenarios</span><b>'+esc(ac.candidate_count??0)+'</b></div><div class="metric"><span>Regime</span><b>'+esc(x.regime?.label||'—')+'</b></div><div class="metric"><span>Version</span><b>'+esc(getAgentVersion(x,id))+'</b></div></div>'+candidateListHtml(ac.search_candidates,'search');
    }else if(id==='evaluator'){
      const best=bestEvaluated(x);
      inner='<div class="metric-grid"><div class="metric"><span>Top EV</span><b>'+fmt(best?.ev_score)+'</b></div><div class="metric"><span>Top Confidence</span><b>'+fmt(best?.confidence)+'</b></div><div class="metric"><span>Top State Fit</span><b>'+fmt(best?.state_fit)+'</b></div></div>'+candidateListHtml(ac.evaluated_candidates,'eval')+'<div class="agent-callout">Evaluator นี้เป็น <b>NNUE-style fixed-weight v1</b> — contract พร้อมสำหรับ trained model ในอนาคต แต่ยังไม่อ้างว่าเป็น neural network ที่ train แล้ว</div>';
    }else if(id==='heuristics'){
      inner='<div class="metric-grid"><div class="metric"><span>Passed</span><b>'+esc(ac.accepted_ids?.length??0)+'</b></div><div class="metric"><span>Rejected</span><b>'+esc(ac.rejected_ids?.length??0)+'</b></div><div class="metric"><span>Version</span><b>'+esc(getAgentVersion(x,id))+'</b></div></div>'+candidateListHtml(ac.top_candidates,'heur');
    }else if(id==='endgame'){
      inner='<div class="metric-grid"><div class="metric"><span>Plans</span><b>'+esc(ac.endgame_plan_count??0)+'</b></div><div class="metric"><span>Final Action</span><b>'+esc(x.final_action||'—')+'</b></div><div class="metric"><span>Version</span><b>'+esc(getAgentVersion(x,id))+'</b></div></div>'+candidateListHtml(ac.endgame_plans,'end');
    }
    return '<div class="agent-market-box"><h4>'+esc(x.instrument)+'</h4>'+inner+'</div>';
  }).join('');
  box.innerHTML='<div class="agent-deep-head"><div><div class="eyebrow">'+esc(meta.role)+'</div><h3>'+esc(meta.title)+'</h3><p class="muted">'+esc(meta.power)+'</p></div><button class="agent-close" id="agentClose">Close</button></div><div class="agent-deep-grid">'+markets+'</div>';
  box.classList.add('open');
  const close=byId('agentClose'); if(close) close.onclick=()=>box.classList.remove('open');
}

function renderMarkets(){
  const cards=SNAPSHOT.instruments.map(x=>{
    const r=x.regime||{}, a=x.aggregate||{}, d=x.decision||{}, rc=x.risk_control||{};
    const q=x.source_quality==='GOOD'?'good':'warn';
    const hypothesis=d.action||'WAIT';
    const final=x.final_action||'WAIT';
    const suggestClass=hypothesis==='BUY'?'BUY':hypothesis==='SELL'?'SELL':'WAIT';
    const finalClass=final==='BUY'?'BUY':final==='SELL'?'SELL':'WAIT';
    const riskReasons=(rc.reasons||[]).join(' · ')||'No veto reason';
    const top=(x.agent_core?.top_candidates||[])[0];
    return `
      <article class="market-card analysis-card">
        <div class="market-head">
          <div><h3>${esc(x.instrument)}</h3><div class="muted">${esc(x.signal?.authority||'—')}</div></div>
          ${badge(x.source_quality,q)}
        </div>

        <div class="suggest-grid">
          <div class="suggest-box">
            <span class="suggest-label">SYSTEM SUGGESTION</span>
            <strong class="big-action ${suggestClass}">${esc(hypothesis)}</strong>
            <small>${esc(d.strategy_family||'—')} · ${esc(d.selected_candidate_id||'—')}</small>
          </div>
          <div class="suggest-arrow">→</div>
          <div class="suggest-box final-box">
            <span class="suggest-label">FINAL GOVERNED ACTION</span>
            <strong class="big-action ${finalClass}">${esc(final)}</strong>
            <small>${rc.allowed?'Risk gate allowed':'Risk gate blocked / wait'}</small>
          </div>
        </div>

        <div class="stats">
          <div class="stat"><span>Regime</span><b>${esc(r.label)}</b></div>
          <div class="stat"><span>Regime Conf.</span><b>${fmt(r.confidence)}</b></div>
          <div class="stat"><span>Trend</span><b>${fmt(a.trend_score)}</b></div>
          <div class="stat"><span>Momentum</span><b>${fmt(a.momentum_score)}</b></div>
          <div class="stat"><span>Trend Strength</span><b>${fmt(a.trend_strength)}</b></div>
          <div class="stat"><span>Volatility</span><b>${fmt(a.volatility_score)}</b></div>
          <div class="stat"><span>News Risk</span><b>${esc(x.signal?.news_risk||'—')}</b></div>
          <div class="stat"><span>Decision Conf.</span><b>${fmt(d.confidence)}</b></div>
        </div>

        <div class="analysis-reason">
          <div><b>Decision rationale:</b> ${esc(d.reason||'—')}</div>
          <div><b>Risk/Veto:</b> ${esc(riskReasons)}</div>
          <div><b>Top candidate:</b> ${top?esc(top.candidate_id)+' · score '+fmt(top.adjusted_score)+' · conf '+fmt(top.confidence):'—'}</div>
        </div>
      </article>`;
  }).join('');
  safeSet('marketCards',cards);
}

function renderTrace(){
  const html=SNAPSHOT.instruments.map(x=>`
    <article class="panel">
      <div class="market-head"><h3>${esc(x.instrument)}</h3><span class="muted">${x.agent_core?.candidate_count??0} candidates</span></div>
      ${(x.agent_core?.top_candidates||[]).map(c=>`
        <div class="candidate">
          <div><div class="name">${esc(c.candidate_id)}</div><small>${esc(c.action)} · ${esc(c.family)}</small></div>
          <div><small>Score</small><br><b>${fmt(c.adjusted_score)}</b></div>
          <div><small>Conf.</small><br><b>${fmt(c.confidence)}</b></div>
          <div>${badge(c.accepted?'ELIGIBLE':'REJECT',c.accepted?'good':'off')}</div>
        </div>
        <div class="candidate-reason">
          ${c.hard_reasons?.length?'<b>Hard:</b> '+esc(c.hard_reasons.join(', '))+' ':''}
          ${c.soft_penalties?.length?'<b>Penalty:</b> '+esc(c.soft_penalties.join(', ')):''}
        </div>`).join('')}
    </article>`).join('');
  safeSet('trace',html);
}

function renderReport(){
  safeSet('reportText',buildReportHtml());
}

function openWorkflowDetail(layerId,instrument){
  if(!WORKFLOW) return;
  const detail=byId('wfDetail'); if(!detail) return;
  let rows=[];
  if(instrument){
    const ins=WORKFLOW.instruments.find(x=>x.instrument===instrument);
    if(ins&&ins.layers[layerId]) rows=[{instrument,layer:ins.layers[layerId]}];
  }else{
    rows=WORKFLOW.instruments.map(ins=>({instrument:ins.instrument,layer:ins.layers[layerId]})).filter(x=>x.layer);
  }
  detail.innerHTML=
    '<div class="workflow-detail-head"><div><div class="eyebrow">'+esc(WF_LABELS[layerId]||layerId)+'</div>'+
    '<h3 style="margin:5px 0 0">'+esc(instrument||'All instruments')+'</h3></div>'+
    '<button class="workflow-close" id="wfClose">Close</button></div>'+
    '<div class="workflow-detail-grid">'+rows.map(r=>{
      const details=r.layer.details||{};
      const items=Object.entries(details).map(([k,v])=>'<div><strong>'+esc(k.replace(/_/g,' '))+'</strong>: '+esc(wfSafe(v))+'</div>').join('');
      return '<div class="workflow-detail-box"><div><strong>'+esc(r.instrument)+' · '+esc(r.layer.status)+'</strong></div>'+
        '<div style="margin-top:5px">'+esc(r.layer.summary||'')+'</div><div style="margin-top:8px">'+items+'</div>'+
        '<div style="margin-top:8px">Updated: '+esc(wfTime(r.layer.updated_at_utc))+'</div></div>';
    }).join('')+'</div>';
  detail.classList.add('open');
  const close=byId('wfClose'); if(close) close.onclick=()=>detail.classList.remove('open');
}

function buildReportText(){
  if(!SNAPSHOT) return '';
  const lines=['GOLD / BTCUSD Executive Intelligence','Generated: '+SNAPSHOT.generated_at_utc,''];
  for(const x of SNAPSHOT.instruments){
    lines.push(`${x.instrument}: Suggest ${x.decision.action} -> FINAL ${x.final_action}`);
    lines.push(`Regime: ${x.regime.label} | Candidate: ${x.decision.selected_candidate_id||'—'} | Confidence: ${fmt(x.decision.confidence)}`);
    lines.push(`Risk allowed: ${x.risk_control.allowed} | Reasons: ${(x.risk_control.reasons||[]).join(', ')||'none'}`);
    lines.push('');
  }
  lines.push('Execution Layer: DISABLED','TradeIntent: DISABLED');
  return lines.join('\n');
}

function buildReportHtml(){
  if(!SNAPSHOT) return 'Loading…';
  return SNAPSHOT.instruments.map(x=>`
    <div class="exec-report-block">
      <h3>${esc(x.instrument)} — Suggest ${esc(x.decision.action)} → Final ${esc(x.final_action)}</h3>
      <div class="report-grid">
        <div><span>Regime</span><b>${esc(x.regime.label)}</b></div>
        <div><span>Selected Candidate</span><b>${esc(x.decision.selected_candidate_id||'—')}</b></div>
        <div><span>Decision Score</span><b>${fmt(x.decision.adjusted_score)}</b></div>
        <div><span>Confidence</span><b>${fmt(x.decision.confidence)}</b></div>
        <div><span>Risk Score</span><b>${fmt(x.decision.risk_score)}</b></div>
        <div><span>Score Gap</span><b>${fmt(x.decision.score_gap)}</b></div>
      </div>
      <p><b>Decision:</b> ${esc(x.decision.reason)}<br>
      <b>Risk/Veto:</b> ${esc((x.risk_control.reasons||[]).join(', ')||'none')}<br>
      <b>Position size:</b> ${x.proposed_volume??'—'}</p>
    </div>`).join('')+
    '<div class="governance-note"><b>Governance:</b> Execution และ TradeIntent ถูกปิดไว้ หน้านี้จบที่ Analysis / Control / Report เท่านั้น</div>';
}

const agentSquad=byId('agentSquad'); if(agentSquad) agentSquad.addEventListener('click',e=>{const card=e.target.closest('[data-agent-id]');if(card)openAgentDeepDive(card.dataset.agentId);});

const wfNodes=byId('wfNodes'); if(wfNodes) wfNodes.addEventListener('click',e=>{const n=e.target.closest('[data-wf-layer]');if(n)openWorkflowDetail(n.dataset.wfLayer,null);});
const wfLanes=byId('wfLanes'); if(wfLanes) wfLanes.addEventListener('click',e=>{const n=e.target.closest('[data-wf-layer]');if(n)openWorkflowDetail(n.dataset.wfLayer,n.dataset.wfInstrument);});

const refreshBtn=byId('refreshBtn'); if(refreshBtn) refreshBtn.onclick=()=>loadSnapshot().catch(showError);
const autoBtn=byId('autoBtn'); if(autoBtn) autoBtn.onclick=e=>{
  if(timer){clearInterval(timer);timer=null;e.target.textContent='Auto Refresh: Off';}
  else{timer=setInterval(()=>loadSnapshot().catch(()=>{}),60000);e.target.textContent='Auto Refresh: 60s';}
};
const downloadBtn=byId('downloadBtn'); if(downloadBtn) downloadBtn.onclick=()=>{
  const blob=new Blob([JSON.stringify(SNAPSHOT,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='executive_snapshot.json';a.click();URL.revokeObjectURL(a.href);
};
const copyBtn=byId('copyBtn'); if(copyBtn) copyBtn.onclick=async()=>{
  await navigator.clipboard.writeText(buildReportText());
  copyBtn.textContent='Copied ✓'; setTimeout(()=>copyBtn.textContent='Copy Executive Summary',1500);
};

function showError(err){
  safeSet('reportText','<b>Unable to load executive snapshot:</b> '+esc(err.message));
  console.error(err);
}
loadSnapshot().catch(showError);
