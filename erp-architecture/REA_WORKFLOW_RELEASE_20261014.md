# REA Interactive Workflow — Web Release (14 October 2026)

## User-visible
- [Full interactive workflow](workflow.html): 22 clickable nodes in 6 color-coded architecture layers, 28 directional relationships, canvas pan/zoom/reset/fit/fullscreen and search.
- **ERP screen/report references inside each business node**: actual P Object/Form/Version, R Report/UBE/Version, observed menu title and a confidence/evidence status. Not fabricated report recommendations.
- Under the diagram: five reference cards corresponding to Sales, Engineering/Supply, Production/Cutting, QC/Warehouse and Delivery/Finance.
- Node side panel shows full source details and opens the relevant filtered [Evidence Explorer](evidence.html).
- [REA Deep Dive](rea.html) and [ERP Architecture home](index.html) embed the diagram interactively and link to the dedicated full-width view.
- [Scan Audit](scan-audit.html), [Executive Dashboard](executive-dashboard.html), [Mind Map](mindmap.html), [Evidence Explorer](evidence.html) now link Workflow.

## Evidence and quality
- JSON [workflow-map-data.json](workflow-map-data.json) built from private Source of Truth JDE menu/object crosswalk and report lookup. 26 references are matched to authorized observed metadata (22 nodes / 28 edges).
- Developer QA: 55/55 static provenance/reference/layout checks PASS; Chrome/Playwright local smoke tests 25/25 PASS. Browser test confirms zoom/pan, drawer, screen/form/version, report risk, deep linking and mobile no-overflow.
- Approval not implied: JDE UBE Update Y/N and Processing Options, physical table mappings, OTD policy and read-only Data Pool remain NOT_CERTIFIED.

## Privacy
This page exposes public-safe technical metadata of P/R Object + visible names/versions from the existing approved public Evidence Explorer; no raw ERP business transactions, credentials, tokens or direct Oracle access.
