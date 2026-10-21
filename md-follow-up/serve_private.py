#!/usr/bin/env python3
"""NB-only private drilldown web server. Never bind to LAN/public interface."""
import os,pathlib,http.server,urllib.parse,threading,subprocess,sys,json,datetime as dt,time
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
        # Fixed executable and fixed read-only source scan. No user-submitted commands, paths or arguments.
        result=subprocess.run(
            [sys.executable,str(SCAN_ROOT/"refresh_sources.py"),
             "--config",str(SCAN_ROOT/"refresh.config.json"),"--mode","manual","--publish"],
            cwd=str(SCAN_ROOT),text=True,encoding="utf-8",errors="replace",
            capture_output=True,timeout=600)
        source_file=SCAN_ROOT/"source-health.json"
        batch={}
        if source_file.is_file():
            try: batch=json.loads(source_file.read_text(encoding="utf-8-sig")).get("batch",{})
            except (ValueError,OSError): pass
        success=bool(result.returncode==0 and batch.get("successful")==4 and not batch.get("failed"))
        pivot=ROOT/"pivot.json"
        if success and not pivot.is_file():success=False
        _SCAN_STATE.update(
            state="success" if success else "partial_or_failed",
            finished_at=_now(),
            sources={k:("ok" if k in batch.get("ok",[]) else "failed")
                     for k in ("cb","ics","icf","ice")},
            message=("Scanned W: 4/4 and rebuilt private pivot" if success
                      else "Some W: sources failed, or rebuild/publish failed; inspect NB collector audit"),
            local_pivot_updated=dt.datetime.fromtimestamp(pivot.stat().st_mtime,dt.timezone.utc).isoformat() if pivot.is_file() else None,
            cloud={"planner":"NOT_SCANNED_BY_THIS_BUTTON","innovation":"NOT_SCANNED_BY_THIS_BUTTON"})
    except Exception as exc:
        _SCAN_STATE.update(state="error",finished_at=_now(),message="Scan failed: "+type(exc).__name__)
    finally:
        _SCAN_LOCK.release()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def _is_allowed_origin(self):
        origin=self.headers.get("Origin")
        return origin is None or origin==TRUSTED_PUBLIC_ORIGIN
    def _cors_path(self):
        return urllib.parse.urlsplit(self.path).path in ("/pivot.json","/scan-status","/scan-sources")
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
        if requested in ("/pivot.json","/scan-status") and not self._is_allowed_origin():
            self.send_error(403,"Origin not allowed");return
        if requested=="/scan-status":
            self._send_json(200,dict(_SCAN_STATE))
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
        if urllib.parse.urlsplit(self.path).path!="/scan-sources":
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
