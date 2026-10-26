import pathlib,re,subprocess,tempfile,sys
edge=pathlib.Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
with tempfile.TemporaryDirectory(prefix="mm-agenda-smoke-") as tmp:
 p=subprocess.run([str(edge),"--headless=new","--disable-gpu","--no-first-run",
 "--user-data-dir="+tmp,"--virtual-time-budget=10000","--dump-dom",
 "http://127.0.0.1:8766/mm.html"],capture_output=True,text=True,encoding="utf8",errors="replace",timeout=45)
 html=p.stdout
 def item(n):
  m=re.search(r'<strong id="'+n+r'">([^<]*)</strong>',html)
  return m.group(1) if m else None
 print("MM_BROWSER",{"latest":item("kLatest"),"history":item("kHistory"),
        "meetings":item("kPeriods"),"backlog":item("kBacklog"),
        "connection_ok":"เชื่อม MM Snapshot แล้ว" in html,
        "exit":p.returncode,"bytes":len(html)})
 assert p.returncode==0 and item("kLatest")=="11" and item("kHistory")=="106" and item("kPeriods")=="9" and item("kBacklog")=="1"
 assert "เชื่อม MM Snapshot แล้ว" in html