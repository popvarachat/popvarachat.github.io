import os,json,pathlib,re,subprocess,tempfile
p=pathlib.Path(os.environ["LOCALAPPDATA"])/"UAIOS"/"MD-FollowUp-Private"
o=json.loads((p/"pivot.json").read_text(encoding="utf8"))
tasks=[x for x in o["rows"] if x["source"]=="planner" and "MD (1-24)" in x["project"]]
assert len(tasks)==1,tasks
t=tasks[0]
assert t["owner_role"]=="notes_team_only" and t["owner_team"]=="HR" and t["department"]=="HR",t
assert t["owner_person"]=="ยังไม่ระบุเจ้าภาพรายบุคคล",t
print("MD24_SOURCE_OK",{"role":t["owner_role"],"team":t["owner_team"],"department":t["department"],"due":t["due_iso"],"notes_evidence":t["owner_evidence"]})
edge="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
with tempfile.TemporaryDirectory(prefix="md24-owner-smoke-") as prof:
 run=subprocess.run([edge,"--headless=new","--disable-gpu","--no-first-run","--user-data-dir="+prof,"--virtual-time-budget=13000","--dump-dom","http://127.0.0.1:8766/pivot.html"],capture_output=True,text=True,encoding="utf8",errors="replace",timeout=60)
 html=run.stdout
 print("MD24_BROWSER_OK",{"exit":run.returncode,"html_bytes":len(html),"hr_pivot_column":"HR (ฝ่ายเจ้าภาพ)" in html,"hr_owner_renderer":"HR (เจ้าภาพระดับฝ่าย)" in (p/"matrix.js").read_text(encoding="utf8")})
 assert run.returncode==0 and "HR (ฝ่ายเจ้าภาพ)" in html