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
$("refresh-button").addEventListener("click",()=>load(true));
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

async function loadRemote(){
 try{
  const local=location.hostname==="127.0.0.1"||location.hostname==="localhost";
  let d;
  if(local){
   const r=await fetch("./data/live.json?r="+Date.now(),{cache:"no-store"});
   if(!r.ok)throw new Error("live not initialized");d=await r.json();
  }else{
   const url="https://api.github.com/repos/popvarachat/popvarachat.github.io/contents/rdc-mt5-research/data/live.json?t="+Date.now();
   const r=await fetch(url,{headers:{"Accept":"application/vnd.github+json"},cache:"no-store"});
   if(!r.ok)throw new Error("public checkpoint absent");
   const content=await r.json();
   d=JSON.parse(decodeURIComponent(Array.from(atob(content.content.replace(/\s/g,"")),c=>"%"+c.charCodeAt(0).toString(16).padStart(2,"0")).join("")));
  }
  if(d.schema!=="rdc.research.public.live.v1")throw new Error("Unknown schema");
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
  t("remote-runner",ago<25?d.runner_status:"PC OFFLINE / STALE");
  t("remote-cycles",String(d.cycle??"—"));
  t("remote-trials",String(d.candidate_trials??"—"));
  t("remote-champion",d.champion||"—");
  const c=d.challenger||{};
  t("remote-challenger",c.status?("Trial "+c.candidate+" · "+c.status):"NOT YET TESTED");
  t("remote-heartbeat",d.last_heartbeat?new Date(d.last_heartbeat).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}):"—");
  t("remote-last-test",d.last_test?new Date(d.last_test).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"}):"—");
 }catch(e){
  t("remote-runner","CHECKPOINT UNAVAILABLE");
  t("remote-checkpoint-chip","NOT VERIFIED");
  console.warn("Remote checkpoint not available",e.message);
 }
}
loadRemote();setInterval(loadRemote,120000);
