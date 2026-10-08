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

;(()=>{
  const D={
    readiness:{
      kicker:"SYSTEM READINESS",title:"Runtime Readiness · PC + Notebook",page:"runtime",
      current:()=> "100%",status:()=> "VALIDATED",
      operation:"Capability Registry ตรวจ capability ของแต่ละ host ก่อนรับงาน แล้ว Planner/Router ใช้ข้อมูลนี้เลือก execution path ที่มีอยู่จริง.",
      analysis:"Readiness 12/12 ทั้ง PC และ Notebook หมายถึง capability checks ผ่าน ไม่ได้หมายความว่า performance ทุกมิติอยู่ที่ 100%. ต้องแยก readiness ออกจาก success, latency, cost และ autonomy.",
      a:"คง probe/heartbeat ต่อเนื่องและวัด false-ready / stale capability ให้ได้.",
      b:"เพิ่ม host capability score + freshness TTL เพื่อไม่ route งานไปข้อมูลเก่า.",
      c:"หาก probe ขัดแย้ง ให้ mark DEGRADED, หยุด route capability นั้น และใช้ Human Gate เมื่อกระทบ production.",
      internal:"Public view แสดงเพียงสถานะ capability. รายการ endpoint, credential, local path และ raw probe evidence ต้องอยู่ private/local.",
      prevention:"Re-probe หลัง restart, timeout capability ที่ stale, ห้ามถือ READY จากข้อมูลก่อน reboot และ validate ก่อน rejoin.",
      stats:"Source: capability probe / runtime validation · PC 12/12 · NB 12/12 · heartbeat policy 15 min."
    },
    health:{
      kicker:"SYSTEM HEALTH",title:"Execution Quality & Reliability",page:"performance",
      current:()=>document.getElementById("sumSuccess")?.textContent||"—",status:()=> "MEASURED · SMALL SAMPLE",
      operation:"วัดผลของ production task ตั้งแต่รับ intent → route → execute → validate → evidence แล้วสรุป success / first-pass / retry / Human Gate.",
      analysis:"ค่าปัจจุบันสูง แต่ sample ยังน้อยมาก จึงใช้เป็นหลักฐานว่า pipeline เริ่มวัดได้ ไม่ควรใช้สรุปแนวโน้มระยะยาว.",
      a:"สะสม production traces จาก ERP/Playwright/CLI จริงให้ครบ schema และเพิ่ม minimum sample gate ก่อนตีความ score.",
      b:"แยก KPI ตาม task type, host, agent และ tool เพื่อหาว่า success สูงเพราะงานง่ายหรือระบบดีจริง.",
      c:"ถ้า success ลดลง ให้ freeze promotion, เปิด failure pattern analysis และ route งานเสี่ยงผ่าน validator/Human Gate.",
      internal:"Raw trace / evidence payload ไม่เปิดบน public. Public แสดง aggregate และ trace-safe metadata เท่านั้น.",
      prevention:"ห้ามนับ test/demo เป็น production, dedupe trace_id+host_id, ใช้ evidence completeness ก่อนถือว่า DONE.",
      stats:"Source: task_runs + validation/evidence · Window: fleet snapshot / target 7d trend · Current production samples: "+(document.getElementById("sumSamples")?.textContent||"—")
    },
    autonomy:{
      kicker:"AUTONOMY",title:"Automation vs Human Gate",page:"performance",
      current:()=>document.getElementById("sumAutomation")?.textContent||"—",status:()=> "COLLECTING",
      operation:"วัดสัดส่วนงานที่ RDC วางแผน/route/execute/validate จบเอง เทียบกับงานที่ต้องหยุดให้ Human Gate ตัดสินใจ.",
      analysis:"Autonomy สูงมีค่าเมื่อ reliability, safety และ evidence ยังดีด้วย. เป้าหมายไม่ใช่ลด Human Gate ให้เป็นศูนย์ แต่ใช้ Gate เฉพาะจุดเสี่ยง.",
      a:"ลด manual intervention ในงาน read-only/repeatable ด้วย skill/template ที่ผ่าน validation.",
      b:"เพิ่ม confidence calibration เพื่อให้ low-confidence escalates แต่ high-confidence ผ่านอัตโนมัติ.",
      c:"งาน production-impact / credential / destructive / live-money บังคับ Human Gate และ rollback path.",
      internal:"Authority flags และ policy boundary รายละเอียดเชิงสิทธิ์ไม่เปิด public; เก็บ private policy/evidence.",
      prevention:"Never trade safety for autonomy; audit bypass attempts; require evidence before auto-promotion.",
      stats:"Primary metrics: automation_rate, human_gate_rate, manual_intervention, rollback rate."
    },
    resources:{
      kicker:"RESOURCE FABRIC",title:"PC + Notebook Resource Placement",page:"resources",
      current:()=> "79.3 GB capacity",status:()=> "2 HOSTS",
      operation:"RDC ใช้ task-level pooling: route workload ไป PC/NB ตาม RAM/CPU/capability แล้วส่งผลลัพธ์/state กลับ ไม่ได้รวม physical RAM เป็น address space เดียว.",
      analysis:"PC มี RAM มากกว่าและ free RAM สูงกว่า จึงเหมาะ heavy-memory; Notebook เหมาะ interactive/browser orchestration. ประสิทธิภาพขึ้นกับ placement ไม่ใช่ aggregate RAM อย่างเดียว.",
      a:"ใช้ PC เป็น default heavy host และ NB เป็น orchestration/interactivity พร้อม threshold free RAM.",
      b:"เพิ่ม durable job queue + shared artifact/cache เพื่อ handoff ข้าม host ได้เร็วและลดงานซ้ำ.",
      c:"ถ้า host หาย ให้ drain → re-plan → fallback/wait → re-probe ก่อน rejoin; ห้ามทำ silent host-specific failover.",
      internal:"ไม่เปิด network credential, remote token, private share path หรือ authenticated session บน public page.",
      prevention:"Heartbeat + freshness TTL + checkpoint/evidence + idempotent retry + host-specific capability guard.",
      stats:"PC 63.7 GB total / 47.4 GB free snapshot · NB 15.6 GB total / 4.3 GB free snapshot."
    },
    l5:{
      kicker:"L5 READINESS",title:"Self-Improvement Loop",page:"performance",
      current:()=> "BASELINE BUILDING",status:()=> "L5-READY FOUNDATION",
      operation:"Observe → Measure → Compare → Diagnose → Recommend → Shadow/Canary → Evaluate → Promote/Rollback → Learn.",
      analysis:"Telemetry/KPI foundation เริ่มทำงานแล้ว แต่ Compare/Diagnose/Canary ยังต้อง sample จริงมากขึ้นก่อนปล่อย automatic improvement.",
      a:"เพิ่ม instrumentation ให้ ERP/Playwright/CLI ทุก workflow กลายเป็น production trace มาตรฐาน.",
      b:"สร้าง candidate generator จาก failure pattern, latency, route regret, cost/quality พร้อม confidence.",
      c:"ห้าม auto-promote architecture/skill ถ้า sample ต่ำ, evidence ไม่ครบ หรือ canary แย่กว่า baseline.",
      internal:"Architecture proposal/eval evidence ฉบับเต็มควรอยู่ private repo/evidence store; public แสดง status/summary.",
      prevention:"Minimum sample, shadow-first, canary threshold, rollback criteria, immutable evidence hash.",
      stats:"Dimensions: Quality · Reliability · Speed · Cost efficiency · Autonomy · Safety. Score ยังรอ baseline ที่มี sample เพียงพอ."
    },
    samples:{
      kicker:"FLEET TELEMETRY",title:"Production Samples & Statistical Record",page:"performance",
      current:()=> (document.getElementById("sumSamples")?.textContent||"—")+" samples",status:()=> "REAL TELEMETRY ONLY",
      operation:"PC/NB collector เขียน record ด้วย host_id + trace_id แล้ว Fleet Aggregator dedupe และคำนวณ KPI ก่อน promote เป็น public snapshot.",
      analysis:"ตอนนี้ sample จริงยังน้อย จึงเหมาะกับการ verify ว่า pipeline วัดได้ แต่ยังไม่พอสำหรับ trend, SLA หรือ causal conclusion.",
      a:"Instrument ERP current project ให้ task/tool/agent/validation/evidence ทุก step เข้า schema เดียวกัน.",
      b:"เพิ่ม 7d/30d rolling window, task-type segmentation และ confidence interval/minimum sample threshold.",
      c:"ถ้า collector degraded ให้ mark gap ชัดเจน, ไม่ backfill ด้วยข้อมูลสมมุติ และหยุด promotion score ที่อาศัยช่วงข้อมูลขาด.",
      internal:"Raw command text, payload, ERP content และ sensitive evidence ไม่ส่งขึ้น public. Public ใช้ aggregate.",
      prevention:"Dedupe, test exclusion, clock normalization, missing-duration flag, collector health monitor.",
      stats:"Entities: task_runs, agent_runs, tool_runs, model_runs, validation_runs, canary_runs, evidence_ledger."
    },
    attention:{
      kicker:"MANAGEMENT ATTENTION",title:"Management Risks & Improvement Priorities",page:"governance",
      current:()=> "4 active notes",status:()=> "EXECUTIVE WATCH",
      operation:"รวมประเด็นที่ผู้บริหารควรรู้ก่อนอ่าน KPI เช่น sample ต่ำ, resource role, L5 evidence และ public snapshot cost policy.",
      analysis:"ใช้เพื่อกันการอ่าน dashboard ผิดบริบท เช่น 100% จาก sample เดียว หรือ READY = performance ดีทุกด้าน.",
      a:"แก้ P0 instrumentation gaps ก่อนเพิ่ม feature ใหม่ เพื่อให้ข้อมูลตัดสินใจเชื่อถือได้.",
      b:"จัด priority = Impact × Frequency × Confidence ÷ Cost/Risk แล้วทำ shadow/canary.",
      c:"ประเด็น safety/production-impact ให้ containment ก่อน optimization และ Human Gate เมื่อจำเป็น.",
      internal:"Management/private evidence, root-cause notes และ security details แยกจาก public executive note.",
      prevention:"ทุก recommendation ต้องมี owner/status/evidence/before-after และ promotion/rollback decision.",
      stats:"Public summary = batch snapshot; detailed operational evidence remains local/private."
    }
  };

  const drawer=document.getElementById("execDrill"),backdrop=document.getElementById("execDrillBackdrop");
  if(!drawer||!backdrop)return;
  let currentKey="health";
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v||"—"};
  const rich=(id,text)=>{const e=document.getElementById(id);if(e)e.innerHTML='<p>'+String(text||"").replaceAll("\n","</p><p>")+'</p>'};
  const open=(key)=>{
    const d=D[key]||D.health;currentKey=key;
    set("drillKicker",d.kicker);set("drillTitle",d.title);set("drillCurrent",typeof d.current==="function"?d.current():d.current);set("drillStatus",typeof d.status==="function"?d.status():d.status);
    rich("drillOperation",d.operation);rich("drillAnalysis",d.analysis);set("drillPlanA",d.a);set("drillPlanB",d.b);set("drillPlanC",d.c);rich("drillInternal",d.internal);rich("drillPrevention",d.prevention);rich("drillStatistics",d.stats);
    document.querySelectorAll("[data-drill-tab]").forEach((b,i)=>b.classList.toggle("active",i===0));document.querySelectorAll("[data-drill-pane]").forEach((p,i)=>p.classList.toggle("active",i===0));
    backdrop.hidden=false;drawer.classList.add("open");drawer.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
  };
  const close=()=>{drawer.classList.remove("open");drawer.setAttribute("aria-hidden","true");backdrop.hidden=true;document.body.style.overflow=""};
  document.querySelectorAll("[data-drill]").forEach(el=>{
    el.addEventListener("click",()=>open(el.dataset.drill));
    el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open(el.dataset.drill)}});
  });
  document.querySelectorAll("[data-drill-tab]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("[data-drill-tab]").forEach(x=>x.classList.toggle("active",x===b));
    document.querySelectorAll("[data-drill-pane]").forEach(p=>p.classList.toggle("active",p.dataset.drillPane===b.dataset.drillTab));
  }));
  document.getElementById("execDrillClose")?.addEventListener("click",close);document.getElementById("drillCloseBottom")?.addEventListener("click",close);backdrop.addEventListener("click",close);document.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawer.classList.contains("open"))close()});
  document.getElementById("drillDeepLink")?.addEventListener("click",()=>{
    const page=(D[currentKey]||D.health).page;close();document.querySelector('[data-story-target="'+page+'"]')?.click();
  });
})();
