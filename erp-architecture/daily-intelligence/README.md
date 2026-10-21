# Practika Daily ERP Intelligence — 15 Dimensions

**URL**: https://popvarachat.github.io/erp-architecture/daily-intelligence/

## Per-node Pivot (21 Oct 2026)

- Public: https://popvarachat.github.io/erp-architecture/daily-intelligence/pivot.html?node=wip
- Every one of the 15 Workflow node Inspector panels has an **open Pivot** link to its own `pivot.html?node=<id>` route.
- X-axis: due date for the selected node (year/month/day drill levels); Y-axis: where work is actually pending, when such evidence exists.
- Pivot cells are interactive and drill into supporting work rows; search, date filters, stage grouping and CSV download on NB private data.
- **Private NB WIP preview:** 2,383 distinct open Cuttings in the source dataset, 1,632 with WO finish due in 2026. Of those 2026 rows, 1,146 preliminarily assigned a stage and 486 require further Control Plan/Operation verification. Snapshot 2026-10-18; not whole-factory WIP.
- **Critical:** the WIP date is WO finish due, NOT a per-operation handoff deadline; stage classification NOT verified Current Operation and individual employee owner is unknown. Other 14 node pivots have source contracts and no fake work counts while due/owner joins remain unavailable.
- Local internal-only `private-pivot.json` has been explicitly gitignored; no WO/Item/Project rows in public data.
- Playwright acceptance: 15 node contracts publicly, 2026 pivot with local private data, 31 daily due columns, cell-click details, no JS exceptions.

## What is delivered

- Interactive zoomable, pannable curved-connector workflow with 15 clickable business dimensions; alternative 15-card grid, department filter, searchable source catalog and Inspector drill-down.
- Thai executive language, date selector, source-provenance links, per-dimension question, report/application, join grain and data-owner requirement.
- Data confidence indicators distinguish confirmed sample **source evidence** from certified **daily KPI**. Missing is **unknown**, never an invented 0.
- Period-specific totals appear only if approved, certified, complete data is loaded through the governed Data Pool. All 15 metrics currently **not certified**.
- Footer tells the user this is a public-safe evidence-coverage dashboard, **not** a live ERP extraction.
- Static JSON `daily-status.json` stores no SO/WO rows, supplier/item names, prices, GL journals, credentials, or raw ERP screenshots.

## Source of truth

Private repository: `popvarachat/practika-erp-architecture`.
Read-only JDE sample investigation: `docs/52_live_jde_landed_cost_receipt_cardex_verification_20261020.md`.
Registered ERP apps: `docs/02_application_map.md`.

## Data publication contract

Never publish raw ERP transactions to GitHub Pages. Every daily metric requires:
- `as_of`, `source`, `extracted_at`, authoritative business `grain`;
- total source `row_count`, pagination coverage, document reversals/backdating, validation `passed`;
- owner signoff; explicit `public_release_approved: true`;
- all quantitative and dimensional releases must be pre-approved under an appropriate data classification.

The `download data contract` feature generates a **blank PRIVATE template locally** in the user's browser, not a report upload. A read-only NB-side collector may produce private snapshots for later governed validation. Do not commit private snapshots into the public repo.

## Current coverage (20 Oct 2026)

- Sample receipt to Cardex and landed-cost rule configuration tested for three of 15 business dimensions (receipt, inventory, cost).
- Remaining dimensions are mapped to JDE applications where known; no complete date-scoped total is certified.
- Public visual treats “unavailable” as a data-coverage problem, not an operational zero.

## Public versus local URLs

- Public dashboard: `/erp-architecture/daily-intelligence/`.
- NB local preview: `http://127.0.0.1:8767/erp-architecture/daily-intelligence/` when the local preview server is running.
- NB Playwright JDE and its Chrome session are separate; GitHub Pages cannot directly query internal JDE, and does not attempt to.

## QA

- JS parse and JSON contract validation.
- Playwright browser UI checked at 1536x960; 15 SVG nodes, 15 grid items, drill-down, domain filters, search and date change verified.
- No production ERP writes, UBE runs or GL postings are part of the dashboard.