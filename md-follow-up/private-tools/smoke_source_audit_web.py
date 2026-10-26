import json,pathlib,re,subprocess,tempfile,urllib.request
base='http://127.0.0.1:8766'
with urllib.request.urlopen(base+'/source-audit.json',timeout=10) as response:
 data=json.load(response)
 assert response.status==200
assert len(data['sources'])==13 and data['total']==13
assert not data['all_sources_verified_recent']
assert 'innovation' in [x['key'] for x in data['sources'] if x['status']=='stale']
print('SOURCE_AUDIT_API_OK',json.dumps({'counts':data['counts'],'batch':data['w_batch_checked_at'],'all_recent':data['all_sources_verified_recent'],'no_scan':not data['new_scan_triggered']}))
edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
with tempfile.TemporaryDirectory(prefix='mm-source-audit-') as profile:
 result=subprocess.run([edge,'--headless=new','--disable-gpu','--no-first-run','--user-data-dir='+profile,'--virtual-time-budget=12000','--dump-dom',base+'/pivot.html'],capture_output=True,text=True,encoding='utf8',errors='replace',timeout=60)
 html=result.stdout
 state=re.search(r'<div class=\"desc\" id=\"auditSummary\"[^>]*>([^<]+)</div>',html)
 print('SOURCE_AUDIT_BROWSER',json.dumps({'exit':result.returncode,'dom_bytes':len(html),'status':state.group(1) if state else None,'table_rows':len(re.findall(r'<tr><td><strong>',html))},ensure_ascii=True))
 assert result.returncode==0 and '12/13' in html and 'Innovation Project Register' in html
 assert 'ตรวจสถานะอีกครั้ง (ไม่สแกน)' in html