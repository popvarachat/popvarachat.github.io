(()=>{'use strict';
const $=id=>document.getElementById(id);
const enc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>(v>=0?'+':'')+(v/1000).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const nfmt=n=>Number(n).toLocaleString('en-US');
const ASET={bis:null,imf:null};
let view={mode:'bis',region:'ASEAN',country:'*',direction:'all',sign:'all',limit:16,zoom:1,tx:0,ty:0};
const data=()=>ASET[view.mode];
const regionOf=(meta,c)=>{const x=meta[c];if(!x)return 'Other';return x.r||'Other'};
const isAsean=(meta,c)=>{const x=meta[c];return Boolean(x&&(x.a===1||['BN','KH','ID','LA','MY','MM','PH','SG','TH','TL','VN'].includes(x.c||c)))};
const includeReg=(d,c,r)=>r==='All'||(r==='ASEAN'?isAsean(d.countries,c):r==='Americas'?regionOf(d.countries,c)==='Americas':regionOf(d.countries,c)===r);
const name=(d,c)=>d.countries[c]?.n||c;
const nice=(d,c)=>(name(d,c).length>31?name(d,c).slice(0,28)+'…':name(d,c));
function getRelevant(d,scope,origin,mode,sign){
 let rows=d.edges.filter(e=>{
 const [a,b,v]=e;
 if(!Number.isFinite(v))return false;
 if(view.mode==='imf'&&v<=0)return false;
 if(scope!=='All'&&!includeReg(d,a,scope)&&!includeReg(d,b,scope))return false;
 if(origin!=='*'){
  if(mode==='in'&&b!==origin)return false;
  if(mode==='out'&&a!==origin)return false;
  if(mode==='all'&&a!==origin&&b!==origin)return false;
 }
 if(sign==='positive'&&v<=0)return false;
 if(sign==='negative'&&v>=0)return false;
 return true;
 });
 rows.sort((a,b)=>Math.abs(b[2])-Math.abs(a[2]));
 return rows;
}
function chooseRegion(r){
 view.region=r;
 const d=data();if(!d)return;
 const codes=[...new Set(d.edges.flatMap(e=>[e[0],e[1]]))].filter(k=>includeReg(d,k,r));
 const weight={};for(const [a,b,v] of d.edges){weight[a]=(weight[a]||0)+Math.abs(v);weight[b]=(weight[b]||0)+Math.abs(v)}
 codes.sort((a,b)=>(weight[b]||0)-(weight[a]||0));
 $('bilCountry').innerHTML='<option value="*">🌍 All countries / top corridors</option>'+codes.map(c=>'<option value="'+enc(c)+'">'+enc(name(d,c))+' ('+enc(c)+')</option>').join('');
 if(!codes.includes(view.country))view.country='*';
 $('bilCountry').value=view.country;
}
function changeData(){
 view.mode=$('bilDataset').value;
 const d=data();if(!d){$('bilStatus').textContent='Loading official datasets…';return;}
 $('bilModeLabel').textContent=view.mode==='bis'?'Quarterly adjusted banking claims (proxy flow)':'Portfolio positions at end-Dec 2025 (holdings only)';
 $('bilPeriod').textContent=view.mode==='bis'?'2026-Q1 · BIS':'2025-S2 · IMF';
 $('bilSign').disabled=view.mode==='imf';if(view.mode==='imf'){view.sign='all';$('bilSign').value='all'}
 if(view.mode==='imf'){view.country='*'}else if(view.country!=='*' && view.country.length===3){view.country='*'}
 chooseRegion(view.region);
 render();
}
function text(x,y,t,cl='nt',anchor='start'){return '<text x="'+x+'" y="'+y+'" class="'+cl+'" text-anchor="'+anchor+'">'+enc(t)+'</text>'}
function node(x,y,label,sub,code,sel=false){
 return '<g class="bilnode" data-bil-code="'+enc(code)+'" tabindex="0" role="button" aria-label="'+enc(label)+'"><rect x="'+x+'" y="'+(y-23)+'" rx="10" width="270" height="47" fill="'+(sel?'#24566a':'#163b50')+'" stroke="'+(sel?'#f8d995':'#528195')+'" stroke-width="'+(sel?'2':'1')+'"/>'+text(x+10,y-2,label,'nt')+text(x+10,y+13,sub,'nv')+'</g>'
}
function transform(){
 $('bilNetwork').setAttribute('transform','translate('+view.tx+' '+view.ty+') scale('+view.zoom+')');
}
function network(d,rows){
 const sel=rows.slice(0,Math.min(view.limit,9)); // cap drawn corridors so labels cannot overlap; table/CSV preserve all rows
 const left=[...new Set(sel.map(e=>e[0]))],right=[...new Set(sel.map(e=>e[1]))];
 const yFor=(arr,k)=>arr.length<2?315:72+arr.indexOf(k)*480/(arr.length-1);
 let html='<text x="54" y="29" class="tiny">'+(view.mode==='bis'?'BANKING OFFICE · REPORTER':'SECURITIES HOLDER · RESIDENCE')+'</text><text x="827" y="29" class="tiny">'+(view.mode==='bis'?'BANKING COUNTERPARTY':'SECURITIES ISSUER · RESIDENCE')+'</text>';
 sel.forEach(e=>{
  const [a,b,v]=e,y1=yFor(left,a),y2=yFor(right,b),shade=view.mode==='imf'?'#b4a6f6':v>=0?'#55e4b9':'#ff8d96';
  const strength=Math.max(1.4,Math.min(15,1.1+Math.sqrt(Math.abs(v)/1000)*.8));
  html+='<path d="M323 '+y1+' C497 '+y1+', 658 '+y2+', 822 '+y2+'" fill="none" stroke="'+shade+'" stroke-width="'+strength+'" stroke-opacity=".54" '+(view.mode==='imf'?'stroke-dasharray="4 7"':v<0?'stroke-dasharray="9 5"':'')+'><title>'+enc(name(d,a))+' → '+enc(name(d,b))+' '+fmt(v)+'B '+(view.mode==='bis'?'quarterly adjusted claims':'securities holdings')+'</title></path>'
 });
 left.forEach(k=>html+=node(52,yFor(left,k),nice(d,k),k+' · '+regionOf(d.countries,k),k,k===view.country));
 right.forEach(k=>html+=node(824,yFor(right,k),nice(d,k),k+' · '+regionOf(d.countries,k),k,k===view.country));
 html+=text(560,602,view.mode==='bis'?'Positive = claims expanded | Negative = claims contracted · USD billions':'Positions / stocks only · not a transfer of funds · USD billions','tiny','middle');
 $('bilNetwork').innerHTML=html;
 $('bilNetwork').querySelectorAll('[data-bil-code]').forEach(g=>{
  const c=g.getAttribute('data-bil-code');
  const go=()=>{if(!Array.from($('bilCountry').options).some(o=>o.value===c)){view.region='All';$('bilRegion').value='All';chooseRegion('All')}view.country=c;$('bilCountry').value=c;render()};
  g.addEventListener('click',go);
  g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
 });
 transform();
}
function render(){
 const d=data();if(!d)return;
 const rows=getRelevant(d,view.region,view.country,view.direction,view.sign);
 const reporters=new Set(d.edges.map(e=>e[0])).size,issuers=new Set(d.edges.map(e=>e[1])).size;
 $('bilCoverage').innerHTML='<div><small>COUNTRY-COUNTRY OBSERVATIONS</small><strong>'+nfmt(d.edges.length)+'</strong><span>'+reporters+' reporters / holders · '+issuers+' counterpart economies</span></div><div><small>CURRENT FILTER MATCHES</small><strong>'+nfmt(rows.length)+'</strong><span>'+enc(view.region)+(view.country==='*'?'':' · '+enc(name(d,view.country)))+'</span></div><div><small>DATA TYPE</small><strong>'+ (view.mode==='bis'?'FLOW PROXY':'POSITION')+'</strong><span>'+(view.mode==='bis'?'BIS FX/break-adjusted claims':'IMF cross-border securities holdings')+'</span></div>';
 $('bilDefinition').innerHTML=view.mode==='bis'?
  '<b>BIS · Financial claims</b><p>ธนาคารในประเทศต้นทางมีสินทรัพย์เรียกร้องต่อลูกหนี้ในประเทศปลายทางเพิ่มหรือลดสุทธิหลังปรับผล FX และการเปลี่ยนวิธีรายงานแล้ว ค่า <b>ลบ</b> คือการหดตัวของสิทธิเรียกร้อง ไม่ได้บอกว่าเงินถูกนำไปลงทุนที่ใดต่อ และไม่ใช่การซื้อขายหุ้น/พันธบัตรในตลาดหลักทรัพย์</p><a target="_blank" rel="noopener noreferrer" href="https://data.bis.org/topics/LBS">BIS LBS · official source ↗</a>':
  '<b>IMF · Portfolio investment positions</b><p>ผู้มีถิ่นพำนักในประเทศต้นทางถือครองหลักทรัพย์ของผู้ออกในประเทศปลายทาง ณ <b>สิ้นปี 2025</b> เป็นมูลค่า <b>Stock</b> ไม่ใช่ Fund Flow; ศูนย์กลางรับฝากสินทรัพย์อาจไม่ใช่ประเทศของเจ้าของเงินตัวจริง ไม่ใช้ผลต่าง stock แทนธุรกรรม</p><a target="_blank" rel="noopener noreferrer" href="https://data.imf.org/datasets/IMF.STA%3APIP">IMF PIP · official source ↗</a>';
 const shown=rows.slice(0,view.limit);
 network(d,shown);
 $('bilMatrix').innerHTML=shown.length?shown.map((e,i)=>{
 const [a,b,v,s]=e;
 return '<tr><td>'+String(i+1)+'</td><td><button class="bilRowCountry" data-bil-click="'+enc(a)+'">'+enc(name(d,a))+'</button></td><td><button class="bilRowCountry" data-bil-click="'+enc(b)+'">'+enc(name(d,b))+'</button></td><td class="num" style="color:'+(view.mode==='imf'?'#c7baf8':v<0?'#ff8d96':'#55e4b9')+'">'+fmt(v)+'</td><td class="num">'+(view.mode==='bis'?(s===null?'n/a':fmt(s)):'—')+'</td></tr>'
 }).join(''):'<tr><td colspan="5">No disclosed observations under the current selection. Missing data ≠ zero.</td></tr>';
 $('bilMatrix').querySelectorAll('[data-bil-click]').forEach(el=>el.addEventListener('click',()=>{view.country=el.getAttribute('data-bil-click');if(!Array.from($('bilCountry').options).some(o=>o.value===view.country)){view.region='All';$('bilRegion').value='All';chooseRegion('All')} $('bilCountry').value=view.country;render()}));
 const net=rows.reduce((a,e)=>a+e[2],0),grossPos=rows.filter(x=>x[2]>0).reduce((a,e)=>a+e[2],0),grossNeg=rows.filter(x=>x[2]<0).reduce((a,e)=>a+e[2],0);
 $('bilTakeaway').innerHTML='<div class="eyebrow">ANALYST VIEW / '+(view.mode==='bis'?'2026-Q1':'2025-S2')+'</div><h3>'+enc(view.country==='*'?view.region+' · region review':name(d,view.country))+'</h3><p class="micro muted">'+nfmt(rows.length)+' recorded bilateral observations matched. Displaying '+shown.length+' largest absolute corridors.</p>'+
 '<div class="metric"><span>'+(view.mode==='bis'?'Sum of selected adjusted claims':'Sum of selected disclosed holdings')+'</span><b>'+fmt(net)+' B USD</b></div>'+
 (view.mode==='bis'?'<div class="metric"><span>Positive changes (selected)</span><b class="good">'+fmt(grossPos)+' B</b></div><div class="metric"><span>Negative changes (selected)</span><b class="bad">'+fmt(grossNeg)+' B</b></div>':'')+
 '<p class="micro muted">ยอดรวมนี้เป็นเพียงผลรวมรายการที่ผ่านตัวกรอง ไม่ใช่ Global Net Capital Flows หรือยอดรวมทุกประเทศที่ BIS/IMF เผยแพร่ และห้ามบวก BIS กับ IMF รวมกัน</p>';
 $('bilStatus').textContent='BIS '+nfmt(ASET.bis?.edges.length||0)+' corridors · IMF '+nfmt(ASET.imf?.edges.length||0)+' holdings · verified static snapshots';
}
function saveCSV(){
 const d=data(),arr=getRelevant(d,view.region,view.country,view.direction,view.sign);
 const records=[['source','target','source_name','target_name','value_usd_m','stock_usd_m','dataset','period','classification']];
 arr.forEach(e=>records.push([e[0],e[1],name(d,e[0]),name(d,e[1]),e[2],view.mode==='bis'?e[3]:'',view.mode==='bis'?'BIS adjusted bank claims':'IMF portfolio position',view.mode==='bis'?'2026-Q1':'2025-S2',view.mode==='bis'?'flow proxy':'stock']));
 const csv=records.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const u=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=u;a.download='global_bilateral_'+view.mode+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)
}
function validate(d,key){
 if(!d||!Array.isArray(d.edges)||!d.countries||!d.metadata)throw Error(key+' missing structure');
 let bad=0,uniq=new Set();
 for(const e of d.edges){if(!Array.isArray(e)||e.length<3||!d.countries[e[0]]||!d.countries[e[1]]||!Number.isFinite(e[2])||e[0]===e[1])bad++;
 const x=e[0]+'|'+e[1];if(uniq.has(x))bad++;uniq.add(x);
 }if(bad)throw Error(key+' contains '+bad+' invalid or duplicate observations');
 return true;
}
$('bilDataset').addEventListener('change',changeData);
$('bilRegion').addEventListener('change',()=>{view.country='*';chooseRegion($('bilRegion').value);render()});
$('bilCountry').addEventListener('change',()=>{view.country=$('bilCountry').value;render()});
$('bilDirection').addEventListener('change',()=>{view.direction=$('bilDirection').value;render()});
$('bilSign').addEventListener('change',()=>{view.sign=$('bilSign').value;render()});
$('bilLimit').addEventListener('change',()=>{view.limit=Number($('bilLimit').value);render()});
$('bilExport').addEventListener('click',saveCSV);
$('bilFit').addEventListener('click',()=>{view.zoom=1;view.tx=0;view.ty=0;transform()});
$('bilPlus').addEventListener('click',()=>{view.zoom=Math.min(2.4,view.zoom*1.2);transform()});
$('bilMinus').addEventListener('click',()=>{view.zoom=Math.max(.65,view.zoom/1.2);transform()});
const svg=$('bilSvg');let drag=null;
svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.bilnode'))return;drag={x:e.clientX,y:e.clientY,tx:view.tx,ty:view.ty};svg.setPointerCapture(e.pointerId)});
svg.addEventListener('pointermove',e=>{if(!drag)return;let b=svg.getBoundingClientRect();view.tx=drag.tx+(e.clientX-drag.x)*1150/b.width;view.ty=drag.ty+(e.clientY-drag.y)*640/b.height;transform()});
svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
svg.addEventListener('wheel',e=>{e.preventDefault();view.zoom=Math.max(.65,Math.min(2.4,view.zoom*(e.deltaY<0?1.1:.9)));transform()},{passive:false});
Promise.all([
 fetch('./data/bis-global-2026q1.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('BIS HTTP '+r.status);return r.json()}),
 fetch('./data/imf-pip-2025s2.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('IMF HTTP '+r.status);return r.json()})
]).then(([b,i])=>{validate(b,'BIS');validate(i,'IMF');ASET.bis=b;ASET.imf=i;changeData();$('bilStatus').classList.remove('bad');}).catch(e=>{
 console.error('Global bilateral error',e);$('bilStatus').textContent='DATA LOAD FAILED: '+e.message;$('bilStatus').classList.add('bad');$('bilTakeaway').innerHTML='<h3>Unable to verify global data.</h3><p>Do not interpret missing observations as zero. Try reloading or see source links below.</p>';
});
})();