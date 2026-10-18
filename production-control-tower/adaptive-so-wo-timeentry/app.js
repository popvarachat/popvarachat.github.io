const $=s=>document.querySelector(s);
let DATA;
const state={wo:'ALL',so:'ALL',production:'ALL',search:'',mode:'pivot'};
const fmt=n=>new Intl.NumberFormat('th-TH').format(n||0);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const stamp=d=>d?new Date(d).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}):'ไม่ทราบ';
const distinct=rs=>[...new Map(rs.map(r=>[r.cutting,r])).values()];
const uniq=(rs,k)=>new Set(rs.map(r=>r[k]).filter(Boolean)).size;
function selectedCuttings(ignoreProduction=false){
 const q=state.search.toLowerCase().trim();
 return distinct(DATA.cuttings||[]).filter(r=>(state.wo==='ALL'||r.wo===state.wo)&&(state.so==='ALL'||r.so===state.so)&&(ignoreProduction||state.production==='ALL'||r.position===state.production)&&(!q||[r.wo,r.so,r.cutting,r.product,r.project_code,r.position,r.control_plan,r.controlplan_business_unit].join(' ').toLowerCase().includes(q)));
}
function card(l,v,s,k=''){return '<div class="kpi '+k+'"><div class="label">'+esc(l)+'</div><div class="value">'+fmt(v)+'</div><div class="sub">'+esc(s)+'</div></div>';}
function renderKpis(rs){
 $('#kpis').innerHTML=card('Open Cutting',rs.length,'Distinct Cutting / ยังไม่มี 9D','info')+card('WO',uniq(rs,'wo'),'ตามขอบเขต Cutting 40','info')+card('SO',uniq(rs,'so'),'Sales Order','info')+card('ระบุแผนกได้',rs.filter(r=>r.position!=='รอตรวจสอบ').length,'ControlPlan + Access reference','info')+card('เกินกำหนดโอน',rs.filter(r=>r.delivery_state==='LATE').length,'เทียบวันที่ ERP กับวันนี้','warn')+card('Status 99',rs.filter(r=>r.status==='99').length,'จบ Cutting แต่ยังไม่มี 9D','warn');
}
function columns(rs){
 const order=['Store','สโตร์','ENG','Planning','ผลิต1','ผลิต2','ผลิต3','ผลิต3,4','ผลิต4','ผลิต5','Finish','รอตรวจสอบ'];
 const present=[...new Set(rs.map(r=>r.position))];
 return [...new Set([...order.filter(x=>present.includes(x)||['สโตร์','ผลิต1','ผลิต2','ผลิต3','ผลิต4','ผลิต5','Finish'].includes(x)),...present])];
}
function renderPivot(rs){
 const cols=columns(DATA.cuttings),groups=new Map();
 for(const r of rs){const key=r.so+'|'+r.wo;if(!groups.has(key))groups.set(key,{so:r.so,wo:r.wo,rows:[]});groups.get(key).rows.push(r);}
 const arr=[...groups.values()].sort((a,b)=>a.so.localeCompare(b.so)||a.wo.localeCompare(b.wo));
 $('#pivotHead').innerHTML='<tr><th>SO</th><th>WO</th>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'<th>Late</th><th>Grand Total</th></tr>';
 $('#pivotBody').innerHTML=arr.map(g=>'<tr><td><button class="text-btn" data-so="'+esc(g.so)+'">'+esc(g.so)+'</button></td><td><button class="text-btn" data-wo="'+esc(g.wo)+'">'+esc(g.wo)+'</button></td>'+cols.map(c=>{const n=g.rows.filter(r=>r.position===c).length;return '<td>'+(n?'<button class="text-btn" data-wo="'+esc(g.wo)+'" data-production="'+esc(c)+'">'+fmt(n)+'</button>':'·')+'</td>';}).join('')+'<td class="hi">'+fmt(g.rows.filter(r=>r.delivery_state==='LATE').length)+'</td><td><strong>'+fmt(g.rows.length)+'</strong></td></tr>').join('')+'<tr><td><strong>Grand Total</strong></td><td></td>'+cols.map(c=>'<td><strong>'+fmt(rs.filter(r=>r.position===c).length)+'</strong></td>').join('')+'<td class="hi">'+fmt(rs.filter(r=>r.delivery_state==='LATE').length)+'</td><td><strong>'+fmt(rs.length)+'</strong></td></tr>';
 $('#pivotNote').textContent='Distinct Cutting • '+(state.so==='ALL'?'ทุก SO':'SO '+state.so)+' / '+(state.wo==='ALL'?'ทุก WO':'WO '+state.wo)+' / '+(state.production==='ALL'?'ทุกแผนก':state.production)+' • คลิกเพื่อเจาะ / รีเซ็ตเพื่อกลับ';
 $('#pivotBody').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.so)state.so=b.dataset.so;if(b.dataset.wo){state.wo=b.dataset.wo;$('#projectFilter').value=state.wo;}if(b.dataset.production)state.production=b.dataset.production;render();$('#detailBody').closest('section').scrollIntoView({behavior:'smooth',block:'start'});});
}
function renderFlow(rs){
 const counts=columns(rs).map(c=>[c,rs.filter(r=>r.position===c).length]).filter(x=>x[1]),mx=Math.max(1,...counts.map(x=>x[1]));
 $('#stageFlow').innerHTML=counts.map(([c,n])=>'<button class="stage stage-button" data-production="'+esc(c)+'"><div class="num">'+fmt(n)+'</div><div class="bar-wrap"><div class="bar" style="height:'+Math.max(3,n/mx*100)+'%"></div></div><div class="name">'+esc(c)+'</div></button>').join('');
 $('#stageFlow').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.production=b.dataset.production;render();});
 $('#adaptiveInsight').textContent='แผนกคำนวณจาก SQL เดิมใน Access + Cutting Type / Status / ControlPlan สด ไม่แปลง Status 60/70 เป็นผลิตแบบเหมารวม และไม่ใช้ WO Status แทน Cutting lifecycle';
}
function renderRisk(rs){
 const by=new Map();for(const r of rs){if(!by.has(r.wo))by.set(r.wo,{id:r.wo,late:0});by.get(r.wo).late=Math.max(by.get(r.wo).late,r.late_days||0);}
 const arr=[...by.values()].sort((a,b)=>b.late-a.late).slice(0,8),mx=Math.max(1,...arr.map(x=>x.late));
 $('#dailyChart').innerHTML=arr.map(x=>'<div class="day-col"><div class="day-bar-stack"><div class="day-bar" style="height:'+Math.max(5,x.late/mx*100)+'%"><strong>'+fmt(x.late)+'d</strong></div></div><div class="day-label">WO '+esc(x.id)+'</div></div>').join('');
 $('#dailyLegend').textContent='จำนวนวันเกินกำหนดโอนสูงสุด ไม่ใช่ระยะเวลาที่ค้างในแผนก';
}
function renderRank(rs){
 const groups=new Map();for(const r of rs){if(!groups.has(r.wo))groups.set(r.wo,[]);groups.get(r.wo).push(r);}
 const arr=[...groups].sort((a,b)=>b[1].length-a[1].length),mx=Math.max(1,...arr.map(x=>x[1].length));
 $('#projectRank').innerHTML=arr.map(([wo,cs])=>'<button class="rank-row" data-wo="'+esc(wo)+'"><div class="rank-name">WO '+esc(wo)+'</div><div class="rank-track"><div class="rank-fill" style="width:'+cs.length/mx*100+'%"></div></div><div class="rank-num">'+fmt(cs.length)+'</div></button>').join('');
 $('#projectRank').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.wo=b.dataset.wo;$('#projectFilter').value=state.wo;render();});
}
function renderSignals(rs){
 const c=DATA.controlplan||{},unknown=rs.filter(r=>r.position==='รอตรวจสอบ').length;
 const conflicts=(c.anomalies||[]).filter(a=>a.reason==='STATUS_SOURCE_CONFLICT');
 const cards=[[conflicts.length?'amber':'green','สถานะระหว่างแหล่งข้อมูล',conflicts.length?conflicts.map(a=>'Cutting '+a.cutting+': Monitor '+a.monitor_status+' / Cutting '+a.cutting_status+' — ยึด Cutting lifecycle').join('; '):'ไม่มีสถานะขัดกัน'],['green','ControlPlan',fmt(c.resolved_cuttings)+' / '+fmt(DATA.cuttings.length)+' Cutting ระบุแผนกได้; '+fmt(c.operation_rows)+' operation rows'],[unknown?'red':'green','ข้อยกเว้น',unknown?fmt(unknown)+' Cutting ต้องตรวจหลักฐานเพิ่ม':'ไม่มี Cutting ที่มีหลายคำตอบจาก reference'],['amber','ขอบเขตข้อมูล','เฉพาะชุด Cutting 40 ที่ ERP คืนมา ไม่ใช่ WIP ทั้งโรงงาน'],['amber','รอบข้อมูล','Cutting: '+stamp(DATA.cutting_snapshot_at_utc)+' | ControlPlan: '+stamp(c.collected_to)],['amber','มูลค่า SO','ยังไม่เชื่อมแหล่งมูลค่าที่รับรอง จึงเว้นว่าง'],['green','การอัปเดต','Snapshot ที่ดึงจาก ERP ในรอบนี้ ยังไม่ได้ตั้งดึงอัตโนมัติ']];
 $('#signals').innerHTML=cards.map(([k,l,t])=>'<div class="signal '+k+'"><div class="sig-title">'+esc(l)+'</div><div class="sig-text">'+esc(t)+'</div></div>').join('');
}
function opText(o){return o?o.seq+' · '+o.business_unit+' · '+(o.description||''):'ไม่มีขั้นตอนค้างที่ยืนยันได้';}
function renderTable(rs){
 $('#detailHead').innerHTML='<tr>'+['SO','WO','Cutting','Type / Status','แผนกตาม ControlPlan','ControlPlan / Business Unit','Operation แรกที่ยังไม่จบ','กำหนดโอน','Late (วัน)','99 / 9D','หลักฐาน'].map(x=>'<th>'+x+'</th>').join('')+'</tr>';
 $('#detailBody').innerHTML=rs.slice().sort((a,b)=>a.so.localeCompare(b.so)||a.wo.localeCompare(b.wo)||a.cutting.localeCompare(b.cutting)).map(r=>'<tr><td>'+esc(r.so)+'</td><td>'+esc(r.wo)+'</td><td>'+esc(r.cutting)+'</td><td>'+esc(r.cutting_type)+' / '+esc(r.status)+'</td><td><strong>'+esc(r.position)+'</strong><br><small>'+esc(r.position_detail===r.position?'':r.position_detail)+(r.source_status_conflict?' ⚠ สถานะขัดกัน':'')+'</small></td><td>'+esc(r.control_plan||'ไม่มี')+'<br><small>'+esc(r.controlplan_business_unit||'-')+'</small></td><td>'+esc(opText(r.next_open_operation))+'</td><td>'+esc(r.due_transfer||'-')+'</td><td class="'+(r.late_days?'hi':'')+'">'+fmt(r.late_days)+'</td><td>'+esc(r.date_closed||'-')+' / '+esc(r.date_9d||'-')+'</td><td><button class="text-btn" data-cutting="'+esc(r.cutting)+'">'+fmt(r.operations?.length)+' ขั้นตอน</button></td></tr>').join('');
 $('#detailBody').querySelectorAll('button').forEach(b=>b.onclick=()=>showEvidence(DATA.cuttings.find(r=>r.cutting===b.dataset.cutting)));
}
function showEvidence(r){
 let dlg=$('#evidenceDialog');if(!dlg){dlg=document.createElement('dialog');dlg.id='evidenceDialog';document.body.append(dlg);}
 dlg.innerHTML='<button id="closeEvidence" class="ghost-btn">ปิด ×</button><h2>Cutting '+esc(r.cutting)+'</h2><p>'+esc(r.position)+' · '+esc(r.control_plan)+' · '+esc(r.controlplan_business_unit)+'</p><p>แผนกตาม ControlPlan = ผล SQL เดิมของ Access ส่วนรายการด้านล่างเป็น routing สดพร้อมสถานะ operation ไม่ใช่ตำแหน่งทางกายภาพที่รับรองด้วยการสแกนหน้างาน</p><p>Max Oper Seq: '+esc(r.max_operation_seq)+' · วิธี: '+esc(r.resolution_method)+'</p><div class="table-wrap"><table><thead><tr>'+['Seq','Business Unit','Operation','Code / Status','เริ่ม','จบ'].map(s=>'<th>'+s+'</th>').join('')+'</tr></thead><tbody>'+r.operations.map(o=>'<tr><td>'+esc(o.seq)+'</td><td>'+esc(o.business_unit)+'</td><td>'+esc(o.description)+'</td><td>'+esc(o.code||'-')+' / '+esc(o.status)+'</td><td>'+esc(o.begin_date||'-')+'</td><td>'+esc(o.end_date||'-')+'</td></tr>').join('')+'</tbody></table></div>';
 $('#closeEvidence').onclick=()=>dlg.close();dlg.showModal();
}
function setMode(mode){state.mode=mode;document.querySelectorAll('#viewMode button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('#pivotPanel').style.display=mode==='pivot'?'block':'none';document.querySelector('.stage-panel').style.display=mode==='flow'?'block':'none';document.querySelector('.trend-panel').style.display=mode==='risk'?'block':'none';document.querySelector('.layout-main').style.display=mode==='pivot'?'none':'grid';}
function render(){
 const rs=selectedCuttings();renderKpis(rs);renderPivot(rs);renderFlow(rs);renderRisk(rs);renderRank(rs);renderSignals(rs);renderTable(rs);
 $('#scopeNote').textContent=[state.so==='ALL'?'ทุก SO':'SO '+state.so,state.wo==='ALL'?'ทุก WO':'WO '+state.wo,state.production==='ALL'?'ทุกแผนก':state.production,fmt(rs.length)+' Cutting'].join(' · ');
 $('#sourceStats').innerHTML='<span>'+fmt(DATA.coverage.open_rows)+' open</span><span>'+fmt(DATA.coverage.unique_work_orders)+' WO</span><span>'+fmt(DATA.coverage.unique_sales_orders)+' SO</span><span>'+fmt(DATA.coverage.transferred_9d)+' มี 9D ตัดออก</span>';
 $('#scopeNote').title='กดรีเซ็ตเพื่อกลับทุก SO / WO / แผนก';
}
function reset(){state.wo=state.so=state.production='ALL';state.search='';$('#projectFilter').value='ALL';$('#searchBox').value='';render();}
async function init(){try{
 const response=await fetch('./data/current-production.json?ts='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);DATA=await response.json();
 $('#snapshotTime').value=stamp(DATA.cutting_snapshot_at_utc||DATA.generated_at_utc);
 $('#modePill').textContent='ERP snapshot · Read-only';
 $('#sourceText').textContent=DATA.source;
 $('#projectFilter').innerHTML='<option value="ALL">ทุก WO</option>'+DATA.rows.map(r=>'<option value="'+esc(r.id)+'">WO '+esc(r.id)+' · SO '+esc(r.so)+'</option>').join('');
 $('#projectFilter').onchange=e=>{state.wo=e.target.value;state.so=state.production='ALL';render();};
 $('#searchBox').oninput=e=>{state.search=e.target.value;render();};
 $('#resetBtn').onclick=reset;$('#clearProject').onclick=reset;
 document.querySelectorAll('#viewMode button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
 render();setMode('pivot');
}catch(e){$('#modePill').textContent='โหลดข้อมูลไม่สำเร็จ';$('#adaptiveInsight').textContent=e.message;}}
init();
