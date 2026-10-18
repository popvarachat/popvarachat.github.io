const $=s=>document.querySelector(s);
let DATA=null;
const state={wo:"ALL",search:""};
const fmt=n=>new Intl.NumberFormat("th-TH").format(n||0);
const money=n=>n==null?"รอ SO value lookup":"฿"+new Intl.NumberFormat("th-TH",{maximumFractionDigits:0}).format(n);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
function selectedCuttings(){
 const q=state.search.toLowerCase().trim();
 return (DATA.cuttings||[]).filter(r=>(state.wo==="ALL"||r.wo===state.wo)&&(!q||[r.wo,r.so,r.cutting,r.product,r.project_code,r.position].join(" ").toLowerCase().includes(q)));
}
function selectedWos(){
 const ids=new Set(selectedCuttings().map(r=>r.wo));
 return (DATA.rows||[]).filter(r=>ids.has(r.id));
}
function uniq(rs,k){return new Set(rs.map(r=>r[k]).filter(Boolean)).size;}
function card(label,value,sub,kind=""){return '<div class="kpi '+kind+'"><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="sub">'+sub+'</div></div>';}
function renderKpis(rs){
 const late=rs.filter(r=>r.delivery_state==="LATE").length;
 const s60=rs.filter(r=>r.status==="60").length,s70=rs.filter(r=>r.status==="70").length,s99=rs.filter(r=>r.status==="99").length;
 $("#kpis").innerHTML=card("Open WIP",fmt(rs.length),"Cutting ที่ยังไม่มี 9D","warn")+card("WO",fmt(uniq(rs,"wo")),"Work Order จริงจาก Cutting","info")+card("SO",fmt(uniq(rs,"so")),"Sales Order ที่เชื่อมได้","info")+card("ผลิต1/2 → 3/4",fmt(s60),"Status 60","")+card("อยู่ผลิต3/4",fmt(s70),"Status 70","")+card("Late",fmt(late),"เลยวันกำหนดโอน","warn");
}function renderFlow(rs){
 const stages=[["60","ผลิต1/2 → รอรับโดย 3/4"],["70","อยู่ที่ผลิต3/4"],["99","จบ Cutting → รอ 9D"]];
 const vals=stages.map(([k])=>rs.filter(r=>r.status===k).length),mx=Math.max(...vals,1);
 $("#stageFlow").innerHTML=stages.map(([k,n],i)=>'<div class="stage '+(k==="99"?"hot":"")+'"><div class="num">'+fmt(vals[i])+'</div><div class="bar-wrap"><div class="bar" style="height:'+Math.max(3,vals[i]/mx*100)+'%"></div></div><div class="name">'+n+'</div></div>').join("");
 $("#adaptiveInsight").innerHTML='<strong>All Open WIP:</strong> '+fmt(uniq(rs,"wo"))+' WO / '+fmt(rs.length)+' Cutting. Status 60 = โอนชิ้นส่วนจากผลิต1/2 ไป 3/4, Status 70 = รับโดยผลิต3/4, Status 99 = จบ Cutting แต่ยังไม่มี 9D';
}
function renderRisk(wos){
 const arr=wos.slice().sort((a,b)=>b.max_late_days-a.max_late_days).slice(0,8),mx=Math.max(...arr.map(x=>x.max_late_days),1);
 $("#dailyChart").innerHTML=arr.map(x=>'<div class="day-col"><div class="day-bar-stack"><div class="day-bar" style="height:'+Math.max(5,x.max_late_days/mx*100)+'%"><strong>'+fmt(x.max_late_days)+'d</strong></div></div><div class="day-label">WO '+esc(x.id)+'</div></div>').join("");
 $("#dailyLegend").textContent="จำนวนวันเกินกำหนดโอนสูงสุดต่อ WO";
}
function renderRank(wos){
 const mx=Math.max(...wos.map(x=>x.cuttings),1);
 $("#projectRank").innerHTML=wos.slice().sort((a,b)=>b.cuttings-a.cuttings).map(x=>'<div class="rank-row" data-wo="'+esc(x.id)+'"><div class="rank-name">WO '+esc(x.id)+' · SO '+esc(x.so||"-")+'</div><div class="rank-track"><div class="rank-fill" style="width:'+(x.cuttings/mx*100)+'%"></div></div><div class="rank-num">'+fmt(x.cuttings)+'</div></div>').join("");
 document.querySelectorAll(".rank-row").forEach(el=>el.onclick=()=>{state.wo=el.dataset.wo;$("#projectFilter").value=state.wo;render();});
}function renderSignals(rs){
 const late=rs.filter(r=>r.delivery_state==="LATE").length;
 const noDue=rs.filter(r=>r.delivery_state==="NO_DUE_DATE").length;
 const c=DATA.coverage||{};
 const cards=[
  ["red","กำหนดโอน",late+" / "+rs.length+" Cutting เลยกำหนดโอนและยังไม่มี 9D"],
  ["amber","9D gate",(c.transferred_9d||0)+" Cutting โอนครบแล้ว ถูกตัดออกจาก Open WIP"],
  ["amber","มูลค่า","Value coverage "+(c.value_coverage_pct||0)+"% — ยังไม่เดาตัวเลขจาก SO"],
  ["green","Source","JDE P594801C/PTK0002 · W594801CE · grid memory "+(c.source_rows||0)+" rows"]
 ];
 $("#signals").innerHTML=cards.map(s=>'<div class="signal '+s[0]+'"><div class="sig-title">'+s[1]+'</div><div class="sig-text">'+s[2]+'</div></div>').join("");
}
function renderTable(rs){
 $("#detailHead").innerHTML="<tr><th>WO</th><th>SO</th><th>Cutting</th><th>Type</th><th>จุดค้าง</th><th>Status</th><th>กำหนดโอน</th><th>เกินกำหนด</th><th>ผล</th><th>มูลค่า</th></tr>";
 $("#detailBody").innerHTML=rs.slice().sort((a,b)=>b.late_days-a.late_days||a.wo.localeCompare(b.wo)).map(r=>'<tr><td>'+esc(r.wo)+'</td><td>'+esc(r.so||"-")+'</td><td>'+esc(r.cutting)+'</td><td>'+esc(r.cutting_type||"-")+'</td><td>'+esc(r.position)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.due_transfer||"-")+'</td><td class="'+(r.late_days?"hi":"")+'">'+(r.late_days?fmt(r.late_days)+" วัน":"-")+'</td><td class="'+(r.delivery_state==="LATE"?"hi":"")+'">'+esc(r.delivery_state)+'</td><td>'+money(null)+'</td></tr>').join("");
}
function render(){
 const rs=selectedCuttings(),wos=selectedWos();
 renderKpis(rs);renderFlow(rs);renderRisk(wos);renderRank(wos);renderSignals(rs);renderTable(rs);
 $("#scopeNote").textContent=(state.wo==="ALL"?"ทุก WO":"WO "+state.wo)+" · "+fmt(rs.length)+" Cutting";
 $("#sourceStats").innerHTML='<span>'+fmt(DATA.coverage.open_rows)+' open</span><span>'+fmt(DATA.coverage.unique_work_orders)+' WO</span><span>'+fmt(DATA.coverage.unique_sales_orders)+' SO</span><span>'+fmt(DATA.coverage.transferred_9d)+' transferred 9D excluded</span>';
}async function init(){
 try{
  const r=await fetch("./data/current-production.json?ts="+Date.now(),{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  DATA=await r.json();
  $("#snapshotTime").value=new Date(DATA.generated_at_utc).toLocaleString("th-TH");
  $("#modePill").innerHTML='<span class="dot"></span> Cutting 40 Live WIP · Read-only';
  $("#sourceText").textContent="JDE Cutting 40 → 60/70/99 → exclude 9D → All Open WIP";
  $("#projectFilter").innerHTML='<option value="ALL">ทุก WO</option>'+(DATA.rows||[]).map(x=>'<option value="'+esc(x.id)+'">WO '+esc(x.id)+' · SO '+esc(x.so||"-")+'</option>').join("");
  $("#projectFilter").onchange=e=>{state.wo=e.target.value;render();};
  $("#searchBox").oninput=e=>{state.search=e.target.value;render();};
  $("#resetBtn").onclick=()=>{state.wo="ALL";state.search="";$("#projectFilter").value="ALL";$("#searchBox").value="";render();};
  $("#clearProject").onclick=()=>{state.wo="ALL";$("#projectFilter").value="ALL";render();};
  document.querySelectorAll("#viewMode button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#viewMode button").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelector(".trend-panel").scrollIntoView({behavior:"smooth",block:"nearest"});});
  render();
 }catch(e){
  $("#modePill").textContent="Data unavailable";
  $("#adaptiveInsight").textContent="โหลดข้อมูล Cutting 40 ไม่สำเร็จ: "+e.message;
 }
}
init();