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
