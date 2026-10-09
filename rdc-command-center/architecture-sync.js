(async function(){
 const target=document.getElementById('rdcArchitectureSync');
 if(!target)return;
 const set=(msg)=>{target.textContent=msg;};
 try{
  const r=await fetch('data/architecture_sync.json',{cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const x=await r.json();
  const stages=x.architecture_contract?.stages||[];
  const ok=x.schema==='rdc.architecture.public.v1'&&stages.length>=8&&x.security?.sanitized_public===true;
  const c=x.source_commit||'unknown';
  set((ok?'Versioned architecture snapshot':'Unverified architecture snapshot')+
    ' · Runtime '+x.runtime_version+' · Decision Gate '+x.decision_gate_version+
    ' · Source '+c.slice(0,10)+
    ' · Sync policy: '+x.sync_policy+
    ' · Self-improvement: evaluate → test → approve → promote (not autonomous publishing)');
  target.dataset.status=ok?'verified_snapshot':'unverified_snapshot';
 }catch(err){set('Architecture sync: unavailable / not verified — last deployed architecture retained'); target.dataset.status='unknown';}
})();
