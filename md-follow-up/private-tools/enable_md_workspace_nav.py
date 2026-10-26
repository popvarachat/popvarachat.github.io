#!/usr/bin/env python3
"""Add MD unified navigator on authorized NB without changing source or routes."""
import pathlib,re,shutil
root=pathlib.Path.home()/"AppData"/"Local"/"UAIOS"/"MD-FollowUp-Private"
project=pathlib.Path.home()/"Documents"/"MD-Control-Collector"/"md-follow-up"
server=project/"serve_private.py"
s=server.read_text(encoding="utf8")
before='"/source-audit.js","/mm.html"'
after='"/source-audit.js","/navigation.js","/navigation.css","/mm.html"'
if before in s:
 if s.count(before)!=1:raise RuntimeError("VIEWER_ROUTE_ANCHOR_AMBIGUOUS")
 s=s.replace(before,after)
 if '("127.0.0.1",8766)' not in s or "TRUSTED_PUBLIC_ORIGIN" not in s:
  raise RuntimeError("PRIVATE_LISTEN_SECURITY_CHANGED")
 compile(s,str(server),"exec")
 backup=server.with_name("serve_private.before-workspace-nav.bak")
 if not backup.exists():shutil.copy2(server,backup)
 server.write_text(s,encoding="utf8")
elif after not in s:raise RuntimeError("VIEWER_ALLOWLIST_UNKNOWN")
print("PRIVATE_VIEWER_NAV_ASSETS_ALLOWED")
page=root/"pivot.html"
html=page.read_text(encoding="utf8")
if "navigation.js" not in html:
 head='<link rel="stylesheet" href="./navigation.css?v=workspace26a"><script defer src="./navigation.js?v=workspace26a"></script>'
 if html.count("</head>")!=1:raise RuntimeError("PIVOT_HEAD_UNKNOWN")
 html=html.replace("</head>",head+"</head>")
 # Keep only one contextual link; unified nav now owns the other destinations.
 html,n=re.subn(r'<nav class="topnav">[\s\S]*?</nav>',
  '<nav class="topnav"><a href="./line-audit.html#md-progress">ดูรายงานความคืบหน้า MD จาก LINE ↗</a></nav>',html,count=1)
 if n!=1:raise RuntimeError("PIVOT_NAV_ANCHOR_NOT_FOUND")
 backup=page.with_name("pivot.before-workspace-nav.bak")
 if not backup.exists():shutil.copy2(page,backup)
 page.write_text(html,encoding="utf8")
print("PRIVATE_PIVOT_UNIFIED_NAV_READY")