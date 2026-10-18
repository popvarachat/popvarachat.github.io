'use strict';
const fs=require('node:fs'),path=require('node:path');
exports.run=build=>{try{
 const args=process.argv.slice(2);
 if(args.some(a=>a!=='--allow-partial'))throw Error('Only --allow-partial is supported');
 const root=path.join(process.env.USERPROFILE||process.env.HOME||'', 'Documents','Practika-ERP-Architecture','collector');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8').trimStart());
 const result=build({folder:path.join(root,'runtime/raw/daily-census-20261018'),ref:read(path.join(root,'reference/access_controlplan_reference_verified.json')),known:{controlplan:{collected_from:null,collected_to:null}}});
 console.log(JSON.stringify({coverage:result.report.coverage,flags:result.report.flags}));
 require('./safe_report').writeOutputs(result,{allowPartial:args.includes('--allow-partial')});
}catch(e){console.error('Build blocked: '+e.message);process.exitCode=1;}};
