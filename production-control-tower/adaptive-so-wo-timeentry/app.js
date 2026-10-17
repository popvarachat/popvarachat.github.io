const $=s=>document.querySelector(s);
let DATA=null;
const state={wo:"ALL",search:""};
const stages=["ผลิต1","ผลิต2","ผลิต3","ผลิต4","ผลิต5","Rework","Other"];
const fmt=n=>new Intl.NumberFormat("th-TH").format(n||0);
const age=m=>m==null?"-":m<60?m+" นาที":(m/60).toFixed(1)+" ชม.";
function rows(){
  return (DATA.rows||[]).filter(r=>(state.wo==="ALL"||r.id===state.wo)&&(!state.search||((r.id+" "+r.so).toLowerCase().includes(state.search.toLowerCase()))));
}
function counts(rs){
  if(state.wo==="ALL")return DATA.production.stage_counts||{};
  const o=Object.fromEntries(stages.map(s=>[s,0]));
  for(const r of rs){
    for(const s of String(r.current_stage||"").split("→").map(x=>x.trim()))if(o[s]!==undefined)o[s]++;
    if(r.rework>0)o.Rework=Math.max(o.Rework,r.rework);
  }
  return o;
}function renderKpis(rs){
 const ops=rs.reduce((a,r)=>a+(r.operations||0),0);
 const cuts=rs.reduce((a,r)=>a+(r.cuttings||0),0);
 const rw=rs.reduce((a,r)=>a+(r.rework||0),0);
 const cards=[
  ["WO",fmt(rs.length),"Work Order ใน scope","info"],
  ["Cutting",fmt(cuts),"Distinct Cutting",""],
  ["Operation",fmt(ops),"Operation rows","info"],
  ["Rework",fmt(rw),rw?"ต้องติดตาม":"ไม่พบใน scope",rw?"warn":"good"],
  ["ERP Coverage",fmt(DATA.coverage.completion_pct)+"%","9 datasets / semantic ready","good"],
  ["Blocking",fmt(DATA.exceptions.BLOCKING||0),"exception ระดับ blocking",(DATA.exceptions.BLOCKING||0)?"warn":"good"]
 ];
 $("#kpis").innerHTML=cards.map(c=>'<div class="kpi '+c[3]+'"><div class="label">'+c[0]+'</div><div class="value">'+c[1]+'</div><div class="sub">'+c[2]+'</div></div>').join("");
}function renderFlow(sc){
 const mx=Math.max(...stages.map(s=>sc[s]||0),1);
 let hot=stages[0]; for(const s of stages)if((sc[s]||0)>(sc[hot]||0))hot=s;
 $("#stageFlow").innerHTML=stages.map(s=>'<div class="stage '+(s==="Rework"?"hot":"")+'"><div class="num">'+fmt(sc[s]||0)+'</div><div class="bar-wrap"><div class="bar" style="height:'+Math.max(3,((sc[s]||0)/mx)*100)+'%"></div></div><div class="name">'+s+'</div></div>').join("");
 $("#adaptiveInsight").innerHTML='<strong>Adaptive insight:</strong> Stage ที่มี operation มากสุดคือ <strong>'+hot+'</strong> ('+fmt(sc[hot]||0)+') · Rework signal '+fmt(DATA.production.rework_signals||0);
}
function renderFreshness(){
 const fr=Object.entries(DATA.freshness||{}).sort((a,b)=>(a[1].age_minutes||0)-(b[1].age_minutes||0));
 const fm=Math.max(...fr.map(x=>x[1].age_minutes||0),1);
 $("#dailyChart").innerHTML=fr.map(([n,v])=>'<div class="day-col"><div class="day-bar-stack"><div class="day-bar" style="height:'+Math.max(7,100-((v.age_minutes||0)/fm*85))+'%"><strong>'+age(v.age_minutes)+'</strong></div></div><div class="day-label">'+n.replaceAll("_"," ")+'</div></div>').join("");
 $("#dailyLegend").textContent="แท่งสูง = ข้อมูลสดกว่า · ใช้ freshness จาก Planning Intelligence";
}function renderRadar(rs){
 const max=Math.max(...rs.map(r=>(r.operations||0)+(r.rework||0)*3),1);
 $("#projectRank").innerHTML=rs.slice().sort((a,b)=>((b.operations||0)+(b.rework||0)*3)-((a.operations||0)+(a.rework||0)*3)).map(r=>'<div class="rank-row" data-wo="'+r.id+'"><div class="rank-name">WO '+r.id+' · SO '+(r.so||"-")+'</div><div class="rank-track"><div class="rank-fill" style="width:'+((((r.operations||0)+(r.rework||0)*3)/max)*100)+'%"></div></div><div class="rank-num">'+fmt(r.operations)+'</div></div>').join("");
 document.querySelectorAll(".rank-row").forEach(el=>el.onclick=()=>{state.wo=el.dataset.wo;$("#projectFilter").value=state.wo;render();});
}
function renderSignals(rs){
 const rw=rs.reduce((a,r)=>a+(r.rework||0),0);
 const aging=Object.values(DATA.freshness||{}).filter(x=>x.state==="AGING").length;
 const missingValue=rs.filter(r=>r.value_thb==null).length;
 const missingDue=rs.filter(r=>!r.transfer_due).length;
 const cards=[
  ["red","Delivery risk gate","ยังฟันธงทัน/ไม่ทันไม่ได้ "+fmt(missingDue)+" WO เพราะยังไม่มี Target Transfer Date จาก SO"],
  ["amber","Value visibility","ยังขาดมูลค่า SO "+fmt(missingValue)+" WO — targeted SO lookup required"],
  ["amber","Freshness","AGING "+fmt(aging)+" datasets — refresh ก่อนตัดสินใจรายวัน"],
  ["green","Simulation lower-bound","คำนวณ P50/P75/P90 จาก empirical work-center time เฉพาะ route ที่มองเห็น; ไม่รวม page ที่ยังไม่ถูกดึงและ rework duration ที่ไม่มี model"]
 ];
 $("#signals").innerHTML=cards.map(s=>'<div class="signal '+s[0]+'"><div class="sig-title">'+s[1]+'</div><div class="sig-text">'+s[2]+'</div></div>').join("");
}function renderTable(rs){
 $("#detailHead").innerHTML="<tr><th>WO</th><th>SO</th><th>Cutting</th><th>Route/จุดค้าง</th><th>มูลค่า</th><th>กำหนดโอน</th><th>Sim P50</th><th>Sim P75</th><th>Sim P90</th><th>ผลทันกำหนด</th></tr>";
 $("#detailBody").innerHTML=rs.map(r=>{
  const value=r.value_thb==null?"รอ SO lookup":("฿"+fmt(r.value_thb));
  const due=r.transfer_due||"รอ SO lookup";
  const result=r.transfer_due?"รอคำนวณ":"ยังฟันธงไม่ได้";
  return '<tr><td>'+r.id+'</td><td>'+(r.so||"-")+'</td><td>'+(r.cutting||"-")+'</td><td>'+r.current_stage+'</td><td>'+value+'</td><td>'+due+'</td><td>'+fmt(r.sim_p50_hours_visible_route)+' ชม.</td><td>'+fmt(r.sim_p75_hours_visible_route)+' ชม.</td><td>'+fmt(r.sim_p90_hours_visible_route)+' ชม.</td><td class="hi">'+result+'</td></tr>';
 }).join("");
}
function render(){
 const rs=rows(),sc=counts(rs);
 renderKpis(rs); renderFlow(sc); renderFreshness(); renderRadar(rs); renderSignals(rs); renderTable(rs);
 $("#scopeNote").textContent=(state.wo==="ALL"?"ทุก WO":"WO "+state.wo)+" · "+rs.length+" records";
 $("#sourceStats").innerHTML='<span>'+DATA.coverage.datasets+' datasets</span><span>'+DATA.coverage.live_row_coverage_pct+'% live rows</span><span>'+DATA.coverage.semantic_ready+' semantic ready</span>';
}
async function init(){
 try{
  const r=await fetch("./data/current-production.json?ts="+Date.now(),{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status); DATA=await r.json();
  $("#snapshotTime").value=new Date(DATA.generated_at_utc).toLocaleString("th-TH");
  $("#projectFilter").innerHTML='<option value="ALL">ทุก WO</option>'+(DATA.rows||[]).map(r=>'<option value="'+r.id+'">WO '+r.id+' · SO '+(r.so||"-")+'</option>').join("");
  $("#projectFilter").onchange=e=>{state.wo=e.target.value;render();};
  $("#resetBtn").onclick=()=>{state.wo="ALL";state.search="";$("#projectFilter").value="ALL";$("#searchBox").value="";render();};
  $("#clearProject").onclick=()=>{state.wo="ALL";$("#projectFilter").value="ALL";render();};
  $("#searchBox").oninput=e=>{state.search=e.target.value;render();};
  render();
 }catch(e){$("#modePill").textContent="Data unavailable";$("#adaptiveInsight").textContent="ไม่สามารถโหลด Current ERP: "+e.message;}
}
init();