(async function(){
 const mount=document.getElementById("rdcRoleRegistry");
 if(!mount)return;
 const style=document.createElement("style");
 style.textContent="#rdcRoleRegistry{margin:16px 0;padding:16px;border:1px solid #476179;border-radius:14px;background:#0c1b2d;color:#e2ecfa}#rdcRoleRegistry h3{margin:0 0 8px}#rdcRoleRegistry .rr-meta{font-size:12px;color:#b3c5d9;margin-bottom:12px}#rdcRoleRegistry .rr-groups{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}#rdcRoleRegistry button{cursor:pointer;background:#172e47;color:#d8edfa;border:1px solid #53728b;border-radius:8px;padding:7px 11px;font:inherit;font-size:12px}#rdcRoleRegistry button[aria-pressed=true]{background:#165b65;border-color:#79dfda}#rdcRoleRegistry .rr-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:9px;max-height:500px;overflow-y:auto}#rdcRoleRegistry .rr-item{text-align:left;display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-height:75px}#rdcRoleRegistry .rr-item small{font-size:11px;opacity:.8}#rdcRoleRegistry .rr-detail{margin-top:12px;border:1px solid #547188;border-radius:10px;padding:13px;background:#10263a;overflow-wrap:anywhere}#rdcRoleRegistry .rr-status{font-weight:bold;color:#a8d3dd}#rdcRoleRegistry input{width:100%;max-width:380px;background:#0b2033;border:1px solid #617f96;border-radius:7px;color:white;padding:9px;margin-bottom:10px}";
 document.head.appendChild(style);
 const h=document.createElement("h3");h.textContent="RDC Master Role Registry";mount.appendChild(h);
 const meta=document.createElement("div");meta.className="rr-meta";meta.textContent="Loading verified architecture snapshot…";mount.appendChild(meta);
 try{
 const response=await fetch("data/role_registry.json",{cache:"no-store"});
 if(!response.ok)throw new Error("HTTP "+response.status);
 const data=await response.json();
 if(data.schema!=="rdc.role_registry.v1"||!Array.isArray(data.roles))throw new Error("invalid registry schema");
 meta.textContent=data.roles.length+" nodes · "+data.version+" · Architecture contract / ไม่ใช่ Live Health · Self-improvement ยังต้องมีหลักฐานจริง";
 const search=document.createElement("input");search.type="search";search.placeholder="ค้นหา Node หรือ Job Description";search.setAttribute("aria-label","ค้นหาบทบาท Node");mount.appendChild(search);
 const tabs=document.createElement("div");tabs.className="rr-groups";mount.appendChild(tabs);
 const list=document.createElement("div");list.className="rr-list";mount.appendChild(list);
 const detail=document.createElement("div");detail.className="rr-detail";detail.setAttribute("aria-live","polite");mount.appendChild(detail);
 let group="All";
 function show(r){
 detail.replaceChildren();
 const title=document.createElement("strong");title.textContent=r.name+" — "+r.title;detail.appendChild(title);
 for(const line of ["Role: "+r.responsibility,"Group: "+r.group,"Mode / status: "+r.status,"Authority: "+r.authority,"Performance evidence: "+r.telemetry]){
  const p=document.createElement("p");p.style.margin="7px 0";p.textContent=line;detail.appendChild(p);
 }
 }
 function render(){
 list.replaceChildren();
 const q=search.value.trim().toLocaleLowerCase();
 const filtered=data.roles.filter(r=>(group==="All"||r.group===group)&&[r.name,r.title,r.responsibility,r.id].some(x=>x.toLocaleLowerCase().includes(q)));
 for(const r of filtered){
  const b=document.createElement("button");b.className="rr-item";b.type="button";
  const name=document.createElement("strong");name.textContent=r.name;
  const subtitle=document.createElement("small");subtitle.textContent=r.title;
  const status=document.createElement("small");status.textContent=r.status;
  b.append(name,subtitle,status);b.addEventListener("click",()=>show(r));list.appendChild(b);
 }
 if(!filtered.length)list.textContent="ไม่พบ Node ที่ตรงกับคำค้นหา";
 }
 for(const g of ["All",...new Set(data.roles.map(x=>x.group))]){
  const b=document.createElement("button");b.type="button";b.textContent=g;
  b.setAttribute("aria-pressed",g===group?"true":"false");b.addEventListener("click",()=>{group=g;for(const btn of tabs.children)btn.setAttribute("aria-pressed",btn===b?"true":"false");render()});
  tabs.appendChild(b);
 }
 search.addEventListener("input",render);render();show(data.roles[0]);
 }catch(e){meta.textContent="Role Registry unavailable — keeping last deployed architecture; "+e.message;}
})();