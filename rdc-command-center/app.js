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
  "retry-router":{kicker:"RECOVERY CONTROL",purpose:"ตัดสิน RETRY_SAME, CHANGE_METHOD, CALL_DEBUGGER, ROLLBACK, DEEP_REASONING หรือ HUMAN_GATE หลัง failure.",authority:"Safe/idempotent retry อัตโนมัติได้; high-impact retry ต้อง gate.",inputs:["Failure evidence","Idempotency","Checkpoint"],outputs:["Recovery action"],related:"#architecture"},
  "agent-force":{kicker:"EXECUTION ROLES",purpose:"กลุ่ม Agent ที่ลงมือทำ scoped work เช่น shell/API, code, data, GitHub, recovery และ UI fallback.",authority:"Scoped write ตามงานที่ RDC มอบหมาย; ห้ามขยาย scope เอง.",inputs:["Task packet","Skill","Tool route"],outputs:["Mutation","Artifacts","Evidence"],related:"#agents"},
  "subagents":{kicker:"PARALLEL ADVISORY",purpose:"Reviewer/Scout/Debugger/QA/Security/Context ทำงานขนานเพื่อลด context load และเพิ่ม independent review.",authority:"Read-only/advisory by default.",inputs:["Narrow review question"],outputs:["Finding","Recommendation","Evidence"],related:"#agents"},
  "arsenal":{kicker:"LAZY CAPABILITY",purpose:"Global skill metadata ที่รู้จักกว้างแต่ไม่ preload; fetch เฉพาะ pinned commit และ verify SHA ตอนต้องใช้.",authority:"ไม่มี execution authority จนถูกเลือกและผ่าน validation.",inputs:["Capability gap"],outputs:["Verified skill candidate"],related:"#arsenal"},
  "execution":{kicker:"EXECUTION FABRIC",purpose:"พื้นผิวลงมือจริงโดยเรียง backend-first: API → MCP → CLI → OI → UI fallback.",authority:"ทำตาม scope ของ RDC และ policy; UI เป็นทางเลือกสุดท้าย.",inputs:["Action","Credentials via secure store","Tool args"],outputs:["Observed external/local state"],related:"#architecture"},
  "validator":{kicker:"SYSTEM-TWO CHECK",purpose:"ตรวจ source of truth ใหม่หลัง mutation, tests/health checks และหลักฐานสุดท้ายก่อนรายงาน DONE.",authority:"ถือ final-validation authority; Jev DONE เป็น advisory เท่านั้น.",inputs:["Requested outcome","Observed state","Tests"],outputs:["PASS","RETRY","BLOCKED"],related:"#guardrails"},
  "telemetry":{kicker:"SHADOW LEARNING",purpose:"เก็บ confidence, agreement, latency, usage และ fallback เพื่อปรับจูน Jev โดยไม่เก็บ raw secret state.",authority:"Observe only; ไม่สั่ง execution.",inputs:["Typed decisions","Baseline"],outputs:["Tuning metrics","Promotion evidence"],related:"#jev-arsenal"},
  "done":{kicker:"VERIFIED TERMINAL STATE",purpose:"สถานะจบเมื่อ outcome ถูกสังเกตจริง validation ผ่าน ไม่มี blocker และ external effect ถูกตรวจเมื่อเกี่ยวข้อง.",authority:"เกิดจาก Final Validator ไม่ใช่จาก model claim.",inputs:["Validated evidence"],outputs:["DONE"],related:"#architecture"}
};

(async()=>{
  const [s,w,a]=await Promise.all([loadJSON("data/status.json"),loadJSON("data/weekly.json"),loadJSON("data/arsenal.json")]);
  const dc=s.decision_coprocessor||{};
  const metrics=[
    [s.agents,"Agents / Roles"],
    [s.local_skills,"Local Skills"],
    [dc.product||"—","Decision Coprocessor"],
    [s.global_catalog,"Global Metadata"],
    ["0","External Preload"],
    [s.gateway_version||"v1.4","Gateway"]
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

  const jevGraph=document.getElementById("jevGraphStatus");
  if(jevGraph) jevGraph.textContent=`${dc.status||"UNKNOWN"} · ${dc.model||"—"}`;

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
    if(id==="execution") return Object.values(fabric).map(x=>`${x.name}:${x.status}`).join(" · ");
    if(id==="validator") return "AUTHORITATIVE";
    if(id==="telemetry") return "SHADOW OBSERVE";
    if(id==="done") return "VERIFIED ONLY";
    if(id==="subagents") return "READ / REVIEW DEFAULT";
    if(id==="agent-force") return "SCOPED EXECUTION";
    if(id==="retry-router") return "SAFE RETRY ENABLED";
    if(id==="model-router") return "BOUNDED ROUTING";
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