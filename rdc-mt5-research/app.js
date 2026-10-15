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
const validTabs=new Set(["overview","workflow","analytics","evidence","control","league"]);
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
