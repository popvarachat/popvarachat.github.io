#!/usr/bin/env python3
"""Read-only private MM page + JSON; unrelated MD routes and POST controls unchanged."""
from pathlib import Path
import shutil
p=Path(__file__).resolve().with_name("serve_private.py")
s=p.read_text(encoding="utf8")
if '"/mm-agenda.json"' in s and '"/mm.html"' in s:
 print("MM_ALLOWLIST_ALREADY_INSTALLED");raise SystemExit(0)
a='"/pivot.json","/innovation-room-events.json"'
assert s.count(a)==2,("MM guard fail: "+str(s.count(a)))
s=s.replace(a,'"/pivot.json","/mm-agenda.json","/innovation-room-events.json"')
b='"/pivot.html","/pivot.json","/line-audit.html"'
assert s.count(b)==1,("MM viewer guard fail: "+str(s.count(b)))
s=s.replace(b,'"/pivot.html","/pivot.json","/mm.html","/mm-agenda.json","/line-audit.html"')
assert '("127.0.0.1",8766)' in s and 'TRUSTED_PUBLIC_ORIGIN="https://popvarachat.github.io"' in s
compile(s,str(p),"exec")
bak=p.with_name("serve_private.before-mm-agenda.bak")
if not bak.exists():shutil.copy2(p,bak)
p.write_text(s,encoding="utf8")
print("MM_VIEWER_ALLOWLIST_ADDED_READ_ONLY")