#!/usr/bin/env python3
"""Build separate, private MM agenda from authorized SharePoint workbook extract.

This source is an extract made by the connected Microsoft SharePoint service,
not an independently live Microsoft Graph source. Output is NOT MD's agenda,
and must never be posted to public GitHub Pages.
"""
import csv, datetime as dt, hashlib, json, os, pathlib, re, tempfile
ROOT=pathlib.Path(os.environ["LOCALAPPDATA"])/"UAIOS"/"MD-FollowUp-Private"
SOURCE=ROOT/"mm-sharepoint-extract.csv"
OUTPUT=ROOT/"mm-agenda.json"
INFO=ROOT/"mm-sharepoint-source.json"
NAMES=("mm (9) 15.10.69","mm (8) 11.9.69","mm (7) 12.8.69","คงค้าง",
       "mm (6) 10.7.69","mm (5) 10.6.69","mm (4) 8.5.69","mm (3) 25.3.69",
       "mm (2) 27.2.69","mm (1) 23.1.69","Sheet2")
BANGKOK=dt.timezone(dt.timedelta(hours=7))

def cell(r,i):
    return str(r[i]).strip().replace("\xa0"," ") if 0<=i<len(r) and r[i] is not None else ""

def source_date(x):
    s=str(x or "").strip()
    if not s:return ("","")
    m=re.search(r"\b(\d{4})-(\d\d)-(\d\d)",s)
    if m:
        try:return (dt.date(*map(int,m.groups())).isoformat(),"exact")
        except ValueError:return ("","unverified")
    m=re.fullmatch(r"(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})",s)
    if m:
        d,mo,y=map(int,m.groups())
        if y>=2500:y-=543
        elif y<100:y=2000+y
        try:return (dt.date(y,mo,d).isoformat(),"exact")
        except ValueError:pass
    return ("","unverified")

def subtasks(text):
    # Genuine numbered sub-lines; don't misread "Pdd.02" or dates as stages.
    bits=list(re.finditer(r"(?m)^\s*(\d{1,2})\s*[.)]\s+([^\r\n]+)",text))
    if len(bits)<2:return []
    return [{"step":i+1,"title":text[m.start():bits[i+1].start() if i+1<len(bits) else len(text)].strip()[:5000]}
            for i,m in enumerate(bits)]

def current_state(status,completed):
    t=(status or "").casefold()
    if t in ("ok","done","closed","เสร็จ","เสร็จแล้ว","เรียบร้อย","ดำเนินการแล้ว"):
        return "reported_done_unverified"
    if any(s in t for s in ("ค้าง","ล่าช้า","ยังไม่","รอ","แก้")):return "attention"
    if t:return "status_provided"
    if completed:return "progress_reported_unverified"
    return "not_reported"

def atomic(p,obj):
    with tempfile.NamedTemporaryFile("w",encoding="utf8",dir=p.parent,delete=False,suffix=".tmp") as f:
        tmp=pathlib.Path(f.name);json.dump(obj,f,ensure_ascii=False,indent=2)
    os.replace(tmp,p)

def build(src_text, meta=None):
    pages=src_text.split("\f")
    if len(pages)!=len(NAMES):raise RuntimeError("MM_TABS_CHANGED_FAIL_CLOSED")
    meetings=[];backlog=[];total=0
    for idx,(name,page) in enumerate(zip(NAMES,pages)):
        if name=="Sheet2":continue
        grid=list(csv.reader(page.splitlines()))
        if not grid:continue
        alt=name.startswith("mm (3)")
        base=1 if alt else 8
        heading=cell(grid[1],base) if len(grid)>1 else ""
        if "MANAGEMENT MEETING" not in heading:
            raise RuntimeError("MM_HEADING_MISMATCH_"+name)
        m=re.match(r"mm \((\d+)\)",name)
        mid=int(m.group(1)) if m else 0
        records=[]
        for row in grid[3:]:
            number=cell(row,base)
            action=cell(row,base+3)
            if not number.isdigit() or not action:continue
            agenda=int(number)
            raw_due=cell(row,base+7)
            due_iso,due_quality=source_date(raw_due)
            status=cell(row,base+8)
            progress=cell(row,base+6)
            r={"id":f"MM-2026-{mid:02d}-{agenda:02d}" if mid else f"MM-BACKLOG-{agenda:02d}",
               "meeting_index":mid,"agenda_no":agenda,"agenda":cell(row,base+1),
               "proposer":cell(row,base+2),"action":action,
               "department":cell(row,base+4),"owner":cell(row,base+5),
               "progress":progress,"due_raw":raw_due,"due_iso":due_iso,
               "due_quality":due_quality,"status_raw":status,"note":cell(row,base+9),
               "state":current_state(status,progress),
               "subtasks":subtasks(action),"workstream":"MM","sheet":name}
            records.append(r)
        total+=len(records)
        if name=="คงค้าง":backlog=records
        elif mid:meetings.append({"id":"MM-2026-"+str(mid).zfill(2),"sheet":name,"meeting_index":mid,
                                   "meeting_header":heading,"items":records,"count":len(records)})
    meetings.sort(key=lambda x:-x["meeting_index"])
    if not meetings or meetings[0]["meeting_index"]!=9 or meetings[0]["count"]<10:
        raise RuntimeError("MM_MOST_RECENT_INCOMPLETE_KEEP_LAST_GOOD")
    rawhash=hashlib.sha256(src_text.encode("utf8")).hexdigest()
    last=meetings[0]
    allrecords=[r for m in meetings for r in m["items"]]
    if len({r["id"] for r in allrecords})!=len(allrecords):raise RuntimeError("DUPLICATE_MM_ID")
    return {"schema":1,"source":"SharePoint MM workbook (authorized connector extracted snapshot)",
            "workstream":"MM","separate_from":"MD",
            "source_hash":rawhash,"snapshot_generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),
            "source_updated_at":(meta or {}).get("source_updated_at"),
            "source_url":(meta or {}).get("source_url",""),
            "refresh_mode":"connector_snapshot_not_direct_live",
            "latest_meeting_id":last["id"],"latest_meeting_header":last["meeting_header"],
            "latest_item_count":last["count"],
            "total_meeting_items":len(allrecords),
            "backlog_count":len(backlog),"backlog":backlog,
            "meetings":meetings,
            "policy":{"mm_kpi_separate":True,"md_kpi_unchanged":True,
                      "no_completion_inference_from_progress_text":True,
                      "date_only_when_unambiguous":True}}

def main():
    src=SOURCE.read_text(encoding="utf8")
    meta=json.loads(INFO.read_text(encoding="utf8")) if INFO.exists() else {}
    data=build(src,meta)
    if OUTPUT.exists():
        previous=json.loads(OUTPUT.read_text(encoding="utf8"))
        if previous.get("source_hash")==data["source_hash"]:
            print(json.dumps({"state":"unchanged","latest":data["latest_item_count"],
                  "all":data["total_meeting_items"],"backlog":data["backlog_count"]}))
            return
    atomic(OUTPUT,data)
    print(json.dumps({"state":"updated","latest":data["latest_item_count"],
          "all":data["total_meeting_items"],"backlog":data["backlog_count"]}))

if __name__=="__main__":main()