/* PRACTIKA Experience Engine v2 — isolated prototype branch.
 * This geometry is illustrative. Movement is grid A*; not a validated evacuation model.
 */
export function install(c) {
 const {THREE, $, renderer, camera, dyn, box, cyl, group, floor, room, label, M, setMode, getMode, getSim, setScenario, cameraPose, resetOrbit, getActors,getDeskLayout,disposeTree}=c;
 const state={kind:'desk',finish:'oak',size:2.2,exploded:false,routes:true,heatmap:true,mode:'overview',selection:[],pieces:[],model:null,flow:null,agents:[],tour:false,tourTime:0,metrics:null,lastTick:0};
 const finishes={oak:'#c8a47a',walnut:'#655142',ash:'#ded0b3',graphite:'#505d65',ivory:'#e2daca',sage:'#779e95',navy:'#4d6a83'};
 const cm=(color,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const metal=cm('#738b95',.28,.77),charcoal=cm('#263744',.38,.4),accent=cm('#d6af79',.35,.5),stone=cm('#273943',.8);
 const glass=new THREE.MeshPhysicalMaterial({color:'#bedee2',roughness:.13,transparent:true,opacity:.27,side:THREE.DoubleSide,depthWrite:false});
 const light=new THREE.MeshStandardMaterial({color:'#ffe5b8',emissive:'#f7c87c',emissiveIntensity:1.2});
 const tab=document.querySelector('.topnav');
 const stage=$('three').parentElement;
 const aside=document.querySelector('.sidebar');
 function makeUI(){
   tab.insertAdjacentHTML('beforeend','<button data-mode="studio">DESIGN STUDIO</button><button data-mode="factory">PROCESS TWIN</button>');
   tab.querySelectorAll('button[data-mode="studio"],button[data-mode="factory"]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
   stage.insertAdjacentHTML('beforeend',[
   '<div class="v2-scene"><b>ENGINEERING EXPERIENCE / LEVEL 02</b><span id="v2Status">INTERACTIVE ARCHITECTURE</span></div>',
   '<div class="v2-diagnostics"><span>OBJECTS <b id="v2Count">0</b></span><span>AGENTS <b id="v2AgentCount">0</b></span></div>',
   '<div class="v2-camera"><button data-camera="orbit" class="active">◉ ORBIT</button><button data-camera="top">⌗ TOP VIEW</button><button data-camera="interior">◫ INTERIOR</button><button id="v2Tour">▶ TOUR</button></div>',
   '<div id="v2Toast" class="v2-toast" role="status" hidden></div>'
   ].join(''));
   aside.querySelector('.section').insertAdjacentHTML('afterend',[
   '<section class="section v2-section" id="v2Studio">',
   '<div class="section-title"><span class="eyebrow">02 / PRODUCT ENGINEERING</span><span class="pill">PARAMETRIC</span></div>',
   '<h2 class="v2-h2">Furniture Design Studio</h2><p>ปรับขนาดและวัสดุ ทดลองแยกชิ้นส่วนพร้อมคลิกตรวจสอบองค์ประกอบบนโมเดล 3D</p>',
   '<div class="v2-choice"><button data-type="desk" class="active">DESK</button><button data-type="chair">CHAIR</button><button data-type="shelf">STORAGE</button></div>',
   '<div class="label"><label for="v2Width">ความกว้างต้นแบบ</label><output id="v2WidthValue">2.2 m</output></div>',
   '<input id="v2Width" type="range" min="1.2" max="3" step=".1" value="2.2">',
   '<div class="label">Surface finish <output id="v2FinishValue">Oak</output></div>',
   '<div class="v2-swatches" id="v2Swatches"></div>',
   '<div class="v2-choice"><button id="v2Explode">◇ EXPLODED VIEW</button><button id="v2ResetDesign">↺ RESET DESIGN</button></div>',
   '<p class="v2-disclaimer">โมเดลนี้ออกแบบเพื่อการนำเสนอเท่านั้น ไม่ใช่ไฟล์ CAD, BOM, หรือสเปกผลิตภัณฑ์ Practika ที่รับรองแล้ว</p>',
   '</section>',
   '<section class="section v2-section" id="v2Flow">',
   '<div class="section-title"><span class="eyebrow">03 / AGENT-BASED SIMULATION</span><span class="pill">GRID A*</span></div>',
   '<h2 class="v2-h2">Compare Scenarios</h2><p>ระบบค้นหาเส้นทาง A* หลบโต๊ะบนแผนผังเดียวกัน แสดงตัวแทนคนเดิน Route Overlay และ Heatmap</p>',
   '<div class="v2-choice" id="v2ScenarioGroup"><button data-scenario="A" class="active">A · OPEN</button><button data-scenario="B">B · DENSE</button><button data-scenario="C">C · CROWD</button></div>',
   '<div class="v2-statgrid"><div><span>Average route</span><b id="v2Route">—</b></div><div><span>Reachable</span><b id="v2Reach">—</b></div><div><span>People density</span><b id="v2Density">—</b></div><div><span>Travel time*</span><b id="v2Travel">—</b></div></div>',
   '<div class="v2-choice"><button id="v2Routes" class="active">ROUTES ON</button><button id="v2Heat" class="active">HEATMAP ON</button></div>',
   '<p class="v2-disclaimer">*ความเร็วสมมติ 1.2 เมตร/วินาที ทางเดินและขนาดห้องยังเป็นสมมติฐาน โมเดลนี้ไม่ใช่การรับรองอพยพหนีไฟ ความจุอาคาร หรือความปลอดภัย</p>',
   '</section>',
   '<section class="section v2-section" id="v2Inspector">',
   '<div class="section-title"><span class="eyebrow">04 / OBJECT INSPECTOR</span><span class="pill">REA TRACE</span></div>',
   '<h2 class="v2-h2" id="v2ObjectName">Select a 3D component</h2><p id="v2ObjectDesc">คลิกโมเดลเพื่อศึกษาวัสดุ องค์ประกอบ และสถานะการยืนยันข้อมูล</p>',
   '<div class="v2-choice" id="v2PartButtons" aria-label="Accessible 3D component selection"></div>',
   '<div class="v2-inspector-table"><div><span>Element</span><strong id="v2ObjectPart">—</strong></div><div><span>Fidelity status</span><strong>CONCEPT / UNVERIFIED CAD</strong></div><div><span>Source</span><strong>Practika category</strong></div></div>',
   '<a href="https://www.practika.com/" class="pane-link" id="v2Evidence" target="_blank" rel="noopener">↗ OPEN ORIGINAL SOURCE</a>',
   '</section>'
   ].join(''));
   $('v2Swatches').innerHTML=Object.entries(finishes).map(([k,v])=>'<button type="button" data-finish="'+k+'" style="--swatch:'+v+'" title="'+k+'" aria-label="'+k+'"></button>').join('');
   document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.camera)));
   $('v2Tour').addEventListener('click',()=>{state.tour=!state.tour;state.tourTime=0;$('v2Tour').textContent=state.tour?'Ⅱ STOP TOUR':'▶ TOUR';if(state.tour)note('Camera tour running')});
   document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{state.kind=b.dataset.type;goStudio()}));
   $('v2Width').addEventListener('input',()=>{state.size=+$('v2Width').value;goStudio()});
   document.querySelectorAll('[data-finish]').forEach(b=>b.addEventListener('click',()=>{state.finish=b.dataset.finish;goStudio()}));
   $('v2Explode').addEventListener('click',()=>{state.exploded=!state.exploded;explode();$('v2Explode').classList.toggle('active',state.exploded)});
   $('v2ResetDesign').addEventListener('click',()=>{state.kind='desk';state.finish='oak';state.size=2.2;state.exploded=false;$('v2Width').value='2.2';goStudio()});
   for(const [name,values] of Object.entries({A:{desks:8,aisle:1.8,people:8},B:{desks:16,aisle:1.1,people:16},C:{desks:24,aisle:0.8,people:30}}))
      document.querySelector('[data-scenario="'+name+'"]').addEventListener('click',()=>{setScenario(values);document.querySelectorAll('[data-scenario]').forEach(x=>x.classList.toggle('active',x.dataset.scenario===name));note('Scenario '+name+' · A* routes recalculated')});
   $('v2Routes').addEventListener('click',()=>{state.routes=!state.routes;$('v2Routes').classList.toggle('active',state.routes);$('v2Routes').textContent=state.routes?'ROUTES ON':'ROUTES OFF';if(state.flow)state.flow.routes.visible=state.routes});
   $('v2Heat').addEventListener('click',()=>{state.heatmap=!state.heatmap;$('v2Heat').classList.toggle('active',state.heatmap);$('v2Heat').textContent=state.heatmap?'HEATMAP ON':'HEATMAP OFF';if(state.flow)state.flow.heat.visible=state.heatmap});
   renderer.domElement.addEventListener('click',clickObject);
   renderer.domElement.addEventListener('pointerdown',e=>{renderer.domElement.dataset.pointerStart=e.clientX+','+e.clientY});
 }
 function note(t){$('v2Toast').textContent=t;$('v2Toast').hidden=false;clearTimeout(note.timer);note.timer=setTimeout(()=>$('v2Toast').hidden=true,2500)}
 function changeView(view){state.tour=false;$('v2Tour').textContent='▶ TOUR';document.querySelectorAll('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===view));
  if(view==='top')cameraPose(.6,1.48,31);else if(view==='interior')cameraPose(.8,.27,16);else resetOrbit();
 }
 function goStudio(){if(getMode()!=='studio')setMode('studio');else rebuildStudio();}
 function part(root,name,description){let p=new THREE.Group();root.add(p);p.userData.data={name,part:name,description};state.selection.push(p);state.pieces.push(p);return p}
 function inspect(d){$('v2ObjectName').textContent=d.name;$('v2ObjectPart').textContent=d.part||d.name;$('v2ObjectDesc').textContent=d.description;$('v2Evidence').href=$('sourceLink').href}
 const ray=new THREE.Raycaster(),coords=new THREE.Vector2();
 function clickObject(e){if(!state.selection.length)return;
 const start=(renderer.domElement.dataset.pointerStart||'').split(',').map(Number);if(start.length===2&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>7)return;const r=renderer.domElement.getBoundingClientRect();coords.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(coords,camera);const hits=ray.intersectObjects(state.selection,true);for(const hit of hits){let o=hit.object;while(o&&!o.userData.data)o=o.parent;if(o?.userData.data){inspect(o.userData.data);note('Inspecting: '+o.userData.data.name);break}}}
 function architecture(mode){
  const g=group();
  if(mode==='overview'){
   for(let i=0;i<16;i++){let a=i*Math.PI*2/16,x=Math.sin(a)*12.5,z=Math.cos(a)*12.5;box(g,.12,6.4,.22,x,3.15,z,metal).rotation.y=a;
    let beam=box(g,2.6,.1,.24,x,6.38,z,accent);beam.rotation.y=a}
   for(const [rad,tube,y,material] of [[12.4,.13,6.45,metal],[11.7,.07,6.57,accent]]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(rad,tube,8,64),material);ring.rotation.x=Math.PI/2;ring.position.y=y;g.add(ring)
   }
  }else{
   for(let i=0;i<9;i++){const x=-8+i*2;box(g,.08,.1,17.7,x,5.55,0,metal);box(g,1.1,.04,.24,x,5.37,0,light)}
   for(let i=0;i<7;i++){const z=-8+i*2.6;box(g,.06,3.2,.08,8.7,1.6,z,metal);
    if(i<6){const pane=box(g,.03,2.7,2.53,8.7,1.55,z+1.3,glass);pane.castShadow=false}}
   box(g,17.4,.12,.12,0,.03,8.8,accent);box(g,.12,.09,17.4,-8.8,.025,0,accent);
  }
  return g;
 }
 function rebuildStudio(){
  if(state.model){dyn.remove(state.model);disposeTree(state.model)}
  state.selection=[];state.pieces=[];
  const g=new THREE.Group();dyn.add(g);state.model=g;
  const body=new THREE.Group();body.position.y=.47;g.add(body);
  cyl(g,3.1,3.4,.36,0,.18,0,metal,48);cyl(g,3,3,.1,0,.39,0,stone,48);
  const wood=cm(finishes[state.finish]),frame=cm('#6c7f88',.25,.75),w=state.size;
  if(state.kind==='desk'){
   let top=part(body,'WORKTOP / SURFACE','แผ่นหน้าโต๊ะและผิววัสดุที่เปลี่ยนสีได้ เป็น geometry สาธิต');
   box(top,w,.13,1.25,0,.88,0,wood);
   for(let i=-2;i<=2;i++){box(top,.012,.015,1.16,i*w/5,.956,0,accent).castShadow=false}
   let legs=part(body,'FRAME AND STRUCTURE','โครงสร้างเหล็กส่วนขา ขนาดและการรับน้ำหนักต้องอ้างอิงสินค้าจริง');
   for(let x of [-w/2+.12,w/2-.12]){box(legs,.09,.84,.78,x,.42,0,frame);box(legs,.4,.045,.9,x,.05,0,metal)}
   box(legs,w-.4,.06,.07,0,.68,-.39,frame);
   let cable=part(body,'CABLE MANAGEMENT','ช่องเก็บสายสัญญาณและสายไฟจำลอง ไม่ใช่ข้อกำหนดการเดินระบบไฟฟ้าจริง');
   box(cable,w*.62,.11,.22,0,.76,-.49,stone);cyl(cable,.09,.09,.02,w*.3,.96,-.35,stone);
   let modesty=part(body,'MODESTY PANEL','แผงบังขาและขอบตกแต่งสำหรับศึกษาองค์ประกอบชิ้นส่วน');
   box(modesty,w*.76,.42,.05,0,.45,-.48,wood);box(modesty,w*.76,.055,.075,0,.7,-.48,accent);
   let accessories=part(body,'WORK ACCESSORIES','ตัวอย่างหน้าจอและฐานจอที่ไม่ใช่ส่วนหนึ่งของสเปกโต๊ะ');
   box(accessories,.82,.52,.045,0,1.29,-.25,stone);box(accessories,.7,.41,.018,0,1.31,-.212,M.glass);
   box(accessories,.04,.21,.04,0,1.02,-.24,metal);box(accessories,.3,.035,.19,0,.96,-.24,metal);
  }else if(state.kind==='chair'){
   let base=part(body,'CASTER BASE','ฐานล้อห้าแฉกเชิงแนวคิด ไม่ใช่การรับรองมาตรฐานเก้าอี้');
   cyl(base,.14,.16,.45,0,.33,0,frame);
   for(let i=0;i<5;i++){let a=i*Math.PI*2/5;let b=box(base,.08,.06,.63,Math.sin(a)*.2,.12,Math.cos(a)*.2,metal);b.rotation.y=a;cyl(base,.11,.11,.07,Math.sin(a)*.53,.055,Math.cos(a)*.53,stone)}
   let seat=part(body,'UPHOLSTERED SEAT','วัสดุหุ้มเบาะตัวอย่าง ไม่ใช่ตัวเลือกสินค้าจริงที่ยืนยันแล้ว');box(seat,.82,.19,.73,0,.78,.05,wood);
   let back=part(body,'BACKREST','โครงพนักพิงและจุดรองรับหลังในโมเดลสาธิต');box(back,.8,1.13,.13,0,1.4,-.33,frame);box(back,.67,.85,.045,0,1.43,-.23,wood);
   let arms=part(body,'ARMRESTS','ที่วางแขนปรับการประกอบชิ้นส่วน');for(let x of [-.44,.44]){box(arms,.11,.07,.66,x,1.12,.02,metal);box(arms,.065,.34,.065,x,.95,.16,frame)}
  }else{
   let chassis=part(body,'STORAGE FRAME','โครงสร้างชั้นวางสำหรับตัวอย่าง ไม่ได้ผ่านการทดสอบการรับน้ำหนัก');
   for(let x of [-w/2,w/2])for(let z of [-.35,.35])box(chassis,.075,3.4,.075,x,1.7,z,frame);
   let shelfPart=part(body,'MODULAR SHELVES','แผ่นชั้นสามารถจัดองค์ประกอบใหม่ได้');
   for(let y of [.22,1.0,1.78,2.56,3.28])box(shelfPart,w+.12,.09,.83,0,y,0,wood);
   let storage=part(body,'CLOSED STORAGE','ตู้และบานเปิดตัวอย่างโมดูลเสริม');
   for(let i=0;i<4;i++){box(storage,w*.34,.58,.55,(i%2?1:-1)*w*.25,.56+Math.floor(i/2)*.79,0,i%2?M.blue:M.fabric)}
  }
  label(g,state.kind.toUpperCase()+' / CUSTOM MATERIAL',0,4.18,0,.28);
  $('v2Width').disabled=state.kind==='chair';
  $('v2WidthValue').textContent=state.kind==='chair'?'fixed model':state.size.toFixed(1)+' m';
  $('v2FinishValue').textContent=state.finish.toUpperCase();
  const picker=$('v2PartButtons');picker.replaceChildren();
  for(const item of state.selection){
   const button=document.createElement('button');button.type='button';button.textContent=item.userData.data.name;button.addEventListener('click',()=>inspect(item.userData.data));picker.append(button);
  }
  document.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===state.kind));
  document.querySelectorAll('[data-finish]').forEach(b=>b.classList.toggle('active',b.dataset.finish===state.finish));
  $('v2Explode').classList.toggle('active',state.exploded);$('v2Explode').setAttribute('aria-pressed',String(state.exploded));
  explode();
 }
 function explode(){state.pieces.forEach((p,i)=>{if(!p.userData.base)p.userData.base=p.position.clone();p.position.copy(p.userData.base);if(state.exploded){p.position.y+=i*.32;p.position.x+=(i%2?1:-1)*.28;p.position.z+=(i%3-1)*.24}})}
 function factory(){
  const g=group();room(g,20);const stations=['DESIGN','MATERIALS','CUTTING','ASSEMBLY','QC','INSTALLATION'];
  for(let i=0;i<stations.length;i++){
   let x=(i%3-1)*6,z=(i<3?-1:1)*5.5,p=new THREE.Group();g.add(p);p.position.set(x,0,z);
   box(p,4.4,.25,4.3,0,.12,0,stone);box(p,3.3,.18,1.4,0,.87,0,i%2?M.woodLight:M.metal);
   for(let j=0;j<3;j++)box(p,.24,.58,.54,-1+j,1.25,0,i===4?M.gold:M.blue);
   for(let j=0;j<2;j++)box(p,.14,.72,.15,-1+j*2,.4,0,metal);
   label(p,(i+1)+' / '+stations[i],0,3.12,0,.23);
  }
  for(let i=0;i<5;i++){const x=(i%3-1)*6,z=(i<3?-1:1)*5.5,tx=((i+1)%3-1)*6,tz=(i<2?-1:1)*5.5;
   const a=new THREE.Vector3(x,.3,z),b=new THREE.Vector3(tx,.3,tz);
   const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:'#e9bc84'}));g.add(ln)
  }
 }
 function astar(occupied,size,start,goal){
  const key=(x,y)=>y*size+x,open=new Map([[key(...start),{g:0,f:0}]]),from=new Map(),scores=new Map([[key(...start),0]]),closed=new Set();
  const steps=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]],dest=key(...goal);
  for(let count=0;open.size&&count<size*size;count++){
   let k,f=Infinity;for(const [n,data] of open){if(data.f<f){k=n;f=data.f}}
   if(k===dest){const route=[];while(k!==undefined){route.push([k%size,Math.floor(k/size)]);k=from.get(k)}return route.reverse()}
   const current=open.get(k);open.delete(k);closed.add(k);
   const x=k%size,y=Math.floor(k/size);
   for(let [dx,dy] of steps){const xx=x+dx,yy=y+dy,q=key(xx,yy);
    if(xx<0||yy<0||xx>=size||yy>=size||occupied.has(q)||closed.has(q))continue;
    if(dx&&dy&&(occupied.has(key(x+dx,y))||occupied.has(key(x,y+dy))))continue;
    const v=current.g+(dx&&dy?1.414:1);
    if(v<(scores.get(q)??Infinity)){scores.set(q,v);from.set(q,k);open.set(q,{g:v,f:v+Math.hypot(goal[0]-xx,goal[1]-yy)})}
   }
  }return [];
 }
 function flowScene(){
  const sim=getSim(),layout=getDeskLayout(sim.desks,sim.aisle),step=.66,N=Math.max(45,2*Math.ceil((layout.roomSize+2)/(2*step))+1),center=(N-1)/2,occ=new Set();
  // Occupancy is derived from EXACT visible desk placements, chair direction, and illustrative avatar clearance.
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
   const x=(i-center)*step,z=(j-center)*step;
   for(const spot of layout.spots){
    const relX=x-spot.x,relZ=z-spot.z,chairZ=spot.z+(spot.rot? -1:1)*1.09;
    const tabletop=Math.abs(relX)<spot.width/2+.24&&Math.abs(relZ)<.475+.24;
    const seat=Math.abs(relX)<.31+.24&&Math.abs(z-chairZ)<.285+.24;
    if(tabletop||seat){occ.add(j*N+i);break}
   }
  }
  const world=([x,y])=>new THREE.Vector3((x-center)*step,.17,(y-center)*step);
  const flows=group(),routes=new THREE.Group(),heat=new THREE.Group(),avatars=new THREE.Group();
  flows.add(routes,heat,avatars);state.flow={routes,heat,avatars};
  const visits=new Map(),lengths=[],agents=Math.min(sim.people,40),routeCache=new Map();
  state.agents=[];let reached=0;
  for(let i=0;i<agents;i++){
   const lane=i%4,entry=Math.max(3,Math.floor((layout.roomSize/2-1.2)/step));
   const left=Math.floor(center-entry),right=Math.ceil(center+entry),start=i%2?[left,Math.floor(center+3+lane)]:[right,Math.floor(center+3+lane)],
   end=i%2?[right,Math.floor(center-3-lane)]:[left,Math.floor(center-3-lane)];
   const key=start.join(',')+':'+end.join(',');
   let path=routeCache.get(key);if(!path){path=astar(occ,N,start,end);routeCache.set(key,path)}
   if(path.length<2)continue;
   reached++;const coords=path.map(world);
   let len=0;for(let j=1;j<coords.length;j++)len+=coords[j].distanceTo(coords[j-1]);lengths.push(len);
   for(const [x,y] of path){const k=y*N+x;visits.set(k,(visits.get(k)||0)+1)}
   if(i<12){const poly=new THREE.Line(new THREE.BufferGeometry().setFromPoints(coords.map(v=>v.clone().add(new THREE.Vector3(0,.06,0)))),new THREE.LineBasicMaterial({color:i%2?'#78d5c1':'#e7bd88',transparent:true,opacity:.67}));routes.add(poly)}
   const a=new THREE.Group();a.position.copy(coords[0]);cyl(a,.15,.17,.63,0,.97,0,i%2?M.blue:M.fabric);cyl(a,.15,.15,.28,0,1.47,0,M.woodLight);
   for(const x of [-.1,.1])cyl(a,.05,.05,.49,x,.37,0,metal);
   avatars.add(a);state.agents.push({mesh:a,points:coords,meters:(i*.55)%Math.max(len,1),length:len});
  }
  let max=Math.max(1,...visits.values());for(const [k,count] of visits){let x=k%N,y=Math.floor(k/N),p=count/max;
   const m=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(.35*(1-p),.88,.56),transparent:true,opacity:.14+p*.36,depthWrite:false,side:THREE.DoubleSide});
   const tile=new THREE.Mesh(new THREE.PlaneGeometry(step*.92,step*.92),m);tile.rotation.x=-Math.PI/2;tile.position.set((x-center)*step,.075,(y-center)*step);heat.add(tile)
  }
  routes.visible=state.routes;heat.visible=state.heatmap;getActors().forEach(a=>a.visible=false);
  let avg=lengths.length?lengths.reduce((s,v)=>s+v,0)/lengths.length:0;
  state.metrics={avg,reached,agents,people:sim.people,density:sim.people/(layout.roomSize*layout.roomSize),seconds:avg/1.2,room:layout.roomSize};
  $('v2Route').textContent=avg?avg.toFixed(1)+' m':'BLOCKED';
  $('v2Reach').textContent=reached+'/'+agents;
  $('v2Density').textContent=(sim.people/(layout.roomSize*layout.roomSize)).toFixed(2)+' p/m²';
  $('v2Travel').textContent=avg?(avg/1.2).toFixed(1)+' s':'—';
  $('v2AgentCount').textContent=reached;
 }
 function afterScene(mode){
  // Old scene GPU resources are centrally disposed by the owning shell before calling afterScene().
  state.mode=mode;state.model=null;state.flow=null;state.agents=[];state.pieces=[];state.selection=[];
  const preset={A:{desks:8,aisle:1.8,people:8},B:{desks:16,aisle:1.1,people:16},C:{desks:24,aisle:.8,people:30}};
  const simNow=getSim();document.querySelectorAll('[data-scenario]').forEach(btn=>{const v=preset[btn.dataset.scenario];btn.classList.toggle('active',v.desks===simNow.desks&&v.people===simNow.people&&Math.abs(v.aisle-simNow.aisle)<.051)});
  if(mode==='studio'){rebuildStudio();cameraPose(.52,.40,11.8)}
  else if(mode==='factory'){architecture(mode);factory()}
  else{architecture(mode);if(mode==='simulation')flowScene()}
  let count=0;dyn.traverse(n=>{if(n.isMesh)count++});$('v2Count').textContent=count.toLocaleString();
  $('v2AgentCount').textContent=mode==='simulation'?(state.metrics?.reached||0):'0';
  if(mode!=='simulation'){$('v2Route').textContent='—';$('v2Reach').textContent='—';$('v2Density').textContent='—';$('v2Travel').textContent='—'}
  $('v2Status').textContent=mode==='studio'?'PARAMETRIC PRODUCT / EXPLODED PARTS':mode==='simulation'?'AGENT PATHFINDING / HEATMAP':mode==='factory'?'DESIGN → MATERIAL → CUT → ASSEMBLY → QC':'ARCHITECTURE / FURNITURE / EXPERIENCE';
 }
 function tick(){
  const now=performance.now(),dt=state.lastTick?Math.max(0,Math.min(.1,(now-state.lastTick)/1000)):0;state.lastTick=now;
  if(state.tour){state.tourTime+=dt;cameraPose(.7+state.tourTime*.16,.45+Math.sin(state.tourTime*.37)*.13,25+Math.sin(state.tourTime*.21)*3)}
  // Distance is in meters. This is a looping route REPLAY at 1.2 m/s, NOT collision-aware crowd physics.
  for(const a of state.agents){
   if(a.points.length<2||!a.length)continue;a.meters=(a.meters+dt*1.2)%(a.length+1.2);
   let remaining=Math.min(a.length,a.meters),j=0;
   for(;j<a.points.length-1;j++){const segment=a.points[j].distanceTo(a.points[j+1]);if(remaining<=segment)break;remaining-=segment}
   j=Math.min(j,a.points.length-2);const p=a.points[j],q=a.points[j+1],seg=p.distanceTo(q);
   const v=p.clone().lerp(q,seg>0?Math.min(1,remaining/seg):0);
   a.mesh.position.set(v.x,a.mesh.position.y,v.z);a.mesh.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);
  }
 }
 makeUI();
 return {afterScene,tick,getMetrics:()=>state.metrics,sharedMaterials:[metal,charcoal,accent,stone,glass,light]};
}
