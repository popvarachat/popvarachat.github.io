"use strict";
const $=id=>document.getElementById(id);
let model=null;
const COLORS={ADAPTIVE_POLICY:"#54dec7",STATIC_V3:"#a18afc",ORIGINAL_BASE:"#8296ad"};
const LABELS={ADAPTIVE_POLICY:"Adaptive v4",STATIC_V3:"Static v3",ORIGINAL_BASE:"Original MACD"};
const NODE={
 question:["Research Question","เริ่มจากเป้าหมายที่วัดได้ ระบุ Baseline, หน่วยของ KPI, ความเสี่ยงที่ยอมรับ และเงื่อนไขที่ห้ามทำ","Question ID · Pre-registered metrics · Human constraints"],
 hypothesis:["Hypothesis Generator","ให้เหตุผลว่าการเปลี่ยน Exit, Regime หรือ Risk Policy น่าจะช่วยตรงจุดใด พร้อมระบุวิธีพิสูจน์และ Null Hypothesis","Hypothesis → Expected mechanism → Falsification tests"],
 critic:["Model Critic / Red Team","ท้าทายสมมติฐาน ตรวจ Look-ahead, ใช้ OOS ผิดหน้าที่, Overfit, ขาดข้อมูล Tick, Broker FX, ต้นทุน และตัวอย่างต่ำ","Reject leakage · Opposing evidence · Root cause"],
 dataqa:["Data QA Agent","ตรวจ H1 OHLC, Timestamp, Tick/Spread, USDTHB conversion และการแบ่ง Train/Validation/OOS","69,622 H1 bars · FX/tick coverage gaps"],
 tester:["Backtest / Model Agent","ส่ง Config ไป MT5 Strategy Tester บน PC ที่กำหนดเท่านั้น ใช้ EA ที่ได้รับอนุญาตและ Tester-only lock","MQL5 EX5 · Model 2/4 · PC Host Guard"],
 risk:["Risk / Stress Agent","ตรวจ PF, Max Equity DD, Recovery, จำนวน Trades, ต้นทุนเพิ่ม, Worst Block และ Lot/SL/TP","Additional spread/slippage stress · Risk gate"],
 walk:["Walk-Forward Agent","เลือกนโยบายจาก Train/Validation ก่อนทดสอบ Forward; บันทึก Frozen Decision และห้ามปรับจากผล OOS รอบนั้น","23 complete blocks · 15 trading · 8 No Trade"],
 qa:["Independent QA","ตรวจความครบถ้วนหลักฐาน Reproduce ค่า Metric, จำนวนเทรด, ป้องกันการแก้ประวัติย้อนหลัง และตรวจ Hash","18/18 evidence checks passed; strategy gate still FAIL"],
 gate:["Research Decision Gate","PASS/FAIL/INCONCLUSIVE/BLOCKED ตามเกณฑ์ที่ประกาศล่วงหน้า ไม่ใช่เลือก Metric ที่ดีที่สุดย้อนหลัง","Current research acceptance: FAIL"],
 human:["Human Gate","อนุมัติขอบเขตการทดลองต่อในอนาคต ควบคุมสิทธิ์ใช้งาน Production / Live โดยการวิจัยไม่ให้สิทธิ์เทรดอัตโนมัติ","Human approval required · Live Trading HOLD"]
};
function fmt(x,d=2){return x===null||x===undefined||Number.isNaN(+x)?"N/A":Number(x).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});}
function t(id,v){const n=$(id);if(n)n.textContent=v;}
function div(cls,txt){const n=document.createElement("div");if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
function child(parent,tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;parent.appendChild(n);return n;}
function nav(name){
 document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
 document.querySelectorAll(".page").forEach(n=>n.classList.toggle("active",n.id==="page-"+name));
 window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("#nav button").forEach(b=>b.addEventListener("click",()=>{nav(b.dataset.tab);history.replaceState(null,"","#"+b.dataset.tab);}));
const validTabs=new Set(["overview","workflow","analytics","evidence","control","league","manager","parameters"]);
function openTabFromHash(){const tab=location.hash.slice(1);if(validTabs.has(tab))nav(tab);}
window.addEventListener("hashchange",openTabFromHash);
openTabFromHash();
$("refresh-button").addEventListener("click",()=>{load(true);loadRemote();});
$("strategy-filter").addEventListener("change",()=>renderBlocks());
document.querySelectorAll("[data-node]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".node").forEach(c=>c.classList.toggle("active",b===c));const k=NODE[b.dataset.node];t("node-title",k[0]);t("node-badge","RESEARCH NODE");t("node-description",k[1]);t("node-proof",k[2]);}));
function renderKpis(d){
 const o=d.overview||{},a=d.strategies.ADAPTIVE_POLICY||{};
 t("kpi-blocks",(o.wf_blocks_completed||0)+"/"+(o.wf_blocks_total||0));
 t("kpi-pf",fmt(a.pf,3));
 t("kpi-dd",fmt(a.dd_max_block)+"%");
 t("kpi-wins",(o.wf_positive_blocks||0)+"/"+(o.wf_blocks_total||0));
 t("kpi-qa",(d.evidence_integrity_checks.passed||0)+"/"+(d.evidence_integrity_checks.total||0));
 t("kpi-regime",fmt(100*(o.regime_agreement||0),1)+"%");
 t("rag-status",(o.rag_qa_passed||0)+"/"+(o.rag_qa_total||0)+" QA");
 t("gate-label",d.research_gate);
 t("loop-status",d.process.auto_loop_enabled?"RUNNING":"OFF");
 t("health-status",d.process.state==="RUNNING"?"TESTING":d.process.state==="ACTIVE_RESEARCH"?"RESEARCH LOOP ACTIVE":"RESEARCH HOLD");
 t("process-state",d.process.state==="RUNNING"?"TESTER RUNNING":d.process.state==="ACTIVE_RESEARCH"?"RESEARCH LOOP ACTIVE":"RESEARCH HOLD");
 const l=document.querySelector(".light");l.classList.toggle("running",["RUNNING","ACTIVE_RESEARCH"].includes(d.process.state));
 t("data-asof",d.dataset_asof||"—");
 const stamp=new Date(d.generated_at);const local=!/github\.io$/i.test(location.hostname) && ["localhost","127.0.0.1"].includes(location.hostname);
 t("snapshot-time",stamp.toLocaleString("th-TH",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Bangkok"}));
 t("footer-time","Generated "+stamp.toLocaleString("en-GB",{timeZone:"Asia/Bangkok"}));
 t("mode-pill",local?"PC LOCAL · AUTOREFRESH":"PUBLISHED SNAPSHOT");
 $("gate-meter").style.width=Math.min(100,100*(o.wf_positive_blocks||0)/Math.max(1,o.wf_blocks_total||0))+"%";
}
function renderStrategies(d){
 const host=$("strategy-rows");host.replaceChildren();
 for(const key of ["ADAPTIVE_POLICY","STATIC_V3","ORIGINAL_BASE"]){
  const s=d.strategies[key];if(!s)continue;
  const row=div("strategy-line");
  const first=div("strategy-name");const mark=div("model-marker "+(key==="STATIC_V3"?"indigo":key==="ORIGINAL_BASE"?"slate":""));
  first.appendChild(mark);child(first,"span","",LABELS[key]);row.appendChild(first);
  child(row,"span",s.net>=0?"profit":"loss",(s.net>=0?"+":"")+fmt(s.net));
  child(row,"span","",fmt(s.pf,3));
  child(row,"span","",fmt(s.dd_max_block)+"%");
  child(row,"span","",String(s.trades||0));
  host.appendChild(row);
 }
}
const NS="http://www.w3.org/2000/svg";
function element(parent,tag,attrs,text){
 const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,v);
 if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;
}
function graph(d){
 const host=$("profit-chart");host.replaceChildren();
 const entries=d.quarterly_blocks||[],qs=Array.from(new Set(entries.map(v=>v.q))).sort();
 const map=new Map(entries.map(v=>[v.q+"|"+v.strategy,v]));
 const keys=["ADAPTIVE_POLICY","STATIC_V3","ORIGINAL_BASE"];
 const value=entries.map(v=>v.profit||0),max=Math.max(500,...value,0),min=Math.min(-350,...value,0);
 const width=Math.max(1040,qs.length*51+115),height=314,top=24,bottom=270,left=55,right=24;
 const inner=height-top-(height-bottom),scale=y=>top+(max-y)/(max-min)*inner;
 const svg=element(host,"svg",{viewBox:"0 0 "+width+" "+height,style:"width:"+width+"px",role:"img","aria-label":"Quarterly real-tick backtest net profit comparison"});
 for(let k=0;k<=5;k++){const v=max-(max-min)*k/5;const yy=scale(v);element(svg,"line",{x1:left,y1:yy,x2:width-right,y2:yy,class:Math.abs(v)<(max-min)/10?"zero":""});element(svg,"text",{x:4,y:yy+4},fmt(v,0));}
 const zero=scale(0),gW=(width-left-right)/qs.length;
 for(let i=0;i<qs.length;i++){
  const x=left+i*gW;
  keys.forEach((key,j)=>{
   const e=map.get(qs[i]+"|"+key);if(!e)return;
   const y=scale(e.profit||0),h=Math.max(1,Math.abs(y-zero)),w=Math.min(10,gW/4);
   const rect=element(svg,"rect",{x:x+gW*.5+(j-1.5)*w*1.12,y:Math.min(y,zero),width:w,height:h,rx:2,fill:COLORS[key]});
   element(rect,"title",{},qs[i]+" "+LABELS[key]+": "+fmt(e.profit)+" THB; PF "+fmt(e.pf,3)+"; DD "+fmt(e.dd)+"%");
   rect.addEventListener("click",()=>{nav("analytics");$("strategy-filter").value=key;renderBlocks();});
  });
  if(i%2===0||qs.length<=16)element(svg,"text",{x:x+gW/2,y:291,"text-anchor":"middle",style:"font-size:9px"},qs[i].slice(2).replace("-","/"));
 }
}
function renderPhases(d){
 const host=$("phase-list");host.replaceChildren();
 (d.phases||[]).forEach((v,i)=>{
  const r=div("phase");const a=div("");child(a,"strong","",String(i+1)+". "+v.name);child(a,"small","",v.detail);r.appendChild(a);
  const p=child(r,"span","pill "+(v.status.includes("FAIL")?"fail":v.status.includes("COMPLETE")?"ok":""),v.status.replaceAll("_"," "));
  host.appendChild(r);
 });
}
function renderBars(d){
 const holder=$("metric-bars");holder.replaceChildren();
 const specs=[["Profit Factor","pf","",2.1],["Maximum Equity DD per Block","dd_max_block","%",9],["Sum Net Profit (reset account)","net"," THB",5600]];
 for(const [title,field,unit,max] of specs){
  const g=div("metric-group");child(g,"h3","",title);
  ["ADAPTIVE_POLICY","STATIC_V3","ORIGINAL_BASE"].forEach(k=>{
   const v=d.strategies[k]||{},n=Number(v[field]||0),r=div("metric-line");child(r,"span","",LABELS[k]);
   const track=div("track"),bar=div("track-bar "+(k==="STATIC_V3"?"indigo":k==="ORIGINAL_BASE"?"slate":""));bar.style.width=Math.max(0,Math.min(100,n/max*100))+"%";track.appendChild(bar);r.appendChild(track);child(r,"strong","",fmt(n,field==="pf"?3:2)+unit);g.appendChild(r);
  });holder.appendChild(g);
 }
}
function renderBlocks(){
 if(!model)return;
 const filter=$("strategy-filter").value,rows=(model.quarterly_blocks||[]).filter(x=>filter==="ALL"||x.strategy===filter);
 t("table-count",rows.length+" records");const tbody=$("block-table");tbody.replaceChildren();
 rows.sort((a,b)=>a.q.localeCompare(b.q)||a.strategy.localeCompare(b.strategy));
 rows.forEach(v=>{
  const tr=document.createElement("tr");
  const vals=[v.q,LABELS[v.strategy]||v.strategy,v.gate==="BASE"?"Baseline":v.gate==="-1"?"No Trade":"Gate "+v.gate,
  (v.profit>0?"+":"")+fmt(v.profit),fmt(v.pf,3),fmt(v.dd),fmt(v.recovery,3),String(v.trades)];
  vals.forEach((x,i)=>{const td=document.createElement("td");td.textContent=x;if(i===3)td.className=v.profit>0?"pos":v.profit<0?"neg":"";tr.appendChild(td);});tbody.appendChild(tr);
 });
}
function renderEvidence(d){
 const box=$("events");box.replaceChildren();
 const ev=d.process.events||[];
 const audit=[{phase:"Evidence",status:"COMPLETE",message:"18/18 Evidence Integrity QA passed · Trade Research Gate FAIL",ts:"2026-10-14"},
 {phase:"Walk-Forward",status:"FAILED",message:"23 matched forward blocks evaluated; 9 profitable; strategy research gate FAIL",ts:"2026-10-14"},
 {phase:"Local RAG",status:"FAILED",message:"3 factual questions; 2 passed; 1 answer did not state MFE proxy caveat",ts:"2026-10-14"},
 {phase:"Safety",status:"STOPPED",message:"Live Trading HOLD · Autonomous executor disabled",ts:"2026-10-14"}];
 const all=ev.length?ev.slice().reverse():audit;t("event-count",all.length+" events"+(ev.length?"":" · archived"));
 all.forEach(v=>{
  const row=div("event");const line=div("event-line");child(line,"b",v.status==="COMPLETE"?"done":v.status==="FAILED"?"fail":"");row.appendChild(line);
  const body=div("event-body");child(body,"b","",(v.phase||"Research")+" · "+(v.type||v.status));child(body,"small","",v.ts||"Time not reported");child(body,"p","",v.message||"Evidence recorded");row.appendChild(body);box.appendChild(row);
 });
 const lim=$("limitations");lim.replaceChildren();(d.limitations||[]).forEach(s=>child(lim,"div","",s));
}
function render(d){
 if(d.schema!=="rdc.mt5.research.dashboard.v1")throw new Error("Invalid dashboard data schema");
 model=d;renderKpis(d);renderStrategies(d);graph(d);renderPhases(d);renderBars(d);renderBlocks();renderEvidence(d);
 $("load-error").hidden=true;
}
let inFlight=false;
async function load(force){
 if(inFlight)return;inFlight=true;
 try{
  const resp=await fetch("./data/snapshot.json?v="+Date.now(),{cache:"no-store"});
  if(!resp.ok)throw new Error("HTTP "+resp.status);
  render(await resp.json());
 }catch(err){$("load-error").hidden=false;console.error("Snapshot unavailable:",err);}
 finally{inFlight=false;}
}
load();setInterval(()=>load(false),15000);

// Public dashboard resilient telemetry: raw JSON first (no low anonymous GitHub API quota).
// Fall back to published GitHub Pages snapshot and finally GitHub Contents API.
let latestDataFeedSource="LOADING";
function syncHeaderWithLatestEvidence(d){
 const age=Math.max(0,(Date.now()-Date.parse(d?.last_heartbeat||""))/60000);
 const fresh=Number.isFinite(age)&&age<=35;
 const paused=d?.runner_status==="PAUSED";
 const label=paused?"RESEARCH PAUSED":fresh?"RESEARCH LOOP ACTIVE":"STALE DATA · PC UNVERIFIED";
 t("process-state",label);
 t("health-status",label);
 const light=document.querySelector(".header-right .light");
 if(light)light.classList.toggle("running",fresh&&!paused);
}
const RDC_PUBLIC_RESEARCH_PATH="popvarachat/popvarachat.github.io/main/rdc-mt5-research/data/live.json";
async function fetchResearchTelemetry(){
 const nonce="?t="+Date.now();
 const isPC=["localhost","127.0.0.1"].includes(location.hostname);
 const endpoints=[
  ...(isPC?[{name:"PC Local · direct",url:"./data/live.json"+nonce}]:[]),
  {name:"GitHub Raw · current repository data",url:"https://raw.githubusercontent.com/"+RDC_PUBLIC_RESEARCH_PATH+nonce},
  {name:"GitHub API · commit checkpoint",url:"https://api.github.com/repos/popvarachat/popvarachat.github.io/contents/rdc-mt5-research/data/live.json"+nonce},
  {name:"GitHub Pages · released snapshot (may be stale)",url:"./data/live.json"+nonce}
 ];
 let best=null;
 const errors=[];
 for(const source of endpoints){
  try{
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8500);
   let res;
   try{res=await fetch(source.url,{cache:"no-store",signal:ctl.signal});}
   finally{clearTimeout(timer);}
   if(!res.ok)throw new Error("HTTP "+res.status);
   let data=await res.json();
   if(data.encoding==="base64"&&typeof data.content==="string"){
     data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g,"")),c=>c.charCodeAt(0))));
   }
   if(data.schema!=="rdc.research.public.live.v1"||data.indicator_research?.schema!=="rdc.indicator.family.loop.v1")throw new Error("RESEARCH_SCHEMA_MISSING");
   const timestamp=Date.parse(data.generated_at)||0;
   const candidate={data,source:source.name,timestamp};
   if(!best||timestamp>best.timestamp)best=candidate;
   // Raw direct is fresh enough; avoid unnecessary anonymous GitHub API calls.
   // Pages release is NOT live telemetry. For stale Raw, check API before using it.
   if((isPC && source.name.startsWith("PC Local")) ||
      (source.name.startsWith("GitHub Raw")&&Date.now()-timestamp<5*60000) ||
      (source.name.startsWith("GitHub API")&&Date.now()-timestamp<10*60000))return candidate;
  }catch(e){errors.push(source.name+": "+String(e.message||e));}
 }
 if(best)return best;  // Retain honest STALE label on old snapshot.
 throw new Error(errors.join(" | "));
}
async function loadRemote(){
 try{
  const {data:d,source}=await fetchResearchTelemetry();
  latestDataFeedSource=source;
  try{localStorage.setItem("rdc_research_last_good_v1",JSON.stringify(d));}catch(e){} 
  const feedAgeMin=Math.floor(Math.max(0,(Date.now()-Date.parse(d.generated_at))/60000));
  t("family-data-source","Source: "+source+" · ข้อมูลจาก PC "+feedAgeMin+" นาทีที่แล้ว · "+new Date(d.generated_at).toLocaleTimeString("th-TH",{timeZone:"Asia/Bangkok"}));
  const ago=(Date.now()-Date.parse(d.generated_at))/60000;
  syncHeaderWithLatestEvidence(d);
  renderResearchMarketTape(d,source);
  renderResearchLeague(d.research_league||null,d);
  renderParameterFinder(d.parameter_finder||null);
  renderTFParameterPolicy(d.tf_parameter_policy||null,d.discovery_manager||null,d.indicator_research||null);
  renderManagerDailyAudit(d.agent_manager_daily_audit||null);
  renderWaveGraph(d.wave_graph||null);
  renderDiscoveryManager(d.discovery_manager||null);
  renderExternalResearch(d.external_discovery||null);
  renderQwenCrossReview(d.qwen_cross_review||null);
  renderMetaLearning(d.learning_intelligence||null);
  renderShortTfFeasibility(d.short_tf_feasibility||null);
  t("remote-checkpoint-chip",ago<35?"PC CHECKPOINT":"STALE CHECKPOINT");
  const rows=document.getElementById("remote-history");
  if(rows){
   rows.replaceChildren();
   const trials=(d.recent_experiments||[]).slice(-20).reverse();
   if(!trials.length){const tr=document.createElement("tr");const td=document.createElement("td");td.colSpan=9;td.textContent="ยังไม่มี Challenger ที่รันทดสอบ";tr.appendChild(td);rows.appendChild(tr);}
   trials.forEach(x=>{
    const tr=document.createElement("tr");
    const vals=[x.index,x.family,(x.params||[]).join(","),fmt(x.fit_pf,3),fmt(x.validation_pf,3),
      fmt(x.validation_dd)+"%",fmt(x.validation_recovery,3),fmt(x.validation_net),x.status||"UNKNOWN"];
    vals.forEach(v=>{const td=document.createElement("td");td.textContent=String(v||"—");tr.appendChild(td)});
    rows.appendChild(tr);
   });
  }
  const thinking=document.getElementById("remote-thinking");
  if(thinking){thinking.replaceChildren();(d.thinking_history||[]).slice(-8).reverse().forEach(x=>{
    const el=document.createElement("div");el.className="health";
    const a=document.createElement("span");a.textContent="Cycle "+(x.cycle||"—")+" · "+(x.family||"RESEARCH");
    const b=document.createElement("strong");b.textContent=x.status||"PROPOSED";
    el.append(a,b);thinking.appendChild(el);
  });}
  latestModelInspections=d.model_inspections||{};
  if(d.indicator_research){renderFamilyResearch(d.indicator_research,d,ago);latestLoopStatus={f:d.indicator_research,d};refreshLiveMonitor();}
  t("remote-runner",ago<25?d.runner_status:"UNVERIFIED: STALE CHECKPOINT");
  t("remote-cycles",String(d.cycle??"—"));
  t("remote-trials",String(d.candidate_trials??"—"));
  t("remote-champion",d.champion||"—");
  const c=d.challenger||{};
  t("remote-challenger",c.status?("Trial "+c.candidate+" · "+c.status):"NOT YET TESTED");
  t("remote-heartbeat",d.last_heartbeat?new Date(d.last_heartbeat).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}):"—");
  t("remote-last-test",d.last_test?new Date(d.last_test).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}):"—");
 }catch(e){
  let previous=null;
  try{previous=JSON.parse(localStorage.getItem("rdc_research_last_good_v1")||"null");}catch(ignore){}
  if(previous?.schema==="rdc.research.public.live.v1" && previous.indicator_research){
    const minutes=(Date.now()-Date.parse(previous.generated_at))/60000;
    latestLoopStatus={f:previous.indicator_research,d:previous};
    latestModelInspections=previous.model_inspections||{};
    renderFamilyResearch(previous.indicator_research,previous,minutes);
    refreshLiveMonitor();
    syncHeaderWithLatestEvidence(previous);
    renderResearchMarketTape(previous,"Last cached snapshot (may be old)");
    renderResearchLeague(previous.research_league||null,previous);
    renderParameterFinder(previous.parameter_finder||null);
    renderTFParameterPolicy(previous.tf_parameter_policy||null,previous.discovery_manager||null,previous.indicator_research||null);
    renderManagerDailyAudit(previous.agent_manager_daily_audit||null);
    renderWaveGraph(previous.wave_graph||null);
    renderDiscoveryManager(previous.discovery_manager||null);
    renderExternalResearch(previous.external_discovery||null);
    renderQwenCrossReview(previous.qwen_cross_review||null);
    renderMetaLearning(previous.learning_intelligence||null);
    renderShortTfFeasibility(previous.short_tf_feasibility||null);
    t("family-run-status","STALE · FEED INTERRUPTED");
    t("family-data-source","Last cached checkpoint · data "+Math.round(minutes)+"m old");
  }else{
    const statusLight=document.querySelector(".header-right .light");
    if(statusLight)statusLight.classList.remove("running");
    t("process-state","FEED UNAVAILABLE · PC UNVERIFIED");
    t("family-run-status","DATA FEED ERROR · RETRYING");
    markMarketTapeUnavailable();
    t("family-current","ข้อมูลชั่วคราวไม่พร้อม");
    t("family-current-stage","อ่าน Progress ไม่ได้ · ระบบ PC อาจยังทำงานอยู่");
    t("family-data-source","เครือข่าย / GitHub ชั่วคราวผิดพลาด");
  }
  t("remote-runner","CHECKPOINT UNAVAILABLE");
  t("remote-checkpoint-chip","FEED ERROR · RETRYING");
  console.warn("Research telemetry degraded; all 3 public endpoints failed",e.message);
 }
}
loadRemote();setInterval(loadRemote,60000);

function renderFamilyResearch(f,d,ageMins){
 if(f.schema!=="rdc.indicator.family.loop.v1")return;
 const fresh=ageMins<35;
 t("family-run-status",!fresh?"PC OFFLINE / STALE":d.runner_status==="PAUSED"?"PAUSED":"∞ RESEARCH LOOP ACTIVE");
 t("family-current",String(f.family_number).padStart(2,"0")+" / "+f.family_total+" · "+f.current_name);
 const stages={QUEUE_READY:"เตรียมทดลองระบบถัดไป",FIT_RUNNING:"กำลัง Backtest: Fit (2019–2024)",
 VAL_RUNNING:"กำลัง Backtest: Validation (2025)",CANDIDATE_EVALUATED:"เสร็จ 1 Challenger · ประเมินคะแนนแล้ว",
 WAITING_DAILY_MT5_BUDGET:"รอรอบทดสอบถัดไป (ไม่มีโควตารายวัน)",FAILED:"เกิดข้อผิดพลาด — ดู Evidence"};
 t("family-current-stage",stages[f.current_step]||f.current_step||"กำลังตรวจสถานะ");
 t("family-trial-caption","Parameter Set "+f.trial_number+" / "+f.trials_per_family+" · "+(f.current_step||"QUEUE"));
 t("family-trial-percent",fmt(f.trial_progress_pct,0)+"%");
 t("family-round-caption","รอบ "+f.round+" · ตรวจผ่าน "+(f.pass_checked_count??Math.max(0,f.family_number-1))+"/"+f.family_total+" ระบบ (ไม่ใช่ % ที่วิจัยเสร็จทั้งหมด)");
 t("family-round-percent",fmt(f.system_progress_pct,1)+"%");
 $("family-trial-bar").style.width=Math.max(0,Math.min(100,f.trial_progress_pct||0))+"%";
 $("family-round-bar").style.width=Math.max(0,Math.min(100,f.system_progress_pct||0))+"%";
 t("family-round",String(f.round));
 t("family-system-number",f.family_number+"/"+f.family_total);
 t("family-experiments",String(f.total_experiments));
 t("family-qualified",String(f.systems_with_qualified_best));
 const mod=(f.models||[]);
 const adapters=mod.filter(x=>x.adapter_ready).length;
 t("family-registry-status",adapters+" testers ready · "+(mod.length-adapters)+" adapters in development");
 const track=$("family-track");track.replaceChildren();
 mod.forEach((m,i)=>{
   const status=m.status==="CURRENT"?"กำลังคิด/ทดสอบ":m.status==="NEEDS_ADAPTER"?"EA อยู่ระหว่างพัฒนา":
         m.status==="TESTED"?"ทดสอบแล้ว":"รอคิว";
   const card=div("family-chip "+(m.status==="CURRENT"?"current":m.best?"qualified":m.status==="NEEDS_ADAPTER"?"adapter":""));
   const hd=div("family-chip-top");
   child(hd,"strong","",(i+1).toString().padStart(2,"0")+". "+m.name);
   card.appendChild(hd);
   const sub=child(card,"span","family-chip-status",status);
   if(m.best){child(card,"span","up", "PF "+fmt(m.best.pf,3)+" · RF "+fmt(m.best.recovery,2)+(m.best.improvement?" ▲ NEW BEST":""));}
   else if(m.status==="TESTED"){child(card,"span","family-chip-status","ไม่ผ่านเกณฑ์คัดเลือก");}
   else if(m.status==="CURRENT"){child(card,"span","family-chip-status", "Trial "+f.trial_number+"/"+f.trials_per_family);}
   track.appendChild(card);
 });
 const banner=$("family-champion-banner");
 const ch=f.best_global;
 if(ch){
  banner.classList.remove("empty");
  banner.textContent="🏆 BEST VERIFIED HISTORICAL CHALLENGER: "+ch.family_id+" · PF "+fmt(ch.pf,3)+" · DD "+fmt(ch.dd,2)+"% · Recovery "+fmt(ch.recovery,2)+" · n="+ch.trades+
   " — Research only; ยังไม่ผ่าน Blind Forward";
 }else{
  banner.classList.add("empty");
  banner.textContent="ยังไม่มีระบบที่ผ่าน Research Qualification · ไม่ประกาศ Champion ปลอมจากการทดลองที่ไม่ผ่านเกณฑ์";
 }
 const leaderboard=$("family-leaderboard");leaderboard.replaceChildren();
 const best=mod.filter(m=>m.best).sort((a,b)=>(b.best.score||0)-(a.best.score||0));
 if(!best.length)child(leaderboard,"div","empty-family","ยังไม่มี Model ที่ผ่านเกณฑ์ PF>1, DD≤15%, Recovery>0, Trades≥20");
 best.forEach(m=>{
   const c=div("family-winner "+(m.best.improvement?"new":""));
   const hd=div("winner-head");child(hd,"strong","",m.name);
   if(m.best.improvement)child(hd,"span","","▲ IMPROVED");else child(hd,"span","","QUALIFIED");
   c.appendChild(hd);
   const metrics=div("winner-metrics");
   for(const [label,v] of [["PF",fmt(m.best.pf,3)],["DD",fmt(m.best.dd,1)+"%"],["Recovery",fmt(m.best.recovery,2)]])
   {const wrapper=div("");child(wrapper,"span","",label);child(wrapper,"b","",v);metrics.appendChild(wrapper);}
   c.appendChild(metrics);
   child(c,"div","annotation","Profit "+fmt(m.best.net)+" THB · Trades "+m.best.trades+" · R"+m.best.round+"/T"+m.best.trial);
   const inspect=child(c,"button","model-open-button","🔍 Parameter / Entry–Exit");
   inspect.type="button";
   inspect.addEventListener("click",()=>openModelInspector(m.id||m.family_id||m.best.family_id||m.name.split(" ")[0]));
   leaderboard.appendChild(c);
 });
 const trials=$("family-recent-trials");trials.replaceChildren();
 const recent=(f.recent_trials||[]).slice(-9).reverse();
 if(!recent.length)child(trials,"div","empty-family","ไม่มีผลทดลองใหม่ที่ยืนยันจาก Native MT5");
 recent.forEach(z=>{
   const row=div("family-trial-row "+(z.improvement?"new":""));
   child(row,"strong","",z.family_id);
   child(row,"span","",("Round "+z.round+" · Trial "+z.trial));
   child(row,"span","",fmt(z.pf,3)+" PF");
   child(row,"span","",fmt(z.dd,1)+"% DD");
   child(row,"span","",fmt(z.recovery,2)+" RF");
   child(row,"span",z.improvement?"found":"",z.improvement?"▲ NEW BEST":z.status==="RESEARCH_QUALIFIED"?"QUALIFIED":"NOT QUALIFIED");
   trials.appendChild(row);
 });
 t("family-best-updated",f.total_experiments+" Native MT5 experiments · "+f.systems_tested_ever+" systems tested");
}


let latestLoopStatus=null;
function deltaMinute(dateString){
 if(!dateString)return Infinity;
 const d=Date.parse(dateString);
 return Number.isFinite(d)?Math.max(0,(Date.now()-d)/60000):Infinity;
}
function shortThaiClock(value){
 if(!value)return "ไม่ระบุ";
 const d=new Date(value);
 return Number.isNaN(d.getTime())?"ไม่ระบุ":d.toLocaleString("th-TH",{timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"});
}
function refreshLiveMonitor(){
 if(!latestLoopStatus)return;
 const {f,d}=latestLoopStatus;
 const heartbeatAge=deltaMinute(d.last_heartbeat);
 const dataAge=deltaMinute(d.generated_at);
 const pending=!!(d.runner_status==="PAUSED");
 // 2x15-minute checkpoint window + propagation tolerance; distinguish stale evidence from PC offline.
 const fresh=heartbeatAge<=35 && dataAge<=35;
 const led=$("loop-status-light");
 led.classList.remove("healthy","stale","error");
 const heartbeatText=Number.isFinite(heartbeatAge)?("Heartbeat "+Math.floor(heartbeatAge)+" นาทีที่แล้ว"):"ไม่มี Heartbeat";
 if(pending){
   led.classList.add("stale");t("loop-online-status","PAUSED BY OWNER");t("loop-heartbeat-age",heartbeatText);
 }else if(fresh){
   led.classList.add("healthy");t("loop-online-status","PC LOOP ACTIVE");t("loop-heartbeat-age",heartbeatText);
 }else{
   led.classList.add("stale");t("loop-online-status","Checkpoint ล่าช้า · กำลังตรวจใหม่");
   t("loop-heartbeat-age","Heartbeat ล่าสุด "+heartbeatText+" · ยังสรุปไม่ได้ว่า PC ออฟไลน์");
 }
 const step=f.current_step||"QUEUE_READY";
 const testing=(f.state==="TESTING_MT5_PC" || step==="FIT_RUNNING" || step==="VAL_RUNNING");
 t("loop-test-status",!fresh?"ยังยืนยันสถานะ MT5 ไม่ได้":testing?"ทดสอบอยู่ ณ Checkpoint":"รอทดสอบรอบถัดไป");
 const last=d.last_test?"ผล MT5 ล่าสุด "+shortThaiClock(d.last_test):"รอผล MT5";
 t("loop-test-updated",last+(testing?" · ต้องรอ Checkpoint ใหม่":""));
 const checked=(f.pass_checked_count??Math.max(0,f.family_number-1));
 t("loop-pass-percent",fmt(f.system_progress_pct||0,1)+"% · "+checked+"/"+f.family_total);
 t("loop-pass-detail","ทดสอบครบ "+(f.pass_tested_count??0)+" · รอสร้าง EA "+(f.pass_pending_adapter_count??0));
 t("loop-pc-heartbeat",shortThaiClock(d.last_heartbeat));
 t("loop-data-delay","Checkpoint "+Math.floor(dataAge)+" นาทีที่ผ่านมา · PC ส่งสถานะ ~15 นาที");
}
setInterval(refreshLiveMonitor,20000);


const retryFeedButton=document.getElementById("retry-live-feed");
if(retryFeedButton)retryFeedButton.addEventListener("click",()=>loadRemote());


// Browser background-tab throttling must not turn a working PC red.
// Refresh immediately when the operator returns to this tab rather than waiting for a timer.
let lastForegroundReload=0;
function refreshTelemetryOnReturn(){
 if(document.visibilityState!=="visible" || !latestLoopStatus)return;
 const elapsed=Date.now()-lastForegroundReload;
 if(elapsed<12000)return;
 lastForegroundReload=Date.now();
 t("loop-online-status","กำลังยืนยัน Heartbeat ล่าสุด...");
 loadRemote();
}
document.addEventListener("visibilitychange",refreshTelemetryOnReturn);
window.addEventListener("focus",refreshTelemetryOnReturn);
window.addEventListener("pageshow",refreshTelemetryOnReturn);


// RDC "market exchange" board: purely visual motion of ALREADY RECORDED PC events.
// Honest security invariant: animated ticker is never evidence of a running MT5 process.
let researchMarketTapeEvidence=null;
let researchMarketTapeSource="CHECKING";
const eventTypeNames={
 TESTER_START:"MT5 TEST START",TESTER_EXIT:"MT5 TEST FINISH",
 FIT_START:"FIT START",FIT_COMPLETE:"FIT COMPLETE",VAL_START:"VAL START",VAL_COMPLETE:"VAL COMPLETE",
 NEW_FAMILY_BEST:"NEW BEST",FIRST_QUALIFIED_BEST:"FIRST QUALIFIED",
 FAMILY_CYCLE_COMPLETE:"INDICATOR COMPLETED",TESTED_NO_IMPROVEMENT:"NO IMPROVEMENT",
 NEW_HYPOTHESIS:"AI HYPOTHESIS",PROPOSED:"AI RESEARCH IDEA",
 EA_ADAPTER_REQUIRED:"EA ADAPTER PENDING",CYCLE_RESTART:"NEW RESEARCH ROUND",
 CHALLENGER_EVALUATED:"CHALLENGER REVIEW",STATUS_CHECKPOINT:"PC CHECKPOINT"
};
function thaiTapeClock(value){
 const timestamp=Date.parse(value||"");
 return Number.isFinite(timestamp)?new Date(timestamp).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Bangkok"}):"—";
}
function tapeFreshness(data){
 const age=deltaMinute(data?.last_heartbeat);
 const feedAge=deltaMinute(data?.generated_at);
 if(data?.runner_status==="PAUSED")return {kind:"paused",age,feedAge};
 if(!Number.isFinite(age)||!Number.isFinite(feedAge)||age>35||feedAge>35)return {kind:"stale",age,feedAge};
 return {kind:"verified",age,feedAge};
}
function marketTapeItem(label,value,state=""){
 const item=div("market-tape-item "+state);
 child(item,"small","",label);
 child(item,"b","",String(value));
 return item;
}
function setTapeLoop(id,records,copy){
 const root=$(id);if(!root)return;
 root.replaceChildren();
 for(let i=0;i<2;i++){
  const group=div(id==="market-tape-track"?"market-tape-runner":"market-event-runner");
  if(i===1)group.setAttribute("aria-hidden","true");
  records.forEach(record=>group.appendChild(copy(record)));
  root.appendChild(group);
 }
}
function markMarketTapeUnavailable(){
 const root=$("research-market-tape");
 if(!root)return;
 root.classList.remove("verified","paused");root.classList.add("stale");
 t("market-tape-mode","DATA FEED ERROR · ไม่ยืนยันสถานะ PC");
 t("market-tape-verified","Last verification unavailable");
 t("market-tape-source","Retrying verified PC checkpoint");
}
function renderResearchMarketTape(data,source){
 if(!data?.indicator_research)return markMarketTapeUnavailable();
 researchMarketTapeEvidence=data;
 researchMarketTapeSource=source;
 const f=data.indicator_research;
 const best=f.best_global;
 const trials=(f.recent_trials||[]),lastTrial=trials.length?trials[trials.length-1]:null;
 const events=(data.research_events||[]).filter(x=>x&&x.ts&&eventTypeNames[x.type]).slice(-22).reverse();
 const latestStart=events.find(e=>e.type==="TESTER_START"),latestEnd=events.find(e=>e.type==="TESTER_EXIT");
 const inProgress=latestStart&&(!latestEnd||Date.parse(latestStart.ts)>Date.parse(latestEnd.ts))&&deltaMinute(latestStart.ts)<3;
 const mt5Label=inProgress?"TESTER START SEEN":"STANDBY / NEXT TICK";
 const family=f.current_id||"—",round=f.round||"—";
 const totals=f.total_experiments??0;
 const bestLabel=best?best.family_id+" PF "+fmt(best.pf,3):"AWAIT QUALIFIED MODEL";
 const items=[
  ["PC","POP-FARM01 · MT5 ONLY","up"],
  ["RESEARCH ROUND","#"+round,"up"],
  ["CURRENT INDICATOR",family+" "+(f.family_number||0)+"/"+(f.family_total||26),"up"],
  ["PASS CHECKED",fmt(f.system_progress_pct||0,1)+"% · "+(f.pass_checked_count||0)+"/"+f.family_total,""],
  ["NATIVE EXPERIMENTS",String(totals),"up"],
  ["QUALIFIED FAMILIES",String(f.systems_with_qualified_best||0),"up"],
  ["NATIVE MT5 TESTER",mt5Label,inProgress?"up":"warning"],
  ["RECENT CHALLENGER",lastTrial?lastTrial.family_id+" PF "+fmt(lastTrial.pf,3):"WAITING",""],
  ["BEST HISTORICAL",bestLabel,best?"up":"warning"],
  ["BEST DD",best?fmt(best.dd,2)+"%":"N/A",""],
  ["BEST RECOVERY",best?fmt(best.recovery,2):"N/A",""],
  ["AUTO RESEARCH","NO DAILY QUOTA","up"],
  ["LIVE TRADING","HOLD","warning"]
 ];
 setTapeLoop("market-tape-track",items,x=>marketTapeItem(x[0],x[1],x[2]));
 const tapeEvents=[];
 for(const e of events){
   const desc=[thaiTapeClock(e.ts),e.family||"RDC",eventTypeNames[e.type]].join(" · ");
   tapeEvents.push({text:desc,style:e.status==="FAILED"?"error":e.status==="BLOCKED"?"warning":e.type==="NEW_FAMILY_BEST"?"up":""});
 }
 if(!tapeEvents.length){
  for(const t of (f.recent_trials||[]).slice(-10).reverse()){
   tapeEvents.push({text:thaiTapeClock(t.ts)+" · "+t.family_id+" Trial "+t.trial+" · PF "+fmt(t.pf,3)+" · DD "+fmt(t.dd,1)+"%"+(t.improvement?" · NEW BEST":""),style:t.improvement?"up":""});
  }
 }
 if(!tapeEvents.length)tapeEvents.push({text:"Waiting for timestamped PC tester events · display is not realtime MT5 feed",style:"warning"});
 setTapeLoop("market-event-track",tapeEvents,item=>child(div("market-event-item "+item.style),"span","",item.text).parentNode);
 t("market-tape-count",events.length+" recorded PC events · PC tests every 5-minute scheduler tick");
 refreshResearchMarketTapeStatus();
}
function refreshResearchMarketTapeStatus(){
 const d=researchMarketTapeEvidence;
 if(!d)return;
 const root=$("research-market-tape");
 if(!root)return;
 const f=tapeFreshness(d);
 root.classList.remove("verified","paused","stale");
 root.classList.add(f.kind);
 const mins=Number.isFinite(f.age)?Math.floor(f.age):"∞";
 const verified=f.kind==="verified";
 t("market-tape-mode",verified?"PC CONTROLLER VERIFIED · MT5 tester may be between jobs":
    f.kind==="paused"?"RESEARCH PAUSED BY OWNER":"CHECKPOINT STALE · PC NOT VERIFIED");
 t("market-tape-verified",verified?"HEARTBEAT "+mins+"m ago":f.kind==="paused"?"OWNER PAUSED":"LAST HEARTBEAT "+mins+"m ago");
 t("market-tape-source",researchMarketTapeSource+" · Evidence "+thaiTapeClock(d.generated_at)+" ICT · "+Math.floor(f.feedAge)+"m old");
}
setInterval(refreshResearchMarketTapeStatus,15000);


const leagueRoles={
 PROMOTER:"Tournament Orchestration / Next Challenger",
 RESEARCH_PLANNER:"Family & Parameter Hypotheses",
 PC_MT5_EXECUTOR:"MT5 Strategy Tester · POP-FARM01",
 JUDGE:"Risk-adjusted PF / DD / Recovery Gate",
 RED_TEAM:"Historical Leakage / Overfit / Low Sample",
 SCOREKEEPER:"Immutable Evidence & Hall of Fame"
};
function leagueNum(x,digits=2){
 return x===null||x===undefined?"—":Number(x).toLocaleString("en-US",{minimumFractionDigits:digits,maximumFractionDigits:digits});
}
function renderResearchLeague(l,d){
 const summary=$("league-overview-summary");
 const label=$("league-tournament-status");
 if(!l||l.schema!=="rdc.research.league.public.v1"){
  if(summary)summary.textContent="Promoter ยังไม่ส่งรายงาน League จาก PC — Loop Indicator ยังคงทำงานตามเดิม";
  if(label)label.textContent="LEAGUE EVIDENCE NOT YET PUBLISHED";
  return;
 }
 const age=deltaMinute(d.last_heartbeat);
 const fresh=age<=35&&deltaMinute(d.generated_at)<=35;
 if(label)label.textContent=fresh?"PROMOTER ACTIVE · EVIDENCE VERIFIED":"PROMOTER DATA STALE · VERIFY PC";
 const champ=l.champion;
 const name=champ?champ.family:"NO QUALIFIED CHAMPION";
 t("league-champion-name",name);
 t("league-champion-pf",champ?leagueNum(champ.pf,3):"—");
 t("league-champion-dd",champ?leagueNum(champ.dd,2)+"%":"—");
 t("league-champion-rf",champ?leagueNum(champ.recovery,2):"—");
 t("league-champion-score",champ?leagueNum(champ.score,4):"—");
 t("league-champion-sub",champ?"Native MT5 2025 Validation · Round "+champ.round+" / Trial "+champ.trial+" · "+
   champ.trades+" closed trades · ยังไม่ใช่ Production Champion":"กำลังรอ Challenger ที่ผ่านเกณฑ์ Judge");
 const next=l.next_fixture;
 const universe=l.experiment_universe||{};
 t("league-macd-protocols",universe.certified_macd_protocol_combinations||"—");
 t("league-other-protocols",(universe.certified_multifamily_protocol_combinations_per_family||"—")+" × 9");
 const degrees=universe.supported_dimensions?.adaptive_degrees;
 t("league-adaptive-levels",degrees?"D"+degrees.ready.join(" / D")+" READY":"—");
 t("league-backlog-count",(universe.ready_adapter_families||"—")+" EA READY · "+(universe.unavailable_adapter_families||"—")+" PENDING");
 const dimensions=next?.dimensions;
 t("league-dimension-status",dimensions?"MULTIDIMENSIONAL ACTIVE · ROUND "+next.round:"CERTIFIED MATRIX ARMS IN ROUND 4");
 t("league-next-dimension",dimensions?
    dimensions.protocol_id+" · FIT "+dimensions.fit_from+"–"+dimensions.fit_to+
    " · VAL "+dimensions.val_from+"–"+dimensions.val_to+" · "+dimensions.validation_type:
    "จบ Round 3 แล้ว Promoter เริ่มหมุนมิติ Timeframe, Rolling Window, Regime, Exit, ไม้ซ้อน และ Lot เฉพาะ EA ที่รองรับจริง");
 t("league-next-family",next?next.family+" · R"+next.round+" / T"+next.trial:"Await next fixture");
 const parameters=next?.params;
 const desc=parameters?"Fast "+parameters.fast+" · Slow "+parameters.slow+" · Period "+
       parameters.period+" · Threshold "+leagueNum(parameters.threshold,2):"EA Adapter required or not yet planned";
 const search=next?.parameter_search;
 t("league-next-params",desc+(search?
   " · EFFECTIVE: "+search.effective_fields.join(",")+" · "+search.design:
   "")+(next&&next.status==="NEEDS_EA_ADAPTER"?" · ยังไม่มี EA ทดสอบ":""));
 t("league-completed-count",String(l.matches_completed));
 t("league-qualified-count",l.judge_qualified+" qualified · "+l.promotions+" promotions");
 const last=l.latest_match||{};
 if(summary)summary.textContent="Round "+(d.indicator_research?.round||"—")+" · "+
      l.matches_completed+" MATCHES · Champion "+(name||"—")+" · Judge "+
      (last.status||"READY").replaceAll("_"," ");
 const grid=$("league-agent-grid");if(grid){
  grid.replaceChildren();
  Object.entries(leagueRoles).forEach(([id,role])=>{
   const agent=(l.agent_roles||{})[id]||{status:"READY"};
   const card=div("league-agent");
   child(card,"strong","",id.replaceAll("_"," "));
   child(card,"span","",role);
   child(card,"small","",agent.status||"UNKNOWN");
   grid.appendChild(card);
  });
 }
 const table=$("league-standings");if(table){
  table.replaceChildren();
  const rows=Object.entries(l.family_hall_of_fame||{}).sort((a,b)=>(b[1].score||0)-(a[1].score||0));
  if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=8;td.textContent="ยังไม่มีระบบที่ผ่าน Judge";tr.appendChild(td);table.appendChild(tr);}
  rows.forEach(([family,best],i)=>{
   const tr=document.createElement("tr");
   const values=[i+1,family,leagueNum(best.score,4),leagueNum(best.pf,3),leagueNum(best.dd,2)+"%",
     leagueNum(best.recovery,2),best.trades||"—",best.round||"—"];
   values.forEach(value=>{const cell=document.createElement("td");cell.textContent=String(value);tr.appendChild(cell)});
   const action=document.createElement("td"),inspect=document.createElement("button");
   inspect.type="button";inspect.className="model-open-button";inspect.textContent="🔍 ดู Entry/Exit";
   inspect.addEventListener("click",()=>{nav("overview");history.replaceState(null,"","#overview");openModelInspector(family);});
   action.appendChild(inspect);tr.appendChild(action);
   table.appendChild(tr);
  });
 }
 const tape=$("league-match-tape");if(tape){
  tape.replaceChildren();
  const list=(l.matches||[]).slice(-14).reverse();
  if(!list.length)child(tape,"div","empty-family","ยังไม่มีการแข่งขันที่มีหลักฐาน MT5");
  list.forEach(m=>{
   const promoted=m.status==="NEW_RESEARCH_LEAGUE_CHAMPION"||m.status==="NEW_FAMILY_CHAMPION";
   const wrapper=div("league-match "+(promoted?"promoted":m.status==="REJECTED"?"rejected":""));
   child(wrapper,"b","",m.family+" · R"+m.round+"/T"+m.trial);
   child(wrapper,"span","","PF "+leagueNum(m.pf,3)+" · DD "+leagueNum(m.dd,2)+"% · RF "+leagueNum(m.recovery,2));
   child(wrapper,"span","match-decision",m.status?.replaceAll("_"," ")||"UNKNOWN");
   if((m.flags||[]).length)child(wrapper,"span","flags","Red Team: "+m.flags.join(" · "));
   tape.appendChild(wrapper);
  });
 }
}


let latestModelInspections={};
function inspectorField(parent,label,value){
 const el=div("model-inspect-field");
 child(el,"span","",label);child(el,"strong","",String(value));
 parent.appendChild(el);
 return el;
}
function openModelInspector(fid){
 // Normalize family name from displayed registry to sanitized native MT5 record.
 const raw=String(fid||"").toUpperCase();
 const keys=Object.keys(latestModelInspections);
 const key=keys.includes(raw)?raw:keys.find(k=>raw===k||raw.startsWith(k+" ")||raw.startsWith(k+"_"));
 const panel=$("model-inspect-panel");
 if(!panel)return;
 panel.hidden=false;
 panel.scrollIntoView({block:"start",behavior:"smooth"});
 if(!key || !latestModelInspections[key]){
  t("model-inspect-title",String(fid)+" · รายละเอียดยังไม่พร้อม");
  t("model-inspect-proof","PC ไม่มีรายงาน Config + Deals ที่ยืนยันได้สำหรับรุ่นนี้");
  $("model-inspect-inputs").replaceChildren();
  $("model-inspect-rules").replaceChildren();
  $("model-inspect-trade-rows").replaceChildren();
  return;
 }
 const m=latestModelInspections[key],config=m.tester_config||{},logic=m.logic||{};
 const waveButton=document.getElementById("model-wave-jump");
 if(waveButton)waveButton.hidden=(key!=="MACD"||!wavePayload);
 t("model-inspect-title",key+" · "+(m.run||"")+(config.ea?" · "+config.ea:""));
 t("model-inspect-proof",m.status==="NATIVE_REPORT_VERIFIED"?
   "✓ NATIVE MT5 REPORT SHA-256 VERIFIED · "+String(m.report_sha256||"").slice(0,20)+"… · "+
   (config.timeframe||"H1")+" · "+(config.from||"?")+" → "+(config.to||"?"):
   "⚠ MT5 report/config not verified · no deal-based conclusions");
 const inputRoot=$("model-inspect-inputs");
 inputRoot.replaceChildren();
 for(const [k,v] of Object.entries(config.inputs||{}))inspectorField(inputRoot,k,v);
 t("model-inspect-note",logic.note||"No verified strategy source-rule available");
 const rules=$("model-inspect-rules");rules.replaceChildren();
 for(const [name,value] of [["BUY ENTRY",logic.long],["SELL ENTRY",logic.short],
   ["EXIT / REVERSE",logic.exit],["STOP / RISK",logic.risk],
   ["PYRAMIDING",logic.stacking],["SIGNAL TIMING",logic.signal_timing]]){
  if(value)inspectorField(rules,name,value);
 }
 if((logic.parameters_used||[]).length)inspectorField(rules,"ENTRY INPUTS REALLY USED",logic.parameters_used.join(" · "));
 const rows=$("model-inspect-trade-rows");rows.replaceChildren();
 const trades=m.status==="NATIVE_REPORT_VERIFIED"?(m.recent_closed_trades||[]):[];
 if(!trades.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=8;td.textContent="No SHA-verified closed MT5 deals for this exact Champion run";tr.appendChild(td);rows.appendChild(tr);}
 const n=x=>typeof x==="number"?x.toFixed(2):String(x||"—");
 trades.slice().reverse().forEach(z=>{
  const tr=document.createElement("tr");
  for(const val of [z.side,z.entry_time,n(z.entry_price),z.exit_time,n(z.exit_price),
    z.volume,n(z.net_thb),z.exit_reason]){
   const td=document.createElement("td");td.textContent=String(val);tr.appendChild(td);
  }
  rows.appendChild(tr);
 });
}
document.getElementById("model-inspect-close")?.addEventListener("click",()=>{
 document.getElementById("model-inspect-panel").hidden=true;
});

/* Research Meta-Learner: descriptive evidence, strictly SHADOW read-only. */
function renderMetaLearning(m){
  if(!m || m.schema!=="rdc.research.meta_learning.shadow.v1"){
    t("meta-coverage","PC Meta-Learner ยังไม่เผยแพร่ข้อมูล — Research Loop เดิมยังทำงาน");
    return;
  }
  t("meta-exp-count",String(m.experiment_count||0));
  t("meta-fit-weak",String(m.risk_diagnostics?.fit_weak??"—"));
  t("meta-high-dd",String(m.risk_diagnostics?.high_dd??"—"));
  t("meta-generalization",String(m.risk_diagnostics?.good_val_weak_fit??"—"));
  const root=$("meta-learnings");
  if(root){
    root.replaceChildren();
    (m.top_findings||[]).forEach(x=>{
      const card=div("meta-learning-item");
      child(card,"strong","",x.title||x.code);
      child(card,"span","",x.detail||"");
      child(card,"small","","NEXT RESEARCH QUESTION · "+(x.next||""));
      root.appendChild(card);
    });
  }
  t("meta-coverage",(m.unique_entry_configurations||0)+" ชุด Entry ที่ต่างกัน · "+
    (m.potential_redundant_trials||0)+" การทดลองอาจไม่ให้ Entry ใหม่ · "+
    "คำแนะนำจากหลักฐานเท่านั้น (SHADOW)");
}

/* Short-TF pilot is NEVER a confirmed League win or institutional HFT certification. */
function renderShortTfFeasibility(e){
 const root=$("shorttf-results");if(!root)return;
 root.replaceChildren();
 if(!e||e.schema!=="rdc.short_tf.feasibility.public.v1"){
  const tr=document.createElement("tr");const td=document.createElement("td");
  td.colSpan=8;td.textContent="Short-TF pilot evidence unavailable from PC";
  tr.appendChild(td);root.appendChild(tr);return;
 }
 for(const record of e.cases||[]){
  const tr=document.createElement("tr");
  const cells=[record.tf,record.model_id,""+record.entry_fast+" / "+record.entry_slow+" / "+record.entry_signal,
   record.trades??"—",record.pf??"—",
   record.equity_dd_pct===null?"—":Number(record.equity_dd_pct).toFixed(2),
   record.net_thb===null?"—":Number(record.net_thb).toFixed(2),
   record.outcome==="RESEARCH_NOT_PROFITABLE"?"NOT PROFITABLE · QA":"HISTORICAL ONLY"];
  cells.forEach((item,i)=>{
   const td=document.createElement("td");td.textContent=String(item);
   if(i===7)td.className=record.outcome==="RESEARCH_NOT_PROFITABLE"?"shorttf-loss":"";
   tr.appendChild(td);
  });
  root.appendChild(tr);
 }
 t("shorttf-summary",(e.cases?.length||0)+
    " TF ผ่าน Native PC Tester QA · มกราคม 2025 เพียง 3 วัน · Real Tick mode requested · "+
    "ไม่ใช่ HFT ระดับสถาบัน / ยังไม่รับรอง Tick completeness, Slippage หรือ Live latency");
}

/* Qwen3 vs signed-in ChatGPT: display only verified PRIVATE GitHub cross-review
 * aggregates, not untrusted hypothesis text, not live trading authorization. */
function renderQwenCrossReview(review){
 if(!review || review.schema!=="rdc.qwen.review.status.v1"){
  t("qwen-review-note","ไม่มีผล Independent Reviewer ล่าสุดจาก PC · Qwen3 ยังคง SHADOW");
  return;
 }
 t("qwen-review-posted",String(review.posted_total??0));
 t("qwen-review-total",String(review.completed_reviews??0));
 t("qwen-review-plausible",String(review.verdicts?.REVIEWED_PLAUSIBLE??0));
 t("qwen-review-pending",String(review.verdicts?.INSUFFICIENT_EVIDENCE??0));
 const msg=review.auto_permissions_granted?
  "REVIEW POLICY ALERT: ตรวจสิทธิ์ก่อนใช้จริง":
  "Qwen3: SHADOW ONLY · Codex ChatGPT: independent review on Notebook · "+
  "Rejected "+String(review.verdicts?.REJECTED??0)+" · "+
  "สอดคล้องกัน ≠ พิสูจน์ว่าถูกต้อง · ต้องผ่าน MT5 และ Human Gate ก่อน";
 t("qwen-review-note",msg);
}

/* Discovery Agent Manager publishes aggregate counts only; proposals remain PC-private. */
function renderDiscoveryManager(m){
 if(!m || m.schema!=="rdc.discovery_manager.queue.v1"){
  t("discovery-status","รอ Discovery Manager checkpoint จาก PC · คิว MT5 เดิมยังทำงานอิสระ");return;
 }
 t("discovery-total",String(m.total_discovered??0));
 t("discovery-ready",String(m.ready_for_promoter_revalidation??0));
 t("discovery-blocked",String(m.blocked_or_review??0));
 t("discovery-linked",String(m.completed_with_native_evidence??0));
 const node=$("discovery-categories");if(node){node.replaceChildren();
  const names={"CERTIFIED_FIXTURE":"EA-ready fixtures · await Promoter check",
   "HYPOTHESIS_TO_CERTIFY":"Failure-driven hypotheses",
   "EA_ADAPTER_BACKLOG":"EA adapters to build",
   "CAPABILITY_BACKLOG":"New adaptive capabilities",
   "SHORT_TF_STRESS_BACKLOG":"M1–M30 cost & tick QA",
   "PLANNING_BLOCKER":"Planner blockers",
   "EXTERNAL_AI_QUANT_RESEARCH":"Public AI / Quant / GitHub / arXiv"};
  for(const [kind,n] of Object.entries(m.pending_by_kind||{})){
   const el=document.createElement("div");el.className="discovery-category";
   const title=document.createElement("span");title.textContent=names[kind]||kind;
   const count=document.createElement("strong");count.textContent=String(n);
   el.append(title,count);node.appendChild(el);
  }
 }
 const ts=m.generated_utc?new Date(m.generated_utc).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}):"—";
 t("discovery-status","อัปเดตจาก PC "+ts+
   " · "+String(m.pending_total||0)+" cases pending · "+
   "ผลจริงต้องผ่าน MT5 FIT/VAL & Native SHA ก่อน · ไม่แทรกเคสที่ยังไม่รับรอง");
}

/* Browser read-only citation radar, safe public source URLs only, no remote execution. */
function renderExternalResearch(q){
 const root=$("discovery-external-examples");
 if(!root)return;
 root.replaceChildren();
 if(!q||q.schema!=="rdc.external.discovery.v1"){
  t("discovery-external-count","รอผลค้นหา Public Sources จาก PC");return;
 }
 t("discovery-external-count",String(q.total_external_cases||0)+
  " เคสอ้างอิง · GitHub + arXiv · "+(q.status||"UNKNOWN")+" (QA REQUIRED)");
 const sources=(q.cases_sample||[]).slice(0,6);
 for(const s of sources){
  const url=String(s.source_url||"");
  let ok=false;
  try{const v=new URL(url);ok=v.protocol==="https:"&&
    ["github.com","arxiv.org","export.arxiv.org"].includes(v.hostname)&&
    !v.username&&!v.password;}catch(err){}
  const box=document.createElement("div");box.className="discovery-public-item";
  const head=document.createElement(ok?"a":"span");
  if(ok){head.href=url;head.target="_blank";head.rel="noopener noreferrer";}
  head.textContent=String(s.source_title||"Public research")+
    (ok?" ↗":"");
  const meta=document.createElement("small");
  meta.textContent=String(s.source||"PUBLIC")+" · "+
    String(s.objective||"RESEARCH")+" · LICENSE: "+String(s.license_id||"UNKNOWN");
  box.append(head,meta);root.append(box);
 }
}


/* WAVE GRAPH V1 — actual MT5 historical GOLDmicro H1 bars, confirmed closed-bar
 * MACD reconstruction, and SHA-verified Strategy Tester Buy/Sell/Exit deals.
 * Zigzag swing / early-mid-late is strictly HINDSIGHT only, not an AI trade signal.
 * This UI cannot place orders; no remote libraries or untrusted scripts. */
let wavePayload=null;
let waveTradeId=null;
let waveView=null;
let waveHoverIdx=null;
const waveFmt=(t)=>new Date(Number(t)*1000).toISOString().slice(0,16).replace("T"," ");
function waveText(id,txt){const el=document.getElementById(id);if(el)el.textContent=String(txt);}
function wavePairList(p){
 const sorted=(p.events||[]).filter(x=>x.kind.endsWith("_ENTRY")).sort((a,b)=>a.time-b.time);
 return sorted.map(a=>({...a,exit:(p.events||[]).find(x=>x.id===a.id&&x.kind.includes("EXIT"))||null}));
}
function renderWaveGraph(p){
 if(!p||p.schema!=="rdc.wave.graph.v1"||!p.bars?.length||!p.events?.length){
  wavePayload=null;
  waveText("wave-graph-status","AWAITING VERIFIED MT5 WAVE DATA");
  waveText("wave-graph-provenance","ยังไม่มีกราฟพร้อมหลักฐานจาก PC · ไม่สร้าง OHLC หรือ Entry/Exit สมมติ");
  return;
 }
 if(p.model_id!=="MACD"||p.trading_authorized!==false || p.bars.length<300) return;
 const same=wavePayload&&wavePayload.report_sha256===p.report_sha256&&
     wavePayload.bars.length===p.bars.length;
 wavePayload=p;
 const pairs=wavePairList(p);
 if(!pairs.length)return;
 if(!same||waveTradeId===null||!pairs.some(x=>x.id===waveTradeId))
   waveTradeId=pairs[pairs.length-1].id;
 const select=document.getElementById("wave-trade-select");
 if(select){
  select.replaceChildren();
  for(const tr of pairs){
   const opt=document.createElement("option");opt.value=String(tr.id);
   opt.textContent=waveFmt(tr.time)+" · "+tr.side+" · "+Number(tr.price).toFixed(2)+
      (tr.exit?" · "+Number(tr.exit.pnl||0).toFixed(2)+" THB":"");
   select.appendChild(opt);
  }
  select.value=String(waveTradeId);
 }
 waveText("wave-graph-status",p.timeframe+" · "+p.model_run+" · "+p.events.length+
    " VERIFIED DEAL EVENTS");
 waveText("wave-graph-provenance","GOLDmicro H1 · MACD "+p.parameters.fast+"/"+
    p.parameters.slow+"/"+p.parameters.signal+" · "+p.bars.length+
    " REAL MT5 OHLC bars · Native report SHA "+p.report_sha256.slice(0,16)+"… · "+
    p.summary.historical_entries+" closed historical trades · Price-aligned time UTC"+
    (p.trade_report_utc_offset_hours>=0?"+":"")+p.trade_report_utc_offset_hours);
 drawWaveGraph();
}
function waveCanvas(id,height){
 const el=document.getElementById(id);if(!el)return null;
 const width=Math.max(330,Math.round(el.getBoundingClientRect().width||850));
 const ratio=Math.min(2,window.devicePixelRatio||1);
 el.width=Math.round(width*ratio);el.height=Math.round(height*ratio);
 el.style.height=height+"px";
 const ctx=el.getContext("2d");if(!ctx)return null;
 ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.clearRect(0,0,width,height);
 return {el,ctx,width,height};
}
function waveLine(ctx,arr,mapper,color,width=1.5){
 if(arr.length<2)return;
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
 arr.forEach((a,i)=>{const [x,y]=mapper(a,i);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
 ctx.stroke();
}
function drawWaveGraph(){
 if(!wavePayload)return;
 const p=wavePayload,trade=wavePairList(p).find(x=>x.id===waveTradeId);
 if(!trade)return;
 const ext=trade.exit?.time||trade.time+24*3600;
 const begin=trade.time-55*3600, end=ext+38*3600;
 let view=p.bars.filter(b=>b.time>=begin&&b.time<=end);
 if(view.length<20)view=p.bars.slice(-125);
 waveView=view;waveHoverIdx=null;
 const lo=Math.min(...view.map(b=>b.low));
 const hi=Math.max(...view.map(b=>b.high));
 const margin=(hi-lo)*0.09||1, floor=lo-margin,ceil=hi+margin;
 const mvals=view.flatMap(b=>[b.macd,b.signal]),limit=Math.max(.15,...mvals.map(Math.abs))*1.17;
 const price=waveCanvas("wave-price-canvas",295),macd=waveCanvas("wave-macd-canvas",185);
 if(!price||!macd)return;
 const left=56,right=16;
 const start=view[0].time,stop=view[view.length-1].time+3600;
 const xval=(t,w)=>left+(w-left-right)*(t-start)/(stop-start);
 const xp=(t)=>xval(t,price.width),xm=(t)=>xval(t,macd.width);
 const yp=(y)=>18+(price.height-49)*(ceil-y)/(ceil-floor);
 const ym=(y)=>15+(macd.height-44)*(limit-y)/(2*limit);
 const grid=(cv,min,max,fmt,yMap)=>{
  const {ctx,width,height}=cv;
  ctx.font="10px system-ui";ctx.fillStyle="#8eabb7";ctx.lineWidth=.6;
  for(let i=0;i<=4;i++){
   const val=min+(max-min)*(i/4),y=yMap(val);
   ctx.strokeStyle="rgba(142,171,183,.18)";ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();
   ctx.fillText(fmt(val),3,y+4);
  }
  for(let k=0;k<=5;k++){
   const tt=start+(stop-start)*k/5,xx=xval(tt,width);
   ctx.strokeStyle="rgba(142,171,183,.11)";ctx.beginPath();ctx.moveTo(xx,15);ctx.lineTo(xx,height-27);ctx.stroke();
   ctx.fillStyle="#8eabb7";ctx.fillText(waveFmt(tt).slice(5,16),Math.min(xx-20,width-85),height-6);
  }
 };
 grid(price,floor,ceil,v=>v.toFixed(0),yp);
 grid(macd,-limit,limit,v=>v.toFixed(1),ym);
 const pc=price.ctx,mc=macd.ctx;
 // Closed-bar phase shading is observational; negative/positive signal only.
 view.forEach((bar,i)=>{
  const next=view[i+1],xx=xp(bar.time),xnext=xp(next?.time??bar.time+3600);
  pc.fillStyle=bar.phase.startsWith("BULL")?"rgba(48,154,111,.045)":"rgba(206,90,103,.045)";
  pc.fillRect(xx,17,Math.max(1,xnext-xx),price.height-48);
 });
 const candleWidth=Math.max(1,Math.min(8,(price.width-left-right)/view.length*.65));
 view.forEach(bar=>{
  const xx=xp(bar.time+1800),up=bar.close>=bar.open;
  pc.strokeStyle=up?"#5dcfa7":"#ea8895";pc.fillStyle=up?"#49ba95":"#d97686";
  pc.lineWidth=1;pc.beginPath();pc.moveTo(xx,yp(bar.high));pc.lineTo(xx,yp(bar.low));pc.stroke();
  pc.fillRect(xx-candleWidth/2,Math.min(yp(bar.open),yp(bar.close)),candleWidth,
   Math.max(1,Math.abs(yp(bar.open)-yp(bar.close))));
 });
 if(document.getElementById("wave-pivots-toggle")?.checked){
  const pivot=p.pivots.filter(z=>z.time>=start&&z.time<=stop);
  if(pivot.length>=2){
   waveLine(pc,pivot,z=>[xp(z.time+1800),yp(z.price)],"#c29eea",1.8);
   pivot.forEach(z=>{
    const xx=xp(z.time+1800),yy=yp(z.price);
    pc.fillStyle=z.type==="HIGH"?"#eec5fa":"#a8b8ff";
    pc.beginPath();pc.arc(xx,yy,2.3,0,Math.PI*2);pc.fill();
   });
  }
 }
 // MACD main and signal are computed from the same native H1 close bars.
 mc.strokeStyle="#71828c";mc.lineWidth=1;
 mc.beginPath();mc.moveTo(left,ym(0));mc.lineTo(macd.width-right,ym(0));mc.stroke();
 waveLine(mc,view,z=>[xm(z.time+1800),ym(z.macd)],"#70beee",2);
 waveLine(mc,view,z=>[xm(z.time+1800),ym(z.signal)],"#f6b66c",1.7);
 for(const b of view){
  if(!b.setup)continue;
  const xx=xm(b.time+3600);
  mc.strokeStyle=b.setup==="BUY_SETUP"?"rgba(80,222,155,.8)":"rgba(238,120,131,.8)";
  mc.setLineDash([3,3]);mc.lineWidth=1;mc.beginPath();mc.moveTo(xx,19);mc.lineTo(xx,macd.height-32);mc.stroke();mc.setLineDash([]);
  mc.fillStyle=b.setup==="BUY_SETUP"?"#72dab4":"#f4a2af";mc.font="10px system-ui";
  mc.fillText(b.setup==="BUY_SETUP"?"▲":"▼",xx-4,ym(0)-5);
 }
 if(document.getElementById("wave-events-toggle")?.checked){
  const visible=(p.events||[]).filter(z=>z.time>=start&&z.time<=stop+3600);
  visible.forEach(ev=>{
   const xx=xp(ev.time),yy=yp(ev.price),entry=ev.kind.endsWith("_ENTRY"),selected=ev.id===waveTradeId;
   const color=ev.kind.startsWith("BUY")?"#53eab2":ev.kind.startsWith("SELL")?"#f18197":
      ev.kind==="SL_EXIT"?"#cda5fd":"#ffcb73";
   pc.fillStyle=color;pc.strokeStyle="#0d2530";pc.lineWidth=selected?2:1;
   const rad=selected?6:4.4;
   pc.beginPath();
   if(entry){pc.moveTo(xx,yy-rad);pc.lineTo(xx+rad,yy+rad);pc.lineTo(xx-rad,yy+rad);}
   else {pc.moveTo(xx-rad,yy-rad);pc.lineTo(xx+rad,yy-rad);pc.lineTo(xx+rad,yy+rad);pc.lineTo(xx-rad,yy+rad);}
   pc.closePath();pc.fill();pc.stroke();
   if(selected){
    pc.font="bold 11px system-ui";pc.fillStyle=color;
    const label=entry?(ev.side==="BUY"?"BUY":"SELL"):(ev.kind==="SL_EXIT"?"SL":"EXIT");
    pc.fillText(label,Math.min(price.width-58,Math.max(60,xx-11)),Math.max(17,yy-11));
    pc.strokeStyle=color;pc.setLineDash([3,5]);pc.globalAlpha=.45;
    pc.beginPath();pc.moveTo(xx,17);pc.lineTo(xx,price.height-30);pc.stroke();
    pc.setLineDash([]);pc.globalAlpha=1;
   }
  });
 }
 const pnl=trade.exit?.pnl;
 const score=trade.wave_class_hindsight||"UNCLASSIFIED";
 const stats=document.getElementById("wave-stats");
 if(stats){
  stats.replaceChildren();
  for(const [label,value] of [
   ["TRADE",trade.side+" @ "+trade.price.toFixed(2)],
   ["EXIT",trade.exit?trade.exit.kind.replace("_"," ")+" @ "+trade.exit.price.toFixed(2):"NOT PAIRED"],
   ["NET",typeof pnl==="number"?pnl.toFixed(2)+" THB":"—"],
   ["WAVE POSITION*",score],
   ["MACD",p.parameters.fast+" / "+p.parameters.slow+" / "+p.parameters.signal]
  ]){
   const node=document.createElement("div");const name=document.createElement("span");
   name.textContent=label;const valueEl=document.createElement("strong");
   valueEl.textContent=value;node.append(name,valueEl);stats.append(node);
  }
 }
 waveText("wave-hover","Trade "+trade.report_time+" → "+(trade.exit?.report_time||"—")+
  " · "+trade.side+" · "+(typeof pnl==="number"?pnl.toFixed(2)+" THB":"—")+
  " · *Wave position is retrospective (future pivot confirmation), NOT an entry signal");
 wavePriceMap={start,stop,view,price,macd,xp,xm,yp,ym,trade};
}
let wavePriceMap=null;
function wavePointer(ev,fromMacd){
 const p=wavePayload,map=wavePriceMap;if(!p||!map)return;
 const canvas=fromMacd?map.macd.el:map.price.el;
 const x=ev.clientX-canvas.getBoundingClientRect().left;
 const t=map.start+(x-56)/(canvas.getBoundingClientRect().width-72)*(map.stop-map.start);
 const b=map.view.reduce((best,v)=>Math.abs(v.time-t)<Math.abs(best.time-t)?v:best,map.view[0]);
 const nearby=p.events.filter(z=>Math.abs(z.time-b.time)<3600);
 const source=nearby.length?nearby.map(z=>z.kind+" @ "+z.price+
    " ["+z.reason+"]").join(" | "):"No executed trade on this candle";
 waveText("wave-hover",waveFmt(b.time)+" · OHLC "+[b.open,b.high,b.low,b.close].join(" / ")+
  " · MACD "+b.macd+" / Signal "+b.signal+" / Hist "+b.hist+
  " · "+b.phase+(b.setup?" · "+b.setup+" (closed bar)":"")+" · "+source);
}
for(const [id,isMacd] of [["wave-price-canvas",false],["wave-macd-canvas",true]]){
 document.getElementById(id)?.addEventListener("mousemove",ev=>wavePointer(ev,isMacd));
}
function changeWaveTrade(n){
 if(!wavePayload)return;
 const list=wavePairList(wavePayload);let idx=list.findIndex(t=>t.id===waveTradeId);
 idx=(idx+n+list.length)%list.length;waveTradeId=list[idx].id;
 const select=document.getElementById("wave-trade-select");if(select)select.value=String(waveTradeId);
 drawWaveGraph();
}
document.getElementById("wave-trade-select")?.addEventListener("change",e=>{
 waveTradeId=Number(e.target.value);drawWaveGraph();
});
document.getElementById("wave-previous")?.addEventListener("click",()=>changeWaveTrade(-1));
document.getElementById("wave-next")?.addEventListener("click",()=>changeWaveTrade(1));
for(const id of ["wave-pivots-toggle","wave-events-toggle"])
 document.getElementById(id)?.addEventListener("change",()=>drawWaveGraph());
document.getElementById("model-wave-jump")?.addEventListener("click",()=>{
 nav("league");window.history.replaceState(null,"","#league");
 document.getElementById("wave-graph-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
 drawWaveGraph();
});
window.addEventListener("resize",()=>{
 if(document.getElementById("page-league")?.classList.contains("active")&&wavePayload)
  drawWaveGraph();
});


/* AGENT MANAGER DAILY AUDIT:
 * Nine process roles across PC / NB, not 9 autonomous independent LLMs.
 * Actual structured dispatch and outcome evidence, without exposing
 * private natural-language prompts or broker identifiers. */
let managerAuditPayload=null;
const managerRoleLabels={
 promoter:"Promoter / Planner",executor:"Native MT5 Executor",
 judge:"Judge / Red Team",scorekeeper:"Scorekeeper / Evidence",
 discovery:"Discovery Manager",external:"External Research Radar",
 qwen:"Qwen3 Hypothesis",reviewer:"ChatGPT Independent Reviewer",
 web:"Web / Telemetry Publisher"
};
function managerNum(v){return typeof v==="number"?v.toLocaleString("en-US"):"—";}
function managerAuditTime(ts){
 try{return new Date(ts).toLocaleTimeString("th-TH",{timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});}
 catch(e){return "—";}
}
function renderManagerDailyAudit(payload){
 if(!payload||payload.schema!=="rdc.agent_manager.daily_audit.v1"){
  managerAuditPayload=null;
  t("manager-audit-health","AWAITING VERIFIED PC AUDIT");
  t("manager-daily-verdict","ยังไม่ได้รับผลประเมินรายวันจาก PC · ไม่สร้างคะแนนสมมติ");
  return;
 }
 managerAuditPayload=payload;
 const dates=$("manager-audit-date"),roles=$("manager-audit-role");
 if(!dates||!roles)return;
 const previouslyChosen=dates.value;
 const prevRole=roles.value;
 dates.replaceChildren();
 for(const date of payload.dates){
  const option=document.createElement("option");option.value=date;option.textContent=date+" (ICT)";
  dates.appendChild(option);
 }
 dates.value=payload.dates.includes(previouslyChosen)?previouslyChosen:payload.dates[0];
 roles.replaceChildren();
 const all=document.createElement("option");all.value="ALL";all.textContent="ทุก Sub-agent";roles.appendChild(all);
 const legend=payload.days.find(d=>d.date===dates.value)?.roles||[];
 for(const item of legend){
  const opt=document.createElement("option");opt.value=item.role_id;opt.textContent=item.label;
  roles.appendChild(opt);
 }
 roles.value=Object.hasOwn(managerRoleLabels,prevRole)?prevRole:"ALL";
 showManagerDay();
}
function showManagerDay(){
 const data=managerAuditPayload,selector=$("manager-audit-date"),filter=$("manager-audit-role");
 if(!data||!selector)return;
 const day=data.days.find(x=>x.date===selector.value);if(!day)return;
 const s=day.summary||{},ex=day.roles.find(x=>x.role_id==="executor");
 const measured=Number(s.native_technical_attempts||0),success=Number(s.native_phase_success||0);
 const pct=measured?(100*success/measured).toFixed(1)+"%":"N/A";
 t("manager-audit-health",(day.is_partial_today?"TODAY · IN PROGRESS":"HISTORICAL DAY")+
   " · "+day.date);
 t("manager-audit-asof","Checkpoint "+
   new Date(data.generated_at).toLocaleString("th-TH",{timeZone:"Asia/Bangkok",
    year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})+
   " · "+(day.is_partial_today?"ข้อมูลระหว่างวัน":"ครบตาม Ledger ที่มี"));
 t("manager-kpi-native",managerNum(s.native_completed_experiments));
 t("manager-kpi-reliability",pct);
 t("manager-kpi-plans",managerNum(s.promoter_plans));
 t("manager-kpi-quality",managerNum(s.strategy_qualified)+
   " / "+managerNum(s.native_completed_experiments));
 const failed=Number(s.native_phase_fail_or_stale||0),
       blocked=Number(s.promoter_adapter_blocked||0),
       rejected=Number(s.strategy_not_qualified||0);
 const summary="Agent Manager สรุป: "+measured+" native MT5 phase attempts · "+
   success+" fresh reports · "+failed+" failed/stale attempts · "+
   blocked+" EA adapter blocks · "+rejected+" strategies not qualified (not execution failures). "+
   "Recommendations are based on logs, not agent intentions. Trading HOLD.";
 t("manager-daily-verdict",summary);
 const cards=$("manager-roles");if(cards){cards.replaceChildren();
  for(const r of day.roles){
   const card=document.createElement("article");card.className="manager-role-card";
   const name=document.createElement("strong");name.textContent=r.label;
   const platform=document.createElement("small");platform.textContent=r.runtime;
   const counts=document.createElement("div");counts.className="manager-role-counts";
   counts.textContent="Recorded "+managerNum(r.commands)+" · Completed/recorded "+
      managerNum(r.completed)+" · Blocked "+managerNum(r.blocked);
   const rate=document.createElement("div");rate.className="manager-role-ratio";
   rate.textContent=r.reliability_pct===null?
     "NO MEASURABLE ACCURACY SCORE · "+r.reliability_basis:
     r.reliability_pct.toFixed(1)+"% · "+r.reliability_basis;
   card.append(name,platform,counts,rate);
   if(typeof r.reliability_pct==="number"){
    const track=document.createElement("div");track.className="manager-role-track";
    const fill=document.createElement("div");fill.className="manager-role-fill";
    fill.style.width=Math.max(0,Math.min(100,r.reliability_pct))+"%";
    track.appendChild(fill);card.appendChild(track);
   }
   const metrics=document.createElement("div");metrics.className="manager-role-metrics";
   for(const [key,value] of Object.entries(r.metrics||{}).slice(0,4)){
    const span=document.createElement("span");
    span.textContent=key.replaceAll("_"," ")+": "+String(value===null?"—":value);
    metrics.appendChild(span);
   }
   const desc=document.createElement("p");desc.textContent=r.assessment;
   const origin=document.createElement("small");origin.textContent="EVIDENCE: "+r.basis;
   card.append(metrics,desc,origin);cards.appendChild(card);
  }
 }
 const recRoot=$("manager-recommendations");if(recRoot){recRoot.replaceChildren();
  for(const rec of day.top_recommendations||[]){
   const box=document.createElement("div");
   box.className="manager-action "+(rec.severity==="HIGH"?"manager-severity-high":"");
   const head=document.createElement("strong");head.textContent=
    rec.severity+" · "+(managerRoleLabels[rec.role]||rec.role);
   const action=document.createElement("p");action.textContent=rec.action;
   const evidence=document.createElement("small");evidence.textContent="Evidence: "+rec.evidence;
   box.append(head,action,evidence);recRoot.appendChild(box);
  }
 }
 const role=filter?.value||"ALL";
 const timeline=(day.dispatch_timeline||[]).filter(row=>role==="ALL"||row.agent===role);
 const tb=$("manager-audit-rows");if(tb){tb.replaceChildren();
  for(const entry of timeline){
   const tr=document.createElement("tr");
   for(const value of [managerAuditTime(entry.ts),managerRoleLabels[entry.agent]||entry.agent,
     entry.command,entry.status+" · "+entry.outcome,entry.source]){
    const td=document.createElement("td");td.textContent=String(value||"—");tr.appendChild(td);
   }
   tb.appendChild(tr);
  }
  if(!timeline.length){
   const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;
   td.textContent="No recorded sampled dispatch for this role on selected date";tr.appendChild(td);tb.appendChild(tr);
  }
 }
 t("manager-audit-count",timeline.length+" visible / "+
   managerNum(day.total_dispatch_rows_before_sampling)+" ledger-mapped events"+
   (role==="ALL"?"":" (role filtered)"));
 t("manager-audit-limitations","Observed scope: "+
   (data.sources||[]).join(", ")+". Not measured: "+
   (day.unmeasured||[]).join("; ")+
   ". All dates use Thailand ICT (+07). Timeline is latest stratified up to 20 entries per role; full-day KPIs use all relevant log records.");
}
$("manager-audit-date")?.addEventListener("change",showManagerDay);
$("manager-audit-role")?.addEventListener("change",showManagerDay);


/* Native research Parameter Finder. Full historical ledger, not limited to
 * current winners. No global ranking across different protocols or 3-day pilots. */
let parameterCatalog=null;
function paramNumber(value,d=2){
 return typeof value==="number"&&Number.isFinite(value)?
   value.toLocaleString("en-US",{maximumFractionDigits:d,minimumFractionDigits:d}):"—";
}
function paramSelectFill(el,values,select){
 if(!el)return;
 el.replaceChildren();
 for(const [id,text] of values){
  const opt=document.createElement("option");opt.value=id;opt.textContent=text;el.appendChild(opt);
 }
 if(select&&values.some(x=>x[0]===select))el.value=select;
}
function renderParameterFinder(payload){
 if(!payload||payload.schema!=="rdc.research.parameter_finder.v1"){
  parameterCatalog=null;
  t("param-status","AWAITING VERIFIED NATIVE RESULTS");
  t("param-result-verdict","ยังไม่มีผลอ้างอิงจาก PC · จะไม่สร้างค่า Parameter หรือคะแนนสมมติ");
  return;
 }
 const old=parameterCatalog;
 parameterCatalog=payload;
 const families=$("param-family"),tf=$("param-tf");
 if(!families||!tf)return;
 const oldFamily=families.value||"MACD",oldTf=tf.value||"M1";
 paramSelectFill(families,(payload.families||[]).map(x=>[x,x]),oldFamily);
 paramSelectFill(tf,(payload.timeframes||[]).map(x=>[x,x]),oldTf);
 if(!old && (payload.families||[]).includes("MACD") && (payload.timeframes||[]).includes("M1")){
  families.value="MACD";tf.value="M1";
 }
 t("param-status",payload.total_native+" NATIVE FIT+VAL / "+payload.total_pilot+" PILOTS");
 refreshParameterGroups();
}
function refreshParameterGroups(){
 if(!parameterCatalog)return;
 const family=$("param-family")?.value,tf=$("param-tf")?.value;
 const rows=parameterCatalog.rows.filter(r=>r.family===family&&r.tf===tf);
 const groups=[...new Set(rows.map(r=>r.group))].sort();
 const g=$("param-group"),old=g?.value;
 paramSelectFill(g,[["ALL","All protocols · rankings separated"],...groups.map(k=>{
  const item=rows.find(r=>r.group===k);
  return [k,(item.window_id||"LEGACY")+" · "+(item.protocol_id||"PILOT")+
     " · Model "+item.test_model];
 })],old);
 updateParameterResults();
}
function updateParameterResults(){
 if(!parameterCatalog)return;
 const cat=parameterCatalog, family=$("param-family")?.value||"MACD";
 const tf=$("param-tf")?.value||"M1",group=$("param-group")?.value||"ALL";
 const sorting=$("param-sort")?.value||"pf";
 const filt={fast:$("param-fast")?.value,slow:$("param-slow")?.value,
             period:$("param-signal")?.value};
 let all=cat.rows.filter(r=>r.family===family&&r.tf===tf&&
   (group==="ALL"||r.group===group));
 const matching=all.filter(r=>Object.entries(filt).every(([k,v])=>
    v===""||v===undefined||v===null||Number(r.params[k])===Number(v)));
 const testedUnique=new Set(matching.map(r=>["fast","slow","period"].map(k=>r.params[k]).join("/")));
 const groups=[...new Set(matching.map(r=>r.group))].sort();
 const pilot=matching.filter(r=>r.evidence==="SHA256_NATIVE_MT5_SINGLE_3DAY_PILOT");
 const official=matching.filter(r=>r.evidence==="NATIVE_MT5_FIT_VAL_HASHED");
 const selectableGroup=group!=="ALL",gInfo=cat.groups?.[group];
 const best=selectableGroup&&gInfo?.valid_ranking?
   matching.find(r=>r.id===gInfo.winner_id):null;
 t("param-count",String(matching.length));
 t("param-distinct",String(testedUnique.size));
 t("param-groups",String(groups.length));
 t("param-best-flag",best?"GROUP BEST":"NOT PROVEN");
 t("param-result-count",matching.length+" results · "+
   official.length+" FIT+VAL / "+pilot.length+" Pilot");
 const hasNoNative=official.length===0;
 let msg;
 if(matching.length===0)msg="ไม่พบผล MT5 ตาม Indicator / TF / Parameter ที่ระบุ · ไม่สามารถเลือก Best ได้";
 else if(tf==="M1"&&family==="MACD"&&hasNoNative){
  msg="MACD M1: มีเพียง "+pilot.length+" Pilot (6–9 Jan 2025), ยังไม่มี FIT+VAL สำหรับการเปรียบเทียบพารามิเตอร์ · ไม่มี Best M1 ที่ยืนยันได้. "+
    "ต้องทดสอบหลายชุดด้วย Rolling Windows และ realistic spread/slippage/tick QA ก่อน";
 }else if(best){
  msg="Best OBSERVED within exact certified protocol: "+family+
    "("+best.params.fast+","+best.params.slow+","+best.params.period+")"+
    " · VAL PF "+paramNumber(best.val.pf,3)+
    " · VAL DD "+paramNumber(best.val.dd)+"%"+
    " · SCORE "+paramNumber(best.score,4)+
    " · Historical validation reused / NOT independent forward proof";
 }else if(!selectableGroup){
  msg="พบ "+matching.length+" ผล · แสดงแยกเป็น "+groups.length+
    " Protocol Groups ห้ามเลือก Best ข้าม Window, Timeframe, Lot, Exit, Adaptive Mode หรือ Test Model. "+
    "เลือก COMPARISON PROTOCOL เพื่อหาอันดับเฉพาะกลุ่ม";
 }else{
  msg="กลุ่มนี้ยังไม่มี Qualified Winner ที่มีพารามิเตอร์อย่างน้อย 2 ชุดและ FIT+VAL เปรียบเทียบกันได้ · "+
    "ไม่ประกาศ Best จากผลเดียวหรือผล Pilot";
 }
 t("param-result-verdict",msg);
 const root=$("param-result-rows");if(!root)return;
 root.replaceChildren();
 if(!matching.length){
  const tr=document.createElement("tr"),td=document.createElement("td");
  td.colSpan=10;td.textContent="NO NATIVE RESULTS FOUND — ไม่สร้างผลจำลอง";tr.appendChild(td);root.appendChild(tr);
 }
 const compare=(a,b)=>{
  const getter=(r)=>r.val?.[sorting];
  const av=getter(a),bv=getter(b);
  if(av===null||av===undefined)return 1;
  if(bv===null||bv===undefined)return -1;
  const diff=sorting==="dd"?av-bv:bv-av;
  return diff||String(a.id).localeCompare(String(b.id));
 };
 for(const groupKey of groups){
  const groupRows=matching.filter(r=>r.group===groupKey).sort(compare);
  const groupInfo=cat.groups?.[groupKey];
  const heading=document.createElement("tr");heading.className="param-group-heading";
  const th=document.createElement("td");th.colSpan=10;
  th.textContent=(groupRows[0].window_id||"LEGACY")+" · "+groupRows[0].protocol_id+
   " · Test Model "+groupRows[0].test_model+" · "+groupRows.length+
   " shown · "+(groupInfo?.valid_ranking?"HAS A QUALIFIED COMPARABLE WINNER":
       "NO CERTIFIED PARAMETER WINNER");
  heading.appendChild(th);root.appendChild(heading);
  for(const row of groupRows.slice(0,100)){
   const tr=document.createElement("tr");
   const winner=groupInfo?.valid_ranking&&row.id===groupInfo.winner_id;
   if(winner)tr.className="param-observed-winner";
   const pp=row.params||{};
   const run=row.source==="PC_SHORT_TF_REAL_TICKS_PILOT"?"PILOT 3 DAYS":
       "R"+row.round+" / T"+row.trial;
   const params=family+"("+pp.fast+","+pp.slow+","+pp.period+")"+
       (pp.threshold===null?"":" · threshold="+pp.threshold);
   const context=(row.window_val||"UNKNOWN")+" · "+
       (row.comparison_scope==="ONE_PILOT_ONLY_NO_FIT_VAL"?"Real ticks pilot":
        row.window_id||"LEGACY");
   const quality=row.source==="PC_SHORT_TF_REAL_TICKS_PILOT"?
       "UNRANKED PILOT · NO FIT+VAL · SHA "+row.hash_val:
       (row.status==="RESEARCH_QUALIFIED"?"RESEARCH QUALIFIED":"RESEARCH REJECTED")+
       " · FIT SHA "+row.hash_fit+"… / VAL SHA "+row.hash_val+"…";
   const values=[run,params,context,paramNumber(row.fit?.pf,3),
     paramNumber(row.val?.pf,3),paramNumber(row.val?.dd),
     paramNumber(row.val?.recovery,3),paramNumber(row.val?.net),
     paramNumber(row.val?.trades,0),quality];
   for(let i=0;i<values.length;i++){
    const td=document.createElement("td");td.textContent=String(values[i]);tr.appendChild(td);
   }
   root.appendChild(tr);
  }
 }
 t("param-method","Source: PC native FIT+VAL reports (both SHA) plus separately labeled short-TF real-tick pilots. "+
   "Indicator TF alone does NOT make different test windows/EA exits comparable. "+
   "A Group Best requires >=2 distinct MACD x,y,z parameter sets in exact same certified protocol "+
   "and at least one Judge-qualified record; score is historical only, not blind OOS. "+
   "Results refresh on PC periodic telemetry snapshot; this Web is read-only. No live trading.");
}
$("param-family")?.addEventListener("change",refreshParameterGroups);
$("param-tf")?.addEventListener("change",refreshParameterGroups);
$("param-group")?.addEventListener("change",updateParameterResults);
$("param-sort")?.addEventListener("change",updateParameterResults);
for(const id of ["param-fast","param-slow","param-signal"])
 $(id)?.addEventListener("input",updateParameterResults);
$("param-clear")?.addEventListener("click",()=>{
 for(const id of ["param-fast","param-slow","param-signal"])if($(id))$(id).value="";
 updateParameterResults();
});


/* Timeframe-conditioned parameter ranges: honest distinction between active
 * H1/H4 certified framework (effective from Round 19), and SHORT TF shadow
 * candidates awaiting data/cost/EA certification. */
function renderTFParameterPolicy(policy,queue,progress){
 const grid=document.getElementById("tf-policy-grid");
 if(!grid)return;
 grid.replaceChildren();
 if(!policy||policy.schema!=="rdc.tf_parameter_policy.v1"){
  t("tf-policy-activation","AWAITING PC POLICY");
  t("tf-policy-message","ไม่พบข้อมูล Range Profile จาก PC · ไม่สร้างผลหรือคิวสมมติ");
  return;
 }
 const round=progress?.round??progress?.current_round??null;
 const shadow=queue?.pending_by_kind?.TF_AWARE_MACD_SHADOW_CASE||0;
 t("tf-policy-activation","NEW TF SEARCH FROM ROUND "+policy.activation_round);
 for(const tf of ["M1","M5","M15","M30","H1","H4"]){
  const p=policy.profiles?.[tf];if(!p)continue;
  const card=document.createElement("article");card.className="tf-policy-card";
  const title=document.createElement("strong");title.textContent=tf;
  const state=document.createElement("span");state.className="tf-policy-state";
  state.textContent=p.native_execution_enabled?"CERTIFIED TF · ROUND 19+":"SHADOW · QA REQUIRED";
  const ranges=document.createElement("div");ranges.className="tf-policy-values";
  for(const [key,val] of [["Fast",p.fast],["Slow",p.slow],["Signal",p.signal]]){
   const cell=document.createElement("div");
   const name=document.createElement("small");name.textContent=key;
   const range=document.createElement("b");range.textContent=String(val[0])+"–"+String(val[1]);
   cell.append(name,range);ranges.append(cell);
  }
  const note=document.createElement("small");note.className="tf-policy-footnote";
  note.textContent=p.native_execution_enabled?
   "Native H1/H4 FIT + VAL research only · check window bars and costs":
   "Candidate source only · no native short-TF optimization yet";
  card.append(title,state,ranges,note);grid.append(card);
 }
 t("tf-policy-message","Discovery Manager เก็บ "+shadow+
   " เคส TF-aware Short-TF ที่รอ EA / Tick Quality / Spread & Slippage QA · "+
   "Active H1/H4 search activates at Round "+policy.activation_round+
   ". Broad → Local → Parameter Interaction → Robustness; results must be matched by TF and exact protocol. "+
   "No promise that a 500-period parameter is superior. Historical results are not fresh blind OOS.");
}
