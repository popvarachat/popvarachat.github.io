#!/usr/bin/env python3
"""Read-only MD Dashboard refresh runner. Public output is strictly aggregate metadata.
Usage:
  py -3 refresh_sources.py --config refresh.config.json --mode manual
  py -3 refresh_sources.py --config refresh.config.json --mode auto --publish
Missing sources NEVER overwrite the last good snapshot. No macro execution.
"""
import argparse, datetime as dt, hashlib, json, os, pathlib, subprocess, sys, tempfile
from collections import Counter

ROOT=pathlib.Path(__file__).resolve().parent
UTC=dt.timezone.utc
def stamp(): return dt.datetime.now(UTC).isoformat(timespec="seconds")
def sig(path):
    st=path.stat()
    return {"size_bytes":st.st_size,"file_modified":dt.datetime.fromtimestamp(st.st_mtime,UTC).isoformat(timespec="seconds")}
def extract(path,kind):
    from openpyxl import load_workbook
    w=load_workbook(path,read_only=True,data_only=True,keep_links=False)
    try:
        if kind=="cb":
            s=next((x for x in w if "CB" in x.title.upper()),w.active)
            total=0; states=Counter()
            for r in s.iter_rows(min_row=2,min_col=1,max_col=11,values_only=True):
                if isinstance(r[0],(int,float)) and 1<=r[0]<=10000 and r[1]:
                    total+=1;states[str(r[10]).strip() if r[10] is not None else "blank"]+=1
            return {"unit":"entries","total":total,"status_counts":dict(states)}
        if kind in ("ics","icf","ice"):
            wanted={"ics":"ICS69","icf":"ICF 2569","ice":"ICF 2569"}[kind]
            s=w[wanted] if wanted in w.sheetnames else w.active
            stats=Counter()
            for r in s.iter_rows(min_col=6,max_col=9,values_only=True):
                gate=r[0]
                if not gate or "Status" in str(gate) or "สถานะ" in str(gate): continue
                status=str(r[3]).strip() if r[3] is not None else "blank"
                stats[status]+=1
            return {"unit":"gate_rows","total":sum(stats.values()),"status_counts":dict(stats)}
        if kind=="innovation":
            s=w["ติดตามงาน"] if "ติดตามงาน" in w.sheetnames else w.active
            st=Counter();stages=0
            for r in s.iter_rows(min_col=4,max_col=7,values_only=True):
                if r[0] and str(r[0]).strip() not in ("แผนงาน",):
                    stages+=1;st[str(r[3]).strip() if r[3] is not None else "blank"]+=1
            return {"unit":"activity_rows","total":stages,"status_counts":dict(st),"note":"Not the unique project dashboard count"}
        raise ValueError("Unsupported source kind "+kind)
    finally: w.close()
def atomic_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix="md-",suffix=".tmp",dir=str(path.parent))
    try:
        with os.fdopen(fd,"w",encoding="utf8") as f:json.dump(obj,f,ensure_ascii=False,indent=2)
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
def main():
    pa=argparse.ArgumentParser()
    pa.add_argument("--config",default=str(ROOT/"refresh.config.json"))
    pa.add_argument("--mode",choices=["manual","auto"],default="manual")
    pa.add_argument("--publish",action="store_true")
    a=pa.parse_args()
    conf=json.loads(pathlib.Path(a.config).read_text(encoding="utf-8-sig"))
    destination=ROOT/"source-health.json"
    old=json.loads(destination.read_text(encoding="utf8")) if destination.exists() else {"sources":{}}
    report={"schema":1,"generated_at":stamp(),"mode":a.mode,"sources":dict(old.get("sources",{})),"batch":{"ok":[],"failed":[]}}
    sources=conf.get("sources",{})
    for name,src in sources.items():
        kind=src.get("kind",name);path=pathlib.Path(os.path.expandvars(src.get("path","")))
        try:
            if not path.is_file():raise FileNotFoundError("unavailable")
            values=extract(path,kind)
            report["sources"][name]={"status":"ok","checked_at":stamp(),**sig(path),**values}
            report["batch"]["ok"].append(name)
        except Exception as err:
            previous=report["sources"].get(name,{})
            report["sources"][name]={**previous,"status":"stale" if previous.get("checked_at") else "unavailable","last_attempt":stamp(),"error":type(err).__name__}
            report["batch"]["failed"].append(name)
    report["batch"]["total"]=len(sources)
    report["batch"]["successful"]=len(report["batch"]["ok"])
    # For public deployment never expose source file locations, owner identities or document payloads.
    if a.publish and not report["batch"]["ok"]:
        print("SKIP_PUBLISH: no source could be checked",flush=True);return 2
    atomic_json(destination,report)
    audit_dir=ROOT/".audit-local";audit_dir.mkdir(exist_ok=True)
    with (audit_dir/"refresh.jsonl").open("a",encoding="utf8") as f:
        f.write(json.dumps({"time":stamp(),"mode":a.mode,"ok":report["batch"]["ok"],"failed":report["batch"]["failed"]})+"\n")
    if a.publish:
        repo=ROOT.parent
        subprocess.run(["git","add","md-follow-up/source-health.json"],cwd=repo,check=True)
        changes=subprocess.run(["git","diff","--cached","--quiet"],cwd=repo).returncode
        if changes:
            subprocess.run(["git","commit","-m","chore: refresh public-safe MD source health"],cwd=repo,check=True)
            subprocess.run(["git","push","origin","main"],cwd=repo,check=True)
        print("PUBLISHED_PUBLIC_METADATA",flush=True)
    print(json.dumps({"status":"complete","ok":report["batch"]["ok"],"failed":report["batch"]["failed"],"output":str(destination)},ensure_ascii=False))
    return 0
if __name__=="__main__":sys.exit(main())
