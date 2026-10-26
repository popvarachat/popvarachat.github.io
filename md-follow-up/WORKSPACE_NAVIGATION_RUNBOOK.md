# MD Control Workspace — Unified Website v1 (26 Oct 2026)

## User intent and UX rules
- ONE start page, not disconnected MD/LINE/MM tabs. Read the story as **Overview → MD task/owner/deadline → LINE reports and source evidence → explicit human closure**.
- **MM** is a separate workstream with separate KPI and source Excel. Never combine MD and MM counts.
- The home page is a navigation and source-trust surface, not a duplicate of the Pivot or the detailed LINE audit.
- Dense workflow/5-layer network is preserved as a technical reference, not the first thing everyone sees.
- Every page shares the same accessible mobile-responsive top navigator. Private NB users stay in the same origin.
- Opening any page is READ-ONLY and does not automatically rescan CB workbooks, SharePoint, Planner, LINE or Cloudflare D1.
- Public GitHub source must contain no private pivot rows, SO/client names, LINE text/media, user IDs, or credentials.

## Canonical pages
| Purpose | Public path | NB localhost path |
| --- | --- | --- |
| Workspace landing | `/md-follow-up/` | `http://127.0.0.1:8766/workspace.html` |
| MD task ownership, deadline and drilldown | `/md-follow-up/pivot.html` | `http://127.0.0.1:8766/pivot.html` |
| Innovation LINE evidence & MD progress | `/md-follow-up/line-audit.html#md-progress` | `http://127.0.0.1:8766/line-audit.html#md-progress` |
| MM meeting follow-up (SEPARATE) | `/md-follow-up/mm.html` | `http://127.0.0.1:8766/mm.html` |
| Technical diagram and controls | `/md-follow-up/architecture.html` | Public technical reference |
| Source quality | `/md-follow-up/#source-status` | `http://127.0.0.1:8766/workspace.html#source-status` |

## Changed site components
- `index.html`: replaced stale 19-Oct technical-first home with task-first hub. Technology controls are behind a technical-details section.
- `architecture.html`: intact original five-layer node-zoom technical visualization moved here. Do not delete or silently reintroduce outdated counts as live numbers on the new home.
- `navigation.css` and `navigation.js`: responsive sticky global navigation. Private `workspace.html` maps to the same Overview active state; mobile nav scrolls horizontally INSIDE header, not the whole document. The global menu supports Escape/click-away closing.
- `workspace.css` and `workspace.js`: responsive hub and strictly read-only `GET /source-audit.json`; no external scan. On public GitHub if Chrome blocks localhost private-network requests, show “ยังยืนยันไม่ได้” and link to local/private pivot — never fake fresh status.
- `pivot.html`: simplified contextual navigation; existing Pivot JS and data logic untouched. Keeps source receipts and HR owner/Planner Notes correction.
- `line-audit.html`: main MD progress digest appears before the raw-source UI; explicit 360° CB and evidence is still available. Raw LINE timeline/source-import panels are under expandable “รายละเอียดเพิ่มเติม”; no IDs deleted and data collectors unchanged.
- `mm.html`: maintains separate private MM snapshot workflow, now with shared header and one contextual link.
- `publish-pages.yml`: changed paths include new workspace, architecture and navigation assets and root Portal index.

## Private NB deployment
The deployed Authorized NB environment was online and tested as PTKCMT-R-NB02.
Static approved `workspace.html/css/js`, `navigation.js/css`, `mm.html`, and `line-audit.html` were copied into `%LOCALAPPDATA%\UAIOS\MD-FollowUp-Private`. Do not copy private JSON to GitHub.
- Installer code in `private-tools/enable_md_workspace_nav.py` adds only two static nav asset routes, and inserts shared nav into the existing local Pivot without replacing its Source Audit status.
- `private-tools/enable_workspace_home.py` allows only three extra STATIC workspace resources. Existing Python server remains bound to localhost `127.0.0.1:8766`; JSON Origin check, task-scanning POST protections and source polling remain unchanged.
- Running the installer does NOT rescan upstream sources. Only restart `MD-FollowUp-Private-Viewer` after static-route changes.

## Tested, not assumed
- Live Edge desktop+mobile CDP layout audit at viewport widths **1366 and 390 px**: home has 3 columns desktop/1 column mobile, nav once, no document-wide horizontal overflow. NB Pivot/LINE/MM also **0 horizontal overflow** at 390 px.
- Edge browser DOM smoke visited 8 public and private routes: main navigator exactly once on all. LINE advanced panels are collapsed by default, retaining raw source under one details group.
- Local private workspace HTTP 200 for all static resources and read-only source receipt. Browser shows Overview active, 3 clear paths and **12/13 recent** source checks at validation, explicitly identifying the stale source instead of claiming 100%.
- The 13-source indicator is LOCAL receipt freshness, not proof that all upstream SharePoint files or LINE were scanned at the same instant.
- Portal MD card was renamed **MD Control Workspace**. MM remains a different Portal card.
- The GitHub Pages workflow was manually dispatched for the full release on 26 Oct 2026; verify latest run succeeded before claiming publication.

## Recovery
1. Check repo main branch static assets above.
2. Use versioned private installers and copy exactly approved static files to NB private directory; never replace private operational JSON or its scheduled collectors.
3. Restart only scheduled task `MD-FollowUp-Private-Viewer`.
4. Verify `http://127.0.0.1:8766/workspace.html`, `/pivot.html`, `/line-audit.html#md-progress`, `/mm.html` plus `/source-audit.json`; no need to repeat D1/backfill scans for a UI change.
5. Confirm source status is honest and no business data appears in public HTML source.
