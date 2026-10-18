(() => {"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b=(x,d=1)=>x==null?'n/a':Number(Math.abs(x)).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const sgn=x=>x==null?'n/a':(x>0?'+':x<0?'−':'')+b(x);
const toUSD=x=>'$'+b(x)+'B';
let database=null,filters={year:"2025",continent:"All",kind:"all",search:"",sort:"absolute",selected:"USA"};
const status={positive:"Net capital supplier",negative:"Net capital receiver"};
const get=()=>database?.countries.filter(x=>x[filters.year]&&x[filters.year].net!==null)||[];
const filtered=()=>get().filter(x=>(filters.continent==="All"||x.continent===filters.continent)&&(!filters.search||[x.name,x.id].some(t=>t.toLowerCase().includes(filters.search.toLowerCase())))&&(filters.kind==="all"||(filters.kind==="exporters"?x[filters.year].net>0:x[filters.year].net<0)));
const sorter=(a,b)=>{
 const va=a[filters.year].net,vb=b[filters.year].net;
 if(filters.sort==="receiver")return va-vb;
 if(filters.sort==="exporter")return vb-va;
 if(filters.sort==="name")return a.name.localeCompare(b.name);
 return Math.abs(vb)-Math.abs(va);
};
const num=x=>Number(x).toLocaleString("en-US");
function unitLine(country){
 let v=country[filters.year].net;
 let label=v>=0?"Net capital supplied":"Net capital received";
 return label+" · "+toUSD(v);
}
function chart(rows,container,color,klass){
 if(!rows.length){$(container).innerHTML='<p class="micro muted">No published financial account data for this filter.</p>';return}
 const mx=Math.max(...rows.map(r=>Math.abs(r[filters.year].net)));
 $(container).innerHTML=rows.map((r,i)=>{
  const v=r[filters.year].net;
  return '<button type="button" class="wbar '+(r.id===filters.selected?'picked':'')+'" data-w-select="'+esc(r.id)+'" aria-label="'+esc(r.name)+' '+b(v)+' billion US dollars"><span class="wname">'+esc(r.name)+'</span><span class="wtrack"><i style="width:'+Math.max(1,Math.abs(v)/mx*100).toFixed(2)+'%;background:'+color+'"></i></span><b>'+b(v)+'</b></button>';
 }).join('');
 $(container).querySelectorAll("[data-w-select]").forEach(el=>el.addEventListener('click',()=>{filters.selected=el.dataset.wSelect;render()}));
}
function detail(){
 const country=database.countries.find(c=>c.id===filters.selected);
 if(!country){$('worldDetail').innerHTML='<p class="muted">Select a country</p>';return;}
 const v=country[filters.year];const prev=country[filters.year==="2025"?"2024":"2025"];
 const row=(name,value,unit,desc)=>'<div class="wmetric"><div><span>'+esc(name)+'</span><small>'+esc(desc)+'</small></div><b>'+unit+(value==null?'n/a':sgn(value))+'</b></div>';
 if(!v||v.net===null){$('worldDetail').innerHTML='<h3>'+esc(country.name)+'</h3><p class="micro muted">Financial account information not reported for '+filters.year+'. Do not substitute zero.</p>';return;}
 const val=v.net>=0?'Capital Supplier':'Capital Receiver';
 $('worldDetail').innerHTML='<span class="eyebrow">COUNTRY CAPITAL BALANCE · '+filters.year+'</span><h3>'+esc(country.name)+'</h3><span class="tag '+(v.net<0?'pending':'')+'">'+val+'</span><p class="micro muted">IMF BoP financial account via World Bank WDI. Positive means net lending / supplying funding to the rest of world; negative means net borrowing / receiving financing. Not a verified bilateral route.</p>'+
 '<div class="wlead '+(v.net<0?'recv':'sup')+'">'+toUSD(v.net)+'</div>'+
 '<p class="micro muted">'+(v.net>=0?'Financial assets acquired abroad net of new liabilities incurred.':'External financial liabilities incurred net of financial assets acquired.')+'</p>'+
 row("Financial account, net",v.net,"$","Positive = net capital supplier")+
 row("Current account balance",v.ca,"$","Separate reconciliation indicator")+
 row("Portfolio investment, net",v.portfolio,"$","Financial account subcategory, BPM6 sign")+
 row("FDI net inflows",v.fdi_in,"$","Inward investment indicator, separate")+
 row("FDI net outflows",v.fdi_out,"$","Outward investment indicator, separate")+
 (prev&&prev.net!==null?'<div class="wmetric"><div><span>Other year</span><small>Financial account '+(filters.year==="2025"?"2024":"2025")+'</small></div><b>$'+sgn(prev.net)+'</b></div>':'')+
 '<p class="micro muted">Metrics in USD billion, not a destination-by-origin trace. FDI in/out and portfolio cannot be added to net financial balance without reconciling the BoP categories.</p>'+
 '<a href="https://data.worldbank.org/indicator/BN.FIN.TOTL.CD?locations='+encodeURIComponent(country.id)+'" target="_blank" rel="noopener noreferrer">↗ Open country primary-series reference</a>';
}
function render(){
 if(!database)return;
 const all=get(),matched=filtered(),supp=matched.filter(r=>r[filters.year].net>0).sort((a,b)=>b[filters.year].net-a[filters.year].net),recv=matched.filter(r=>r[filters.year].net<0).sort((a,b)=>a[filters.year].net-b[filters.year].net);
 const selected=database.countries.find(c=>c.id===filters.selected);
 if(!selected||!selected[filters.year]||selected[filters.year].net===null){filters.selected=matched[0]?.id||all[0]?.id}
 const cc=database.coverage[filters.year];
 $('wCount').textContent=num(all.length);
 $('wSuppliers').textContent=num(cc.net_lenders);
 $('wReceivers').textContent=num(cc.net_borrowers);
 $('wDataDate').textContent=filters.year;
 $('wCoverageCaption').textContent=num(all.length)+' economies with published data for '+filters.year+'. World total not inferred from incomplete national coverage.';
 $('wFilterCount').textContent=num(matched.length);
 chart(supp.slice(0,10),'wSupChart','#55e4b9','sup');
 chart(recv.slice(0,10),'wRecvChart','#90c1ff','recv');
 const table=matched.slice().sort(sorter);
 $('worldRows').innerHTML=table.map(r=>{
 const v=r[filters.year].net;return '<tr class="wclick" data-w-code="'+esc(r.id)+'" tabindex="0"><td>'+esc(r.name)+'</td><td>'+esc(r.continent)+'</td><td><span class="'+(v>=0?'good':'amber')+'">'+(v>=0?'Supplier':'Receiver')+'</span></td><td class="num">'+sgn(v)+'</td><td class="num">'+sgn(r[filters.year].ca)+'</td><td class="num">'+sgn(r[filters.year].portfolio)+'</td><td class="num">'+sgn(r[filters.year].fdi_in)+'</td></tr>';
 }).join('');
 $('worldRows').querySelectorAll('[data-w-code]').forEach(tr=>{
 const go=()=>{filters.selected=tr.dataset.wCode;detail();$('worldDetail').scrollIntoView({block:'nearest',behavior:'smooth'});};
 tr.addEventListener('click',go);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})
 });
 detail();
 const continent=[];
 for(const c of [...new Set(all.map(r=>r.continent))].sort()){
 const entries=all.filter(r=>r.continent===c);continent.push([c,entries.length,entries.filter(x=>x[filters.year].net>0).reduce((a,x)=>a+x[filters.year].net,0),entries.filter(x=>x[filters.year].net<0).reduce((a,x)=>a-x[filters.year].net,0)]);
 }
 $('wContinent').innerHTML=continent.map(([c,n,exp,imp])=>'<div class="wcontinent"><b>'+esc(c)+'</b><small>'+num(n)+' economies</small><span class="good">Supplied $'+b(exp)+'B</span><span style="color:#90c1ff">Received $'+b(imp)+'B</span></div>').join('')+
 '<p class="micro muted">Gross sums of net country balances within reported economies; do not treat as bilateral routes or fully measured continent totals.</p>';
}
function csv(){
 const rows=[['country_iso3','economy','continent','year','net_financial_account_usd_b','current_account_usd_b','portfolio_net_usd_b','fdi_inflows_usd_b','fdi_outflows_usd_b','classification']];
 filtered().sort(sorter).forEach(c=>{const v=c[filters.year];rows.push([c.id,c.name,c.continent,filters.year,v.net,v.ca,v.portfolio,v.fdi_in,v.fdi_out,v.net>=0?'Net lender':'Net borrower'])});
 const payload=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff',payload],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='world_net_financial_account_'+filters.year+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$('wYear').addEventListener('change',()=>{filters.year=$('wYear').value;render()});
$('wContSelect').addEventListener('change',()=>{filters.continent=$('wContSelect').value;render()});
$('wType').addEventListener('change',()=>{filters.kind=$('wType').value;render()});
$('wSearch').addEventListener('input',()=>{filters.search=$('wSearch').value;render()});
$('wSort').addEventListener('change',()=>{filters.sort=$('wSort').value;render()});
$('wExport').addEventListener('click',csv);
fetch('./data/global-financial-account-2025-2024.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('World Bank dataset HTTP '+r.status);return r.json()}).then(d=>{
 if(!d.countries?.length||d.coverage?.['2025']?.net_countries<100||d.meta?.indicator!=='BN.FIN.TOTL.CD')throw Error('Invalid WDI BoP dataset');
 database=d;
 $('wLive').textContent='VERIFIED SNAPSHOT · WDI/IMF BoP · 2025 / 2024';
 const unique=new Set(d.countries.map(x=>x.id));if(unique.size!==d.countries.length)throw Error('Duplicate economy records');
 render();
}).catch(e=>{$('wLive').textContent='SOURCE LOAD ERROR: '+e.message;$('wLive').classList.add('bad');console.error(e)});
})();