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
const validTabs=new Set(["overview","workflow","analytics","evidence","control"]);
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
const RDC_PUBLIC_RESEARCH_PATH="popvarachat/popvarachat.github.io/main/rdc-mt5-research/data/live.json";
async function fetchResearchTelemetry(){
 const nonce="?t="+Math.floor(Date.now()/60000);
 const endpoints=[
  {name:"GitHub Raw · current repository data",url:"https://raw.githubusercontent.com/"+RDC_PUBLIC_RESEARCH_PATH+nonce},
  {name:"GitHub Pages · released checkpoint",url:"./data/live.json"+nonce},
  {name:"GitHub API · fallback",url:"https://api.github.com/repos/popvarachat/popvarachat.github.io/contents/rdc-mt5-research/data/live.json"+nonce}
 ];
 // On POP-FARM01 localhost, prefer its own most-recent PC checkpoint.
 if(["localhost","127.0.0.1"].includes(location.hostname)){
  endpoints.unshift({name:"PC Local · current research evidence",url:"./data/live.json"+nonce});
 }
 const failures=[];
 for(const endpoint of endpoints){
  try{
   const ctl=new AbortController();
   const timeout=setTimeout(()=>ctl.abort(),8500);
   let response;
   try{
    response=await fetch(endpoint.url,{cache:"no-store",signal:ctl.signal});
   }finally{clearTimeout(timeout);}
   if(!response.ok)throw Error("HTTP "+response.status);
   const payload=await response.json();
   let d=payload;
   if(payload.encoding==="base64" && typeof payload.content==="string"){
    const bytes=atob(payload.content.replace(/\s/g,""));
    d=JSON.parse(new TextDecoder().decode(Uint8Array.from(bytes,c=>c.charCodeAt(0))));
   }
   if(d?.schema!=="rdc.research.public.live.v1" || d.indicator_research?.schema!=="rdc.indicator.family.loop.v1")throw Error("MISSING_INDICATOR_EVIDENCE");
   return {data:d,source:endpoint.name};
  }catch(e){failures.push(endpoint.name+": "+String(e.message||e));}
 }
 throw Error(failures.join(" | "));
}
async function loadRemote(){
 try{
  const {data:d,source}=await fetchResearchTelemetry();
  latestDataFeedSource=source;
  try{localStorage.setItem("rdc_research_last_good_v1",JSON.stringify(d));}catch(e){} 
  t("family-data-source","Source: "+source+" · "+new Date(d.generated_at).toLocaleTimeString("th-TH",{timeZone:"Asia/Bangkok"}));
  const ago=(Date.now()-Date.parse(d.generated_at))/60000;
  t("remote-checkpoint-chip",ago<25?"PC CHECKPOINT":"STALE CHECKPOINT");
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
  if(d.indicator_research){renderFamilyResearch(d.indicator_research,d,ago);latestLoopStatus={f:d.indicator_research,d};refreshLiveMonitor();}
  t("remote-runner",ago<25?d.runner_status:"PC OFFLINE / STALE");
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
    renderFamilyResearch(previous.indicator_research,previous,minutes);
    refreshLiveMonitor();
    t("family-run-status","STALE · FEED INTERRUPTED");
    t("family-data-source","Last cached checkpoint · data "+Math.round(minutes)+"m old");
  }else{
    t("family-run-status","DATA FEED ERROR · RETRYING");
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
 const fresh=ageMins<25;
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
 const fresh=heartbeatAge<=22 && dataAge<=22;
 const led=$("loop-status-light");
 led.classList.remove("healthy","stale","error");
 const heartbeatText=Number.isFinite(heartbeatAge)?("Heartbeat "+Math.floor(heartbeatAge)+" นาทีที่แล้ว"):"ไม่มี Heartbeat";
 if(pending){
   led.classList.add("stale");t("loop-online-status","PAUSED BY OWNER");t("loop-heartbeat-age",heartbeatText);
 }else if(fresh){
   led.classList.add("healthy");t("loop-online-status","PC LOOP ACTIVE");t("loop-heartbeat-age",heartbeatText);
 }else{
   led.classList.add("error");t("loop-online-status","ไม่ยืนยันว่า PC ยังทำงาน");t("loop-heartbeat-age","Heartbeat ล่าสุด "+heartbeatText+" · Checkpoint อาจล่าช้า");
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
 t("loop-data-delay","Checkpoint "+Math.floor(dataAge)+" นาทีที่ผ่านมา · อัปเดต PC ทุก ~15 นาที");
}
setInterval(refreshLiveMonitor,20000);


const retryFeedButton=document.getElementById("retry-live-feed");
if(retryFeedButton)retryFeedButton.addEventListener("click",()=>loadRemote());
