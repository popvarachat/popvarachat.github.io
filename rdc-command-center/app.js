const loadJSON=async p=>{const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error(p+" "+r.status);return r.json()};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const fmt=n=>new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n||0);

const NODE_DETAILS={
  "human":{kicker:"INTENT / GOVERNANCE",purpose:"รับเป้าหมาย ขอบเขต ข้อจำกัด และการอนุมัติจากคน ก่อนเข้าสู่ control plane.",authority:"อนุมัติ Human Gate และกำหนด preference/intent ที่ระบบไม่ควรเดาเอง.",inputs:["Goal","Scope","Constraints","Approval"],outputs:["Intent","Decision boundary"],related:"#guardrails"},
  "rdc":{kicker:"CONTROL PLANE",purpose:"Orchestrator หลัก แตกงาน จัด dependency เลือก Agent/Skill/Tool ทำ parallelize/retry และถือ ownership ของ final outcome.",authority:"มี execution control ภายใต้ Hard Policy; ไม่ข้าม Human Gate.",inputs:["Intent","Canonical context","Policy"],outputs:["Plan","Routes","Verified result"],related:"#architecture"},
  "policy":{kicker:"DETERMINISTIC PRECEDENCE",purpose:"ตรวจ hard gates ก่อน model routing เช่น credential/IAM, destructive action, production impact, live money และ security weakening.",authority:"สูงกว่า Jev, Agent และ Sub-Agent ทุกตัว; fail closed.",inputs:["Risk flags","Action scope"],outputs:["ALLOW","HUMAN_GATE"],related:"#guardrails"},
  "human-gate":{kicker:"STOP / APPROVE",purpose:"จุดหยุดสำหรับการกระทำที่ต้องการ explicit approval จากคน.",authority:"อนุมัติหรือปฏิเสธ privileged/high-impact action.",inputs:["Gated action","Risk evidence"],outputs:["APPROVE","REJECT","RE-SCOPE"],related:"#guardrails"},
  "jev":{kicker:"SYSTEM-ONE COPROCESSOR",purpose:"Decision sidecar สำหรับ bounded uncertainty ผ่าน routing / recovery / completion profiles โดยตอบ choice/yes-no/score แบบมี confidence.",authority:"SHADOW เท่านั้นในตอนนี้; ไม่มี execution authority และ override policy ไม่ได้.",inputs:["Minimal redacted state","Decision schema"],outputs:["Choice","Confidence","Probabilities"],related:"#jev-arsenal"},
  "agent-router":{kicker:"WORK OWNER ROUTING",purpose:"เลือก Agent/Sub-Agent ที่แคบที่สุดและเหมาะกับ next step.",authority:"เสนอ work owner; RDC เป็นผู้ตัดสินจริงใน SHADOW mode.",inputs:["Task state","Available roles"],outputs:["Selected role","Confidence"],related:"#agents"},
  "skill-router":{kicker:"PLAYBOOK RESOLUTION",purpose:"เลือก Local Skill ก่อน และใช้ Global Arsenal เมื่อเกิด capability gap จริง.",authority:"เลือกวิธีทำงาน ไม่อนุมัติการข้าม policy.",inputs:["Task type","Local skills","Capability gap"],outputs:["Skill","Global lookup"],related:"#skills"},
  "model-router":{kicker:"REASONING ROUTE",purpose:"เลือก local rule, Jev, Claude, Ollama หรือ deep reasoning ตามความซับซ้อน latency และต้นทุน.",authority:"Routing advisory; governed actions ยังอยู่ใต้ policy.",inputs:["Complexity","Latency","Privacy"],outputs:["Reasoning route"],related:"#architecture"},
  "cli-ai-peers":{kicker:"AI CLI PEER POOL",purpose:"กลุ่ม AI CLI เสริมที่ RDC route ตามงานและ availability ได้แก่ OpenAI Codex Corporate, Claude CLI และ Gemini CLI.",authority:"Advisory/reasoning/coding/review peer; ไม่มี execution authority โดยตรง. ทุก provider เป็น optional และ unavailable แล้วต้อง skip ไม่ block.",inputs:["Task type","Provider availability","Privacy/cost/latency"],outputs:["Reasoning","Code proposal","Review"],related:"#architecture"},
  "qwen-local":{kicker:"LOCAL AI MEMBER",purpose:"Qwen3 8B ที่ปรับเป็น rdc-jev-qwen3 ทำหน้าที่ planner/researcher/reviewer ผ่าน MCP/CLI.",authority:"Proposal-only; ไม่มี host execution authority. Host mutation ต้องผ่าน QA และ Human Gate ตาม policy.",inputs:["Task packet","Local context","Decision/review request"],outputs:["Plan","Review","Structured recommendation"],related:"#architecture"},
  "retry-router":{kicker:"RECOVERY CONTROL",purpose:"ตัดสิน RETRY_SAME, CHANGE_METHOD, CALL_DEBUGGER, ROLLBACK, DEEP_REASONING หรือ HUMAN_GATE หลัง failure.",authority:"Safe/idempotent retry อัตโนมัติได้; high-impact retry ต้อง gate.",inputs:["Failure evidence","Idempotency","Checkpoint"],outputs:["Recovery action"],related:"#architecture"},
  "agent-force":{kicker:"EXECUTION ROLES",purpose:"กลุ่ม Agent ที่ลงมือทำ scoped work เช่น shell/API, Playwright browser automation, code, data, GitHub, recovery และ UI fallback.",authority:"Scoped write ตามงานที่ RDC มอบหมาย; ห้ามขยาย scope เอง.",inputs:["Task packet","Skill","Tool route"],outputs:["Mutation","Artifacts","Evidence"],related:"#agents"},
  "subagents":{kicker:"PARALLEL ADVISORY",purpose:"Reviewer/Scout/Debugger/QA/Security/Context ทำงานขนานเพื่อลด context load และเพิ่ม independent review.",authority:"Read-only/advisory by default.",inputs:["Narrow review question"],outputs:["Finding","Recommendation","Evidence"],related:"#agents"},
  "arsenal":{kicker:"LAZY CAPABILITY",purpose:"Global skill metadata ที่รู้จักกว้างแต่ไม่ preload; fetch เฉพาะ pinned commit และ verify SHA ตอนต้องใช้.",authority:"ไม่มี execution authority จนถูกเลือกและผ่าน validation.",inputs:["Capability gap"],outputs:["Verified skill candidate"],related:"#arsenal"},
  "execution":{kicker:"EXECUTION FABRIC",purpose:"พื้นผิวลงมือจริงแบบ backend-first. งาน Browser ใช้ API/MCP ก่อน แล้ว Playwright CLI/MCP เป็น Primary; TinyFish เป็น Secondary fallback; จากนั้น Windows-MCP และ RDC.",authority:"ทำตาม scope ของ RDC และ policy; Router เลือก browser engine อัตโนมัติจาก intent.",inputs:["Action","Credentials via secure store","Tool args","Browser intent"],outputs:["Observed external/local state"],related:"#architecture"},
  "validator":{kicker:"SYSTEM-TWO CHECK",purpose:"ตรวจ source of truth ใหม่หลัง mutation, tests/health checks และหลักฐานสุดท้ายก่อนรายงาน DONE.",authority:"ถือ final-validation authority; Jev DONE เป็น advisory เท่านั้น.",inputs:["Requested outcome","Observed state","Tests"],outputs:["PASS","RETRY","BLOCKED"],related:"#guardrails"},
  "tool-broker":{kicker:"LIVE CAPABILITY BROKER",purpose:"อ่านสถานะเครื่องมือจริงแล้วจัด route ที่แคบและคุ้มที่สุด. งาน Browser ใช้ API/MCP → Playwright CLI/MCP → TinyFish → Windows-MCP → RDC.",authority:"เลือก/เสนอ execution surface; Playwright เป็น Primary Browser Executor และ TinyFish เป็น Secondary fallback; ไม่อนุมัติ governed action.",inputs:["Task need","Live capabilities","Privacy/latency constraints","Session availability"],outputs:["Preferred route","Fallback order"],related:"#architecture"},
  "sandbox":{kicker:"PRE-MUTATION GUARD",purpose:"จำแนก mutation, ใช้ dry-run/check และ syntax/static validation ก่อนปล่อยงานให้ executor.",authority:"หยุดที่ HUMAN_GATE เมื่อพบ governed/destructive/live-money action; ไม่แทน Final Validator.",inputs:["Planned action","Target artifacts","Rollback context"],outputs:["READ_ONLY_SAFE","DRY_RUN_REQUIRED","HUMAN_GATE"],related:"#guardrails"},
  "test-engineer":{kicker:"READ-ONLY TEST REVIEWER",purpose:"ออกแบบ test matrix ตาม failure mode และพยายาม falsify ผลลัพธ์ด้วย unit/contract/integration/regression/negative-path checks ที่เกี่ยวข้อง.",authority:"Advisory/read-only; ไม่แก้ source code.",inputs:["Change scope","Expected behavior","Evidence"],outputs:["Test matrix","Regression findings"],related:"#agents"},
  "architecture-reviewer":{kicker:"READ-ONLY ARCHITECTURE REVIEWER",purpose:"ตรวจ dependency, coupling, backward compatibility, migration sequencing, rollback และ downstream blast radius.",authority:"Advisory/read-only; broad mutation ยังอยู่กับ RDC + Human Gate.",inputs:["Change graph","Interfaces","Consumers"],outputs:["Blast-radius map","Safe sequencing","Rollback concerns"],related:"#agents"},
  "trace":{kicker:"END-TO-END OBSERVABILITY",purpose:"ใช้ Trace ID เดียวเชื่อม RDC, Jev, Agent/Sub-Agent, Skill, execution, retry และ final validation พร้อม latency/fallback evidence.",authority:"Observe only; telemetry failure ไม่ควรหยุดงานที่ปลอดภัย.",inputs:["Trace ID","Component events","Latency/status"],outputs:["Trace summary","Bottleneck/fallback evidence"],related:"#architecture"},
  "telemetry":{kicker:"JEV SHADOW LEARNING",purpose:"เก็บ confidence, agreement, latency, usage และ fallback เพื่อปรับจูน Jev โดยไม่เก็บ raw secret state.",authority:"Observe only; ไม่สั่ง execution.",inputs:["Typed decisions","Baseline"],outputs:["Tuning metrics","Promotion evidence"],related:"#jev-arsenal"},
  "eval-harness":{kicker:"MEASURE → COMPARE → CHANGE",purpose:"รัน benchmark 50 เคสเพื่อจับ regression ของ Hard Policy, Tool Routing, Sandbox, Reviewer Selection และ Final Validation ก่อนเปลี่ยน architecture.",authority:"Regression gate สำหรับ architecture change; ไม่เพิ่ม runtime execution authority.",inputs:["Frozen baseline","Current routing/policy/runtime"],outputs:["Score","Category deltas","Regression signal"],related:"#eval-harness"},
  "done":{kicker:"VERIFIED TERMINAL STATE",purpose:"สถานะจบเมื่อ outcome ถูกสังเกตจริง validation ผ่าน ไม่มี blocker และ external effect ถูกตรวจเมื่อเกี่ยวข้อง.",authority:"เกิดจาก Final Validator ไม่ใช่จาก model claim.",inputs:["Validated evidence"],outputs:["DONE"],related:"#architecture"}
};

(async()=>{
  const [s,w,a]=await Promise.all([loadJSON("data/status.json"),loadJSON("data/weekly.json"),loadJSON("data/arsenal.json")]);
  const dc=s.decision_coprocessor||{};
  const ix=s.intelligence_extensions||{};
  const ev=s.eval_harness||{};
  const metrics=[
    [s.agents,"Agents / Roles"],
    [s.local_skills,"Local Skills"],
    [dc.product||"—","Decision Coprocessor"],
    [s.global_catalog,"Global Metadata"],
    ["0","External Preload"],
    [s.gateway_version||"v1.5","Gateway"]
  ];
  document.getElementById("metrics").innerHTML=metrics.map(x=>`<div class="metric"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join("");
  const hb=document.getElementById("healthBadge");hb.textContent=s.status;hb.classList.toggle("warn",s.status!=="READY");
  document.getElementById("rules").innerHTML=s.rules.map((x,i)=>`<div class="rule"><i>${String(i+1).padStart(2,"0")}</i><span>${esc(x)}</span></div>`).join("");
  document.getElementById("humanGates").innerHTML=s.human_gates.map((x,i)=>`<div class="rule"><i>G${i+1}</i><span>${esc(x)}</span></div>`).join("");
  document.getElementById("jevState").innerHTML=[
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
    if(id==="rdc") return s.mode||"FAST EXECUTION MODE";
    if(id==="policy") return "ACTIVE · PRECEDENCE";
    if(id==="human-gate") return "ON DEMAND";
    if(id==="jev") return dc.status||"UNKNOWN";
    if(id==="agent-router") return `${s.agents||0} ROLES`;
    if(id==="skill-router") return `${s.local_skills||0} LOCAL SKILLS`;
    if(id==="arsenal") return `${s.global_catalog||0} METADATA`;
    if(id==="tool-broker") return `${ix.tool_broker?.status||"UNKNOWN"} · ${ix.tool_broker?.capability_count||0} CAPABILITIES`;
    if(id==="sandbox") return ix.sandbox?.status||"UNKNOWN";
    if(id==="test-engineer") return ix.test_regression_engineer?.status||"UNKNOWN";
    if(id==="architecture-reviewer") return ix.architecture_blast_radius_reviewer?.status||"UNKNOWN";
    if(id==="trace") return `${ix.observability?.status||"UNKNOWN"} · ${ix.observability?.traces||0} TRACES`;
    if(id==="execution") return "PLAYWRIGHT PRIMARY · TINYFISH FALLBACK · "+Object.values(fabric).map(x=>`${x.name}:${x.status}`).join(" · ");
    if(id==="validator") return "AUTHORITATIVE";
    if(id==="telemetry") return "JEV SHADOW OBSERVE";
    if(id==="done") return "VERIFIED ONLY";
    if(id==="eval-harness") return `${ev.status||"UNKNOWN"} · ${ev.cases||0} CASES · ${ev.latest_score==null?"—":Math.round(Number(ev.latest_score)*100)+"%"}`;
    if(id==="subagents") return "READ / REVIEW DEFAULT";
    if(id==="agent-force") return "SCOPED EXECUTION";
    if(id==="retry-router") return "SAFE RETRY ENABLED";
    if(id==="model-router") return "BOUNDED ROUTING";
    if(id==="qwen-local") return "LOCAL READY · MCP/CLI · PROPOSAL ONLY";
    if(id==="cli-ai-peers") return "CODEX CORPORATE READY · OPTIONAL · RDC-ROUTED";
    if(id==="human") return "MANUAL / CHAT";
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
  const NODE={"orchestrator":"rdc","rdc":"rdc","jev":"jev","agent-router":"agent-router","skill-router":"skill-router","model-router":"model-router","qwen-local":"qwen-local","qwen3":"qwen-local","rdc-jev-qwen3":"qwen-local","cli-ai-peers":"cli-ai-peers","codex-corporate":"cli-ai-peers","openai-codex-corporate":"cli-ai-peers","claude-cli":"cli-ai-peers","gemini-cli":"cli-ai-peers","retry-router":"retry-router","tool-broker":"tool-broker","sandbox":"sandbox","execution":"execution","executor":"execution","shell-api-executor":"agent-force","code-builder":"agent-force","data-engineer":"agent-force","github-release":"agent-force","recovery-agent":"agent-force","browser-automation-executor":"agent-force","playwright":"execution","playwright-cli":"execution","playwright-mcp":"execution","tinyfish":"execution","windows-mcp":"execution","ui-fallback":"agent-force","debugger":"subagents","research-scout":"subagents","qa-verifier":"subagents","security-gatekeeper":"subagents","context-librarian":"subagents","test-regression-engineer":"test-engineer","test-engineer":"test-engineer","architecture-blast-radius-reviewer":"architecture-reviewer","architecture-reviewer":"architecture-reviewer","validator":"validator","final-validator":"validator","telemetry":"telemetry","trace":"trace"};
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