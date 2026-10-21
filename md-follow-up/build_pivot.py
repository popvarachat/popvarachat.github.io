#!/usr/bin/env python3
"""Read-only local MD stage pivot; never publish pivot.json (contains company task data)."""
import os,json,datetime as dt,pathlib,re,collections
ROOT=pathlib.Path(os.environ["LOCALAPPDATA"])/"UAIOS"/"MD-FollowUp-Private"
src=json.loads((ROOT/"records.json").read_text(encoding="utf8"))
TODAY=dt.date.today()
def sval(x):return str(x or "").strip()
def getdate(raw):
 s=sval(raw)
 if not s:return None
 if re.match(r"^\d{4}-\d{2}-\d{2}",s):
  try:return dt.date.fromisoformat(s[:10])
  except ValueError:return None
 m=re.match(r"^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$",s)
 if not m:return None
 y=int(m[3])
 if y>=2500:y-=543
 elif y in (69,26):y=2026
 elif y<100:y+=2000
 try:return dt.date(y,int(m[2]),int(m[1]))
 except ValueError:return None
def dept(owner,source,status=""):
 x=sval(owner).casefold();s=sval(status).casefold()
 if source=="cb":
  if "p3" in s:return "ผลิต 3 (จากสถานะ)"
  if "p5" in s:return "ผลิต 5 (จากสถานะ)"
  return "ไม่ระบุแผนกใน CB"
 for needle,value in (("ผลิต 5","ผลิต 5"),("ผลิต5","ผลิต 5"),("ผลิต 3","ผลิต 3"),("ผลิต3","ผลิต 3"),("ผลิต 2","ผลิต 2"),("ผลิต2","ผลิต 2"),("sts","STS"),("scd","SCD / จัดหา"),("pricing","ราคา"),("eng","วิศวกรรม"),("ฝ่ายแบบ","ฝ่ายแบบ"),("r&d","R&D / แบบ"),("cxd","CXD"),("qp-40","QP-40 / PPI"),("ics","ICS"),("icf","ICF"),("ice","ICE"),("ฝ่ายขาย","ฝ่ายขาย"),("qc","QC")):
  if needle in x:return value
 return "ยังไม่ยืนยันฝ่าย"
def normalized(status):
 x=sval(status)
 if x.startswith("ปิดตามทะเบียน") or x in ("สำเร็จ","จบ","เข้า QP","ยกเลิก","เปิด Order ใหม่","อยู่ในชีตงานที่จบแล้ว","สำเร็จตามขั้นตอน"):return "ปิด/ส่งต่อ"
 if x in ("ระหว่างดำเนินการ","กำลังดำเนินการ") or "เลยกำหนด" in x:return "ดำเนินการ/ติดขัด"
 if x=="ยังไม่เริ่ม":return "ยังไม่เริ่ม"
 if x in ("ไม่ระบุ",""):return "สถานะไม่ชัด"
 return "รอตรวจ/ส่งต่อ"
def calc_due(raw,status,is_confirmed):
 if not is_confirmed:return ("ไม่ได้กำหนด Stage Due",None)
 date=getdate(raw)
 if not date:return ("ไม่มีวันกำหนด",None)
 if normalized(status)=="ปิด/ส่งต่อ":return ("ปิดตามสถานะ",date.isoformat())
 if date<TODAY:return ("ผ่านกำหนดตามตาราง",date.isoformat())
 if date==TODAY:return ("ครบกำหนดวันนี้",date.isoformat())
 return ("ยังไม่ถึงกำหนด",date.isoformat())
sources=src["sources"]
out=[];timelines=collections.defaultdict(list)
def append(group,ref,project,stage,stage_index,status,owner,due,confirmed,notes="",rowid="",team="",source_date="",due_type=""):
 stage=sval(stage);status=sval(status);owner=sval(owner)
 deadline,iso=calc_due(due,status,confirmed)
 item={"source":group,"work_key":ref,"project":sval(project),"stage":stage,
  "stage_index":stage_index,"status":status or "ไม่ระบุ","state":normalized(status),
  "owner":owner or "ยังไม่ระบุ","department":team or dept(owner,group,status),
  "due":sval(due),"due_iso":iso,"due_quality":due_type or ("รับรองจากคอลัมน์กำหนดส่ง" if confirmed else "ไม่มี Stage Due รับรอง"),
  "deadline_state":deadline,"note":sval(notes)[:490],"row_id":sval(rowid),"closed":normalized(status)=="ปิด/ส่งต่อ",
  "source_date":source_date or ""}
 out.append(item);timelines[ref].append(item)
for group in ("cb","ics","icf","ice","innovation","planner"):
 rows=sources.get(group,{}).get("rows",[])
 if group=="innovation":
  for row in rows:
   ref=group+"::"+row["id"];steps=row.get("steps",[])
   if not steps:
    append(group,ref,row["title"],"ไม่พบขั้นตอนย่อย",1,row["status"],row["owner"],"",False,row.get("notes",""),row["id"])
    continue
   for j,s in enumerate(steps,1):
    step_status=s.get("status")
    if "อยู่ในชีตงานที่จบแล้ว" in row.get("status",""):
      step_status="ปิดตามทะเบียน (ยังไม่รับรองราย Gate)"
    append(group,ref,row["title"],s.get("task") or "ขั้นตอนยังไม่ระบุ",j,step_status,
      s.get("owner") or row["owner"],s.get("due",""),True,s.get("notes",""),str(s.get("row","")),
      dept(s.get("owner"),group),due_type="กำหนดขั้นตอนใน SharePoint Snapshot")
 elif group in ("ics","icf","ice"):
  track=collections.Counter()
  for row in rows:
   ref=group+"::"+sval(row.get("reference"))+"::"+sval(row.get("parent"))
   track[ref]+=1
   append(group,ref,row["parent"],row["title"],track[ref],row["status"],row["owner"],
     row.get("due",""),False,row.get("notes",""),row["id"],due_type="วันที่ในตาราง (ยังไม่ใช่ Due)")
 elif group=="cb":
  for row in rows:
   ref=group+"::"+row["id"]
   append(group,ref,row["title"],"CB / "+row["status"],1,row["status"],row["owner"],row.get("due",""),True,row.get("notes",""),
      row["id"],due_type="วันที่โอนตามแผน (ยังไม่รับรองผลโอนจริง)")
 elif group=="planner":
  for row in rows:
   ref=group+"::"+row["id"]
   append(group,ref,row["title"],"งานสั่งการ / Planner",1,row["status"],row["owner"],row.get("due",""),True,row.get("notes",""),row["id"],due_type="กำหนดส่งงาน (ยังไม่มี Stage Due แยก)")
   # The numeric Planner percent is authoritative for completion; Thai UI labels vary.
   out[-1]["closed"]=int(row.get("percent") or 0)>=100
for ref,a in timelines.items():
 total=len(a);active=[x for x in a if not x["closed"] and x["state"]=="ดำเนินการ/ติดขัด"]
 unverified=[x for x in a if not x["closed"] and x["state"]=="สถานะไม่ชัด"]
 current=active[0] if active else (unverified[0] if unverified else next((x for x in a if not x["closed"]),None))
 for x in a:
  x["stage_total"]=total
  x["is_current_stage"]=x is current
  x["current_stage_basis"]="ขั้นตอนแรกที่กำลังทำ" if active else ("ขั้นตอนแรกที่ยังไม่ยืนยันสถานะ" if unverified else "รอการส่งต่อ/ตรวจรับ" if current else "ปิดตามสถานะ")
summary={}
for k in ("cb","ics","icf","ice","innovation","planner"):
 arr=[i for i in out if i["source"]==k]
 openrows=[i for i in arr if not i["closed"]]
 summary[k]={"stages":len(arr),"works":len(set(x["work_key"] for x in arr)),
 "open_stages":len(openrows),"overdue_schedule":sum(x["deadline_state"]=="ผ่านกำหนดตามตาราง" for x in openrows),
 "missing_due":sum(x["deadline_state"] in ("ไม่มีวันกำหนด","ไม่ได้กำหนด Stage Due") for x in openrows),
 "current_stages":sum(x["is_current_stage"] for x in openrows)}

# VERIFIED INDIVIDUAL PRIMARY PIVOT:
# These are literal names observed in workbooks. Never infer a person from a team label.
OWNER_CONFIG_PATH=pathlib.Path(os.environ["LOCALAPPDATA"])/"UAIOS"/"MD-FollowUp-Private"/"verified-person-config.json"
try:
    _owner_config=json.loads(OWNER_CONFIG_PATH.read_text(encoding="utf8"))
except (OSError,ValueError):
    _owner_config={}
SOURCE_NAMES=_owner_config.get("known_person_labels",[])
UNKNOWN="\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38\u0e40\u0e08\u0e49\u0e32\u0e20\u0e32\u0e1e\u0e23\u0e32\u0e22\u0e1a\u0e38\u0e04\u0e04\u0e25"
JOINT_SUFFIX=" (\u0e23\u0e48\u0e27\u0e21)"
ASSIGNMENT_USER_NAMES=_owner_config.get("verified_planner_assignments",{})
if not SOURCE_NAMES:
    raise RuntimeError("PRIVATE_OWNER_DIRECTORY_MISSING: restore local verified-person-config.json before refreshing Pivot")
def named_people(raw):
    raw=(raw or "").strip()
    people=[]
    for name in SOURCE_NAMES:
        if name in raw:
            # Avoid counting a name twice when it is embedded in a longer observed name.
            if any(name in p for p in people):continue
            people=[p for p in people if p not in name]
            people.append(name)
    return people

# Prefer explicit Planner assignment IDs, verified against Microsoft tenant directory.
try:
    exported=json.loads((pathlib.Path(os.environ["LOCALAPPDATA"])/"UAIOS"/"MD-FollowUp-Private"/"planner-export.json").read_text(encoding="utf8"))
    plan_owner={str(t["id"]):t.get("owner_ids",[]) for t in exported.get("tasks",[])}
except Exception:
    plan_owner={}

for row in out:
    raw=row.get("owner","")
    row["owner_raw"]=raw
    if row["source"]=="planner":
        ids=plan_owner.get(str(row["row_id"]),[])
        found=[ASSIGNMENT_USER_NAMES[x] for x in ids if x in ASSIGNMENT_USER_NAMES]
        if found:
            row["owner_person"]=" / ".join(found)
            row["owner_kind"]="named" if len(found)==1 else "joint"
            row["owner_evidence"]="Planner assignment ID verified against tenant directory"
        else:
            row["owner_person"]=UNKNOWN
            row["owner_kind"]="missing"
            row["owner_evidence"]="No named assignment verified in Planner"
        continue
    people=named_people(raw)
    if len(people)==1:
        row["owner_person"]=people[0]
        row["owner_kind"]="named"
        row["owner_evidence"]="Named person explicitly present in source Owner cell"
    elif len(people)>1:
        row["owner_person"]=" / ".join(people)+JOINT_SUFFIX
        row["owner_kind"]="joint"
        row["owner_evidence"]="Multiple persons in source Owner cell; lead not certified"
    else:
        row["owner_person"]=UNKNOWN
        row["owner_kind"]="missing"
        row["owner_evidence"]="Source has team, placeholder, or missing personal assignment"

from planner_owner_notes import audit
summary["planner_ownership_audit"]=audit(out,plan_owner,ASSIGNMENT_USER_NAMES,named_people,UNKNOWN,JOINT_SUFFIX)
payload={"schema":1,"updated":dt.datetime.now(dt.timezone.utc).isoformat(),
 "as_of":TODAY.isoformat(),"source_snapshot":src["generated_at"],"summary":summary,
 "warning":"Internal data only. Open CB overdue means planned transfer date passed, not actual transfer confirmed. ICS/ICF/ICE have no independently confirmed Stage Due; no overdue inference. Blank statuses are uncertain. Rows across sources are not deduplicated.",
 "rows":out}
p=ROOT/"pivot.json"
temp=p.with_suffix(".json.tmp")
temp.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf8")
temp.replace(p)
print(json.dumps({"output":str(p),"sources":summary,"rows":len(out),"mb":round(p.stat().st_size/1e6,2)},ensure_ascii=True))
