# Source Refresh Audit — MD Private Pivot

Updated 26 October 2026. Applies to the private NB page: `http://127.0.0.1:8766/pivot.html`.

## What user sees
- Header “ตรวจสถานะ Refresh จากทุก Source” below KPIs; summary `recent/total` and explicit warnings when a source is old.
- Clicking details reveals per-source name, freshness, last successful verification, source file modified time (not the same as the verification time), and collection method.
- “ตรวจสถานะอีกครั้ง (ไม่สแกน)” requests only the local metadata receipt `GET /source-audit.json`. No expensive external scan, no D1 calls, no Graph calls and no writes.
- Pivot built time and W: batch verification time are displayed distinctly. A file's old modified date is not, by itself, a failure when its latest integrity check is recent.
- If the endpoint fails, the UI never displays “all sources refreshed”.

## Source contracts
- 9 W:/source-health.json receipts: CB master, ICS, ICF, ICE, CB EDU, CB ICF, CB ICS, CB New Product, CB Abdul. Within 26 hours counted as *recent*.
- Planner: latest local `planner-export.json.retrieved_at`, metadata status from source-health; within 5 hours.
- Innovation Project Register (separate from Innovation LINE room): SharePoint health receipt in source-health; within 30 hours.
- MM Agenda: `mm-agenda.json.snapshot_generated_at`; within 30 hours, **not an unattended SharePoint sync**. MM remains separate from MD KPI.
- Innovation LINE room: `innovation-room-twin-health.json.checked_at` and its `state`, within 2.5 hours. Last LINE event timestamp is shown separately from last collector check.
- The overall indicator counts 13 receipts; it does **not** mean every source was queried at exactly the same second or that the underlying business task was completed.

## Confirmed test
- At the rollout, 13 receipts, 12 recent, 1 stale: `innovation` SharePoint project register was last refreshed 19 October 2026.
- Real Edge headless browser on NB: source audit status displays `12/13`, 13 detail rows; `GET /source-audit.json` HTTP 200 returns `new_scan_triggered=false`.
- Syntax of patched Python server and browser JS validated.
- No changes to existing scanner scheduling or source data made.

## Recovery
- Installer: `md-follow-up/private-tools/enable_all_source_audit.py`, previously copied to authorized NB's private project directory and run there. Reinstates one GET endpoint, a static JavaScript file (copy `source-audit.js` to private viewer ROOT), and a pivot status panel. Existing origin, localhost binding and POST route allowlist are preserved.
- Source JS: `md-follow-up/private-tools/source-audit.js`.
- Browser smoke: `md-follow-up/private-tools/smoke_source_audit_web.py`.
- Restart authorized NB `MD-FollowUp-Private-Viewer` scheduled task after server changes, not the unrelated source collectors.
- **Never commit** private `source-health.json`, `pivot.json`, `records.json`, MM content, LINE texts, names, or SO/CB details to public GitHub.

## Future changes
- To add a new source, require verifiable last-success receipt and explicit separate sync policy before increasing the total. Do not equate local page reload with full source update.
- If users request a full refresh, orchestrate each *authorized* source in its own schedule/connector and show per-source errors; do not mark SharePoint connector sources "Live" unless unattended access was actually verified.
