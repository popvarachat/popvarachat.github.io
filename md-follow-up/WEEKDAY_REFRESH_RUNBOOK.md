# MD Weekday Morning Refresh — Source Truth & Permissions

**Implemented 26 Oct 2026.** Bangkok timezone. All timestamps in machine receipts are ISO 8601 UTC and UI renders Thailand time.

## Operating schedule and sources
- **08:20 Mon–Fri:** cloud ChatGPT automation checks exactly the two connected SharePoint source files using the *existing authorized Microsoft SharePoint connector*. It may update a safe metadata-only `sharepoint-morning-status.json` on GitHub and reports any failure. This was scheduled but has not yet completed its first recurring run.
- **08:40 Mon–Fri:** Windows Task `MD-Weekday-Morning-Refresh` (PTKCMT-R-NB02, current user's interactive logon) executes `scripts/md_morning_refresh.py`. It reuses same-morning W/CB, Planner and D1 receipts, only calling a source reader if needed. It never wipes last-good snapshots on a failed read.
- **09:10 Mon–Fri:** independent ChatGPT automation summarizes metadata available in public-safe cloud status. If the NB was off/outside LAN and there is no receipt dated today, explicitly reports **no confirmed result today**, with each source's last successful date/time.
- Saturday and Sunday excluded; **Thai holidays not yet excluded**.
- There is no claim that a scheduled task runs while the NB is powered off; Windows Task Scheduler uses Interactive logon with StartWhenAvailable if returning online.
- No LINE replies, no D1 writes, no public row-level detail and no AI calls on website page-load.

## Exact 13-source inventory
| Source key | Source | Verification |
| --- | --- | --- |
| cb | W: Check Board master | File signature/read-only workbook |
| ics | W: ICS | File signature/read-only workbook |
| icf | W: ICF | File signature/read-only workbook |
| ice | W: ICE | File signature/read-only workbook |
| cb_edu | S: CB EDU | File signature/read-only workbook |
| cb_icf | S: CB ICF | File signature/read-only workbook |
| cb_ics | S: CB ICS | File signature/read-only workbook |
| cb_new | S: CB New Product | File signature/read-only workbook |
| cb_abdul | S: CB Abdul | File signature/read-only workbook |
| planner | Microsoft Planner / To Do | Graph read-only via NB authorized app |
| innovation_line | LINE สมาคมนักนวัตกรรม | Cloudflare D1 verified-room delta |
| innovation | SharePoint `ตารางรวมงานนวัตกรรม.xlsx` | Connected SharePoint read works; **MD private project dashboard snapshot not auto-synced** |
| mm | SharePoint `วาระติดตาม MM ปี 2569  .xlsx` | Connected SharePoint read works; **MM private data not auto-synced** |

## Validation at 26 Oct 2026
Cloud-safe morning metadata: **11/13** sources verified in the final test. Nine W/S workbooks last checked from the NB at around **12:35 ICT**; Planner around **14:34 ICT**; LINE verified-room collector around **16:51 ICT**. This one-time late-afternoon verification **is not a completed before-09:00 run**. First normal weekday morning execution is 27 Oct at 08:40 ICT.

SharePoint:
- Innovation Project Register exact `ตารางรวมงานนวัตกรรม.xlsx` was modified on **22 Oct 2026 14:57 ICT**. Last successful integration into the older MD dashboard was **19 Oct 2026 15:09 ICT**. A connector read of the updated source on 26 Oct **does not itself rebuild the private MD Pivot**.
- MM Agenda exact `วาระติดตาม MM ปี 2569  .xlsx` was modified on **26 Oct 2026 10:38 ICT**. NB private MM snapshot was built **26 Oct around 10:58 ICT**. Cloud connector independently read the current source.
- Public `sharepoint-morning-status.json` shows verified source modification timestamps separately from private snapshot timestamps. Do not double count “read”, “modified”, “integrated into NB”, or “data freshness”.

## Authorization result
The **signed-in user's SharePoint access is valid**: ChatGPT Microsoft SharePoint connector read both source workbooks. Do not keep re-requesting file sharing.
The NB Azure CLI (`az` Microsoft first-party client) delegated Graph token does not include `Files.Read`/`Files.Read.All`. Trying to request `https://graph.microsoft.com/Files.Read.All` gave **AADSTS65002** (first-party app preauthorization required). User approval in ChatGPT does not alter Microsoft Entra OAuth application scopes. For unattended local SharePoint sync use:
1. the already-connected SharePoint cloud automation for source verification; or
2. a tenant-approved dedicated Graph app with the least access necessary, or a OneDrive sync shortcut to the exact source files (not same-name stale local copies).
Do **not** claim that the OAuth scope has been granted or auto-sync of private Excel has passed. This blocker must stay visible until technical verification succeeds.

## Offline-safe UI and files
- GitHub public **source metadata only**: `md-follow-up/morning-refresh-status.json`, `md-follow-up/sharepoint-morning-status.json`.
- Private authorized NB: `%LOCALAPPDATA%\UAIOS\MD-FollowUp-Private\morning-refresh-status.json`; no company rows or individuals in public status.
- Page `md-follow-up/index.html` shows last confirmed receipt and all 13 sources, with two distinct columns: last successful verification and source modification. If the latest receipt is not for today's working day, it displays **no result received today** even if the NB is unavailable.
- A refresh on the website only rereads the small cached receipt; no source rescanning or new API cost.
- Local Private Viewer CSP allows `connect-src 'self' https://popvarachat.github.io` for GET of public status JSON, while preserving localhost binding, read-only source boundary and existing POST gate.

## Tests
- Task Scheduler `MD-Weekday-Morning-Refresh` installed, next run **27 Oct 2026 08:40 ICT**.
- Manual one-time verification `md_morning_refresh.py --force`: **11/13**, GitHub metadata publish succeeded. The two remaining sources have distinct SharePoint connector auditing, not NB end-to-end integration.
- HTTP 200 on local workspace and its CSS/JS/source-audit files. Edge headless browser successfully rendered `11/13` and all 13 rows after whitelisting the exact public GitHub status URL in local CSP.

## Recovery
- Canonical Python: `popvarachat/practika-movement-intelligence/scripts/md_morning_refresh.py`
- Canonical installer: `scripts/install_md_morning_refresh.ps1`; workdir NB `C:\Users\varachat.num\Documents\MD-Control-Collector\md-follow-up`.
- Verify task and last result via Windows Task Scheduler; run Python manually with `--dry-run` without remote source calls.
- Do not delete `morning-refresh-status.json` when an error occurs. No heartbeat today means unknown/offline, **not** success or loss of historical data.
