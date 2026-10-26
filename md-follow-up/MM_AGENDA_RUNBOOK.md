# MM Agenda Follow-up — Separate from MD

## Ownership and data boundaries
- Workstream: **MM**, not MD. This does not augment/replace the MD tracking list or MD KPIs.
- Source of Truth: authorized SharePoint workbook **วาระติดตาม MM ปี 2569 .xlsx** on the meeting owner’s OneDrive (not copied to the public repository).
- Public static UI source: `md-follow-up/mm.html`. Private same-origin viewer URL: `http://127.0.0.1:8766/mm.html`.
- Private JSON on authorized NB: `%LOCALAPPDATA%\UAIOS\MD-FollowUp-Private\mm-agenda.json`.
- Original authorized connector extraction: `mm-sharepoint-extract.csv` in the same private directory; source metadata in `mm-sharepoint-source.json`.
- Parser: `md-follow-up/private-tools/build_mm_agenda.py`. Safe read-only viewer patch: `private-tools/enable_mm_private_viewer.py`; verification: `private-tools/smoke_mm_agenda.py`.
- Public GitHub Pages contains **only** HTML/CSS/JavaScript and parser scripts. Do not commit the MM source workbook, extraction, row-level agenda, people or private JSON.

## Source validation (26 October 2026)
- Source workbook obtained through the **Microsoft SharePoint connected file fetch**; source last modified `2026-10-26T03:38:25Z`.
- Workbook contains 9 meeting tabs for 2026 (MM 1 through MM 9), an explicit separate `คงค้าง` tab, and an unrelated `Sheet2` tab.
- Parsed 106 action-bearing meeting rows; 11 in the latest MM-9 tab (meeting on 15 October 2026) plus 1 backlog entry separate from monthly totals.
- The MM-3 (25 March 2026) tab stores its action columns in `A:J`, whereas other meeting sheets use `H:Q`; parser accounts for both layouts and fails closed if the tab structure changes.
- Each MM record has distinct id `MM-2026-<meeting>-<agenda>`, owner, department, requester, action, progress, status, due-date raw/parsed-quality, and numbered sub-actions when present.
- Source Excel `ดำเนินการ` prose is **not automatically certified completion**; no cross-month dedup without verified identity. MM backlog tab is separate.
- Browser smoke on NB using local Edge PASS: MM latest 11, history 106, meeting tabs 9, backlog 1.
- Main Portal manually pinned **MM Agenda Follow-up** as a *distinct* application card. GitHub Pages workflow deploy validated.

## Refresh and operational limitations
- **Currently a connected SharePoint snapshot, not live auto-sync.** When authenticated ChatGPT Microsoft SharePoint connector refreshes the workbook, update the authorized NB-only `mm-sharepoint-extract.csv` and metadata, then run `python -X utf8 build_mm_agenda.py`. The parser compares SHA-256, preserving existing output without rewriting it on unchanged content.
- **Root cause confirmed 26 Oct 2026:** the SharePoint connector and NB Azure CLI both operate as the SAME user; the user CAN view this workbook and the SharePoint connector fetches it successfully. The Azure CLI app access token lacks the `Files.Read` / `Files.Read.All` delegated permission, so its Graph `shares` call returns `403 accessDenied`. This is an APPLICATION SCOPE issue, NOT evidence the user lacks SharePoint file access. Do not ask the user to request a new SharePoint share. The NB also has a same-named local OneDrive file from **27 Feb 2026** under a different location; it is outdated and **must not replace** the SharePoint snapshot modified on 26 Oct 2026. For unattended automatic source refresh, use an authorized delegated app with approved file-read scopes, or a signed-in OneDrive shortcut/sync pointing to this EXACT source workbook, or the connected SharePoint fetch bridge with a verifiable schedule. Never silently substitute the stale same-name file. The private viewer and connector-sourced MM snapshot are already readable today.
- Browser opening reads existing local snapshot only; does not trigger scanning SharePoint or run costly API calls.
- MM remains distinct from MD and existing LINE Innovation Digital Twin.

## URLs
- Same-origin private: `http://127.0.0.1:8766/mm.html`
- Public shell: `https://popvarachat.github.io/md-follow-up/mm.html`
- Public Portal: `https://popvarachat.github.io/`

## Manual verification
```powershell
python -X utf8 "$HOME\Documents\MD-Control-Collector\md-follow-up\build_mm_agenda.py"
python -X utf8 "$HOME\Documents\MD-Control-Collector\md-follow-up\smoke_mm_agenda.py"
```
