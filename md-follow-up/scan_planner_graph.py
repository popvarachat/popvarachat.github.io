#!/usr/bin/env python3
"""Read-only certified Microsoft Planner refresh on authorized NB.
  Azure CLI has an existing delegated Graph login. Credentials are never saved to project.
  All task data remains under %LOCALAPPDATA%/UAIOS/MD-FollowUp-Private.
  Only aggregate counts/timestamps may be published on GitHub.
"""
import base64,datetime as dt,json,os,pathlib,subprocess,sys,tempfile,time,urllib.error,urllib.request,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parent
PRIVATE=pathlib.Path(os.environ["LOCALAPPDATA"])/"UAIOS"/"MD-FollowUp-Private"
PLAN_ID="dn2yRj0mi0ef4SKPNSvjfskAFE9H"
GRAPH="https://graph.microsoft.com/v1.0"
TZ=dt.timezone(dt.timedelta(hours=7))
def stamp():return dt.datetime.now(dt.timezone.utc).isoformat()
def atomic(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile("w",encoding="utf8",dir=path.parent,prefix=".mdplan-",suffix=".tmp",delete=False) as f:
        tmp=pathlib.Path(f.name);json.dump(data,f,ensure_ascii=False,indent=2)
    os.replace(tmp,path)
def token_from_azure_cli():
    proc=subprocess.run(["az.cmd","account","get-access-token","--resource","https://graph.microsoft.com","-o","json"],
       capture_output=True,text=True,encoding="utf8",errors="replace",timeout=40)
    if proc.returncode:raise RuntimeError("AZURE_CLI_GRAPH_AUTH_REQUIRED")
    result=json.loads(proc.stdout)
    return result["accessToken"]
def graph_get(uri,token):
    if not uri.startswith(GRAPH+"/"):raise RuntimeError("INVALID_GRAPH_URL")
    for attempt in range(4):
        request=urllib.request.Request(uri,headers={"Authorization":"Bearer "+token,"Accept":"application/json"})
        try:
            with urllib.request.urlopen(request,timeout=24) as response:
                return json.loads(response.read().decode("utf8"))
        except urllib.error.HTTPError as e:
            if e.code in (429,503) and attempt<3:
                time.sleep(min(10,int(e.headers.get("Retry-After","2"))));continue
            code=""
            try:code=json.loads(e.read().decode("utf8")).get("error",{}).get("code","")
            except Exception:pass
            raise RuntimeError("GRAPH_HTTP_"+str(e.code)+"_"+code) from None
    raise RuntimeError("GRAPH_RETRY_EXHAUSTED")
def local_date(raw):
    if not raw:return ""
    return dt.datetime.fromisoformat(raw.replace("Z","+00:00")).astimezone(TZ).date().isoformat()
def fetch_tasks():
    access=token_from_azure_cli()
    url=f"{GRAPH}/planner/plans/{PLAN_ID}/tasks"
    gathered=[]
    for _ in range(12):
        reply=graph_get(url,access)
        gathered.extend(reply.get("value",[]))
        url=reply.get("@odata.nextLink")
        if not url:break
    else:raise RuntimeError("GRAPH_PAGINATION_LIMIT")
    if len(gathered)<25 or len(gathered)>200 or len({x["id"] for x in gathered})!=len(gathered):
        raise RuntimeError("PLANNER_INCOMPLETE_TASK_COLLECTION")
    details_ok=0;details_failed=0
    exported=[]
    for task in gathered:
        percent=int(task.get("percentComplete") or 0)
        if not 0<=percent<=100:raise RuntimeError("INVALID_PLANNER_PERCENT")
        tid=task["id"]
        description="";checklist=[];refs_count=0
        try:
            detail=graph_get(f"{GRAPH}/planner/tasks/{urllib.parse.quote(tid,safe='')}/details",access)
            description=detail.get("description","") or ""
            checklist=[{"title":r.get("title",""),"checked":bool(r.get("isChecked"))}
                        for r in (detail.get("checklist") or {}).values()]
            refs_count=len(detail.get("references") or {})
            details_ok+=1
        except RuntimeError:
            details_failed+=1
        exported.append({
            "id":tid,"title":task.get("title",""),"status":"เสร็จสิ้น" if percent==100 else
              ("กำลังดำเนินการ" if percent>0 else "ยังไม่เริ่ม"),
            "percent":percent,"due":task.get("dueDateTime") or "",
            "owner_ids":list((task.get("assignments") or {}).keys()),
            "source":"planner","updated":"","created":task.get("createdDateTime") or "",
            "description":description[:7000],"checklist":checklist[:100],
            "references_count":refs_count
        })
    return {"retrieved_at":stamp(),"source":"Azure CLI delegated Microsoft Graph read-only",
            "plan_id":PLAN_ID,"details_checked":details_ok,"details_unavailable":details_failed,
            "tasks":exported}
def merge_private(exported):
    from pathlib import Path
    records_path=PRIVATE/"records.json"
    old=json.loads(records_path.read_text(encoding="utf8"))
    if not all(k in old["sources"] and old["sources"][k].get("rows") for k in ("cb","ics","icf","ice","innovation")):
        raise RuntimeError("NON_PLANNER_SOURCE_MISSING_KEEP_LAST_GOOD")
    rows=[]
    for t in exported["tasks"]:
        persons=t["owner_ids"]
        owner=f"Assignment {len(persons)} ราย (ตรวจสอบชื่อใน Planner)" if persons else "ไม่มี Assignment ใน Planner"
        desc=t.get("description") or ""
        notes=f"ความคืบหน้า {t['percent']}%"
        if desc:notes+=" · "+desc[:450]
        rows.append({"source":"planner","id":t["id"],"title":t["title"],"status":t["status"],
            "owner":owner,"due":local_date(t["due"]),"due_kind":"กำหนดส่ง",
            "timeliness":"ตรวจจากกำหนดส่งของ Planner","notes":notes[:600],
            "reference":t["id"],"parent":"","percent":t["percent"]})
    old["sources"]["planner"]={"count":len(rows),"rows":rows}
    old.setdefault("source_snapshots",{})["planner_exported"]=exported["retrieved_at"]
    old["generated_at"]=stamp()
    # Commit private export first; existing W scheduled refresh also reads latest export.
    atomic(PRIVATE/"planner-export.json",exported)
    atomic(records_path,old)
    r=subprocess.run([sys.executable,str(ROOT/"build_pivot.py")],capture_output=True,
       text=True,encoding="utf8",errors="replace",timeout=65)
    if r.returncode:raise RuntimeError("PRIVATE_PIVOT_REBUILD_FAILED_"+r.stderr[:160])
    pivot=json.loads((PRIVATE/"pivot.json").read_text(encoding="utf8"))
    p_rows=[x for x in pivot["rows"] if x["source"]=="planner"]
    if len(p_rows)!=len(exported["tasks"]):raise RuntimeError("PIVOT_PLANNER_ROW_COUNT_MISMATCH")
    complete=sum(t["percent"]==100 for t in exported["tasks"])
    if sum(x["closed"] for x in p_rows)!=complete:raise RuntimeError("PLANNER_COMPLETED_STATUS_MISMATCH")
    return len(pivot["rows"])
def publish_metadata(exported):
    tasks=exported["tasks"]
    active=[t for t in tasks if t["percent"]<100]
    today=dt.datetime.now(TZ).date()
    metadata={"status":"ok","provider":"Microsoft Graph read-only via authorized NB Azure CLI",
        "unit":"tasks","total":len(tasks),"open":len(active),
        "completed":sum(t["percent"]==100 for t in tasks),
        "in_progress":sum(0<t["percent"]<100 for t in tasks),
        "not_started":sum(t["percent"]==0 for t in tasks),
        "all_without_assignment":sum(not t["owner_ids"] for t in tasks),
        "open_without_assignment":sum(not t["owner_ids"] for t in active),
        "overdue_open":sum(bool(local_date(t["due"]) and local_date(t["due"])<today.isoformat()) for t in active),
        "open_due_today":sum(local_date(t["due"])==today.isoformat() for t in active),
        "open_without_due_date":sum(not t["due"] for t in active),
        "checked_at":exported["retrieved_at"],
        "details_checked":exported["details_checked"],
        "details_unavailable":exported["details_unavailable"],
        "basis":"Planner plan tasks via Microsoft Graph; no task names or owners published."}
    health_path=ROOT/"source-health.json"
    health=json.loads(health_path.read_text(encoding="utf8"))
    health.setdefault("sources",{})["planner"]=metadata
    atomic(health_path,health)
    # Public source summary only. GitHub push is best-effort; private Todo refresh still succeeds.
    url="repos/popvarachat/popvarachat.github.io/contents/md-follow-up/source-health.json"
    try:
      for attempt in range(3):
        pull=subprocess.run(["gh","api",url],capture_output=True,text=True,encoding="utf8",timeout=30)
        if pull.returncode:raise RuntimeError("GH_METADATA_READ_UNAVAILABLE")
        blob=json.loads(pull.stdout)
        remote=json.loads(base64.b64decode(blob["content"]).decode("utf-8-sig"))
        previous=remote.get("sources",{}).get("planner",{})
        def meaningful(source):
            return {k:v for k,v in source.items() if k not in ("checked_at",)}
        if meaningful(previous)==meaningful(metadata):
            try:
                last_public=dt.datetime.fromisoformat(previous["checked_at"].replace("Z","+00:00"))
                hours=(dt.datetime.now(dt.timezone.utc)-last_public).total_seconds()/3600
                if hours<24:
                    return False
            except (KeyError,ValueError,TypeError):
                pass
        remote.setdefault("sources",{})["planner"]=metadata
        body={"message":"data: refresh verified Planner source health from NB",
              "content":base64.b64encode(json.dumps(remote,ensure_ascii=False,indent=2).encode("utf8")).decode("ascii"),
              "sha":blob["sha"],"branch":"main"}
        push=subprocess.run(["gh","api","--method","PUT",url,"--input","-"],input=json.dumps(body),
           capture_output=True,text=True,encoding="utf8",timeout=55)
        if push.returncode==0:return True
        time.sleep(1.5*(attempt+1))
    except Exception:return False
    return False
def main():
    data=fetch_tasks()
    pivot_total=merge_private(data)
    published=publish_metadata(data)
    r={"state":"success","source":"planner","retrieved_at":data["retrieved_at"],
       "total":len(data["tasks"]),
       "open":sum(t["percent"]<100 for t in data["tasks"]),
       "completed":sum(t["percent"]==100 for t in data["tasks"]),
       "assigned":sum(bool(t["owner_ids"]) for t in data["tasks"]),
       "details_checked":data["details_checked"],
       "details_unavailable":data["details_unavailable"],
       "pivot_stage_rows":pivot_total,"public_health_published":published}
    print(json.dumps(r,ensure_ascii=False))
if __name__=="__main__":
    try:main()
    except Exception as e:
      print(json.dumps({"state":"error","code":str(e)[:180]},ensure_ascii=False))
      sys.exit(2)
