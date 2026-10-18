const fs=require('fs'),path=require('path');
const rawPath=path.resolve(process.env.USERPROFILE,'Documents','Practika-ERP-Architecture','collector','runtime','raw','cutting40_memory_latest.json');
const outPath=path.resolve(__dirname,'data','current-production.json');
const raw=JSON.parse(fs.readFileSync(rawPath,'utf8').replace(/^\uFEFF/,''));
const rows=raw.data||[];
const val=(r,i)=>r[Object.keys(r)[i]]||'';
const parse=d=>{if(!d)return null;const m=String(d).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(!m)return null;let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1]);};
const today=new Date();today.setHours(0,0,0,0);
const statusLabel=s=>s==='60'?'ผลิต1/2 → รอรับโดย 3/4':s==='70'?'อยู่ที่ผลิต3/4':s==='99'?'จบ Cutting → รอ 9D':'อื่น';
const detail=rows.map(r=>{const due=val(r,21),complete=val(r,26),dueDate=parse(due);const late=dueDate&&!complete?Math.max(0,Math.floor((today-dueDate)/86400000)):0;return {
 wo:r['WO Number']||'',so:r['Order Number']||'',cutting:r['Cutting Number']||'',cutting_type:r['Cutting Type']||'',status:r['Cutting Status']||'',status_desc:statusLabel(r['Cutting Status']||''),position:statusLabel(r['Cutting Status']||''),due_transfer:due,due_delivery:val(r,22),date_closed:val(r,25),date_9d:complete,product:r['Product']||'',project_code:val(r,19),late_days:late,delivery_state:complete?'TRANSFERRED':!dueDate?'NO_DUE_DATE':late>0?'LATE':(dueDate-today)<=2*86400000?'AT_RISK':'OPEN'};});
const active=detail.filter(r=>!r.date_9d);
const byWo=new Map();
for(const r of active){if(!byWo.has(r.wo))byWo.set(r.wo,{id:r.wo,so:new Set(),cuttings:0,s60:0,s70:0,s99:0,due:new Set(),late_cuttings:0,max_late_days:0,statuses:new Set()});const x=byWo.get(r.wo);if(r.so)x.so.add(r.so);x.cuttings++;if(r.status==='60')x.s60++;if(r.status==='70')x.s70++;if(r.status==='99')x.s99++;if(r.due_transfer)x.due.add(r.due_transfer);if(r.delivery_state==='LATE'){x.late_cuttings++;x.max_late_days=Math.max(x.max_late_days,r.late_days);}x.statuses.add(r.position);}
const woRows=[...byWo.values()].map(x=>({id:x.id,so:[...x.so].join(','),cuttings:x.cuttings,s60:x.s60,s70:x.s70,s99:x.s99,current_stage:[...x.statuses].join(' | '),due_transfer:[...x.due].join(' | '),late_cuttings:x.late_cuttings,max_late_days:x.max_late_days,value_thb:null,value_status:'SO_VALUE_LOOKUP_PENDING',delivery_state:x.late_cuttings?'LATE':'OPEN'})).sort((a,b)=>b.cuttings-a.cuttings);
const statusCounts={60:active.filter(x=>x.status==='60').length,70:active.filter(x=>x.status==='70').length,99:active.filter(x=>x.status==='99').length};
const out={schema_version:'2.2.0',mode:'CURRENT_CUTTING40_WIP',generated_at_utc:new Date().toISOString(),source:'JDE P594801C/PTK0002 W594801CE grid memory',coverage:{source_rows:detail.length,open_rows:active.length,transferred_9d:detail.length-active.length,unique_work_orders:woRows.length,unique_sales_orders:new Set(active.map(x=>x.so).filter(Boolean)).size,unique_cuttings:new Set(active.map(x=>x.cutting).filter(Boolean)).size,status_counts:statusCounts,late_cuttings:active.filter(x=>x.delivery_state==='LATE').length,no_due_date:active.filter(x=>x.delivery_state==='NO_DUE_DATE').length,value_coverage_pct:0},rows:woRows,cuttings:active};
fs.writeFileSync(outPath,JSON.stringify(out,null,2),'utf8');
console.log(JSON.stringify({coverage:out.coverage,top:woRows.slice(0,5)},null,2));