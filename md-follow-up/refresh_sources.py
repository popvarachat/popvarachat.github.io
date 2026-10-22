#!/usr/bin/env python3
"""Read-only MD Dashboard refresh runner. Public output is strictly aggregate metadata.
Usage:
  py -3 refresh_sources.py --config refresh.config.json --mode manual
  py -3 refresh_sources.py --config refresh.config.json --mode auto --publish
Missing sources NEVER overwrite the last good snapshot. No macro execution.
"""
import argparse, datetime as dt, base64, json, os, pathlib, subprocess, sys, tempfile, time, re
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
                if str(r[0]).strip().isdigit() and 1 <= int(str(r[0]).strip()) <= 10000 and r[1]:
                    total+=1
                    states[str(r[10]).strip() if r[10] is not None else "blank"]+=1
            if total<80:raise ValueError("CB_COUNT_TOO_LOW_EXPECTED_88")
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
def publish_public(report, source_names):
    """Merge only locally checked sources with newest remote GitHub JSON via SHA guard.
    Preserves remote Planner / Innovation from cloud automation.
    """
    uri="repos/popvarachat/popvarachat.github.io/contents/md-follow-up/source-health.json"
    for attempt in range(4):
        response=subprocess.run(["gh","api",uri],capture_output=True,text=True,encoding="utf-8",timeout=40,check=True)
        blob=json.loads(response.stdout)
        remote=json.loads(base64.b64decode(blob["content"]).decode("utf-8-sig"))
        entries=remote.setdefault("sources",{})
        changed=False
        for name in source_names:
            old=entries.get(name,{})
            fresh=report["sources"][name]
            def shape(v):
                return {k:vv for k,vv in v.items() if k not in ("checked_at","last_attempt","error")}
            if shape(old)!=shape(fresh):
                entries[name]=fresh
                changed=True
        if not changed:
            return {"result":"unchanged","attempt":attempt+1}
        remote["schema"]=max(2,int(remote.get("schema",1)))
        remote["generated_at"]=report["generated_at"]
        remote["mode"]=report["mode"]
        remote["batch"]=report["batch"]
        body={"message":"data: refresh NB W-drive source health read-only","content":base64.b64encode(json.dumps(remote,ensure_ascii=False,indent=2).encode("utf-8")).decode("ascii"),"sha":blob["sha"],"branch":"main"}
        resp=subprocess.run(["gh","api","--method","PUT",uri,"--input","-"],input=json.dumps(body),capture_output=True,text=True,encoding="utf-8",timeout=55)
        if resp.returncode==0:
            data=json.loads(resp.stdout)
            return {"sha":data.get("commit",{}).get("sha"),"attempt":attempt+1,"merged_sources":list(entries)}
        if attempt==3:
            raise RuntimeError("GITHUB_PUBLISH_FAILED: "+resp.stderr[:400])
        time.sleep(1.5*(attempt+1))
    raise RuntimeError("PUB_FAILED")

def main():
    pa=argparse.ArgumentParser()
    pa.add_argument("--config",default=str(ROOT/"refresh.config.json"))
    pa.add_argument("--mode",choices=["manual","auto"],default="manual")
    pa.add_argument("--publish",action="store_true")
    a=pa.parse_args()
    conf=json.loads(pathlib.Path(a.config).read_text(encoding="utf-8-sig"))
    destination=ROOT/"source-health.json"
    old=json.loads(destination.read_text(encoding="utf8")) if destination.exists() else {"sources":{}}
    report={"schema":2,"generated_at":stamp(),"mode":a.mode,"sources":dict(old.get("sources",{})),"batch":{"ok":[],"failed":[]}}
    sources=conf.get("sources",{})
    force_marker=ROOT/".audit-local"/"force-deep-w.scan"
    force_deep=force_marker.exists() or a.mode=="manual"
    report["batch"]["deep_scanned"]=[]
    report["batch"]["signature_cached"]=[]
    for name,src in sources.items():
        kind=src.get("kind",name);path=pathlib.Path(os.path.expandvars(src.get("path","")))
        try:
            if not path.is_file():raise FileNotFoundError("unavailable")
            signature=sig(path)
            prior=old.get("sources",{}).get(name,{})
            same=prior.get("status")=="ok" and all(prior.get(k)==v for k,v in signature.items())
            recent=False
            if prior.get("checked_at"):
                try: recent=(dt.datetime.now(UTC)-dt.datetime.fromisoformat(prior["checked_at"])).total_seconds()<24*3600
                except (ValueError,TypeError): pass
            if not force_deep and same and recent:
                report["sources"][name]=prior
                report["batch"]["ok"].append(name)
                report["batch"]["signature_cached"].append(name)
                continue
            values=extract(path,kind)
            report["batch"]["deep_scanned"].append(name)
            report["sources"][name]={"status":"ok","checked_at":stamp(),**sig(path),**values}
            report["batch"]["ok"].append(name)
        except Exception as err:
            previous=report["sources"].get(name,{})
            report["sources"][name]={**previous,"status":"stale" if previous.get("checked_at") else "unavailable","last_attempt":stamp(),"error":type(err).__name__}
            report["batch"]["failed"].append(name)
    report["batch"]["total"]=len(sources)
    report["batch"]["successful"]=len(report["batch"]["ok"])
    # For public deployment never expose source file locations, owner identities or document payloads.
    if a.publish and not sources:
        print("SKIP_PUBLISH: no source could be checked",flush=True);return 2
    atomic_json(destination,report)
    if force_marker.exists():
        try:force_marker.unlink()
        except OSError:pass
    must_rebuild=force_deep or bool(report["batch"]["deep_scanned"]) or bool(report["batch"]["failed"])
    # PRIVATE_DETAIL_BUILD: permitted local W sources to per-row private records, no GitHub upload
    try:
        if not must_rebuild:
            print("PRIVATE_DETAIL_REBUILD_SKIPPED: W source signatures unchanged",flush=True)
        else:
            sub=subprocess.run([sys.executable,str(ROOT/"build_private_details.py")],
            capture_output=True,text=True,encoding="utf-8",timeout=90)
            if sub.returncode:
                print("PRIVATE_DETAIL_BUILD_FAILED "+sub.stderr[:220],flush=True)
            else:
                print("PRIVATE_DETAIL_BUILD_SUCCESS",flush=True)
                pivot=subprocess.run([sys.executable,str(ROOT/"build_pivot.py")],
                    capture_output=True,text=True,encoding="utf-8",timeout=45)
                print("PRIVATE_PIVOT_BUILD_SUCCESS" if pivot.returncode==0
                      else "PRIVATE_PIVOT_BUILD_FAILED "+pivot.stderr[:220],flush=True)

    except Exception as e:
        print("PRIVATE_DETAIL_BUILD_UNAVAILABLE "+type(e).__name__,flush=True)
    audit_dir=ROOT/".audit-local";audit_dir.mkdir(exist_ok=True)
    with (audit_dir/"refresh.jsonl").open("a",encoding="utf8") as f:
        f.write(json.dumps({"time":stamp(),"mode":a.mode,"ok":report["batch"]["ok"],"failed":report["batch"]["failed"]})+"\n")
    if a.publish:
        if a.mode=="auto" and not report["batch"]["deep_scanned"] and not report["batch"]["failed"]:
            print("SKIP_GITHUB_PUBLISH: source signatures unchanged",flush=True)
        else:
            result=publish_public(report,list(sources))
            print("PUBLISHED_PUBLIC_METADATA "+json.dumps(result),flush=True)
    print(json.dumps({"status":"complete","ok":report["batch"]["ok"],"failed":report["batch"]["failed"],"output":str(destination)},ensure_ascii=False))
    return 0
if __name__=="__main__":sys.exit(main())
