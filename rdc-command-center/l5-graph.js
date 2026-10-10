(()=>{"use strict";
const root=document.getElementById("rdcInteractiveMap");if(!root)return;
const ns="http://www.w3.org/2000/svg",groups=["Governance","Intelligence","Execution","Infrastructure","Business","Quality & Learning"],short=["01 · Governance","02 · Intelligence","03 · Execution","04 · Infrastructure","05 · Business","06 · Quality & Learning"];
const colors=["#74d8cb","#8caaff","#f9cb7a","#90c7a0","#cfb0fb","#f0a0b5"];
const css=document.createElement("style");css.textContent=`
#rdcInteractiveMap{background:#0b1c30;border:1px solid #3c6278;border-radius:16px;padding:14px;min-width:0;max-width:100%}
#rdcInteractiveMap .map-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
#rdcInteractiveMap h2{font-size:clamp(18px,2.5vw,25px);margin:0;color:#ecfaff}
#rdcInteractiveMap p{font-size:12px;color:#b9d0dd;line-height:1.5;margin:5px 0}
#rdcInteractiveMap button,#rdcInteractiveMap select{color:#eafaff;background:#12334a;border:1px solid #426780;border-radius:8px;padding:8px 11px;cursor:pointer;font:inherit;font-size:12px}
#rdcInteractiveMap button:focus-visible,#rdcInteractiveMap select:focus-visible{outline:2px solid #8bf5d8}
#rdcInteractiveMap .map-tools{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}
#rdcInteractiveMap .map-viewport{height:min(62vh,630px);min-height:360px;border:1px solid #365a71;border-radius:12px;overflow:hidden;background:#081727;touch-action:none;position:relative;cursor:grab}
#rdcInteractiveMap .map-viewport:active{cursor:grabbing}
#rdcInteractiveMap svg{width:100%;height:100%;display:block}
#rdcInteractiveMap .map-detail{margin-top:12px;padding:12px;border:1px solid #405f74;border-radius:12px;background:#10263b;font-size:13px;line-height:1.7;overflow-wrap:anywhere}
#rdcInteractiveMap .map-detail strong{color:#a2f3dc}
#rdcInteractiveMap .map-meta{font-size:11px;color:#bfd4e3}
#rdcInteractiveMap .map-node{cursor:pointer}
#rdcInteractiveMap .map-node:focus{outline:none}
#rdcInteractiveMap .map-node:focus rect{stroke:#fff;stroke-width:3}
#rdcInteractiveMap .map-node:hover rect{stroke:#fff;stroke-width:2.5}
#rdcInteractiveMap .map-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:#c0d7e4;margin-top:10px}
#rdcInteractiveMap .map-legend span:before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#8af0cb;margin-right:5px}
#rdcInteractiveMap .map-legend span:nth-child(2):before{background:#ffd07b}
#rdcInteractiveMap .map-legend span:nth-child(3):before{background:#7f91a3}
@media(max-width:700px){#rdcInteractiveMap .map-viewport{height:410px;min-height:340px}}
`;document.head.appendChild(css);
root.innerHTML='<div class="map-head"><div><h2>RDC L5 · Interactive Workflow (53 Nodes)</h2><p>สถานะจากทะเบียนสถาปัตยกรรม ไม่ใช่ Live Health · แผนผังสามารถลาก ซูม และเลือก Node ได้</p></div><a href="l5-readiness.html" style="color:#8ef1d4;font-size:12px">ดูหลักฐาน L5 →</a></div><div class="map-tools"><button type="button" data-map="fit">Fit ทั้งระบบ</button><button type="button" data-map="in">＋ Zoom</button><button type="button" data-map="out">－ Zoom</button><select id="rdcMapGroup" aria-label="เลือกกลุ่ม Node"><option value="all">ทุกกลุ่ม (53 Nodes)</option></select><button type="button" data-map="legacy">เปิด/ซ่อน Diagram v1.7 เก่า</button></div><div class="map-viewport" id="rdcMapViewport"><svg id="rdcMapSVG" role="img" aria-label="RDC 53 node grouped network"></svg></div><div class="map-legend"><span>มีหลักฐานใช้งานจริงบางรูปแบบ</span><span>บางส่วน / Shadow</span><span>ยังไม่ยืนยัน Live</span></div><div class="map-detail" id="rdcMapDetail" aria-live="polite">เลือกกลุ่มหรือคลิก Node เพื่อดูบทบาท สถานะ และเส้นทางเชื่อมต่อ</div>';
const svg=root.querySelector("svg"),viewport=root.querySelector(".map-viewport"),detail=root.querySelector(".map-detail"),select=root.querySelector("select");
const legacy=document.querySelector("#architecture .workflow-shell"),legacyHead=document.querySelector("#architecture .section-head");
if(legacy){legacy.style.display="none";if(legacyHead)legacyHead.style.display="none";}
function el(tag,attrs,parent,text){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs||{}))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;(parent||svg).appendChild(e);return e;}
const proven=new Set(["chatgpt","codex-corporate","qwen3","mcp","cli","rdc-remote","pc","notebook","ollama","github-private"]);
const partial=new Set(["orchestrator","playwright","observability","jev","qa","canary"]);
const cols=3,w=598,gapX=24,gapY=32,pad=22,header=68,nodeH=42,nodeGap=7;const boxes={},items=[];
let vb={x:0,y:0,w:1900,h:1400},bounds={x:0,y:0,w:1900,h:1400};
function view(){svg.setAttribute("viewBox",[vb.x,vb.y,vb.w,vb.h].join(" "));}
function setview(b){vb={...b};view();}
function fitBox(b){const ww=viewport.clientWidth||900,hh=viewport.clientHeight||460,ratio=ww/hh;let W=b.w,H=b.h;if(W/H>ratio)H=W/ratio;else W=H*ratio;setview({x:b.x+(b.w-W)/2,y:b.y+(b.h-H)/2,w:W,h:H});}
function wrap(s,limit=33){return s.length>limit?s.slice(0,limit-1)+"…":s;}
function groupKey(s){return groups.indexOf(s);}
function nodeId(r){return r.id||r.name;}
function render(data){
svg.replaceChildren();items.length=0;groups.forEach((group,i)=>{
 const roles=data.roles.filter(r=>r.group===group);const col=i%3,row=Math.floor(i/3),x=pad+col*(w+gapX),y=pad+row*650;
 const h=header+roles.length*(nodeH+nodeGap)+14;boxes[group]={x,y,w,h};
 el("rect",{x,y,width:w,height:h,rx:16,fill:"#10283d",stroke:colors[i],"stroke-width":1.8});
 el("rect",{x:x+1,y:y+1,width:w-2,height:53,rx:15,fill:"#15334b"});
 el("text",{x:x+18,y:y+25,"font-size":21,"font-weight":700,fill:colors[i]},svg,short[i]+" · "+roles.length+" Nodes");
 el("text",{x:x+18,y:y+43,"font-size":11,fill:"#a9c1d3"},svg,i===0?"Goal → Plan → Risk → Route":i===1?"Corporate-first / Qwen PC":i===2?"API / CLI first → UI fallback":i===3?"PC / NB + GitHub / Cloud":i===4?"Business systems — policy restricted":"QA → Evidence → Learning");
 roles.forEach((r,j)=>{const xx=x+12+(j%2)*288,yy=y+header+Math.floor(j/2)* (nodeH+nodeGap),nw=278;
 const key=nodeId(r),state=proven.has(key)?"verified":partial.has(key)?"partial":"unverified";
 const base=el("g",{class:"map-node",role:"button",tabindex:0,"aria-label":r.name+" · "+r.status});
 el("rect",{x:xx,y:yy,width:nw,height:nodeH,rx:8,fill:state==="verified"?"#163a39":"#142f48",stroke:state==="verified"?"#63d1aa":state==="partial"?"#edba75":"#355877","stroke-width":1.2},base);
 el("circle",{cx:xx+13,cy:yy+15,r:4,fill:state==="verified"?"#8af0cb":state==="partial"?"#ffd07b":"#7f91a3"},base);
 el("text",{x:xx+24,y:yy+18,"font-size":13,"font-weight":600,fill:"#eaf6ff"},base,wrap(r.name,32));
 el("text",{x:xx+12,y:yy+34,"font-size":10,fill:"#b4cad9"},base,wrap(r.status||"UNVERIFIED",36));
 const open=()=>{detail.innerHTML="";const header=document.createElement("strong");header.textContent=r.name+" · "+group;detail.appendChild(header);const p=document.createElement("div");p.textContent="Registry status: "+(r.status||"UNKNOWN")+" | Live evidence tier: "+(state==="verified"?"เคยพบหลักฐานใช้งานจริง (ไม่ได้หมายความว่า AI QA ทุกตัวผ่าน)":state==="partial"?"บางส่วน / Shadow":"ยังไม่มีหลักฐาน Live เพียงพอ");detail.appendChild(p);const p2=document.createElement("div");p2.textContent="Purpose: "+(r.description||r.purpose||"ดูรายละเอียดใน Source of Truth")+" · Routes: "+(i===0?"Intelligence / Execution":i===1?"Execution":i===2?"Infrastructure / Business":i===3?"Cloud / QA":i===4?"QA / Human Gate":"Governance / Improvement");detail.appendChild(p2);};base.addEventListener("click",open);base.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});items.push({r,x:xx,y:yy});});
 });
 // High-level route arrows connect areas, not invented direct edges for each node.
 const edges=[[0,1],[1,2],[2,4],[3,2],[4,5],[5,0]];
 for(const [a,b]of edges){const A=boxes[groups[a]],B=boxes[groups[b]];const ax=A.x+A.w/2,ay=A.y+A.h/2,bx=B.x+B.w/2,by=B.y+B.h/2;const path=el("path",{d:`M ${ax} ${ay} Q ${(ax+bx)/2} ${(ay+by)/2-75} ${bx} ${by}`,stroke:"#3b94a6","stroke-width":2,fill:"none","stroke-dasharray":"7 9",opacity:".5"});svg.insertBefore(path,svg.firstChild);}
 const maxH=Math.max(...groups.map(g=>boxes[g].y+boxes[g].h));bounds={x:0,y:0,w:3*w+2*gapX+pad*2,h:maxH+pad};fitBox(bounds);
 groups.forEach((g,i)=>{const o=document.createElement("option");o.value=g;o.textContent=short[i];select.appendChild(o);});
 detail.textContent="ครบ "+data.roles.length+" Node · เลือกกลุ่มเพื่อ Zoom · คลิก Node เพื่อดูสถานะ (Snapshot ไม่ใช่ Live Telemetry)";
}
root.querySelectorAll("button[data-map]").forEach(b=>b.addEventListener("click",()=>{const op=b.dataset.map;if(op==="fit"){select.value="all";fitBox(bounds);}if(op==="in"||op==="out"){const factor=op==="in"?.75:1.35;const ww=vb.w*factor,hh=vb.h*factor;setview({x:vb.x+(vb.w-ww)/2,y:vb.y+(vb.h-hh)/2,w:ww,h:hh});}if(op==="legacy"){if(legacy){const show=legacy.style.display==="none";legacy.style.display=show?"":"none";if(legacyHead)legacyHead.style.display=show?"":"none";b.textContent=show?"ซ่อน Diagram v1.7 เก่า":"เปิด Diagram v1.7 เก่า";}}}));
select.addEventListener("change",()=>{if(select.value==="all")fitBox(bounds);else if(boxes[select.value]){const b=boxes[select.value];fitBox({x:b.x-20,y:b.y-20,w:b.w+40,h:b.h+40});}});
let drag=null;viewport.addEventListener("pointerdown",e=>{if(e.target.closest(".map-node"))return;drag={x:e.clientX,y:e.clientY,v:{...vb}};viewport.setPointerCapture(e.pointerId);});viewport.addEventListener("pointermove",e=>{if(!drag)return;setview({...drag.v,x:drag.v.x-(e.clientX-drag.x)*drag.v.w/viewport.clientWidth,y:drag.v.y-(e.clientY-drag.y)*drag.v.h/viewport.clientHeight});});viewport.addEventListener("pointerup",()=>drag=null);viewport.addEventListener("pointercancel",()=>drag=null);
viewport.addEventListener("wheel",e=>{e.preventDefault();const factor=e.deltaY<0?.90:1.10;const x=vb.x+(e.offsetX/viewport.clientWidth)*vb.w,y=vb.y+(e.offsetY/viewport.clientHeight)*vb.h;setview({x:x-(x-vb.x)*factor,y:y-(y-vb.y)*factor,w:vb.w*factor,h:vb.h*factor});},{passive:false});
fetch("data/role_registry.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{if(!Array.isArray(data.roles)||data.roles.length!==53)throw Error("Expected exactly 53 nodes");render(data)}).catch(e=>detail.textContent="ไม่สามารถโหลดทะเบียน Node: "+e.message);
})();