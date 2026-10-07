
(async()=>{
  const esc2=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
  const load=async p=>{const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error(p+" "+r.status);return r.json()};
  const isLocal=["127.0.0.1","localhost"].includes(location.hostname);
  const perfPath=isLocal?"data/local/performance_live.json":"data/performance_summary.json";
  const [perf,backlog,routing,failures,arch,promotions]=await Promise.all([
    load(perfPath),load("data/improvement_backlog.json"),load("data/routing_recommendations.json"),
    load("data/failure_patterns.json"),load("data/architecture_proposals.json"),load("data/promotion_candidates.json")
  ]);
  const badge=document.getElementById("siCollectionBadge"); if(badge) badge.textContent=perf.collection_status||"UNKNOWN";
  const score=perf.self_improvement_score||{};
  document.getElementById("siScore").textContent=score.value==null?"NO DATA":Number(score.value).toFixed(1);
  document.getElementById("siScoreMeta").textContent=score.value==null?"Historical baseline required · collection started":"Current runtime score";
  document.getElementById("siDimensions").innerHTML=Object.entries(score.dimensions||{}).map(([k,v])=>'<div class="si-dim"><span>'+esc2(k.replaceAll("_"," "))+'</span><b class="'+(v==null?'si-no-data':'')+'">'+(v==null?'—':esc2(v))+'</b></div>').join("");
  const facts=perf.bootstrap_facts||{};
  document.getElementById("siFacts").innerHTML=Object.entries(facts).map(([k,v])=>'<div class="provider"><span>'+esc2(k.replaceAll("_"," "))+'</span><b class="ok">'+esc2(v)+'</b></div>').join("");
  const drawer=document.createElement("div"); drawer.className="si-kpi-drawer"; drawer.hidden=true; drawer.innerHTML='<button>×</button><span class="kicker">KPI LINEAGE</span><h3></h3><p class="si-kpi-detail"></p>'; document.body.appendChild(drawer); drawer.querySelector("button").onclick=()=>drawer.hidden=true;
  document.getElementById("siKpis").innerHTML=(perf.kpis||[]).map(k=>'<article class="si-kpi" data-kpi="'+esc2(k.id)+'"><div class="si-kpi-head"><span class="chip">'+esc2(k.window||"")+'</span><span class="chip '+(k.status==="NO_DATA"?'write':'read')+'">'+esc2(k.status)+'</span></div><h3>'+esc2(k.name)+'</h3><div class="si-kpi-value '+(k.value==null?'si-no-data':'')+'">'+(k.value==null?'NO DATA':esc2(k.value)+" "+esc2(k.unit||""))+'</div><small>'+esc2(k.formula)+'</small></article>').join("");
  document.querySelectorAll(".si-kpi").forEach(el=>el.addEventListener("click",()=>{const k=(perf.kpis||[]).find(x=>x.id===el.dataset.kpi); if(!k)return; drawer.querySelector("h3").textContent=k.name; drawer.querySelector(".si-kpi-detail").innerHTML="<b>Formula:</b> "+esc2(k.formula)+"<br><b>Sources:</b> "+esc2((k.sources||[]).join(", "))+"<br><b>Time window:</b> "+esc2(k.window||"—")+"<br><b>Current value:</b> "+(k.value==null?"NO DATA / COLLECTION STARTED":esc2(k.value)); drawer.hidden=false;}));
  const empty=(id,label)=>{const el=document.getElementById(id); if(el) el.innerHTML='<div class="si-chart-empty"><b>NO DATA / COLLECTION STARTED</b><span>'+esc2(label)+'</span></div>';};
  const charts=perf.charts||{};
  [["chartRuntime","runtime_health","Awaiting task_runs + runtime_events history"],["chartLatency","latency","Awaiting latency samples"],["chartCostQuality","cost_quality","Awaiting model/tool cost + validation quality"],["chartConfidence","confidence_calibration","Awaiting confidence + actual outcome pairs"],["chartHeatmap","agent_tool_heatmap","Awaiting agent/tool run matrix"],["chartCanary","canary_comparison","Awaiting primary vs shadow experiments"],["chartImprovement","self_improvement_trend","Awaiting versioned self-improvement scores"]].forEach(([id,key,msg])=>{if(!(charts[key]||[]).length) empty(id,msg);});
  document.getElementById("siBacklog").innerHTML=(backlog.items||[]).map(x=>'<article class="si-backlog-item"><div class="si-backlog-id">'+esc2(x.id)+'<br><span>'+esc2(x.priority)+'</span></div><div class="si-backlog-main"><strong>'+esc2(x.candidate)+'</strong><p>'+esc2(x.finding)+'</p><div class="si-backlog-tags"><span>'+esc2(x.status)+'</span><span>Impact '+esc2(x.impact)+'</span><span>Confidence '+esc2(x.confidence)+'</span></div></div><span class="chip">'+esc2(x.owner)+'</span></article>').join("");
})().catch(err=>{console.error("Self-improvement analytics:",err); const b=document.getElementById("siCollectionBadge"); if(b){b.textContent="DATA ERROR";b.classList.add("warn")}});
