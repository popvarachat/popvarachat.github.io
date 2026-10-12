/* Practika Living Enterprise — Original Three.js Operational Digital Twin
 * All data are synthetic demonstration values; no access to real ERP/CRM.
 * No third-party BTS source or assets reproduced.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
if(typeof THREE==='undefined'){ $('loading').innerHTML='<b>ไม่สามารถโหลด Three.js ได้</b><small>ตรวจสอบการเชื่อมต่อ CDN แล้วรีเฟรช</small>';return; }
const C={office:0x4185d0,production:0xee994a,logistics:0x25a998,digital:0x9169df,neutral:0x758fa9};
const stations=[
{id:'sales',name:'ฝ่ายขาย / CRM',en:'SALES & CRM',x:-91,z:-41,w:28,d:22,type:'office',icon:'◈',desc:'รับความต้องการลูกค้า เปิดโอกาสขาย ข้อมูลลูกค้า และติดตามใบเสนอราคา'},
{id:'design',name:'ออกแบบ / Costing',en:'DESIGN & ESTIMATE',x:-59,z:-41,w:30,d:22,type:'office',icon:'✎',desc:'ออกแบบ Furniture Customize, Drawing, BOM และประเมินต้นทุน'},
{id:'planning',name:'วางแผน / ERP',en:'PLANNING & ERP',x:-26,z:-41,w:30,d:22,type:'office',icon:'▦',desc:'วางแผนกำลังการผลิต กำหนด Work Order และตารางเครื่องจักร'},
{id:'purchase',name:'จัดซื้อ',en:'PROCUREMENT',x:7,z:-41,w:30,d:22,type:'office',icon:'⌁',desc:'ใบขอซื้อ PO ติดตาม Supplier วัตถุดิบไม้ เหล็ก ผ้า และเก้าอี้นำเข้า'},
{id:'receiving',name:'รับวัตถุดิบ',en:'INBOUND RECEIVING',x:50,z:-43,w:34,d:18,type:'logistics',icon:'↧',desc:'รับเข้า ตรวจนับไม้ เหล็ก ผ้า อุปกรณ์ และสินค้านำเข้า'},
{id:'supplier',name:'Supplier / ท่าเทียบ',en:'SUPPLIER GATE',x:94,z:-44,w:27,d:20,type:'logistics',icon:'▰',desc:'Supplier รถบรรทุกส่งไม้ เหล็ก วัสดุ และเก้าอี้สำเร็จรูปจากต่างประเทศ'},
{id:'wood',name:'1 · สายงานไม้',en:'WOOD LINE',x:-70,z:2,w:40,d:28,type:'production',icon:'▥',desc:'ตัดไม้ CNC, ปิดขอบ, เจาะ, ตรวจขนาด และเตรียมชิ้นงานไม้'},
{id:'metal',name:'2 · สายงานเหล็ก',en:'METAL LINE',x:-25,z:2,w:40,d:28,type:'production',icon:'⚙',desc:'ตัดเหล็ก เชื่อม ดัด เจาะ ประกอบโครง และเตรียมผิว'},
{id:'upholstery',name:'3 · งานหุ้มผ้า',en:'UPHOLSTERY',x:20,z:2,w:40,d:28,type:'production',icon:'▤',desc:'ผลิตเก้าอี้และ Partition ตัดผ้า เย็บฟองน้ำ และหุ้มเบาะ'},
{id:'store',name:'Store / เบิกจ่าย',en:'RAW MATERIAL STORE',x:62,z:-16,w:37,d:26,type:'logistics',icon:'▣',desc:'จัดเก็บวัตถุดิบ รับเข้า-ตัดสต็อก และเบิก Material สู่ทุกสายการผลิต'},
{id:'assembly',name:'4 · งานประกอบ',en:'ASSEMBLY LINE',x:70,z:15,w:38,d:29,type:'production',icon:'⟁',desc:'รวมชิ้นงานจากสายไม้ เหล็ก หุ้มผ้า ประกอบโต๊ะ เก้าอี้ และชุดเฟอร์นิเจอร์'},
{id:'mockup',name:'5 · Mockup',en:'MOCKUP & TRIAL',x:105,z:15,w:25,d:29,type:'production',icon:'♧',desc:'ประกอบ Mockup ตรวจสอบรูปแบบ ขนาดและความเหมาะสมก่อนส่ง QC'},
{id:'qc',name:'QC / ตรวจคุณภาพ',en:'QUALITY CONTROL',x:92,z:51,w:32,d:24,type:'logistics',icon:'✓',desc:'ตรวจสเปก ขนาด ผิว งานประกอบ และตัดสินใจผ่านหรือ Rework'},
{id:'warehouse',name:'คลังสินค้าสำเร็จ',en:'FINISHED GOODS',x:51,z:51,w:36,d:24,type:'logistics',icon:'▤',desc:'รับสินค้าผ่าน QC บรรจุ จัดเก็บและเตรียมออกใบส่งของ'},
{id:'dispatch',name:'ขนส่ง / ทีมช่าง',en:'DISPATCH & INSTALL',x:8,z:51,w:36,d:24,type:'logistics',icon:'➜',desc:'รถขนส่งและทีมติดตั้ง ออกรถไปหน้างานลูกค้า พร้อมตรวจรับ'},
{id:'customer',name:'ไซต์ลูกค้า',en:'CUSTOMER SITE',x:-36,z:51,w:35,d:24,type:'office',icon:'⌂',desc:'ติดตั้งโต๊ะ เก้าอี้ Partition และ Furniture Customize จนส่งมอบ'},
{id:'it',name:'IT Infrastructure',en:'NETWORK & SERVERS',x:-104,z:6,w:23,d:29,type:'digital',icon:'⌘',desc:'เครือข่าย เครื่องแม่ข่าย อุปกรณ์ โรงงานและสำนักงาน สนับสนุนระบบทั้งหมด'},
{id:'ai',name:'RAG · LLM · RDC L5',en:'AI & KNOWLEDGE',x:-101,z:53,w:30,d:24,type:'digital',icon:'✦',desc:'ค้น SOP/BOM/Knowledge ด้วย RAG, LLM ช่วยประสานงาน, RDC ติดตามภาพรวมด้วย Human Gate'}
];
const stationById=Object.fromEntries(stations.map(s=>[s.id,s]));
const journey=['ลูกค้า / CRM','Design / Quote','Planning / PO','รับเข้า / Store','ผลิต 3 สาย','Assembly / Mockup','QC / คลัง','ติดตั้ง / ส่งมอบ'];
const stageIcon=['◈','✎','▦','▣','⚙','▤','✓','⌂'];
const colors={wood:0xe3ae66,metal:0x849bb5,upholstery:0x9278c6,assembly:0xe6b759};
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xeaf3f9);scene.fog=new THREE.Fog(0xeaf3f9,280,530);
scene.add(new THREE.HemisphereLight(0xffffff,0xc0d2db,1.18));
const sun=new THREE.DirectionalLight(0xfff9ed,2.15);sun.position.set(-70,160,95);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-160;sun.shadow.camera.right=160;sun.shadow.camera.top=140;sun.shadow.camera.bottom=-140;sun.shadow.camera.near=1;sun.shadow.camera.far=360;sun.shadow.bias=-.0002;scene.add(sun);
const fill=new THREE.DirectionalLight(0xc3e3fb,.55);fill.position.set(65,55,-100);scene.add(fill);
const camera=new THREE.PerspectiveCamera(37,innerWidth/innerHeight,.1,850);
const focus=new THREE.Vector3(0,1,4);let dist=310,azimuth=.72,elevation=.75,autoRotate=false,tour=false,following=null,paused=false,speed=1,scenario='normal',time=0,frame=0;
const meshes=[],machines=[],agentList=[],movingVehicles=[],decorAnimations=[];
const mat=(color,roughness=.77,metalness=.06)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const mWhite=mat(0xffffff),mCloud=mat(0xf5f8fb),mDark=mat(0x2e4966),mRoad=mat(0xd4e0e9),mGlass=new THREE.MeshStandardMaterial({color:0xc9e4f6,transparent:true,opacity:.29,metalness:.1,roughness:.16,depthWrite:false});
function box(w,h,d,color,x,y,z,parent=scene,cast=true){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof color==='number'?mat(color):color);mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function cyl(r,h,color,x,y,z,parent=scene,seg=12){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),typeof color==='number'?mat(color):color);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh}
function line(points,color,width=1,opacity=.6){const curve=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p[0],p[1],p[2])));const m=new THREE.Line(curve,new THREE.LineBasicMaterial({color,transparent:true,opacity}));scene.add(m);return m}
function assign(entity,obj){obj.userData.entity=entity;meshes.push(obj);return obj}
function label(text,color=0x396194,scale=1){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='rgba(255,255,255,.95)';roundRect(g,12,11,488,106,21);g.fill();g.strokeStyle='#dce8f3';g.lineWidth=2;g.stroke();g.fillStyle='#'+color.toString(16).padStart(6,'0');g.fillRect(24,36,7,58);g.font='bold 38px Segoe UI, Tahoma, Arial';g.textBaseline='middle';g.fillText(text,49,66,432);const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.scale.set(25*scale,6.3*scale,1);sprite.renderOrder=70;return sprite}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function pole(x,z,h=8){box(.55,h,.55,0xb5cbe0,x,h/2+.4,z)}
const ground=box(251,2,139,0xf9fcfe,0,-1.6,5);ground.receiveShadow=true;
box(257,1.2,145,0xd4e6f0,0,-3.1,5);box(263,.9,151,0xc4dbe9,0,-4.1,5);
const lawn=box(245,.1,132,0xe9f4ef,0,-.51,5);lawn.receiveShadow=true;
for(const z of [-26,31])box(250,.04,7.5,mRoad,0,.10,z,scene,false);
for(const x of [-112,-76,-43,-9,32,88])box(4.5,.05,112,mRoad,x,.12,5,scene,false);
for(let x=-122;x<=123;x+=8){box(3.7,.065,.13,0xffffff,x,.19,-26,scene,false);box(3.7,.065,.13,0xffffff,x,.19,31,scene,false)}
// Architectural blocks and colored pads
const titleSprites=[];
function zone(s){
 const color=C[s.type]; const g=new THREE.Group();g.position.set(s.x,0,s.z);scene.add(g);s.group=g;
 const pad=box(s.w,.5,s.d,0xffffff,0,.20,0,g);assign({kind:'station',id:s.id},pad);
 box(s.w-.8,.12,s.d-.8,new THREE.MeshStandardMaterial({color,transparent:true,opacity:.12}),0,.54,0,g,false);
 for(const zz of [-s.d/2+.2,s.d/2-.2])box(s.w,.25,.4,color,0,.70,zz,g);
 for(const xx of [-s.w/2+.2,s.w/2-.2])box(.4,.25,s.d,color,xx,.70,0,g);
 const h=s.type==='office'?8:s.type==='digital'?11:7.2;
 for(const x of [-s.w/2+1,s.w/2-1])for(const z of [-s.d/2+1,s.d/2-1]){const p=box(.65,h,.65,0xc1d2e2,x,h/2+.75,z,g);assign({kind:'station',id:s.id},p)}
 // light glass on back wall, semi-open structure
 const back=box(s.w-2,h-1,.3,new THREE.MeshStandardMaterial({color:0xd8e6f3,transparent:true,opacity:.18}),0,h/2+.75,-s.d/2+.7,g,false);assign({kind:'station',id:s.id},back);
 if(s.type==='office'||s.type==='digital'){
  for(let x=-s.w/2+3;x<s.w/2-1;x+=5){box(3.6,4,.12,mGlass,x,3.9,-s.d/2+.48,g,false);box(.12,4,.15,0xb8c9d9,x-1.8,3.9,-s.d/2+.3,g,false)}
  box(s.w-1,.36,1.8,0xf5faff,0,h+.8,-s.d/2+1,g);
  box(s.w-1,.36,1.8,0xf5faff,0,h+.8,s.d/2-1,g);
 }else{
  box(s.w-1,.25,.5,0xb3cddd,0,h+.83,-s.d/2+1,g);
  box(s.w-1,.25,.5,0xb3cddd,0,h+.83,s.d/2-1,g);
 }
 const sign=label(s.name,color,.82);sign.position.set(0,h+7,0);g.add(sign);assign({kind:'station',id:s.id},sign);titleSprites.push(sign);
 if(s.type==='office'){for(let i=0;i<2;i++)desk(g,-s.w/4+i*s.w/2,-2.3,color);}
 else if(s.id==='wood'){machine(g,-12,-5,'saw','Cutting CNC',0xe0a469);machine(g,1,-5,'edge','Edge Banding',0xe0a469);machine(g,12,-5,'drill','Drilling',0xe0a469);materialStack(g,-12,8,0xd4a76f);}
 else if(s.id==='metal'){machine(g,-10,-4,'steel','Metal Cutting',0x8a9aac);machine(g,5,-4,'weld','Welding',0x8a9aac);machine(g,10,8,'drill','Drilling',0x8a9aac);}
 else if(s.id==='upholstery'){machine(g,-10,-4,'sew','Sewing & Fabric',0xa391ca);chair(g,3,1,0xa58ac9);chair(g,12,7,0x7094bf);box(7,.35,4,0xe8d3e8,-8,1.7,8,g)}
 else if(s.id==='assembly'){for(let i=0;i<3;i++){desk(g,-11+i*10,-4,0xdba24c);chair(g,-8+i*10,6,0x7b9ba7)}}
 else if(s.id==='mockup'){desk(g,1,-4,0xe0ac7b);chair(g,-5,5,0x81aacc);chair(g,5,5,0xc993a4)}
 else if(s.id==='qc'){desk(g,-7,-1,0x32b799);box(5,2,6,0xd1bb8d,8,1.7,1,g)}
 else if(s.id==='warehouse'||s.id==='store'){for(let i=-1;i<=1;i++)rack(g,i*9,1);for(let i=0;i<3;i++)crate(g,-10+i*6,-8,1.2)}
 else if(s.id==='receiving'){for(let i=0;i<4;i++)crate(g,-11+i*7,0,1.4)}
 else if(s.id==='supplier'){for(let i=-1;i<2;i++)crate(g,i*7,2,1.2)}
 else if(s.id==='dispatch'){for(let i=-1;i<=1;i++)crate(g,i*7,-1,1.1)}
 else if(s.id==='customer'){desk(g,-7,-2,0xc9997a);chair(g,5,-3,0x5b7faa);box(8,6,1,0xe9f0f7,0,3.7,9,g)}
 else if(s.id==='it'){for(let i=0;i<3;i++)server(g,-7+i*7,-2)}
 else if(s.id==='ai'){for(let i=0;i<3;i++)server(g,-7+i*7,-1,true);const h=cyl(4,1.4,0x836fce,0,1,7,g,24);const beacon=cyl(1.1,3.3,0x9e8be9,0,3.1,7,g,20);decorAnimations.push({kind:'beacon',mesh:beacon});}
 return g;
}
function desk(parent,x,z,color){box(7,.4,3.9,0xdce7f1,x,3.2,z,parent);for(const dx of [-2.6,2.6])for(const dz of [-1.35,1.35])box(.26,2.5,.26,0x899db0,x+dx,1.9,z+dz,parent);box(2.7,1.5,.25,0x334e6b,x,4.25,z-1.3,parent);box(1.5,.12,1.2,color,x,3.5,z+1,parent)}
function crate(parent,x,z,size=1){box(4*size,2.2*size,3*size,0xc9a87b,x,1.7*size,z,parent);for(let a of [-1,1])box(.17,2.4*size,3.1*size,0x9f794b,x+a*1.5*size,1.7*size,z,parent)}
function rack(parent,x,z){for(const dx of [-2.5,2.5])for(const dz of [-2.4,2.4])box(.25,7,.25,0x69839b,x+dx,4.2,z+dz,parent);for(const yy of [1.7,4.2,6.7]){box(5.7,.22,5,0x839eb1,x,yy,z,parent);for(let i=-1;i<=1;i++)box(1.2,1.4,1.7,[0xd2b48c,0xbccedd,0xd9bd85][(i+3)%3],x+i*1.6,yy+1,z,parent)}}
function chair(parent,x,z,color){cyl(1.8,.35,color,x,2.6,z,parent,12);box(3.6,2.8,.4,color,x,4.0,z-1.5,parent);for(const xx of [-1.1,1.1])for(const zz of [-1,1])box(.3,2.4,.3,0x677c95,x+xx,1.25,z+zz,parent)}
function server(parent,x,z,glow=false){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);box(4.6,8,3.5,0x364c68,0,4.8,0,g);for(let y=1.5;y<8;y+=1.1){box(3.6,.55,.12,0x547393,0,y,1.83,g,false);box(.48,.22,.14,glow?0xbb98fb:0x71e0cd,-1.3,y,1.91,g,false)}}
function machine(parent,x,z,type,name,color){
 const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);g.userData.entity={kind:'machine',id:name,zone:parent.parent?.userData?.zone||''};
 const base=box(8,2.2,5.5,0xdbe4e9,0,1.8,0,g);assign({kind:'machine',id:name,zone:name.includes('Metal')?'metal':name.includes('Sew')?'upholstery':'wood'},base);
 box(7.5,.35,4.8,color,0,3.0,0,g);
 for(let xx of [-3.3,3.3])box(.36,4,.3,0x718fa5,xx,4.5,-1.8,g);
 box(7,.45,.5,0x7a95ae,0,6.5,-1.8,g);
 if(type==='saw'||type==='steel'){const blade=cyl(1.5,.35,0x7f91a3,0,3.5,0,g,24);blade.rotation.x=Math.PI/2;machines.push({mesh:blade,type,zone:type==='saw'?'wood':'metal',id:name})}
 if(type==='drill'){const bit=cyl(.25,3,0x456178,0,4.9,0,g);machines.push({mesh:bit,type,zone:'wood',id:name})}
 if(type==='sew'){const roll=cyl(1.1,5,0x9d82bb,0,3.7,0,g,20);roll.rotation.z=Math.PI/2;machines.push({mesh:roll,type,zone:'upholstery',id:name})}
 if(type==='edge'||type==='weld'){const roller=cyl(.8,6,0x536b84,0,3.5,0,g,16);roller.rotation.z=Math.PI/2;machines.push({mesh:roller,type,zone:type==='edge'?'wood':'metal',id:name})}
 const tag=label(name,0x657c9e,.45);tag.position.set(0,9,0);g.add(tag);
}
stations.forEach(zone);
// Roads and landscaped furniture
const trunk=[[ -110,-25],[ -95,-25],[ -60,-25],[-26,-25],[7,-25],[48,-25],[95,-25],[96,31],[55,31],[8,31],[-36,31]];
for(const [x,z] of trunk)cyl(.7,.1,0x9dbac9,x,.25,z,scene,8);
function tree(x,z,size=1){const trunk=cyl(.55*size,4*size,0x9c806b,x,2*size,z);const top=cyl(3.2*size,1.2*size,0x7cbab0,x,4.7*size,z,scene,16);top.scale.set(1,2.5,1);const top2=cyl(2.2*size,1.2*size,0x8dc5b8,x+1*size,6.4*size,z+.3*size,scene,16);top2.scale.set(1,1.6,1)}
for(const [x,z] of [[-120,-54],[-103,-61],[-75,-60],[-48,-60],[-13,-60],[21,-60],[61,-60],[108,-63],[118,-21],[116,0],[120,35],[115,68],[63,70],[8,70],[-35,70],[-77,70],[-117,72],[-122,32],[-122,-12]])tree(x,z,.72);
for(let i=0;i<14;i++)box(2,.08,3,0xfbfefe,-105+i*15,.25,31,scene,false);
// Moving humanoid logistics, office, AI agents
function makeHuman(color,robot=false){
 const g=new THREE.Group();g.userData.isAgent=true;
 const shirt=robot?0x3871af:color;
 const torso=box(robot?2.2:1.7,2.2,1.15,shirt,0,3.2,0,g);
 const head=cyl(robot?1.0:.78,robot?1.1:.95,robot?0xe2f4ff:0xf3c3a1,0,5,0,g,14);
 box(1.15,.18,.15,robot?0x194a80:0x9c7967,0,5.12,.8,g,false);
 const armL=box(.45,1.65,.46,shirt,-1.22,3.13,0,g),armR=box(.45,1.65,.46,shirt,1.22,3.13,0,g);
 const legL=box(.57,1.7,.7,robot?0x3e607e:0x60758b,-.5,1.25,0,g),legR=box(.57,1.7,.7,robot?0x3e607e:0x60758b,.5,1.25,0,g);
 if(robot){const antenna=cyl(.11,1,0x6c97bf,0,6,0,g,8);const tip=cyl(.25,.3,0x50e4cf,0,6.55,0,g,10)}
 g.userData.limbs=[legL,legR,armL,armR];return g;
}
const routeTemplates=[
['sales','design','planning','purchase','store','wood','assembly','mockup','qc','warehouse','dispatch','customer'],
['sales','design','planning','metal','assembly','qc','warehouse','dispatch','customer'],
['purchase','supplier','receiving','store','upholstery','assembly','mockup','qc','warehouse'],
['store','wood','store','metal','store','upholstery'],
['planning','wood','metal','upholstery','assembly'],
['it','planning','sales','it','ai'],
['ai','planning','qc','warehouse','ai'],
['qc','assembly','qc','warehouse'],
['dispatch','customer','dispatch','warehouse'],
['supplier','receiving','store','receiving','supplier']
];
const roles=['Sales Runner','Design Coordinator','Planning Agent','Purchasing Bot','Store Handler','Wood Operator','Metal Operator','Upholstery Agent','Assembly Technician','QC Inspector','Delivery Coordinator','Installation Crew','Supplier Driver','RAG Assistant','IT Support','Executive Observer'];
function makeAgent(i){
 const route=routeTemplates[i%routeTemplates.length];const robot=i%4===0;const role=roles[i%roles.length];const c=i%4===0?0x398ec0:i%4===1?0xea9863:i%4===2?0x9a81c8:0x39a98d;
 const g=makeHuman(c,robot);scene.add(g);const start=stationById[route[0]];g.position.set(start.x+(i%3-1)*2,.6,start.z+(i%4-2)*1.5);
 const a={kind:'agent',id:'AG-'+String(i+1).padStart(3,'0'),role,route,index:i%route.length,from:null,to:null,progress:0,model:g,speed:7+(i%6)*1.2,robot,task:['ส่ง Work Order','รับเอกสาร','นำเบิกวัตถุดิบ','ติดตาม PO','ตรวจงาน / Report','รายงาน QC'][i%6],walkPhase:i*.7};
 g.traverse(o=>{if(o.isMesh)assign({kind:'agent',id:a.id},o)});
 return a;
}
for(let i=0;i<29;i++)agentList.push(makeAgent(i));
const agentById=Object.fromEntries(agentList.map(a=>[a.id,a]));
function truck(parent,color=0x4e85bd){const g=new THREE.Group();parent.add(g);box(10,4.5,5.2,0xf8fbfd,-2,3.2,0,g);box(4.1,4.4,5.2,color,5,3.2,0,g);box(.13,1.5,3.6,mGlass,7.12,4.5,0,g,false);for(const xx of [-4.3,6.2])for(const zz of [-2.5,2.5]){const w=cyl(1.13,.52,0x2b3f54,xx,1.2,zz,g,18);w.rotation.x=Math.PI/2}box(8,.5,.28,color,-2,3.2,2.7,g);return g}
const van=truck(scene,0x4b8bc8);van.scale.set(.8,.8,.8);
const supplierTruck=truck(scene,0x32a997);supplierTruck.scale.set(.8,.8,.8);
const deliveryTruck=truck(scene,0xe8a76f);deliveryTruck.scale.set(.75,.75,.75);
movingVehicles.push({obj:van,path:['dispatch','customer','dispatch'],offset:0,velocity:5.3},{obj:supplierTruck,path:['supplier','receiving','supplier'],offset:7,velocity:4},{obj:deliveryTruck,path:['warehouse','dispatch','customer','dispatch','warehouse'],offset:12,velocity:4.1});
// Floor transport dots for path visibility, not diagram lines
function floorRoute(a,b,color){const p=stationById[a],q=stationById[b];const path=new THREE.CatmullRomCurve3([new THREE.Vector3(p.x,.68,p.z),new THREE.Vector3((p.x+q.x)/2,.68,(p.z+q.z)/2+2.4),new THREE.Vector3(q.x,.68,q.z)]);const positions=path.getPoints(30);for(let j=1;j<30;j+=3){const v=positions[j];const mesh=cyl(.38,.07,color,v.x,.6,v.z,scene,9);mesh.material.transparent=true;mesh.material.opacity=.38}}
[['sales','design'],['design','planning'],['planning','purchase'],['purchase','store'],['supplier','receiving'],['receiving','store'],['store','wood'],['store','metal'],['store','upholstery'],['wood','assembly'],['metal','assembly'],['upholstery','assembly'],['assembly','mockup'],['mockup','qc'],['qc','warehouse'],['warehouse','dispatch'],['dispatch','customer']].forEach(([a,b])=>floorRoute(a,b,a==='store'?0xf0a560:0x7baad7));
function pathPos(a,b,t,seed){const p=stationById[a],q=stationById[b];const mid=new THREE.Vector3((p.x+q.x)/2,0,(p.z+q.z)/2+Math.sin(seed*3)*3);const start=new THREE.Vector3(p.x+Math.sin(seed)*2,0,p.z+Math.cos(seed)*2);const end=new THREE.Vector3(q.x+Math.sin(seed+2)*2,0,q.z+Math.cos(seed+1)*2);const curve=new THREE.QuadraticBezierCurve3(start,mid,end);return {pos:curve.getPoint(t),tangent:curve.getTangent(Math.min(.999,t))}}
function moveAgents(dt){
 for(let i=0;i<agentList.length;i++){const a=agentList[i];if(!a.from){a.from=a.route[a.index%a.route.length];a.to=a.route[(a.index+1)%a.route.length];}
 const p=stationById[a.from],q=stationById[a.to],length=Math.max(10,Math.hypot(p.x-q.x,p.z-q.z));let slow=(scenario==='supplier'&&a.from==='supplier')||((scenario==='shortage')&&a.from==='store')?0.12:1;
 a.progress+=dt*a.speed*slow/length;
 if(a.progress>=1){a.progress=0;a.index=(a.index+1)%a.route.length;a.from=a.route[a.index];a.to=a.route[(a.index+1)%a.route.length];if(i<12)recordEvent(a.role+' ส่งต่องานถึง '+stationById[a.from].name);}
 const pt=pathPos(a.from,a.to,a.progress,i);a.model.position.set(pt.pos.x,.62+Math.abs(Math.sin(time*8+i))*.07,pt.pos.z);a.model.rotation.y=Math.atan2(pt.tangent.x,pt.tangent.z);
 a.walkPhase+=dt*11*slow;const v=Math.sin(a.walkPhase)*.35*slow;const limbs=a.model.userData.limbs;limbs[0].rotation.x=v;limbs[1].rotation.x=-v;limbs[2].rotation.x=-v*.8;limbs[3].rotation.x=v*.8;
 }
}
function moveTruck(v,t){const elapsed=(t+v.offset)*v.velocity/90;const idx=Math.floor(elapsed)%v.path.length;const frac=elapsed-Math.floor(elapsed);const r=pathPos(v.path[idx],v.path[(idx+1)%v.path.length],frac,v.offset);v.obj.position.set(r.pos.x,.9,r.pos.z);v.obj.rotation.y=Math.atan2(r.tangent.x,r.tangent.z)-Math.PI/2}
let toastTimer;
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600)}
const alerts={normal:['Agent ทำงานตามกระบวนการครบ 3 สาย ก่อนเข้า Assembly, QC และส่งมอบ',0],shortage:['Store ไม่มีวัตถุดิบเพียงพอ — Work Order รอเบิก / จัดซื้อเร่ง PO',4],machine:['เครื่องตัดไม้หยุดทำงาน — Wood Line ค้างและวางแผนใหม่',3],qc:['QC พบ NG — ส่งคืน Assembly เพื่อแก้ไข แล้วตรวจซ้ำ',2],supplier:['รถ Supplier มาส่งช้า — Store และ Production มีความเสี่ยงเลื่อน',3],rush:['งาน Customize ด่วน — Planning เพิ่มลำดับความสำคัญ พร้อมติดตามคิว',1]};
const events=[];
function recordEvent(s){events.unshift({s,t:formatClock(time)});if(events.length>20)events.pop();if(frame%55<8){$('eventText').textContent=s;$('eventTime').textContent=formatClock(time)}}
function formatClock(t){let seconds=Math.floor(t+9*3600)%(24*3600);return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':')}
let selected={kind:'station',id:'assembly'};
function inspect(ent){
 selected=ent;let name='',desc='',state='● ACTIVE',id='',route='',l1='',v1='',l2='',v2='',l3='',v3='',l4='',v4='',progress=70,icon='▣',warn=false;
 if(ent.kind==='station'){const s=stationById[ent.id];if(!s)return;name=s.name;desc=s.desc;id=s.en;icon=s.icon;route=s.type==='production'?'Store → '+s.name+' → Assembly → QC':'CRM → Planning → Production → QC → Warehouse → Installation';
 l1='พื้นที่';v1=s.type.toUpperCase();l2='Agent กำลังเข้า/ออก';v2=agentList.filter(a=>a.from===s.id||a.to===s.id).length;l3='ข้อมูลต้นทาง';v3='DEMO';l4='สิทธิ์ข้อมูล';v4='READ-ONLY';progress=s.type==='production'?63:85;warn=(scenario==='machine'&&s.id==='wood')||(scenario==='shortage'&&s.id==='store')||(scenario==='qc'&&s.id==='qc')||(scenario==='supplier'&&s.id==='receiving');state=warn?'⚠ ATTENTION':'● OPERATING';}
 if(ent.kind==='agent'){const a=agentById[ent.id];if(!a)return;name=a.role;desc='Agent '+a.id+' กำลัง'+a.task+' จาก '+stationById[a.from||a.route[0]].name+' ไป '+stationById[a.to||a.route[1]].name;id=a.id;icon=a.robot?'♙':'♟';route=a.route.map(r=>stationById[r].name).join(' → ');l1='สถานะ';v1='MOVING';l2='ความคืบหน้า';v2=Math.floor(a.progress*100)+'%';l3='ต้นทาง';v3=stationById[a.from||a.route[0]].en;l4='ปลายทาง';v4=stationById[a.to||a.route[1]].en;progress=a.progress*100;state='● IN TRANSIT';}
 if(ent.kind==='machine'){name=ent.id;id=ent.zone.toUpperCase()+' / MACHINE';desc='เครื่องจักรจำลอง แสดงการทำงานในสายการผลิต ตรวจสอบสถานะและคอขวด';icon='⚙';l1='สถานะ';v1='RUNNING';l2='ข้อมูล';v2='SIMULATED';l3='ประเภท';v3=ent.zone.toUpperCase();l4='ควบคุมจริง';v4='DISABLED';route='Store → '+ent.zone+' → Assembly → QC';warn=scenario==='machine'&&ent.id==='Cutting CNC';state=warn?'⚠ MACHINE DOWN':'● RUNNING';progress=warn?0:80;}
 $('entityName').textContent=name;$('entityDesc').textContent=desc;$('entityId').textContent=id;$('entityIcon').textContent=icon;$('entityState').textContent=state;$('entityState').className='pill '+(warn?'warning':'success');$('detailProgress').style.width=progress+'%';$('entityRoute').textContent=route;
 [['label1',l1],['label2',l2],['label3',l3],['label4',l4],['value1',v1],['value2',v2],['value3',v3],['value4',v4]].forEach(([k,v])=>$(k).textContent=v);
 $('inspector').style.display='block';
}
function focusObject(ent){if(ent.kind==='station'){const s=stationById[ent.id];if(s){focus.set(s.x,1,s.z);dist=Math.min(dist,185)}}else if(ent.kind==='agent'){following=ent.id;dist=90}}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let down={x:0,y:0,drag:false},dragging=false;
$('world').addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,drag:false};dragging=true;$('world').setPointerCapture(e.pointerId)});
$('world').addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>2)down.drag=true;azimuth-=dx*.005;elevation=Math.max(.24,Math.min(1.43,elevation+dy*.004));down.x=e.clientX;down.y=e.clientY;autoRotate=false;tour=false;following=null});
$('world').addEventListener('pointerup',e=>{dragging=false;if(down.drag)return;const rect=$('world').getBoundingClientRect();pointer.x=e.clientX/rect.width*2-1;pointer.y=-(e.clientY/rect.height*2-1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(meshes,false);if(hit.length){const ent=hit[0].object.userData.entity;if(ent){inspect(ent);focusObject(ent)}}});
$('world').addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(48,Math.min(465,dist+e.deltaY*.18));following=null},{passive:false});
function resetCamera(){following=null;autoRotate=false;tour=false;focus.set(0,1,4);dist=310;azimuth=.72;elevation=.75;}
$('homeBtn').onclick=resetCamera;$('overviewBtn').onclick=resetCamera;
$('rotateBtn').onclick=()=>{following=null;autoRotate=!autoRotate;tour=false;notify(autoRotate?'เริ่มหมุนมุมมอง 360°':'หยุดหมุนมุมมอง')};
$('tourBtn').onclick=()=>{following=null;autoRotate=false;tour=!tour;notify(tour?'กำลังชมอาคารและสายการผลิต':'หยุดโหมดชมโรงงาน')};
$('followBtn').onclick=()=>{if(selected.kind==='agent'){following=selected.id;dist=85;notify('กำลังติดตาม '+selected.id)}else{following=null;focusObject(selected);notify('โฟกัส '+$('entityName').textContent)}};
$('closeDetail').onclick=()=>$('inspector').style.display='none';
$('playBtn').onclick=()=>{paused=!paused;$('playBtn').textContent=paused?'▶':'Ⅱ';$('playBtn').setAttribute('aria-label',paused?'Play':'Pause');notify(paused?'พัก Simulation':'เดิน Simulation ต่อ')};
document.querySelectorAll('.speed').forEach(el=>el.onclick=()=>{speed=Number(el.dataset.speed);document.querySelectorAll('.speed').forEach(x=>x.classList.toggle('current',x===el));notify('ความเร็วจำลอง '+speed+'×')});
$('resetBtn').onclick=()=>{time=0;paused=false;speed=1;scenario='normal';$('scenario').value='normal';$('playBtn').textContent='Ⅱ';document.querySelectorAll('.speed').forEach(x=>x.classList.toggle('current',x.dataset.speed==='1'));agentList.forEach((a,i)=>{a.index=i%a.route.length;a.progress=0;a.from=null;a.to=null});events.length=0;resetCamera();updateScenario();notify('เริ่มระบบจำลองใหม่แล้ว')};
$('scenario').onchange=e=>{scenario=e.target.value;updateScenario();recordEvent('เปลี่ยนสถานการณ์จำลอง: '+$('scenario').selectedOptions[0].text);notify('ใช้สถานการณ์ '+$('scenario').selectedOptions[0].text)};
function updateScenario(){const [note,num]=alerts[scenario];$('scenarioNote').textContent=note;$('kAlerts').textContent=num;$('alertDesc').textContent=num?note.slice(0,30)+'…':'ทำงานปกติ';$('kAlerts').style.color=num?'#bf703a':'';inspect(selected)}
document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===el));following=null;const v=el.dataset.view;if(v==='all')resetCamera();if(v==='office'){focus.set(-43,1,-42);dist=165}if(v==='factory'){focus.set(0,1,9);dist=155}if(v==='delivery'){focus.set(35,1,43);dist=155}notify('มุมมอง '+el.textContent)});
$('search').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=e.target.value.trim().toLowerCase();if(!q)return;const s=stations.find(x=>x.id.includes(q)||x.en.toLowerCase().includes(q)||x.name.toLowerCase().includes(q));const a=agentList.find(x=>x.id.toLowerCase().includes(q)||x.role.toLowerCase().includes(q));if(s){inspect({kind:'station',id:s.id});focusObject({kind:'station',id:s.id})}else if(a){inspect({kind:'agent',id:a.id});focusObject({kind:'agent',id:a.id})}else if(q.includes('wo-')||q.includes('104')){notify('WO-2569-104: กำลังดำเนินการตามเส้นทางที่แสดงด้านล่าง')}else notify('ไม่พบในข้อมูลจำลอง: '+q)});
function updateStages(){const idx=Math.min(7,Math.floor((time/18)%8));$('stages').innerHTML=journey.map((name,i)=>'<div class="stage '+(i<idx?'done':i===idx?'active':'')+'"><div class="stage-bubble">'+(i<idx?'✓':stageIcon[i])+'</div><span>'+name+'</span></div>').join('');$('jobBadge').textContent='WO-2569-104 · CUSTOM FURNITURE SET · '+(idx+1)+'/8'}
function updateKpis(){const workload=14+Math.floor(Math.sin(time/25)*3);$('kActive').textContent=workload;$('kAgents').textContent=paused?'0':agentList.length;$('kMachines').innerHTML=(scenario==='machine'?'7':'8')+'<span>/12</span>';$('simClock').textContent=formatClock(time);updateStages()}
function updateCamera(dt){if(following){const a=agentById[following];if(a)focus.lerp(a.model.position,.07)}if(autoRotate)azimuth+=dt*.11;if(tour){azimuth+=dt*.07;focus.x=Math.sin(time*.025)*42;focus.z=Math.cos(time*.023)*17;dist=245+Math.sin(time*.1)*25}const desired=new THREE.Vector3(focus.x+Math.sin(azimuth)*Math.cos(elevation)*dist,focus.y+Math.sin(elevation)*dist,focus.z+Math.cos(azimuth)*Math.cos(elevation)*dist);camera.position.lerp(desired,.085);camera.lookAt(focus)}
function animateMachinery(dt){for(const m of machines){if(scenario==='machine'&&m.id==='Cutting CNC')continue;m.mesh.rotation.y+=dt*2.6;m.mesh.rotation.z+=dt*.6}for(const d of decorAnimations){if(d.kind==='beacon')d.mesh.rotation.y+=dt*.4}}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)}addEventListener('resize',onResize);
inspect({kind:'station',id:'assembly'});updateScenario();updateStages();recordEvent('ลูกค้าออกใบสั่งผลิตชุดโต๊ะ เก้าอี้ และ Partition Customize');$('loading').style.display='none';
let last=performance.now(),lastKpi=-1,elapsedReal=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;frame++;if(!paused){const tick=dt*speed;time+=tick;elapsedReal+=dt;moveAgents(tick);for(const v of movingVehicles)moveTruck(v,time);animateMachinery(tick);if(Math.floor(time/3)!==lastKpi){lastKpi=Math.floor(time/3);updateKpis();if(selected.kind==='agent')inspect(selected);if(events.length&&frame%2)$('eventText').textContent=events[0].s;$('eventTime').textContent=formatClock(time)}}updateCamera(dt);renderer.render(scene,camera)}
requestAnimationFrame(loop);
})();