#!/usr/bin/env python3
"""NB-only private drilldown web server. Never bind to LAN/public interface."""
import os,pathlib,http.server,urllib.parse,threading,subprocess,sys,json,datetime as dt,time,traceback
ROOT=pathlib.Path(os.environ.get("LOCALAPPDATA",str(pathlib.Path.home())))/"UAIOS"/"MD-FollowUp-Private"
ROOT.mkdir(parents=True,exist_ok=True)
TRUSTED_PUBLIC_ORIGIN="https://popvarachat.github.io"

SCAN_ROOT=pathlib.Path(__file__).resolve().parent
_SCAN_LOCK=threading.Lock()
_SCAN_STATE={"state":"idle","started_at":None,"finished_at":None,"sources":{},"message":"No manual scan triggered in this server session"}
def _now():
    return dt.datetime.now(dt.timezone.utc).isoformat()
def _run_scan():
    try:
        # Run in the same interactive Windows logon, mapped-W: drive and account
        # as the known-good hourly Task Scheduler, NOT the isolated viewer process.
        srcfile=SCAN_ROOT/"source-health.json"
        pivotfile=ROOT/"pivot.json"
        baseline_src=srcfile.stat().st_mtime_ns if srcfile.is_file() else 0
        baseline_pivot=pivotfile.stat().st_mtime_ns if pivotfile.is_file() else 0
        marker=SCAN_ROOT/".audit-local"/"force-deep-w.scan"
        marker.parent.mkdir(parents=True,exist_ok=True)
        marker.write_text(_now(),encoding="utf-8")
        result=subprocess.run(["schtasks.exe","/run","/tn","MD-FollowUp-Safe-Refresh"],
            capture_output=True,text=True,encoding="utf8",errors="replace",timeout=22)
        if result.returncode!=0:
            raise RuntimeError("ScheduledTaskStartFailed")
        deadline=time.monotonic()+240
        while time.monotonic()<deadline:
            time.sleep(1.5)
            if not srcfile.is_file() or not pivotfile.is_file():
                continue
            if srcfile.stat().st_mtime_ns<=baseline_src or pivotfile.stat().st_mtime_ns<=baseline_pivot:
                continue
            try:scan=json.loads(srcfile.read_text(encoding="utf-8-sig"))
            except (OSError,ValueError):continue
            batch=scan.get("batch",{})
            if len(batch.get("ok",[]))+len(batch.get("failed",[]))!=4:
                continue
            if pivotfile.stat().st_mtime_ns < srcfile.stat().st_mtime_ns:
                continue
            good=len(batch.get("ok",[]))==4 and not batch.get("failed") and len(batch.get("deep_scanned",[]))==4
            _SCAN_STATE.update(
                state="success" if good else "partial_or_failed",
                finished_at=_now(),
                sources={k:("ok" if k in batch.get("ok",[]) else "failed")
                         for k in ("cb","ics","icf","ice")},
                message=("Scheduled W-drive scan 4/4 completed and local pivot rebuilt"
                         if good else "Scheduled scan incomplete; check NB collector audit"),
                local_pivot_updated=dt.datetime.fromtimestamp(
                    pivotfile.stat().st_mtime,dt.timezone.utc).isoformat(),
                cloud={"planner":"NOT_SCANNED_BY_THIS_BUTTON",
                       "innovation":"NOT_SCANNED_BY_THIS_BUTTON"})
            break
        else:
            _SCAN_STATE.update(state="error",finished_at=_now(),
                message="Scheduled W-drive scan did not finish within four minutes")
    except Exception as exc:
        try: (SCAN_ROOT/".audit-local"/"scan-error.log").write_text(traceback.format_exc(),encoding="utf8")
        except OSError:pass
        _SCAN_STATE.update(state="error",finished_at=_now(),
            message="Scheduled source scan failed: "+type(exc).__name__)
    finally:
        _SCAN_LOCK.release()

_PLANNER_LOCK=threading.Lock()
_PLANNER_STATE={"state":"idle","started_at":None,"finished_at":None,
                "message":"Planner scan has not been requested in this server session"}
def _run_planner_scan():
    try:
        # Fixed Graph read-only scanner. The authorized NB Azure CLI profile provides delegated auth.
        r=subprocess.run([sys.executable,str(SCAN_ROOT/"scan_planner_graph.py")],
             cwd=str(SCAN_ROOT),capture_output=True,text=True,
             encoding="utf8",errors="replace",timeout=250)
        final=None
        for line in reversed(r.stdout.splitlines()):
            try:
                obj=json.loads(line)
                if isinstance(obj,dict) and "state" in obj:final=obj;break
            except ValueError:pass
        if r.returncode or not final or final.get("state")!="success":
            code=(final or {}).get("code","GRAPH_SCAN_OR_PIVOT_BUILD_FAILED")
            _PLANNER_STATE.update(state="error",finished_at=_now(),
                message=str(code)[:175])
        else:
            _PLANNER_STATE.update(final)
            _PLANNER_STATE.update(state="success",finished_at=_now(),
                message="Planner Graph refreshed: "+str(final["total"])+" tasks, "+
                       str(final["completed"])+" completed; private Pivot rebuilt")
    except Exception as e:
        _PLANNER_STATE.update(state="error",finished_at=_now(),
            message="Todo Graph refresh unavailable: "+type(e).__name__)
    finally:
        _PLANNER_LOCK.release()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def _is_allowed_origin(self):
        origin=self.headers.get("Origin")
        return origin is None or origin==TRUSTED_PUBLIC_ORIGIN
    def _cors_path(self):
        return urllib.parse.urlsplit(self.path).path in ("/pivot.json","/scan-status","/scan-sources","/planner-status","/scan-planner")
    def do_OPTIONS(self):
        authority=(self.headers.get("Host") or "").lower()
        origin=self.headers.get("Origin")
        if authority not in ("127.0.0.1:8766","localhost:8766") or origin!=TRUSTED_PUBLIC_ORIGIN or not self._cors_path():
            self.send_error(403,"Origin / Host not allowed");return
        self.send_response(204)
        self.end_headers()
    def do_GET(self):
        authority=(self.headers.get("Host") or "").lower()
        if authority not in ("127.0.0.1:8766","localhost:8766"):
            self.send_error(403,"Host not allowed")
            return
        requested=urllib.parse.urlsplit(self.path).path
        if requested in ("/pivot.json","/scan-status","/planner-status") and not self._is_allowed_origin():
            self.send_error(403,"Origin not allowed");return
        if requested=="/scan-status":
            self._send_json(200,dict(_SCAN_STATE))
            return
        if requested=="/planner-status":
            self._send_json(200,dict(_PLANNER_STATE))
            return
        if requested not in ("/","/index.html","/records.json","/pivot.html","/pivot.json","/stage-list.html","/matrix.js","/matrix.css"):
            self.send_error(404,"Resource not served");return
        return super().do_GET()
    def _send_json(self,code,data):
        body=json.dumps(data,ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_POST(self):
        authority=(self.headers.get("Host") or "").lower()
        if authority not in ("127.0.0.1:8766","localhost:8766"):
            self.send_error(403,"Host not allowed");return
        action=urllib.parse.urlsplit(self.path).path
        if action not in ("/scan-sources","/scan-planner"):
            self.send_error(404,"Unsupported action");return
        if self.headers.get("Origin")!=TRUSTED_PUBLIC_ORIGIN:
            self.send_error(403,"Origin not permitted");return
        if "application/json" not in self.headers.get("Content-Type","").lower():
            self.send_error(415,"JSON required");return
        try:length=int(self.headers.get("Content-Length","-1"))
        except ValueError:length=-1
        if not 0<=length<=64:
            self.send_error(413,"Invalid length");return
        try:data=json.loads(self.rfile.read(length))
        except (ValueError,UnicodeError):
            self.send_error(400,"Invalid JSON");return
        if data != {}:
            self.send_error(400,"No parameters accepted");return
        if action=="/scan-planner":
            if not _PLANNER_LOCK.acquire(blocking=False):
                self._send_json(409,dict(_PLANNER_STATE));return
            _PLANNER_STATE.update(state="running",started_at=_now(),finished_at=None,
                message="Reading Planner tasks and checklists from Microsoft Graph on authorized NB")
            try:threading.Thread(target=_run_planner_scan,daemon=True,name="MD_Graph_PlannerScan").start()
            except Exception:
                _PLANNER_LOCK.release()
                self._send_json(500,{"state":"error","message":"Cannot start Todo scan"});return
            self._send_json(202,dict(_PLANNER_STATE));return
        if not _SCAN_LOCK.acquire(blocking=False):
            self._send_json(409,dict(_SCAN_STATE))
            return
        _SCAN_STATE.update(state="running",started_at=_now(),finished_at=None,
             sources={},message="Scanning CB, ICS, ICF, ICE on authorized W: read-only")
        try: threading.Thread(target=_run_scan,daemon=True,name="MD_W_SourceScan").start()
        except Exception:
            _SCAN_LOCK.release()
            self._send_json(500,{"state":"error","message":"Failed to start scan"});return
        self._send_json(202,dict(_SCAN_STATE))
    def end_headers(self):
        origin=self.headers.get("Origin")
        if self._cors_path() and origin==TRUSTED_PUBLIC_ORIGIN:
            self.send_header("Access-Control-Allow-Origin",TRUSTED_PUBLIC_ORIGIN)
            self.send_header("Access-Control-Allow-Methods","GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers","Content-Type")
            self.send_header("Access-Control-Allow-Private-Network","true")
            self.send_header("Cross-Origin-Resource-Policy","cross-origin")
            self.send_header("Vary","Origin")
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("X-Frame-Options","DENY")
        self.send_header("Referrer-Policy","no-referrer")
        self.send_header("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'none'; frame-ancestors 'none'")
        return super().end_headers()
    def log_message(self,fmt,*args):pass
if __name__=="__main__":
    site=http.server.ThreadingHTTPServer(("127.0.0.1",8766),Handler)
    print("MD_PRIVATE_VIEWER_READY http://127.0.0.1:8766/",flush=True)
    site.serve_forever()
