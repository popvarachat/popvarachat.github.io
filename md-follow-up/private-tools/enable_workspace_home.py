"""Serve the unified NB workspace without altering private JSON or POST policy."""
import pathlib,shutil
p=pathlib.Path.home()/"Documents"/"MD-Control-Collector"/"md-follow-up"/"serve_private.py"
s=p.read_text(encoding="utf8")
before='"/navigation.css","/mm.html"'
after='"/navigation.css","/workspace.html","/workspace.css","/workspace.js","/mm.html"'
if after not in s:
 if s.count(before)!=1:raise RuntimeError("ALLOWLIST_ANCHOR_CHANGED")
 s=s.replace(before,after)
 if '("127.0.0.1",8766)' not in s or 'TRUSTED_PUBLIC_ORIGIN="https://popvarachat.github.io"' not in s:
  raise RuntimeError("SECURITY_POLICY_UNEXPECTED")
 compile(s,str(p),"exec")
 backup=p.with_name("serve_private.pre-unified-workspace.bak")
 if not backup.is_file():shutil.copy2(p,backup)
 p.write_text(s,encoding="utf8")
print("WORKSPACE_ENDPOINTS_READY")