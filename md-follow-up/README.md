# MD Follow-up Intelligence (public-safe)

A static, read-only, GitHub Pages executive visualization of six workflow owners plus one central exception/closure layer.

## What it is

- Network-shaped clickable workflow: Executive tasks, Product development (ICS/ICF/ICE), Innovation projects, Check Board, QP-40/PPI, Commercial/SCD.
- Verified Oct 19 2026 *snapshot* of counts and evidence limitations, not a live feed.
- Seven anonymized management concerns; no concern is labeled fully closed without end-to-end proof.
- Clickable source-detail cards, MD concern audit, data-quality ledger, responsive curves, print layout.

## Public-safe rules

No real customer names, personal names, internal order IDs, quotations, LINE contents, credentials, or private SharePoint / on-prem network paths. Never host non-anonymized source data on public GitHub Pages. Changes to the live systems need explicit separate authorization and a protected backend.

## Provenance and counting

- Planner 34 tasks, 27 open, 19 overdue among open, 31 without Planner assignment; Microsoft To Do account view 10 tasks. Different scopes.
- CB V13 Excel 88 entries versus PowerPoint 66, requiring reconciliation; 38 in-plan entries dated before review need transfer proof.
- Innovation SharePoint online workbook downloaded read-only Oct 19: dashboard 98 total / 12 open / 86 closed; 22 currently-listed + 68 closed detectable headings (not yet reconciled); 14 steps marked active, 13 without a row-level named owner.
- Product development gates: ICS 850 (284 done / 77 active / 489 blank), ICF 564 (196 / 57 / 311), ICE 216 (101 / 19 / 96). Counts are gate rows, not distinct orders. 54/56 same-stream CB order IDs matched, not completion certification.
- QP-40 gate rows 164 across ICS/ICF/ICE, not distinct products; SCD source register not certified.
- Seven MD concerns: six partly answered, one with no verified outcome, zero verified closed. Anonymous public classifications only.

No automatic refresh, writeback, live API, or background automation is implemented here. The source of truth remains in company systems.

## Validation

Run `node --check app.js`; browse `/md-follow-up/`; verify node selection, MD concerns expansion, responsive reflow, and portal card. All public-bound counts and notes should be manually checked against the Oct 19 audit on each release.


## Layered Architecture Flow v2 — 19 October 2026

- Replaced six-card radial diagram with five horizontal functional layers: Intake, Control Plane, Six Workstreams, Quality / Exceptions, and Management Decisions.
- 25 clickable nodes and 36 directed curved connectors, showing inputs, outputs, and control/evidence gaps.
- Drag to pan, wheel or +/- to zoom, FIT to restore; preserves detailed six-stream panels, seven concerns, and the evidence ledger.
- Public-safe static design only: no live integration, automatic task updates, or private evidence hosting.


## Local source refresh — auto and manual batch
Public GitHub Pages **cannot access W:\ network drives, protected SharePoint files, or a logged-in Planner account directly**. The local collector is the trust boundary; only approved aggregate counts and source freshness metadata go to `source-health.json`. Confidential rows, user assignments, quotations and source paths never go to GitHub.
- Install Python `openpyxl` on the authorized read-only collector host.
- Copy `refresh.config.example.json` to `refresh.config.json` locally, then set actual accessible paths. The local config and audit logs are excluded from Git. Do not commit them.
- **Manual batch:** `py -3 md-follow-up/refresh_sources.py --config md-follow-up/refresh.config.json --mode manual`.
- **Manual batch with publish:** add `--publish`. This is a public *aggregate metadata* upload, not an upload of source Excel or internal identities.
- **Automatic refresh:** on an authorized Windows host, run `powershell -File md-follow-up/scheduler.ps1 -Action Install -EveryMinutes 60 -Publish`; this script refuses installation if no configured source is currently readable. Remove with `-Action Remove`.
- For SharePoint use a **separately authorized read-only mirrored/synced local file** and ensure the file is refreshed before running the batch. The current collector does not implement Graph, Planner or SharePoint authentication.
- If source missing/broken, preserve last-good counts with explicit `stale` status; no fake success. The public page refresh button reloads published source-health only; it does not send requests to PCs.
- Do not claim automatic update active before installing and observing a successful run on a machine that actually sees the shares.
