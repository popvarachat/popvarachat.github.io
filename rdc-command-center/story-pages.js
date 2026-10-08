(()=>{
  const pages=[
    {id:"summary",title:"Executive Summary"},
    {id:"runtime",title:"Runtime & L5"},
    {id:"resources",title:"Resource Fabric"},
    {id:"architecture",title:"Architecture & Workforce"},
    {id:"performance",title:"Performance & Improvement"},
    {id:"governance",title:"Governance & Evidence"}
  ];
  const byId=id=>pages.findIndex(x=>x.id===id);
  let current=0;
  const hero=document.querySelector(".hero"),metrics=document.getElementById("metrics");
  const nav=[...document.querySelectorAll("[data-story-target]")];
  const sections=[...document.querySelectorAll(".section[data-story-page]")];
  const prev=document.getElementById("storyPrev"),next=document.getElementById("storyNext");
  const no=document.getElementById("storyPageNo"),title=document.getElementById("storyPageTitle");
  const show=(idx,updateHash=true)=>{
    current=Math.max(0,Math.min(pages.length-1,idx));
    const page=pages[current];
    document.body.classList.add("story-ready");
    sections.forEach(s=>s.classList.toggle("story-active",s.dataset.storyPage===page.id));
    nav.forEach(b=>b.classList.toggle("active",b.dataset.storyTarget===page.id));
    hero?.classList.toggle("story-hidden",page.id!=="summary");
    metrics?.classList.toggle("story-hidden",page.id!=="summary");
    if(no)no.textContent=String(current+1).padStart(2,"0")+" / "+String(pages.length).padStart(2,"0");
    if(title)title.textContent=page.title;
    if(prev)prev.disabled=current===0;if(next)next.disabled=current===pages.length-1;
    if(updateHash)history.replaceState(null,"","#page-"+page.id);
    window.scrollTo({top:0,behavior:"instant"});
  };
  nav.forEach(b=>b.addEventListener("click",()=>show(byId(b.dataset.storyTarget))));
  prev?.addEventListener("click",()=>show(current-1));next?.addEventListener("click",()=>show(current+1));
  const deepMap={resource_fabric:"resources","resource-fabric":"resources","live-monitor":"runtime","adaptive-runtime":"runtime","architecture":"architecture","agents":"architecture","skills":"architecture","arsenal":"architecture","self-improvement":"performance","eval-harness":"performance","weekly":"performance","jev-arsenal":"governance","guardrails":"governance"};
  const raw=(location.hash||"").slice(1);
  let initial=raw.startsWith("page-")?byId(raw.slice(5)):byId(deepMap[raw]||"summary");
  if(initial<0)initial=0;show(initial,false);

  const fmt=v=>v==null?"—":Number(v).toFixed(Number(v)%1?1:0)+"%";
  fetch("data/performance_summary.json?ts="+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(p=>{
    const find=id=>(p.kpis||[]).find(x=>x.id===id)||{};
    const success=find("success_rate").value,first=find("first_pass_success").value,retry=find("retry_rate").value,gate=find("human_gate_rate").value,auto=find("automation_rate").value;
    const samples=p.window?.history_points??0;
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    set("sumSamples",samples);set("sumSuccess",fmt(success));set("sumAutomation",fmt(auto));
    set("sumLegendSuccess",fmt(success));set("sumLegendFirst",fmt(first));set("sumLegendRetry",fmt(retry));set("sumLegendGate",fmt(gate));
    set("sumAutoPct",fmt(auto));set("sumGatePct",fmt(gate));
    const measured=[success,first,auto].filter(v=>typeof v==="number");
    const health=measured.length?Math.round(measured.reduce((a,b)=>a+b,0)/measured.length):null;
    set("sumHealthScore",health==null?"—":health+"%");
    const ring=document.getElementById("sumHealthRing");if(ring)ring.style.setProperty("--score",health||0);
    const chip=document.getElementById("sumAutoChip");if(chip)chip.textContent=auto==null?"WAITING":fmt(auto)+" AUTONOMOUS";
    const ab=document.getElementById("sumAutoBar"),gb=document.getElementById("sumGateBar");if(ab)ab.style.setProperty("--w",(auto||0)+"%");if(gb)gb.style.setProperty("--w",(gate||0)+"%");
    const rows=p.charts?.runtime_health||[],chart=document.getElementById("sumTimelineChart");
    if(chart&&rows.length){chart.innerHTML=rows.slice(-16).map((x,i)=>'<div class="sum-sample" title="'+(x.host_id||"host")+'"><i class="success" style="height:'+(x.success?80:8)+'%"></i><i class="retry" style="height:'+(x.retry?42:4)+'%"></i><i class="gate" style="height:'+(x.human_gate?42:4)+'%"></i><span>'+(i+1)+'</span></div>').join("")}
  }).catch(()=>{});
})();