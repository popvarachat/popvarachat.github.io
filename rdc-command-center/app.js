const loadJSON=async p=>{const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error(p+" "+r.status);return r.json()};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const fmt=n=>new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n||0);

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
  const inspectNode=node=>{
    document.querySelectorAll(".wf-node.active").forEach(n=>n.classList.remove("active"));
    node.classList.add("active");
    if(inspectorTitle) inspectorTitle.textContent=node.dataset.title||node.querySelector("b")?.textContent||"RDC Node";
    if(inspectorText) inspectorText.textContent=node.dataset.detail||"Execution component in the RDC workflow.";
  };
  document.querySelectorAll(".wf-node").forEach(node=>{
    node.addEventListener("click",()=>inspectNode(node));
    node.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inspectNode(node);}});
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