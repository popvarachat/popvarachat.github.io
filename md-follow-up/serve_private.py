#!/usr/bin/env python3
"""NB-only private drilldown web server. Never bind to LAN/public interface."""
import os,pathlib,http.server,urllib.parse
ROOT=pathlib.Path(os.environ.get("LOCALAPPDATA",str(pathlib.Path.home())))/"UAIOS"/"MD-FollowUp-Private"
ROOT.mkdir(parents=True,exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def do_GET(self):
        authority=(self.headers.get("Host") or "").lower()
        if authority not in ("127.0.0.1:8766","localhost:8766"):
            self.send_error(403,"Host not allowed")
            return
        requested=urllib.parse.urlsplit(self.path).path
        if requested not in ("/","/index.html","/records.json","/pivot.html","/pivot.json"):
            self.send_error(404,"Resource not served");return
        return super().do_GET()
    def end_headers(self):
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
