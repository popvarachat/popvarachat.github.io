let SNAPSHOT=null, WORKFLOW=null, INSTITUTIONAL=null, SETEQ=null, FOREX=null, timer=null;

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
  jev_shadow:'JEV Shadow',
  decision_risk_control:'Decision & Risk',
  executive_output:'Executive Output'
};
const WF_IDS=['data_input','preprocess_feature','multi_agent_core','jev_shadow','decision_risk_control','executive_output'];

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
  const [snapshotRes,workflowRes,institutionalRes,setEqRes,forexRes]=await Promise.all([
    fetch('data/executive_snapshot.json?ts='+ts,{cache:'no-store'}),
    fetch('data/workflow_status.json?ts='+ts,{cache:'no-store'}),
    fetch('data/institutional_analytics.json?ts='+ts,{cache:'no-store'}),
    fetch('data/set_equity_intelligence.json?ts='+ts,{cache:'no-store'}),
    fetch('data/forex_major_intelligence.json?ts='+ts,{cache:'no-store'})
  ]);
  if(!snapshotRes.ok) throw new Error('snapshot HTTP '+snapshotRes.status);
  if(!workflowRes.ok) throw new Error('workflow HTTP '+workflowRes.status);
  if(!institutionalRes.ok) throw new Error('institutional HTTP '+institutionalRes.status);
  if(!setEqRes.ok) throw new Error('SET equity HTTP '+setEqRes.status);
  if(!forexRes.ok) throw new Error('FOREX HTTP '+forexRes.status);
  SNAPSHOT=await snapshotRes.json();
  WORKFLOW=await workflowRes.json();
  INSTITUTIONAL=await institutionalRes.json();
  SETEQ=await setEqRes.json();
  FOREX=await forexRes.json();
  renderAll();
}

function renderAll(){
  renderHeader();
  renderCioStrip();
  renderWorkflow();
  renderAgentSquad();
  renderJevReview();
  renderSetEquity();
  renderForexMajor();
  renderInstitutional();
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

function pct(v,d=1){
  if(v===null||v===undefined||Number.isNaN(Number(v))) return '—';
  return (Number(v)*100).toFixed(d)+'%';
}
function renderCioStrip(){
  if(!INSTITUTIONAL) return;
  safeText('cioState',INSTITUTIONAL.capital_allocation?.state||'—');
  safeText('cioGoldEdge',INSTITUTIONAL.proof_of_edge?.gold_primary?.status==='EVIDENCED_RESEARCH_ONLY'?'EVIDENCED · RESEARCH':'—');
  safeText('cioBtcEdge',INSTITUTIONAL.proof_of_edge?.btc?.status==='NOT_YET_EVIDENCED'?'NOT YET EVIDENCED':'EVIDENCED');
  safeText('cioHeat',fmt(INSTITUTIONAL.portfolio_risk?.current_heat_r,2)+'R');
  safeText('cioCorr',fmt(INSTITUTIONAL.portfolio_risk?.correlation?.btc_gold_corr_30d,2));
  safeText('cioMacro',INSTITUTIONAL.macro_regime?.regime||'UNKNOWN');
}
function instStatusClass(status){
  if(['EVIDENCED_RESEARCH_ONLY','LIVE_PUBLIC_CONTEXT','LIVE_PUBLIC_SERIES'].includes(status)) return 'good';
  if(['NOT_YET_EVIDENCED','PARTIAL','DEGRADED'].includes(status)) return 'warn';
  return '';
}

function setStageClass(stage){
  if(stage==='ACCUMULATE_WATCH') return 'good';
  if(stage==='HOLD_QUALITY') return 'neutral';
  if(stage==='AVOID_CHASE') return 'warn';
  return 'neutral';
}
function cdcBadge(cdc){
  const map={RED:'🔴',BLUE:'🔵',GREEN:'🟢'};
  return (map[cdc]||'⚪')+' '+esc(cdc||'—');
}
function renderSetEquity(){
  if(!SETEQ) return;
  const rows=SETEQ.stocks||[], top=rows.slice(0,5);
  safeSet('setEquitySummary',
    '<div class="set-summary-card"><span>Universe</span><b>'+rows.length+' SET stocks</b><small>separate research group</small></div>'+
    '<div class="set-summary-card"><span>Top Opportunity</span><b>'+esc(top[0]?.symbol||'—')+' · '+fmt(top[0]?.opportunity_score,1)+'</b><small>quality + dislocation + yield + resilience</small></div>'+
    '<div class="set-summary-card"><span>JEV Shadow</span><b>'+esc(SETEQ.jev?.model||'—')+'</b><small>research-only · no execution authority</small></div>'+
    '<div class="set-summary-card"><span>Top 5</span><b>'+top.map(x=>esc(x.symbol)).join(' · ')+'</b><small>ranked by transparent opportunity score</small></div>'
  );
  safeSet('setEquityTable',rows.map((x,i)=>{
    const j=x.jev_shadow||{},stage=j.stage?.selected||'—',thesis=j.thesis?.selected||'—',risk=j.risk?.selected||'—';
    return '<tr>'+
      '<td class="rank-cell">#'+(i+1)+'</td>'+
      '<td><b>'+esc(x.symbol)+'</b><small>'+esc(x.grade)+'</small></td>'+
      '<td><b>'+fmt(x.opportunity_score,1)+'</b><small>'+esc(stage.replaceAll('_',' '))+'</small></td>'+
      '<td>'+esc(x.financials_3y)+'</td>'+
      '<td><b>'+fmt(x.drawdown_3m_pct,1)+'%</b></td>'+
      '<td>'+fmt(x.dividend_fy_pct,2)+'%</td>'+
      '<td>'+cdcBadge(x.cdc)+'</td>'+
      '<td>'+fmt(x.corr_set,3)+'</td>'+
      '<td>'+fmt(x.corr_industry,3)+'</td>'+
      '<td><span class="set-stage '+setStageClass(stage)+'">'+esc(stage)+'</span><small>Thesis '+esc(thesis)+' · Risk '+esc(risk)+'</small></td>'+
      '<td class="pressure-cell">'+esc(x.pressure)+'<small>'+esc(x.resilience)+'</small></td>'+
    '</tr>';
  }).join(''));
}


function forexStageClass(stage){
  if(stage==='TREND_WATCH') return 'good';
  if(stage==='MEAN_REVERSION_WATCH') return 'neutral';
  if(stage==='WAIT') return 'warn';
  if(stage==='AVOID') return 'bad';
  return 'neutral';
}
function thesisArrow(thesis){
  if(thesis==='BULLISH') return '↑';
  if(thesis==='BEARISH') return '↓';
  return '↔';
}
function sourceState(x,name){
  const s=(x.source_health||[]).find(v=>v.source===name);
  if(!s) return '—';
  return s.status || (s.ok?'GOOD':'FAILED');
}
function sourceClass(v){
  return v==='GOOD'?'good':v==='STALE'?'stale':v==='FAILED'?'bad':'neutral';
}
function renderForexMajor(){
  if(!FOREX) return;
  const rows=FOREX.pairs||[];
  const trend=rows.filter(x=>x.jev_shadow?.stage?.selected==='TREND_WATCH');
  const waits=rows.filter(x=>x.jev_shadow?.stage?.selected==='WAIT');
  const mt5=FOREX.mt5_health||{}, mt5exp=FOREX.mt5_export_health||{}, cot=FOREX.cot_health||{};
  const mt5State=mt5.status || (mt5.ok?'GOOD':'FAILED');
  const mt5Age=mt5.server_age_seconds==null?'—':fmt(mt5.server_age_seconds/86400,1)+'d';
  safeSet('forexSummary',
    '<div class="fx-summary-card"><span>MT5 Live Broker</span><b>'+esc(mt5State)+'</b><small>'+esc(mt5.server_connected?'server connected · read-only broker feed active':'server disconnected · last broker time age '+mt5Age)+'</small></div>'+
    '<div class="fx-summary-card"><span>MT5 Broker Export</span><b>'+esc(mt5exp.status||'—')+' · '+esc(mt5exp.count??'—')+'/7</b><small>historical broker evidence · freshness shown per pair</small></div>'+
    '<div class="fx-summary-card"><span>Macro</span><b>'+esc(FOREX.macro_health||'—')+'</b><small>DXY · US10Y · VIX · SPY</small></div>'+
    '<div class="fx-summary-card"><span>CFTC COT</span><b>'+esc(cot.status||'—')+' · '+esc(cot.count??'—')+'/7</b><small>TFF Futures Only · positioning</small></div>'+
    '<div class="fx-summary-card"><span>JEV Shadow</span><b>'+esc(FOREX.jev?.model||'—')+'</b><small>'+trend.length+' TREND_WATCH · '+waits.length+' WAIT</small></div>'
  );
  safeSet('forexTable',rows.map(x=>{
    const j=x.jev_shadow||{},stage=j.stage?.selected||'—',thesis=j.thesis?.selected||'—',risk=j.risk?.selected||'—';
    const pub=x.public_reference||{}, cot=x.cot||{}, broker=x.broker||{}, bh=x.broker_historical||{};
    const spread=broker.quote?.spread;
    return '<tr>'+
      '<td><b>'+esc(x.pair)+'</b><small>'+esc(x.quality||'—')+' · '+esc(x.authority||'—')+'</small></td>'+
      '<td><b>'+fmt(x.current_reference,5)+'</b><small>'+esc(broker.broker_symbol||pub.source_symbol||'—')+'</small></td>'+
      '<td><span class="src-chip '+sourceClass(sourceState(x,'MT5'))+'">Live '+sourceState(x,'MT5')+'</span><small>'+esc(x.source_health?.find(v=>v.source==='MT5')?.detail||'')+(spread==null?'':' · Spread '+fmt(spread,6))+'</small></td>'+
      '<td><span class="src-chip '+sourceClass(sourceState(x,'MT5_BROKER_EXPORT'))+'">Export '+sourceState(x,'MT5_BROKER_EXPORT')+'</span><small>Age '+(bh.age_days==null?'—':fmt(bh.age_days,1)+'d')+' · med spread '+(bh.spread_points_median==null?'—':fmt(bh.spread_points_median,1)+' pt')+'</small></td>'+
      '<td><span class="src-chip '+sourceClass(sourceState(x,'YAHOO_DAILY'))+'">Public '+sourceState(x,'YAHOO_DAILY')+'</span></td>'+
      '<td><span class="src-chip '+sourceClass(sourceState(x,'MACRO_CONTEXT'))+'">Macro '+sourceState(x,'MACRO_CONTEXT')+'</span></td>'+
      '<td><span class="src-chip '+sourceClass(sourceState(x,'CFTC_TFF'))+'">COT '+sourceState(x,'CFTC_TFF')+'</span><small>'+esc(cot.pair_bias||'—')+'</small></td>'+
      '<td>'+pct(pub.return_1d,2)+'</td>'+
      '<td>'+pct(pub.return_5d,2)+'</td>'+
      '<td>'+pct(pub.return_1m,2)+'</td>'+
      '<td>'+pct(pub.return_3m,2)+'</td>'+
      '<td>'+pct(pub.volatility_20d_ann,1)+'</td>'+
      '<td><b>'+esc(x.regime||'—')+'</b><small>strength '+fmt(x.trend_strength,2)+'</small></td>'+
      '<td><span class="fx-thesis '+(thesis==='BULLISH'?'up':thesis==='BEARISH'?'down':'flat')+'">'+thesisArrow(thesis)+' '+esc(thesis)+'</span></td>'+
      '<td><span class="fx-stage '+forexStageClass(stage)+'">'+esc(stage)+'</span><small>Risk '+esc(risk)+'</small></td>'+
    '</tr>';
  }).join(''));
}

function renderInstitutional(){
  if(!INSTITUTIONAL) return;
  const i=INSTITUTIONAL, gold=i.proof_of_edge?.gold_primary||{}, oos=i.proof_of_edge?.gold_oos_separate_family||{}, stress=i.proof_of_edge?.gold_stress||{};
  const corr=i.portfolio_risk?.correlation||{}, macro=i.macro_regime||{}, btc=(i.instruments||[]).find(x=>x.instrument==='BTCUSD')||{}, xau=(i.instruments||[]).find(x=>x.instrument==='XAUUSD')||{};
  const btcTrig=btc.entry_trigger||{}, goldTrig=xau.entry_trigger||{}, btcAlign=btc.agent_alignment||{}, goldAlign=xau.agent_alignment||{};
  safeSet('institutionalDeck',
    '<article class="inst-card wide"><div class="inst-head"><div><div class="inst-kicker">Proof of Edge</div><h3>GOLD Research Evidence</h3></div><span class="inst-status '+instStatusClass(gold.status)+'">'+esc(gold.status||'—')+'</span></div>'+
      '<div class="inst-big">PF '+fmt(gold.real_tick_pf,3)+'</div><div class="inst-sub">'+esc(gold.candidate||'—')+'</div>'+
      '<div class="inst-metrics"><div class="inst-metric"><span>Real-tick DD</span><b>'+fmt(gold.real_tick_dd_pct,2)+'%</b></div><div class="inst-metric"><span>Trades</span><b>'+esc(gold.real_tick_trades??'—')+'</b></div><div class="inst-metric"><span>EV / trade</span><b>$'+fmt(gold.real_tick_ev_usd_trade,2)+'</b></div><div class="inst-metric"><span>P1 PF</span><b>'+fmt(gold.p1_pf,3)+'</b></div><div class="inst-metric"><span>P2 PF</span><b>'+fmt(gold.p2_pf,3)+'</b></div><div class="inst-metric"><span>Stress PF p05</span><b>'+fmt(stress.pf_p05,3)+'</b></div></div>'+
      '<div class="inst-note">OOS separate family: PF '+fmt(oos.pf,3)+' · DD '+fmt(oos.dd,2)+'% · '+esc(oos.trades??'—')+' trades · Monte Carlo '+esc(stress.scenarios??'—')+' scenarios · Stress gate '+(stress.gate_pass?'PASS':'—')+'. <b>Research only; not live-readiness evidence.</b></div></article>'+
    '<article class="inst-card"><div class="inst-head"><div><div class="inst-kicker">Proof of Edge</div><h3>BTC Evidence</h3></div><span class="inst-status warn">NOT YET EVIDENCED</span></div><div class="inst-big">—</div><div class="inst-sub">No linked BTC backtest/OOS artifact for this strategy stack.</div><div class="inst-note">The dashboard deliberately refuses to borrow GOLD metrics or fabricate Sharpe/PF for BTC.</div></article>'+
    '<article class="inst-card"><div class="inst-head"><div><div class="inst-kicker">Portfolio Risk</div><h3>Capital Heat & Correlation</h3></div><span class="inst-status '+instStatusClass(corr.status)+'">'+esc(corr.status||'—')+'</span></div><div class="inst-big">'+fmt(i.portfolio_risk?.current_heat_r,2)+'R</div><div class="inst-sub">Current governed portfolio heat</div><div class="inst-metrics"><div class="inst-metric"><span>BTC↔GOLD 30D</span><b>'+fmt(corr.btc_gold_corr_30d,2)+'</b></div><div class="inst-metric"><span>90D</span><b>'+fmt(corr.btc_gold_corr_90d,2)+'</b></div><div class="inst-metric"><span>Exposure</span><b>'+esc(i.portfolio_risk?.execution_exposure||'—')+'</b></div></div><div class="inst-note">'+esc(i.portfolio_risk?.note||'')+'</div></article>'+
    '<article class="inst-card"><div class="inst-head"><div><div class="inst-kicker">Macro Regime</div><h3>'+esc(macro.regime||'UNKNOWN')+'</h3></div><span class="inst-status '+instStatusClass(macro.status)+'">'+esc(macro.status||'—')+'</span></div><div class="inst-big">'+esc(macro.score??'—')+'</div><div class="inst-sub">Heuristic macro context score</div><div class="inst-metrics"><div class="inst-metric"><span>DXY 5D</span><b>'+pct(macro.dxy_5d)+'</b></div><div class="inst-metric"><span>US10Y 5D</span><b>'+pct(macro.us10y_5d)+'</b></div><div class="inst-metric"><span>SPY 5D</span><b>'+pct(macro.spy_5d)+'</b></div><div class="inst-metric"><span>VIX 5D</span><b>'+pct(macro.vix_5d)+'</b></div></div><div class="inst-note">'+esc(macro.note||'')+'</div></article>'+
    triggerCard('BTCUSD',btcTrig)+triggerCard('XAUUSD',goldTrig)+
    alignmentCard('BTCUSD',btcAlign)+alignmentCard('XAUUSD',goldAlign)+
    '<article class="inst-card"><div class="inst-head"><div><div class="inst-kicker">Continuous Validation</div><h3>Agent Effectiveness Ledger</h3></div><span class="inst-status warn">'+esc(i.agent_effectiveness?.status||'—')+'</span></div><div class="inst-big">NO LABELS YET</div><div class="inst-sub">'+esc(i.agent_effectiveness?.reason||'')+'</div><div class="inst-note"><b>Next:</b> '+esc(i.agent_effectiveness?.required_next||'')+'</div></article>'
  );
}
function triggerCard(symbol,t){
  if(!t||t.status==='NOT_AVAILABLE') return '<article class="inst-card"><div class="inst-head"><div><div class="inst-kicker">Entry / Trigger</div><h3>'+esc(symbol)+'</h3></div><span class="inst-status warn">NOT AVAILABLE</span></div><div class="inst-note">'+esc(t?.reason||'No trigger data')+'</div></article>';
  return '<article class="inst-card"><div class="inst-head"><div><div class="inst-kicker">Entry / Trigger</div><h3>'+esc(symbol)+' · '+esc(t.action||'—')+'</h3></div><span class="inst-status warn">'+esc(t.status||'—')+'</span></div><div class="inst-big">'+fmt(t.entry_reference,2)+'</div><div class="inst-sub">Research entry reference · '+esc(t.candidate_id||'—')+'</div><div class="inst-metrics"><div class="inst-metric"><span>Current ref</span><b>'+fmt(t.current_reference_price,2)+'</b></div><div class="inst-metric"><span>Stop ref</span><b>'+fmt(t.stop_reference,2)+'</b></div><div class="inst-metric"><span>Target ref</span><b>'+fmt(t.target_reference,2)+'</b></div></div><div class="inst-note">'+esc(t.authority||'')+' · Distance '+fmt(t.distance_atr,2)+' ATR</div></article>';
}
function alignmentCard(symbol,a){
  const c=a?.counts||{}, total=Math.max(1,a?.eligible_candidates||0);
  return '<article class="inst-card"><div class="inst-head"><div><div class="inst-kicker">Agent Alignment</div><h3>'+esc(symbol)+' · '+esc(a?.leader||'—')+'</h3></div><span class="inst-status warn">'+pct(a?.leader_share,0)+'</span></div>'+
    '<div class="alignment-bars">'+['BUY','SELL','WAIT'].map(k=>'<div class="align-row"><span>'+k+'</span><div class="align-track"><div class="align-fill '+k.toLowerCase()+'" style="width:'+Math.round((c[k]||0)/total*100)+'%"></div></div><b>'+esc(c[k]||0)+'</b></div>').join('')+'</div>'+
    '<div class="inst-note">'+esc(a?.diversity_warning||'')+'</div></article>';
}

function flowInstrumentState(layerId,instrument){
  const ins=(WORKFLOW?.instruments||[]).find(x=>x.instrument===instrument);
  return ins?.layers?.[layerId]||{};
}
function flowStatusHtml(layerId){
  const btc=flowInstrumentState(layerId,'BTCUSD');
  const gold=flowInstrumentState(layerId,'XAUUSD');
  return '<div class="flow-live-chip '+esc(btc.status||'FAILED')+'" data-wf-layer="'+esc(layerId)+'" data-wf-instrument="BTCUSD"><span>BTC</span><b>'+esc(btc.status||'—')+'</b></div>'+
    '<div class="flow-live-chip '+esc(gold.status||'FAILED')+'" data-wf-layer="'+esc(layerId)+'" data-wf-instrument="XAUUSD"><span>GOLD</span><b>'+esc(gold.status||'—')+'</b></div>';
}
function renderWorkflow(){
  const w=WORKFLOW;
  if(!w) return;
  safeSet('wfOverall','<span class="flow-state '+esc(w.overall_status)+'">'+esc(w.overall_status)+'</span>');
  safeText('wfUpdated',wfTime(w.generated_at_utc));

  document.querySelectorAll('[data-status-slot]').forEach(el=>{
    el.innerHTML=flowStatusHtml(el.dataset.statusSlot);
  });

  const btcInput=flowInstrumentState('data_input','BTCUSD');
  const goldInput=flowInstrumentState('data_input','XAUUSD');
  const btcAgent=flowInstrumentState('multi_agent_core','BTCUSD');
  const goldAgent=flowInstrumentState('multi_agent_core','XAUUSD');

  const sb=byId('flowSourceBtc'); if(sb) sb.classList.toggle('is-degraded',btcInput.status!=='COMPLETE');
  const sg=byId('flowSourceGold'); if(sg) sg.classList.toggle('is-degraded',goldInput.status!=='COMPLETE');

  const orch=byId('flowOrchestrator');
  if(orch) orch.querySelector('p').textContent=
    'BTC '+(btcAgent.details?.candidate_count??'—')+' candidates · GOLD '+(goldAgent.details?.candidate_count??'—')+' candidates';

  drawFlowConnectors();
}
function connectorSeverity(ids){
  const ranks={FAILED:5,BLOCKED:4,DEGRADED:3,WAIT:2,COMPLETE:1};
  let worst='COMPLETE',score=1;
  for(const layerId of ids){
    const status=WORKFLOW?.layers?.[layerId]?.status||'FAILED';
    if((ranks[status]||5)>score){score=ranks[status]||5;worst=status;}
  }
  return worst;
}
function drawFlowConnectors(){
  const graph=byId('flowGraph'),svg=byId('flowSvg');
  if(!graph||!svg||window.innerWidth<=1180) return;
  const box=graph.getBoundingClientRect();
  svg.setAttribute('viewBox','0 0 '+box.width+' '+box.height);
  const defs='<defs><linearGradient id="flowGradient" x1="0" x2="1"><stop offset="0%" stop-color="#5da4ff"/><stop offset="55%" stop-color="#7b70f2"/><stop offset="100%" stop-color="#56c693"/></linearGradient></defs>';
  const paths=[
    ['flowSourceBtc','flowDataInput',['data_input']],
    ['flowSourceGold','flowDataInput',['data_input']],
    ['flowSourceMacro','flowDataInput',['data_input']],
    ['flowDataInput','flowPreprocess',['data_input','preprocess_feature']],
    ['flowPreprocess','flowOrchestrator',['preprocess_feature','multi_agent_core']],
    ['flowOrchestrator','flowAgentSearch',['multi_agent_core']],
    ['flowOrchestrator','flowAgentEval',['multi_agent_core']],
    ['flowOrchestrator','flowAgentHeur',['multi_agent_core']],
    ['flowOrchestrator','flowAgentEnd',['multi_agent_core']],
    ['flowAgentSearch','flowAgentMerge',['multi_agent_core']],
    ['flowAgentEval','flowAgentMerge',['multi_agent_core']],
    ['flowAgentHeur','flowAgentMerge',['multi_agent_core']],
    ['flowAgentEnd','flowAgentMerge',['multi_agent_core']],
    ['flowAgentMerge','flowJev',['multi_agent_core','jev_shadow']],
    ['flowJev','flowDecision',['jev_shadow','decision_risk_control']],
    ['flowDecision','flowExecutive',['decision_risk_control','executive_output']]
  ];
  let html=defs;
  for(const [fromId,toId,layers] of paths){
    const from=byId(fromId),to=byId(toId);
    if(!from||!to) continue;
    const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
    const x1=a.right-box.left,y1=a.top+a.height/2-box.top;
    const x2=b.left-box.left,y2=b.top+b.height/2-box.top;
    const mid=x1+(x2-x1)*0.52;
    const sev=connectorSeverity(layers);
    const cls=sev==='BLOCKED'||sev==='FAILED'?'blocked':sev==='DEGRADED'?'degraded':'active';
    html+='<path class="'+cls+'" d="M '+x1+' '+y1+' C '+mid+' '+y1+', '+mid+' '+y2+', '+x2+' '+y2+'"/>';
  }
  svg.innerHTML=html;
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


function jevSelected(x,key){
  return x?.jev_shadow?.[key]?.selected||'—';
}
function jevConf(x,key){
  const v=x?.jev_shadow?.[key]?.confidence;
  return v===null||v===undefined?'—':pct(v,0);
}
function renderJevReview(){
  if(!SNAPSHOT) return;
  safeSet('jevReviewGrid',SNAPSHOT.instruments.map(x=>{
    const j=x.jev_shadow||{}, d=x.decision||{}, rc=x.risk_control||{};
    const hard=rc.allowed?'ALLOWED':'BLOCKED';
    const conv=j.system_conviction_score;
    const convPct=conv===null||conv===undefined?'—':pct(conv,0);
    return '<article class="jev-review-card">'+
      '<div class="jev-review-head"><div><div class="inst-kicker">SHADOW COPROCESSOR</div><h3>'+esc(x.instrument)+'</h3></div>'+
      '<span class="jev-mode">JEV · '+esc(j.mode||'SHADOW')+'</span></div>'+
      '<div class="jev-decision-chain">'+
        '<div><span>Agent Core</span><b>'+esc(d.action||'WAIT')+'</b><small>'+esc(d.selected_candidate_id||'—')+'</small></div>'+
        '<i>→</i><div class="jev-box"><span>JEV Shadow</span><b>'+esc(jevSelected(x,'jev_actionability'))+'</b><small>Risk posture '+esc(jevSelected(x,'jev_risk_posture'))+'</small></div>'+
        '<i>→</i><div class="risk-box"><span>Hard Risk</span><b>'+hard+'</b><small>'+esc((rc.reasons||[]).join(' · ')||'No veto')+'</small></div>'+
        '<i>→</i><div class="final-box"><span>Final</span><b>'+esc(x.final_action||'WAIT')+'</b><small>governed action</small></div>'+
      '</div>'+
      '<div class="jev-metric-grid">'+
        '<div><span>Counter-Thesis</span><b>'+esc(jevSelected(x,'jev_counter_thesis'))+'</b><small>'+jevConf(x,'jev_counter_thesis')+'</small></div>'+
        '<div><span>Evidence</span><b>'+esc(jevSelected(x,'jev_evidence_quality'))+'</b><small>'+jevConf(x,'jev_evidence_quality')+'</small></div>'+
        '<div><span>Uncertainty</span><b>'+esc(jevSelected(x,'jev_uncertainty'))+'</b><small>'+jevConf(x,'jev_uncertainty')+'</small></div>'+
        '<div><span>Macro</span><b>'+esc(jevSelected(x,'jev_macro_compatibility'))+'</b><small>'+jevConf(x,'jev_macro_compatibility')+'</small></div>'+
        '<div><span>System Conviction</span><b>'+esc(j.system_conviction_label||'—')+'</b><small>'+convPct+'</small></div>'+
        '<div><span>Decision Stage</span><b>'+esc(j.decision_stage||'—')+'</b><small>'+esc(j.model||'')+'</small></div>'+
      '</div>'+
      '<div class="jev-governance-note">JEV is advisory only · execution authority = FALSE · deterministic Hard Risk has precedence.</div>'+
    '</article>';
  }).join(''));
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
          <div><b>JEV Shadow:</b> ${esc(x.jev_shadow?.jev_actionability?.selected||'—')} · Evidence ${esc(x.jev_shadow?.jev_evidence_quality?.selected||'—')} · Uncertainty ${esc(x.jev_shadow?.jev_uncertainty?.selected||'—')} · Conviction ${esc(x.jev_shadow?.system_conviction_label||'—')}</div>
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
    lines.push(`JEV Shadow: ${x.jev_shadow?.jev_actionability?.selected||'—'} | Evidence: ${x.jev_shadow?.jev_evidence_quality?.selected||'—'} | Uncertainty: ${x.jev_shadow?.jev_uncertainty?.selected||'—'} | System Conviction: ${x.jev_shadow?.system_conviction_label||'—'}`);
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
        <div><span>JEV Actionability</span><b>${esc(x.jev_shadow?.jev_actionability?.selected||'—')}</b></div>
        <div><span>System Conviction</span><b>${esc(x.jev_shadow?.system_conviction_label||'—')} · ${pct(x.jev_shadow?.system_conviction_score,0)}</b></div>
      </div>
      <p><b>Decision:</b> ${esc(x.decision.reason)}<br>
      <b>Risk/Veto:</b> ${esc((x.risk_control.reasons||[]).join(', ')||'none')}<br>
      <b>Position size:</b> ${x.proposed_volume??'—'}</p>
    </div>`).join('')+
    '<div class="governance-note"><b>Governance:</b> Execution และ TradeIntent ถูกปิดไว้ หน้านี้จบที่ Analysis / Control / Report เท่านั้น</div>';
}

const agentSquad=byId('agentSquad'); if(agentSquad) agentSquad.addEventListener('click',e=>{const card=e.target.closest('[data-agent-id]');if(card)openAgentDeepDive(card.dataset.agentId);});

const flowGraph=byId('flowGraph'); if(flowGraph) flowGraph.addEventListener('click',e=>{
  const n=e.target.closest('[data-wf-layer]');
  if(n) openWorkflowDetail(n.dataset.wfLayer,n.dataset.wfInstrument||null);
});
let flowResizeTimer=null;
window.addEventListener('resize',()=>{
  clearTimeout(flowResizeTimer);
  flowResizeTimer=setTimeout(()=>{ if(WORKFLOW) drawFlowConnectors(); },120);
});

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