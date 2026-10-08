const loadJSON=async p=>{const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error(p+" "+r.status);return r.json()};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const fmt=n=>new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n||0);

const NODE_DETAILS={
  "human":{kicker:"INTENT / GOVERNANCE",purpose:"รับเป้าหมาย ขอบเขต ข้อจำกัด และ approval boundary จากผู้ใช้.",authority:"กำหนด intent และอนุมัติ Human Gate.",inputs:["Goal","Scope","Constraints"],outputs:["Intent","Approval boundary"],related:"#guardrails"},
  "planner":{kicker:"DYNAMIC CONTROL PLANE",purpose:"Compile เป้าหมายเป็น DAG ที่มี dependency, parallel groups, checkpoints และ Human Gates.",authority:"ถือ orchestration ownership แต่ override Hard Policy ไม่ได้.",inputs:["Human intent","World state","Policy"],outputs:["Task DAG","Execution envelope","Gate points"],related:"#adaptive-runtime"},
  "policy":{kicker:"DETERMINISTIC PRECEDENCE",purpose:"บังคับ safety boundary ก่อน autonomous execution.",authority:"สูงสุดเหนือ Agent/Model/Router; fail closed.",inputs:["Action scope","Risk flags"],outputs:["ALLOW","POLICY_GATED","HUMAN_GATE"],related:"#guardrails"},
  "human-gate":{kicker:"EXPLICIT APPROVAL",purpose:"หยุดงานที่กระทบ live money, destructive, credentials/IAM หรือ production.",authority:"มนุษย์อนุมัติ/ปฏิเสธ/re-scope.",inputs:["Gated action","Evidence","Rollback"],outputs:["APPROVE","REJECT","RE-SCOPE"],related:"#guardrails"},
  "world-model":{kicker:"WORLD MODEL / DIGITAL STATE",purpose:"สร้าง canonical digital state ของ host, runtime, git, disk, policy และ operational state.",authority:"Read/state layer; ไม่ทำ mutation.",inputs:["Host probe","Runtime probe","Repository state"],outputs:["Canonical world state"],related:"#adaptive-runtime"},
  "temporal-memory":{kicker:"TEMPORAL MEMORY",purpose:"เก็บ snapshot + diff เพื่อรู้ว่าอะไรเปลี่ยนจากรอบก่อนและ context ใด stale.",authority:"Memory/read layer.",inputs:["Current state","Prior snapshots"],outputs:["Diff","Change history","Freshness"],related:"#adaptive-runtime"},
  "capability-registry":{kicker:"LIVE CAPABILITY REGISTRY",purpose:"Probe capability จริงแยกตาม PC/NB รวม availability, version, latency และ success history.",authority:"Read/routing input; ไม่มี execution authority.",inputs:["Heartbeat","Provider probes","Host probes"],outputs:["Live capability map"],related:"#adaptive-runtime"},
  "agent-router":{kicker:"AGENT ROUTING",purpose:"เลือก role ที่แคบที่สุดที่ทำงานได้.",authority:"Routing only.",inputs:["Task DAG","Capabilities"],outputs:["Selected Agent"],related:"#agents"},
  "skill-router":{kicker:"SKILL ROUTING",purpose:"เลือก Local Skill ก่อนและ verified lazy capability เมื่อจำเป็น.",authority:"Routing only.",inputs:["Task type","Skill registry"],outputs:["Selected Skill"],related:"#skills"},
  "model-router":{kicker:"MODEL ROUTING",purpose:"เลือก reasoning route ที่พอเพียง โดยบน Notebook ให้ Codex Corporate เป็น preferred heavy-duty CLI peer สำหรับ coding/review/reasoning เมื่อ available; Claude/Gemini เป็น peers/fallback ตาม capability.",authority:"Reasoning route only; ไม่มีสิทธิ์ bypass Hard Policy/Human Gate.",inputs:["Complexity","Privacy","Provider capability","Task type"],outputs:["Selected model/peer","Fallback chain"],related:"#adaptive-runtime"},
  "economic-router":{kicker:"ECONOMIC ROUTER",purpose:"เปรียบเทียบ quality × latency × cost × failure probability ก่อนเสนอ route. สำหรับงานหนักบน Notebook ให้ Codex Corporate ได้ priority boost เมื่อ authenticated/available.",authority:"SHADOW จน evidence เพียงพอ; ห้าม auto-promote.",inputs:["Candidate routes","Latency","Cost","Failure history","Provider availability"],outputs:["Economic recommendation","Preferred peer"],related:"#adaptive-runtime"},
  "confidence":{kicker:"CONFIDENCE ESCALATION",purpose:"เลือก Execute, second review, sandbox หรือ Human Gate ตาม confidence และ risk.",authority:"Escalation control ภายใต้ Hard Policy.",inputs:["Router outputs","Confidence","Risk"],outputs:["Execution path","Escalation"],related:"#adaptive-runtime"},
  "skill-factory":{kicker:"AUTO-GENERATED SKILL",purpose:"สร้าง Skill draft เมื่อ capability gap เกิดซ้ำ แล้วส่งเข้า Sandbox/Benchmark ก่อน register.",authority:"DRAFT ONLY; ไม่มี auto-register ที่ไม่ผ่าน validation.",inputs:["Capability gap","Successful traces"],outputs:["Skill draft","Tests"],related:"#adaptive-runtime"},
  "sandbox":{kicker:"PRE-MUTATION GUARD",purpose:"Dry-run, syntax/static validation และ rehearsal ก่อน material mutation.",authority:"POLICY-GATED; หยุดที่ Human Gate เมื่อจำเป็น.",inputs:["Planned action","Rollback context"],outputs:["SAFE_TO_EXECUTE","BLOCK","HUMAN_GATE"],related:"#guardrails"},
  "execution":{kicker:"EXECUTION FABRIC",purpose:"ลงมือผ่าน API/MCP/CLI/OI/Browser ด้วย backend-first และ capability-aware routing.",authority:"Scoped mutation ตาม DAG + Policy เท่านั้น.",inputs:["Approved action","Tool args","Capability route"],outputs:["Observed effect","Execution evidence"],related:"#architecture"},
  "red-team":{kicker:"ADVERSARIAL / DEVIL REVIEW",purpose:"พยายาม falsify ผลลัพธ์ ตรวจ prompt injection, secret pattern, risky execution และ unfinished work.",authority:"READ-ONLY; ไม่มีสิทธิ์แก้ source/host.",inputs:["Plan","Execution result","Evidence"],outputs:["Adversarial findings","Block recommendation"],related:"#adaptive-runtime"},
  "validator":{kicker:"SYSTEM-TWO FINAL CHECK",purpose:"Authoritative reread + tests/health checks ก่อนรับผลสำเร็จ.",authority:"Final validation authority.",inputs:["Requested outcome","Observed state","Red-team findings"],outputs:["PASS","RETRY","BLOCKED"],related:"#guardrails"},
  "evidence-ledger":{kicker:"IMMUTABLE EVIDENCE LEDGER",purpose:"Hash-chain plan, route, event, state snapshot, execution และ validation เพื่อ audit ย้อนกลับได้.",authority:"Append-only evidence; ไม่ตัดสิน policy.",inputs:["Plan hash","Route","Events","Validation","Snapshots"],outputs:["Evidence chain","Audit proof"],related:"#adaptive-runtime"},
  "done":{kicker:"VERIFIED TERMINAL STATE",purpose:"จบเมื่อ Final Validator ผ่านและ Evidence Ledger บันทึกหลักฐานครบ.",authority:"เกิดจาก validated evidence ไม่ใช่ model claim.",inputs:["PASS","Ledger evidence"],outputs:["DONE"],related:"#architecture"},
  "event-nervous":{kicker:"EVENT-DRIVEN NERVOUS SYSTEM",purpose:"รับ heartbeat/outage/disk/worktree/telemetry events แล้ว dispatch แบบ safe.",authority:"SAFE DISPATCH; mutation ยังคง policy-gated.",inputs:["Runtime events","Telemetry","Heartbeat"],outputs:["Event routes","Triggers"],related:"#adaptive-runtime"},
  "canary":{kicker:"CANARY / SHADOW EXECUTION",purpose:"เปรียบเทียบ primary กับ candidate route/runtime โดยไม่ promote อัตโนมัติ.",authority:"SHADOW; no auto-promote.",inputs:["Primary result","Candidate result","Telemetry"],outputs:["Comparison evidence"],related:"#adaptive-runtime"},
  "architecture-refactor":{kicker:"ARCHITECTURE REFACTOR PROPOSAL",purpose:"อ่าน telemetry และเสนอการรวม/แยก/เปลี่ยน route เพื่อเพิ่มประสิทธิภาพ.",authority:"READ-ONLY / PROPOSAL ONLY.",inputs:["Telemetry","Canary evidence","Failure patterns"],outputs:["Refactor proposal","Rollback plan"],related:"#adaptive-runtime"},
  "eval-harness":{kicker:"REGRESSION / PROMOTION GATE",purpose:"วัด architecture candidate เทียบ baseline ก่อนอนุญาตการเปลี่ยน runtime.",authority:"Evidence gate; ไม่ auto-promote.",inputs:["Candidate architecture","Frozen baseline","Canary evidence"],outputs:["Score","Regression signal","Promotion evidence"],related:"#eval-harness"}
};

(async()=>{
  const [s,w,a]=await Promise.all([loadJSON("data/status.json"),loadJSON("data/weekly.json"),loadJSON("data/arsenal.json")]);
  const rt=s.adaptive_runtime||{};
  const dc=s.decision_coprocessor||{};
  const ix=s.intelligence_extensions||{};
  const ev=s.eval_harness||{};
  const metrics=[
    [rt.version||s.gateway_version||"1.7","Runtime"],
    [rt.validation?.pc||"12/12","PC Validation"],
    [rt.validation?.notebook||"12/12","NB Validation"],
    [rt.heartbeat_minutes?rt.heartbeat_minutes+"m":"15m","Heartbeat"],
    [s.agents,"Agents / Roles"],
    [s.local_skills,"Local Skills"]
  ];
  document.getElementById("metrics").innerHTML=metrics.map(x=>`<div class="metric"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join("");
  const hb=document.getElementById("healthBadge");hb.textContent="RUNTIME "+(rt.version||"1.7")+" · PC "+(rt.validation?.pc||"12/12")+" · NB "+(rt.validation?.notebook||"12/12");hb.classList.toggle("warn",String(rt.status||"PASS")!=="PASS");
  (document.getElementById("rules")||{set innerHTML(v){}}).innerHTML=s.rules.map((x,i)=>`<div class="rule"><i>${String(i+1).padStart(2,"0")}</i><span>${esc(x)}</span></div>`).join("");
  (document.getElementById("humanGates")||{set innerHTML(v){}}).innerHTML=s.human_gates.map((x,i)=>`<div class="rule"><i>G${i+1}</i><span>${esc(x)}</span></div>`).join("");
  (document.getElementById("jevState")||{set innerHTML(v){}}).innerHTML=[
    ["Status",dc.status||"UNKNOWN"],
    ["Mode",dc.mode||"—"],
    ["Model",dc.model||"—"],
    ["Authority","SHADOW · no execution"]
  ].map(x=>`<div class="provider"><span>${esc(x[0])}</span><b class="${String(x[1]).includes("READY")?"ok":"warning"}">${esc(x[1])}</b></div>`).join("");

  const rein=document.getElementById("reinforcementState");
  if(rein){
    const rows=[
      ["Validation",ix.validation?.status||"UNKNOWN"],
      ["Tool Broker",ix.tool_broker?.status||"UNKNOWN"],
      ["Trace / Observability",ix.observability?.status||"UNKNOWN"],
      ["Sandbox / Dry Run",ix.sandbox?.status||"UNKNOWN"],
      ["Test Engineer",ix.test_regression_engineer?.status||"UNKNOWN"],
      ["Architecture Reviewer",ix.architecture_blast_radius_reviewer?.status||"UNKNOWN"]
    ];
    rein.innerHTML=rows.map(x=>{const good=String(x[1]).includes("READY")||String(x[1])==="PASS";return `<div class="provider"><span>${esc(x[0])}</span><b class="${good?"ok":"warning"}">${esc(String(x[1]).replaceAll("_"," "))}</b></div>`}).join("");
  }

  const evalPct=v=>v==null?"—":Math.round(Number(v)*100)+"%";
  document.getElementById("evalScore").textContent=evalPct(ev.latest_score);
  document.getElementById("evalCases").textContent=ev.cases??"–";
  document.getElementById("evalPassed").textContent=`${ev.passed??"–"} / ${ev.cases??"–"}`;
  document.getElementById("evalDelta").textContent=ev.delta_vs_baseline==null?"—":((Number(ev.delta_vs_baseline)>=0?"+":"")+evalPct(ev.delta_vs_baseline));
  document.getElementById("evalLatency").textContent=ev.avg_case_latency_ms==null?"—":Number(ev.avg_case_latency_ms).toFixed(2)+" ms";
  const freezeBadge=document.getElementById("evalFreezeBadge");
  if(freezeBadge) freezeBadge.textContent=String(ev.status||"UNKNOWN").replaceAll("_"," ");
  const cat=ev.category_scores||{};
  document.getElementById("evalCategories").innerHTML=Object.entries(cat).map(([name,x])=>{
    const score=Number(x.score||0);
    return `<div class="eval-row"><span>${esc(name.replaceAll("_"," "))}</span><div class="eval-track"><div class="eval-fill" style="width:${Math.max(0,Math.min(100,score*100))}%"></div></div><b class="${score<1?"eval-regression":""}">${Math.round(score*100)}%</b></div>`;
  }).join("");
  document.getElementById("evalPolicy").textContent=ev.change_policy||"Measure → compare → change only when evidence justifies it.";
  document.getElementById("evalState").innerHTML=[
    ["Architecture",ev.architecture||"RDC v1.5"],
    ["Baseline",ev.baseline||"v1.5"],
    ["Baseline score",evalPct(ev.baseline_score)],
    ["Latest failures",ev.failed??0],
    ["Safe mode",ev.safe_mode?"ON":"OFF"],
    ["Live mutation",ev.live_mutation?"ON":"OFF"],
    ["Jev authority",ev.jev_authority||"SHADOW"]
  ].map(x=>`<div class="provider"><span>${esc(x[0])}</span><b class="${String(x[1]).includes("FAIL")||String(x[1])==="ON"&&x[0]==="Live mutation"?"warning":"ok"}">${esc(x[1])}</b></div>`).join("");

  const jevGraph=document.getElementById("jevGraphStatus");
  if(jevGraph) jevGraph.textContent=`${dc.status||"UNKNOWN"} · ${dc.model||"—"}`;

  const browserRoute=s.browser_routing||{};
  const browserEl=document.getElementById("browserGraph");
  if(browserEl){
    const order=Array.isArray(browserRoute.order)?browserRoute.order:[];
    browserEl.innerHTML='<span>BROWSER ROUTE</span><b>'+esc(order.join(' → ')||'API/MCP → Playwright → TinyFish → Windows-MCP → RDC')+'</b>';
    browserEl.title=browserRoute.status?('Status: '+browserRoute.status):'';
  }

  const fabric=s.execution_fabric||{};
  const fabricEl=document.getElementById("fabricGraph");
  if(fabricEl){
    fabricEl.innerHTML=Object.values(fabric)
      .sort((a,b)=>(a.preferred_order||99)-(b.preferred_order||99))
      .map(x=>{
        const st=String(x.status||"UNKNOWN");
        const cls=st==="ACTIVE"||st==="AVAILABLE"?"ok":st.includes("FALLBACK")||st.includes("ON_DEMAND")?"fallback":"warn";
        return `<span class="${cls}" title="${esc(x.detail||"")}">${esc(x.name)} · ${esc(st.replaceAll("_"," "))}</span>`;
      }).join("");
    const execNode=document.querySelector(".wf-node.execution");
    if(execNode){
      execNode.dataset.detail=Object.values(fabric).sort((a,b)=>(a.preferred_order||99)-(b.preferred_order||99))
        .map(x=>`${x.name}: ${x.status} — ${x.detail}`).join(" | ");
      execNode.setAttribute("role","button"); execNode.setAttribute("tabindex","0");
    }
  }

  const inspectorTitle=document.getElementById("wfInspectTitle");
  const inspectorText=document.getElementById("wfInspectText");
  const workflowSurface=document.querySelector(".workflow-surface");
  const workflowShell=document.querySelector(".workflow-shell");
  const allNodes=[...document.querySelectorAll(".wf-node[data-node]")];
  const allLinks=[...document.querySelectorAll(".wf-link[data-from][data-to]")];
  const drawer=document.getElementById("nodeDrawer");
  const backdrop=document.getElementById("nodeDrawerBackdrop");
  const nodeName=id=>allNodes.find(n=>n.dataset.node===id)?.querySelector("b")?.textContent||id;
  const liveStatus=id=>{
    const states=rt.nodes||{};
    const key=id.replaceAll("-","_");
    if(states[key]) return states[key].status||states[key];
    if(id==="planner") return "ACTIVE · DAG COMPILER";
    if(id==="policy") return "POLICY-GATED";
    if(id==="human-gate") return "ON DEMAND";
    if(id==="world-model"||id==="temporal-memory"||id==="capability-registry") return "ACTIVE";
    if(id==="economic-router"||id==="canary") return "SHADOW";
    if(id==="red-team"||id==="architecture-refactor") return "READ-ONLY";
    if(id==="skill-factory") return "ACTIVE · DRAFT ONLY";
    if(id==="sandbox") return "POLICY-GATED";
    if(id==="execution") return "ACTIVE · CAPABILITY-AWARE";
    if(id==="validator") return "ACTIVE · AUTHORITATIVE";
    if(id==="evidence-ledger") return "ACTIVE · HASH CHAIN";
    if(id==="event-nervous") return "ACTIVE · SAFE DISPATCH";
    if(id==="eval-harness") return "ACTIVE · NO AUTO-PROMOTE";
    if(id==="done") return "VERIFIED ONLY";
    return "ACTIVE";
  };
  const clearRouteFocus=()=>{
    workflowSurface?.classList.remove("route-focus");
    allLinks.forEach(l=>l.classList.remove("route-active"));
    allNodes.forEach(n=>n.classList.remove("route-peer"));
  };
  const highlightRoutes=id=>{
    clearRouteFocus();
    workflowSurface?.classList.add("route-focus");
    const peers=new Set([id]);
    allLinks.forEach(link=>{
      const hit=link.dataset.from===id||link.dataset.to===id;
      link.classList.toggle("route-active",hit);
      if(hit){peers.add(link.dataset.from);peers.add(link.dataset.to);}
    });
    allNodes.forEach(n=>n.classList.toggle("route-peer",peers.has(n.dataset.node)&&n.dataset.node!==id));
  };
  const openDrawer=node=>{
    const id=node.dataset.node||"";
    const meta=NODE_DETAILS[id]||{};
    const inbound=allLinks.filter(l=>l.dataset.to===id).map(l=>l.dataset.from);
    const outbound=allLinks.filter(l=>l.dataset.from===id).map(l=>l.dataset.to);
    document.getElementById("nodeDrawerKicker").textContent=meta.kicker||"NODE DETAIL";
    document.getElementById("nodeDrawerTitle").textContent=node.dataset.title||node.querySelector("b")?.textContent||id;
    document.getElementById("nodeDrawerStatus").textContent=liveStatus(id);
    document.getElementById("nodeDrawerSummary").textContent=node.dataset.detail||meta.purpose||"";
    document.getElementById("nodeDrawerGrid").innerHTML=[
      ["Purpose",meta.purpose||"—"],
      ["Authority",meta.authority||"—"],
      ["Inputs",(meta.inputs||[]).join(" · ")||"—"],
      ["Outputs",(meta.outputs||[]).join(" · ")||"—"]
    ].map(([k,v])=>`<div class="drawer-detail"><span>${esc(k)}</span><p>${esc(v)}</p></div>`).join("");
    const routeHtml=[
      ...inbound.map(x=>`<span class="route-chip inbound">← ${esc(nodeName(x))}</span>`),
      ...outbound.map(x=>`<span class="route-chip outbound">${esc(nodeName(x))} →</span>`)
    ].join("");
    document.getElementById("nodeDrawerRoutes").innerHTML=routeHtml||'<span class="route-chip">No linked route</span>';
    const link=document.getElementById("nodeDrawerLink");
    link.href=meta.related||"#architecture";
    backdrop.hidden=false;
    drawer.setAttribute("aria-hidden","false");
    document.body.classList.add("drawer-open");
    requestAnimationFrame(()=>drawer.classList.add("open"));
  };
  const closeDrawer=()=>{
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden","true");
    document.body.classList.remove("drawer-open");
    clearRouteFocus();
    allNodes.forEach(n=>n.classList.remove("active"));
    setTimeout(()=>{backdrop.hidden=true;},180);
  };
  const inspectNode=node=>{
    allNodes.forEach(n=>n.classList.remove("active"));
    node.classList.add("active");
    if(inspectorTitle) inspectorTitle.textContent=node.dataset.title||node.querySelector("b")?.textContent||"RDC Node";
    if(inspectorText) inspectorText.textContent=node.dataset.detail||"Execution component in the RDC workflow.";
    highlightRoutes(node.dataset.node);
    openDrawer(node);
  };
  allNodes.forEach(node=>{
    node.addEventListener("click",()=>inspectNode(node));
    node.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inspectNode(node);}});
  });
  document.getElementById("nodeDrawerClose")?.addEventListener("click",closeDrawer);
  backdrop?.addEventListener("click",closeDrawer);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawer.classList.contains("open"))closeDrawer();});

  const flowToggle=document.getElementById("flowToggle");
  flowToggle?.addEventListener("click",()=>{
    const paused=workflowShell.classList.toggle("flow-paused");
    flowToggle.setAttribute("aria-pressed",String(!paused));
    flowToggle.innerHTML=paused?"<span></span> FLOW PAUSED":"<span></span> FLOW LIVE";
  });


  const ar=s.adaptive_runtime||{};
  const adaptiveBadge=document.getElementById("adaptiveBadge");
  if(adaptiveBadge) adaptiveBadge.textContent=String(ar.status||"UNKNOWN").replaceAll("_"," ");
  const layers=ar.layers||{};
  document.querySelectorAll("[data-adaptive]").forEach(card=>{
    const item=layers[card.dataset.adaptive]||{};
    const state=String(item.status||"UNKNOWN").replaceAll("_"," ");
    const b=card.querySelector("b");
    if(b){b.textContent=state;b.classList.toggle("warning",state.includes("SHADOW")||state.includes("WARN"));}
  });
  const at=document.getElementById("adaptiveTests");
  if(at) at.textContent=`${ar.validation?.checks_passed??"–"} / ${ar.validation?.checks_total??"–"} ${ar.validation?.status||""}`;
  const ac=document.getElementById("adaptiveCapabilities");
  if(ac) ac.textContent=ar.capability_probe_count??"–";

  const ja=s.jev_decision_arsenal||{};
  const packs=Array.isArray(ja.packs)?ja.packs:[];
  const profiles=ja.profiles||{};
  const checks=Array.isArray(ja.completion_guard_checks)?ja.completion_guard_checks:[];
  const jrep=ja.report||{};
  document.getElementById("jevPackCount").textContent=packs.length||"–";
  document.getElementById("jevProfileCount").textContent=Object.keys(profiles).length||"–";
  document.getElementById("jevCheckCount").textContent=checks.length||"–";
  document.getElementById("jevBatchMode").textContent=ja.batch_multi_question?"ON":"OFF";
  document.getElementById("jevDecisionGrid").innerHTML=packs.map(x=>`
    <article class="jev-pack">
      <div class="card-head"><span class="chip">${esc(x.group||"decision")}</span><span class="chip read">SHADOW</span></div>
      <h4>${esc(x.name||x.id)}</h4>
      <p>${esc(x.purpose||"Bounded Jev decision")}</p>
      <code>${esc(x.id)}</code>
    </article>`).join("");
  document.getElementById("jevProfiles").innerHTML=Object.entries(profiles).map(([name,items])=>`
    <div class="profile-row">
      <div><strong>${esc(name)}</strong><span>${esc((items||[]).join(" · "))}</span></div>
      <b>${(items||[]).length}</b>
    </div>`).join("");
  const pct=v=>v==null?"—":Math.round(Number(v)*100)+"%";
  const ms=v=>v==null?"—":Number(v).toFixed(1)+" ms";
  const jval=ja.validation||{};
  document.getElementById("jevTuningStats").innerHTML=[
    ["Validation",jval.status||"—"],
    ["Mode",ja.authority_mode||dc.mode||"SHADOW"],
    ["Profile runs",jrep.profile_runs??0],
    ["Profile decisions",jrep.profile_decisions??0],
    ["Agreement",pct(jrep.agreement_rate)],
    ["Avg latency",ms(jrep.avg_latency_ms)],
    ["Completion Guard",jrep.completion_guard_runs??0]
  ].map(x=>`<div class="provider"><span>${esc(x[0])}</span><b class="${x[1]==="PASS"?"ok":""}">${esc(x[1])}</b></div>`).join("");

  document.getElementById("agentsGrid").innerHTML=s.agents_list.map(x=>`
    <article class="card">
      <div class="card-head"><span class="chip">${esc(x.type)}</span><span class="chip ${x.write?"write":"read"}">${x.write?"scoped write":"read / review"}</span></div>
      <h3>${esc(x.id)}</h3><p>${esc(x.mission)}</p>
    </article>`).join("");

  document.getElementById("skillsGrid").innerHTML=s.skills.map(x=>`<div class="skill"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join("");

  document.getElementById("catalogCount").textContent=a.length;
  document.getElementById("arsenalGrid").innerHTML=a.map(x=>`
    <article class="card">
      <div class="card-head"><span class="chip">metadata only</span><span class="stars">★ ${fmt(x.stars)}</span></div>
      <h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p>
      <div style="margin-top:12px;display:flex;gap:5px;flex-wrap:wrap">${x.categories.map(c=>`<span class="chip">${esc(c)}</span>`).join("")}</div>
      <p style="margin-top:10px;font-size:10px">${esc(x.source)}</p>
    </article>`).join("");

  document.getElementById("weekStamp").textContent=w.period;
  document.getElementById("changes").innerHTML=w.changes.map(x=>`<div class="event"><div><span class="when">${esc(x.time)}</span><strong>${esc(x.title)}</strong></div><p>${esc(x.detail)}</p></div>`).join("");
  document.getElementById("candidates").innerHTML=w.candidates.map(x=>`<div class="candidate"><div class="candidate-top"><strong>${esc(x.name)}</strong><span class="chip">${esc(x.source)}</span></div><p class="why">${esc(x.why)}</p><span class="action">${esc(x.action)}</span></div>`).join("");
  document.getElementById("providers").innerHTML=s.providers.map(x=>`<div class="provider"><span>${esc(x.name)}</span><b class="${esc(x.tone)}">${esc(x.status)}</b></div>`).join("");
  document.getElementById("lastUpdated").textContent="Snapshot: "+new Intl.DateTimeFormat("th-TH",{dateStyle:"medium",timeStyle:"short"}).format(new Date(s.generated_at));
})().catch(err=>{
  document.getElementById("healthBadge").textContent="DATA ERROR";
  document.getElementById("healthBadge").classList.add("warn");
  console.error(err);
});

(()=> {
  const LOCAL_LIVE="http://127.0.0.1:8876/live.json";
  const REMOTE_LIVE="https://raw.githubusercontent.com/popvarachat/popvarachat.github.io/rdc-live/rdc-live.json";
  const NODE={
    "orchestrator":"planner","rdc":"planner","planner":"planner","dynamic-planner":"planner","dag":"planner",
    "policy":"policy","hard-policy":"policy","human-gate":"human-gate",
    "world-model":"world-model","world-state":"world-model","digital-state":"world-model",
    "temporal-memory":"temporal-memory","memory":"temporal-memory",
    "capability-registry":"capability-registry","tool-broker":"capability-registry","heartbeat":"capability-registry",
    "agent-router":"agent-router","skill-router":"skill-router","model-router":"model-router","economic-router":"economic-router",
    "confidence":"confidence","confidence-escalation":"confidence",
    "skill-factory":"skill-factory","auto-generated-skill":"skill-factory",
    "sandbox":"sandbox","execution":"execution","executor":"execution","playwright":"execution","tinyfish":"execution","windows-mcp":"execution",
    "red-team":"red-team","devil":"red-team","devil-red-team":"red-team",
    "validator":"validator","final-validator":"validator",
    "evidence-ledger":"evidence-ledger","ledger":"evidence-ledger",
    "event-nervous":"event-nervous","event-nervous-system":"event-nervous","telemetry":"event-nervous",
    "canary":"canary","shadow":"canary","architecture-refactor":"architecture-refactor","eval-harness":"eval-harness","done":"done"
  };
  let source="—",timer=null,localOK=null,lastLocalTry=0,lastRemote=0,lastData=null;
  const fetchTimed=async(url,ms)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(url+(url.includes("?")?"&":"?")+"ts="+Date.now(),{cache:"no-store",signal:ac.signal});if(!r.ok)throw new Error(String(r.status));return await r.json()}finally{clearTimeout(t)}};
  const label=x=>String(x||"").replaceAll("_"," ");
  const ft=v=>{if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("th-TH",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(d)};
  const hi=comp=>{document.querySelectorAll(".wf-node.live-active").forEach(x=>x.classList.remove("live-active"));document.querySelectorAll(".wf-link.live-route").forEach(x=>x.classList.remove("live-route"));const id=NODE[String(comp||"").toLowerCase()];if(!id)return;document.querySelector('.wf-node[data-node="'+id+'"]')?.classList.add("live-active");document.querySelectorAll('.wf-link[data-from="'+id+'"],.wf-link[data-to="'+id+'"]').forEach(x=>x.classList.add("live-route"))};
  const render=d=>{lastData=d;const st=String(d.state||"IDLE").toUpperCase(),b=document.getElementById("liveMonitorBadge"),se=document.getElementById("liveState");if(b){b.textContent=(source==="LOCAL"?"LOCAL LIVE · ":"GITHUB FALLBACK · ")+st;b.classList.toggle("warn",["BLOCKED","HUMAN_GATE","FAIL","FAILED"].includes(st))}if(se){se.textContent=st;se.className="live-state "+st.toLowerCase()}document.getElementById("liveWorkstream").textContent=d.workstream||"No active RDC trace";document.getElementById("liveTraceId").textContent=d.trace_id||"—";document.getElementById("liveSource").textContent=source==="LOCAL"?"RDC local endpoint":"GitHub rdc-live branch";document.getElementById("liveUpdated").textContent=ft(d.generated_at);const cur=d.current||{};document.getElementById("liveCurrentStep").textContent=cur.action||"—";document.getElementById("liveCurrentMeta").textContent=cur.component?(label(cur.component)+" · "+label(cur.status)+(cur.latency_ms!=null?" · "+cur.latency_ms+" ms":"")):"รอ RDC trace";hi(cur.component);
  const cs=Object.entries(d.components||{}).sort((a,b)=>String(b[1]?.updated_at||"").localeCompare(String(a[1]?.updated_at||"")));document.getElementById("liveComponents").innerHTML=cs.length?cs.map(([n,x])=>'<div class="live-component '+esc(String(x.status||"").toLowerCase())+'"><i class="live-dot"></i><div><strong>'+esc(label(n))+'</strong><small>'+esc(x.action||"—")+'</small></div><b>'+esc(label(x.status||"—"))+'</b></div>').join(""):'<div class="live-empty">ยังไม่มี component ทำงาน</div>';
  const tl=[...(d.timeline||[])].reverse();document.getElementById("liveTimeline").innerHTML=tl.length?tl.map(x=>'<div class="live-event"><time>'+esc(ft(x.ts))+'</time><strong>'+esc(label(x.component||"—"))+'</strong><span>'+esc(x.action||"—")+'</span><b>'+esc(label(x.status||"—"))+'</b></div>').join(""):'<div class="live-empty">ยังไม่มี event</div>'};
  const poll=async()=>{let d=null;const now=Date.now(),retryLocal=localOK!==false||now-lastLocalTry>=10000;if(retryLocal){lastLocalTry=now;try{d=await fetchTimed(LOCAL_LIVE,900);localOK=true;source="LOCAL"}catch(e){localOK=false}}if(!d){const due=now-lastRemote>=30000||!lastData;if(due){try{d=await fetchTimed(REMOTE_LIVE,5000);lastRemote=Date.now();source="REMOTE"}catch(e){}}else d=lastData}if(d)render(d);else{const b=document.getElementById("liveMonitorBadge");if(b){b.textContent="OFFLINE / NO TRACE";b.classList.add("warn")}}clearTimeout(timer);timer=setTimeout(poll,localOK?1500:5000)};
  if(document.getElementById("live-monitor"))poll();
})();

;(()=> {
  const BASE_W=1320, BASE_H=1460;
  const fit=()=>{
    const wrap=document.querySelector(".workflow-scroll");
    const surface=document.querySelector(".workflow-surface.runtime-v17");
    if(!wrap||!surface) return;
    const styles=getComputedStyle(wrap);
    const padX=(parseFloat(styles.paddingLeft)||0)+(parseFloat(styles.paddingRight)||0);
    const padY=(parseFloat(styles.paddingTop)||0)+(parseFloat(styles.paddingBottom)||0);
    const available=Math.max(280,wrap.clientWidth-padX);
    const scale=Math.min(1,available/BASE_W);
    const renderedW=BASE_W*scale;
    const renderedH=BASE_H*scale;
    surface.style.left=Math.max(0,(wrap.clientWidth-renderedW)/2)+"px";
    surface.style.transform="scale("+scale+")";
    wrap.style.height=(renderedH+padY)+"px";
    wrap.dataset.workflowScale=scale.toFixed(4);
  };
  let raf=0;
  const queue=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(fit)};
  window.addEventListener("resize",queue,{passive:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fit,{once:true});else fit();
  const target=document.querySelector(".workflow-shell");
  if(target&&"ResizeObserver" in window)new ResizeObserver(queue).observe(target);
})();
