#!/usr/bin/env python3
"""Install lightweight, verifiable per-source refresh ledger on private NB pivot.

No source API calls on page load; all details derive from existing local health
receipts and file mtimes. Existing scan endpoints / schedules are unchanged.
"""
import pathlib,shutil
VIEWER=pathlib.Path(__file__).resolve().with_name("serve_private.py")
PIVOT=pathlib.Path.home()/"AppData"/"Local"/"UAIOS"/"MD-FollowUp-Private"/"pivot.html"
s=VIEWER.read_text(encoding="utf8")
if "_source_audit_receipt" not in s:
    marker='class Handler(http.server.SimpleHTTPRequestHandler):'
    if s.count(marker)!=1:raise RuntimeError("SERVER_PATCH_ANCHOR_CHANGED")
    extension='''
# Metadata-only evidence ledger. Reading this does not scan any external system.
def _source_audit_receipt():
    def load(path):
        try:return json.loads(path.read_text(encoding="utf-8-sig"))
        except (OSError,ValueError):return {}
    def iso(path):
        try:return dt.datetime.fromtimestamp(path.stat().st_mtime,dt.timezone.utc).isoformat()
        except OSError:return None
    def level(status,when,max_hours,now):
        if status not in ("ok","success"):return "error" if status in ("error","stale","failed") else "unavailable"
        if not when:return "unknown"
        try:
            age=(now-dt.datetime.fromisoformat(str(when).replace("Z","+00:00"))).total_seconds()/3600
            return "recent" if -0.5<=age<=max_hours else "stale"
        except (ValueError,TypeError):return "unknown"
    now=dt.datetime.now(dt.timezone.utc)
    health=load(SCAN_ROOT/"source-health.json")
    batch=health.get("batch",{})
    src=health.get("sources",{})
    mm=load(ROOT/"mm-agenda.json")
    line=load(ROOT/"innovation-room-twin-health.json")
    if not line:line=load(ROOT/"innovation-room-health.json")
    pivot=ROOT/"pivot.json"
    source_names=[
       ("cb","CB List","W: / Master",26),
       ("ics","ICS","W: / ICS",26),("icf","ICF","W: / ICF",26),
       ("ice","ICE","W: / ICE",26),
       ("cb_edu","CB / EDU","W: / CB Sheets",26),
       ("cb_icf","CB / ICF","W: / CB Sheets",26),
       ("cb_ics","CB / ICS","W: / CB Sheets",26),
       ("cb_new","CB / New Product","W: / CB Sheets",26),
       ("cb_abdul","CB / Abdul","W: / CB Sheets",26),
       ("planner","Planner / To Do","Microsoft Graph",5),
       ("innovation","Innovation Project Register","SharePoint Snapshot",30),
    ]
    items=[]
    for key,label,provider,threshold in source_names:
        e=src.get(key,{})
        checked=e.get("checked_at")
        if key=="planner":
            stamp=load(ROOT/"planner-export.json").get("retrieved_at")
            checked=stamp or checked
        state=level(e.get("status"),checked,threshold,now)
        checked_mode=("signature_cached" if key in batch.get("signature_cached",[])
                      else "deep_scanned" if key in batch.get("deep_scanned",[])
                      else "external_receipt" if key in ("planner","innovation")
                      else "previous_receipt")
        items.append({"key":key,"label":label,"provider":provider,"status":state,
            "last_verified":checked,"last_attempt":e.get("last_attempt"),
            "source_modified":e.get("file_modified"),"count":e.get("total"),
            "last_w_batch":health.get("generated_at") if key.startswith("cb") or key in ("ics","icf","ice") else None,
            "verification":checked_mode,"note":e.get("error"),
            "needs_manual_permission":False})
    mm_time=mm.get("snapshot_generated_at")
    items.append({"key":"mm","label":"MM Agenda (แยกจาก MD)","provider":"SharePoint Connector Snapshot",
                  "status":level("ok" if mm_time else "unavailable",mm_time,30,now),
                  "last_verified":mm_time,"source_modified":mm.get("source_updated_at"),
                  "count":mm.get("total_meeting_items"),"verification":"connector_snapshot_not_auto_sync",
                  "needs_manual_permission":True,"note":"ไม่ได้ยืนยันการอ่าน SharePoint ใหม่แบบอัตโนมัติ"})
    live=line.get("checked_at")
    items.append({"key":"innovation_line","label":"LINE / สมาคมนักนวัตกรรม","provider":"Cloudflare D1 / Room-only",
                  "status":level("ok" if line.get("state")=="ok" else line.get("state"),live,2.5,now),
                  "last_verified":live,"source_modified":line.get("last_event_at"),
                  "count":line.get("source_event_count",line.get("events_total")),
                  "verification":"incremental_room_only",
                  "needs_manual_permission":False,
                  "note":line.get("error") or ("ตรวจระบบเมื่อเวลาอัปเดต; เวลาข้อความล่าสุดไม่ใช่เวลา Refresh")})
    totals={key:sum(a["status"]==key for a in items) for key in ("recent","stale","error","unavailable","unknown")}
    return {"schema":1,"checked_at":_now(),"read_only":True,"new_scan_triggered":False,
        "pivot_built_at":iso(pivot),"w_batch_checked_at":health.get("generated_at"),
        "w_batch_mode":health.get("mode"),"w_batch_success":len(batch.get("ok",[])),
        "w_batch_failed":batch.get("failed",[]),"w_batch_total":batch.get("total"),
        "scope":"13 upstream receipts; MM separate from MD metrics",
        "all_sources_verified_recent":totals["recent"]==len(items),
        "total":len(items),"counts":totals,"sources":items}

'''
    s=s.replace(marker,extension+marker)
    changes=[
      ('"/pivot.json","/mm-agenda.json"', '"/pivot.json","/source-audit.json","/mm-agenda.json"'),
      ('if requested=="/scan-status":','if requested=="/source-audit.json":\\n            self._send_json(200,_source_audit_receipt())\\n            return\\n        if requested=="/scan-status":'),
      ('"/pivot.html","/pivot.json","/mm.html"','"/pivot.html","/pivot.json","/source-audit.json","/source-audit.js","/mm.html"')
    ]
    for before,after in changes:
        if not s.count(before):raise RuntimeError("UNEXPECTED_SERVER_ANCHOR:"+before)
        # only globally duplicate when intentionally in both CORS and origin gates
        s=s.replace(before,after)
    s=s.replace('if requested=="/source-audit.json":\\n','if requested=="/source-audit.json":\n')
    s=s.replace('self._send_json(200,_source_audit_receipt())\\n','self._send_json(200,_source_audit_receipt())\n')
    s=s.replace('return\\n        if requested=="/scan-status"','return\n        if requested=="/scan-status"')
    # All previous security invariants survive.
    if '("127.0.0.1",8766)' not in s or 'TRUSTED_PUBLIC_ORIGIN="https://popvarachat.github.io"' not in s:
        raise RuntimeError("DO_NOT_WEAKEN_PRIVATE_SECURITY")
    compile(s,str(VIEWER),"exec")
    backup=VIEWER.with_name("serve_private.before-source-audit.bak")
    if not backup.exists():shutil.copy2(VIEWER,backup)
    VIEWER.write_text(s,encoding="utf8")
    print("SOURCE_AUDIT_ENDPOINT_INSTALLED")
else:
    print("SOURCE_AUDIT_ENDPOINT_PRESENT")
p=PIVOT.read_text(encoding="utf8")
if 'id="sourceAuditPanel"' not in p:
    panel='''<section class="panel" id="sourceAuditPanel" aria-label="ตรวจสอบสถานะ Refresh ของทุกแหล่งข้อมูล">
  <div class="panelhead"><div><h2>ตรวจสถานะ Refresh จากทุก Source</h2>
  <div class="desc" id="auditSummary" role="status" aria-live="polite">กำลังตรวจใบยืนยันการอ่านต้นทาง…</div></div>
  <div class="badges"><span class="subbadge" id="auditReceipt">ไม่สแกนซ้ำตอนเปิดเว็บ</span>
   <button class="ghost" type="button" id="auditReadAgain">ตรวจสถานะอีกครั้ง (ไม่สแกน)</button></div></div>
  <div class="refresh-summary" id="auditCounts"></div>
  <details class="audit-details" open><summary>รายละเอียดแหล่งข้อมูล · เวลาอ่านต้นทาง · ความสด · วิธีตรวจ</summary>
    <div class="audit-table-wrap"><table class="audit-table"><thead><tr>
      <th>Source</th><th>สถานะ</th><th>ตรวจยืนยันล่าสุด</th><th>ต้นทางเปลี่ยนล่าสุด</th><th>วิธีตรวจ / หมายเหตุ</th>
    </tr></thead><tbody id="auditRows"><tr><td colspan="5">กำลังตรวจสอบ…</td></tr></tbody></table></div>
  </details><p class="audit-disclaimer">สถานะ “ล่าสุด” หมายถึงมีใบยืนยันภายในเกณฑ์เวลา ไม่ใช่รับรองว่าแหล่งอื่นเป็น Live ทั้งหมด และไม่ได้หมายความว่าไฟล์ต้นทางมีการเปลี่ยนแปลง</p>
</section>
'''
    anchor='<section class="panel">' + chr(10) + ' <div class="panelhead"><div><h2>ตัวกรองรายงาน</h2>'
    if p.count(anchor)!=1:raise RuntimeError("PIVOT_PANEL_ANCHOR_CHANGED")
    p=p.replace(anchor,panel+anchor)
    p=p.replace('</head>', '''<style>
.refresh-summary{display:flex;flex-wrap:wrap;gap:11px;padding:13px 0}
.audit-pill{border:1px solid #cbdce8;background:#f4f8fa;border-radius:12px;padding:10px 14px;min-width:145px;font-size:13px}
.audit-pill strong{font-size:20px;display:block;color:#18374e}
.audit-details summary{cursor:pointer;padding:11px 0;color:#25516b;font-weight:700}
.audit-table-wrap{overflow-x:auto;max-height:390px;overflow-y:auto}
.audit-table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:12px}
.audit-table td,.audit-table th{padding:9px 12px;text-align:left;border-bottom:1px solid #dae7ef}
.audit-table th{position:sticky;top:0;background:#e3eef5;color:#224459}
.audit-chip{display:inline-block;padding:4px 8px;border-radius:9px;background:#e9f1f6;color:#25475e;font-size:11px}
.audit-chip.recent{background:#d9f4e8;color:#176043}
.audit-chip.stale,.audit-chip.unknown{background:#fff0d4;color:#936018}
.audit-chip.error,.audit-chip.unavailable{background:#ffe4e5;color:#9d3040}
.audit-disclaimer{margin:10px 0 0;color:#667e90;font-size:12px;line-height:1.6}
</style><script defer src="./source-audit.js"></script></head>''')
    PIVOT.write_text(p,encoding="utf8")
    print("LOCAL_PIVOT_AUDIT_PANEL_INSTALLED")
else:print("LOCAL_PIVOT_AUDIT_PANEL_PRESENT")