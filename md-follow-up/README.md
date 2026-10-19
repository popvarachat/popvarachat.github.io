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


## Private row-level drilldown (NB only)
Click any Source Health card on public GitHub Pages for aggregate statuses. The link to
`http://127.0.0.1:8766/?source=cb` opens detailed work items only when the viewer is
running on the **same authorized NB**. The server binds 127.0.0.1, serves only
`index.html` and `records.json`, and never exposes original source files or exports.
The NB-only `build_private_details.py` creates a refreshed `records.json` under
`%LOCALAPPDATA%/UAIOS/MD-FollowUp-Private` on every regular W-drive batch.
Cloud Planner detail export uses the authenticated connector's last verified local
snapshot and does not have a live private connector yet. Innovation detail derives
from the last downloaded authorized workbook and may lag the live SharePoint workbook.
For ICS/ICF/ICE, work date is not certified as Due Date; overdue is not inferred.
The private viewer runs using `serve_private.py` on authorized NB only.
Do not add private JSON or local source paths to public GitHub.

## Stage-Due Pivot Report (NB Private Viewer)
- Public source cards link to `http://127.0.0.1:8766/pivot.html` on the authorized NB.
- Private pivot stores about 2,300 gate/stage rows under `%LOCALAPPDATA%/UAIOS/MD-FollowUp-Private/pivot.json`, **never on GitHub Pages**.
- Views: due-date schedule, stage, department, owner; filter source, status, department, search; stage timeline of original work.
- Manual W batch and hourly Task Scheduler now refresh `records.json` **and** `pivot.json`. Private viewer runs via logon task `MD-FollowUp-Private-Viewer` on loopback port 8766.
- CB date = planned transfer only; no claim the item actually missed its transfer without evidence. Planner date = task due, not per-stage due.
- ICS/ICF/ICE date column = an event/completion date, **not** a verified stage due; displayed as No Stage Due; do not falsely mark overdue.
- Innovation stage due dates are based on an authenticated *local downloaded workbook snapshot*, which can be older than the SharePoint cloud total (98). Closed-sheet projects are closed by **sheet classification only**, not certified final outcome.
- Department resolution is based only on explicit department tokens in work assignment or CB status (e.g. P3/P5). Person-only owners are shown as "department not verified"; never guess the team.
- The "current stage" is an algorithmic candidate (first active or first unknown gate), not a certified bottleneck when source status is blank. Stage rows across sources are not yet deduplicated.
- Localhost means the viewer is accessible only via browser running **on the NB**. Other devices require an authenticated intranet service before private records can be remotely viewed.


## MD hierarchical Pivot Table (spreadsheet-style)
- Open NB localhost `http://127.0.0.1:8766/pivot.html` using the public source
  panel's 'Pivot Table' link, available **only from the NB's own browser**.
- Hierarchical rows: **year > month > due date > project/work**, plus explicit
  'No Confirmed Stage Due' rows; collapsible by level.
- Change pivot columns between **department / owner / stage / source**.
  Default measure: distinct *source-local* work keys, with Stage row option.
  Rows/cells can be clicked to see records and step-by-step work progression.
- Year and date represent the task's own scheduled deadline; CB planned transfer
  is not a certified late delivery; ICS/ICF/ICE lack certified Stage Due and are
  classified as unknown instead of falsely overdue.
- Local `pivot.json` is refreshed with each NB batch, data and owners never
  committed to public git or GitHub Pages. Legacy stage-list remains accessible
  as `/stage-list.html`.


## Person-in-charge (default Pivot column)
- Grouping uses owner_person (not department). Columns include all verified
  people and a visible 'no individual owner verified' exception column.
- The owner's raw text is kept for audit inside the NB-only pivot.json.
  Team labels, role codes (RDS, ENG, P5), and placeholders (X) are not individuals.
- Jointly named owners remain a shared-owner group until an accountable primary
  person is certified. Do not silently assign one of them.
- Planner user IDs may be mapped to display names only after tenant-directory
  verification. The owner directory lives at
  %LOCALAPPDATA%/UAIOS/MD-FollowUp-Private/verified-person-config.json
  on authorized NB only, excluded from GitHub.
- The pivot generator refuses a missing local owner directory rather than
  reporting all names unknown with false confidence. Do not publish named
  work items or personal identities to GitHub Pages.
- Both NB Scheduled Tasks support running on battery, preventing Queued
  start failures when NB is unplugged.


## Public Pivot UI on GitHub
- md-follow-up/pivot.html hosts the full public-safe Pivot UI, CSS and JS.
- source-health.json is the only data read automatically by the static page.
- Use Export JSON on NB Private Viewer and choose the downloaded private JSON
  in the Github-hosted Pivot page. Parsing remains in the browser, no upload.
- This is manual local-data import, NOT cross-device automatic sync.
- Do not commit pivot.json or any personal / work-order data to public Git.
