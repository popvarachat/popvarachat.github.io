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
payload={"schema":1,"updated":dt.datetime.now(dt.timezone.utc).isoformat(),
 "as_of":TODAY.isoformat(),"source_snapshot":src["generated_at"],"summary":summary,
 "warning":"Internal data only. Open CB overdue means planned transfer date passed, not actual transfer confirmed. ICS/ICF/ICE have no independently confirmed Stage Due; no overdue inference. Blank statuses are uncertain. Rows across sources are not deduplicated.",
 "rows":out}
p=ROOT/"pivot.json"
temp=p.with_suffix(".json.tmp")
temp.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf8")
temp.replace(p)
print(json.dumps({"output":str(p),"sources":summary,"rows":len(out),"mb":round(p.stat().st_size/1e6,2)},ensure_ascii=True))
