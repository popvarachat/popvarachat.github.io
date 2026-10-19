# Production backlog report — MCP–AIS-first interface

Public route: `/production-control-tower/production-backlog/`

## What it does
Shows a **clearly labeled, historic source observation** of Cutting candidates grouped into Thai production departments. The source is the verified anonymised `../production-daily/data/historical-status-audit.json` aggregate from read-only JDE P594801C collection dated 18 October 2026; filters = Cutting created 2026, Cutting statuses 40/45/60/70, WO statuses 10/30/40.

At release: 1,630 candidate Cuttings, 395 uniquely classifiable by historical Access Type/Status Reference (ผลิต1 74, ผลิต2 48, ผลิต3 2, ผลิต5 271), 1,235 unknown. ผลิต4 = **null**, not zero. These are NOT certified physically located/open factory WIP; no certified overdue numbers. Counts are distinct Cutting, not WO or SO. The 160-Cutting legacy cohort is separate and not additive.

The page also independently presents the **fixed 160-Cutting ControlPlan-reviewed cohort** from `../adaptive-so-wo-timeentry/data/current-production.json` (156 reported open Cutting, 4 transferred excluded, ControlPlan coverage 100% within cohort, production4 131, production2 17, store 6, production1 1, production5 1). These are a DIFFERENT cohort from the 1,630 candidate group and MUST NOT BE ADDED. Status 99 within this cohort is flagged for reconciliation; physical location and whole-factory totals remain unverified.

All data in public JSON is strictly aggregated; no Cutting/WO/SO/customer/employee IDs.

## Control Plan Mapping Correction — 19 October 2026

Root cause of the original **1,235 "unknown production line"** label was missing per-Cutting Control Plan collection, **not absence of line codes in ERP**. Reference `SO_WO_Cutting Rev2.accdb` provides `MapControlPlan`: L1→ผลิต1, L2→ผลิต2, L3→ผลิต3, L4→ผลิต4, L5/L6→ผลิต5, S1/S2→สโตร์.

Private read-only audit checked 20 ControlPlan batch files: 156 verified unique Cuttings, 1,061 operations (Move Complete 651, รอดำเนินการ 295, Partially Completed 113, Material Received 2). The 1,235 2026 high-priority Cutting queue had **0 Cutting ID matches** with this fixed 156-Cutting Control Plan cohort. Consequently, the web now calls the 1,235 **"รออ่าน Control Plan"** and shows mapping/coverage separately. It does NOT infer or fabricate production-line counts for them.

To attribute **current WIP at a station**, join Cutting Number to JDE P5511026/ZPTK0001 current Operations, select outstanding/partially completed operations using business-approved statuses and sequence, map Business Unit prefix L1–L6/S1–S2 to the production area, then reconcile WO status, transfers, due dates and unresolved/multiple-current-operation exceptions. Last control code / Max Oper Seq# alone does not establish actual current station.

This page keeps separate cohorts and anonymized aggregates only. Source detail and private 1,235 Cutting queue never belong in public GitHub.

## New: P5511026 read-only ControlPlan collection progress (19 Oct 2026)

A separate checked-scope bar is fetched from `data/controlplan-verification-progress.json`. Its private source is the checkpointed `collector/scripts/Collect-PriorityControlPlan2026.ps1` reading the exact 1,235 tier-1 Cutting IDs from approved JDE HTML (`P5511026/ZPTK0001`, Playwright Read-only; NOT AIS). No Cutting/WO IDs are copied to the public site. The bar separately displays checked, matching ControlPlan, empty verified query results and pending. The Business Unit prefixes L1–L6/S1/S2 are route-presence metadata, **NOT confirmed current factory WIP**; they may overlap between Cutting records. Source Operation Status strings remain under review because the ERP UI sometimes returns garbled Thai text. Only `certify-wip.js` signed full-scope AIS audit may upgrade the WIP report.

Collection is checkpointed and the NB Windows Task `RDC-ERP-PriorityControlPlan1235` executes the continuation, with a single-reader lock; do not launch a competing Playwright session on the same authenticated ERP page. The public JSON is a checkpoint snapshot, not auto-live from the browser.

## Source governance
- `build_backlog.js` builds `data/backlog-focus.json` from the previously published audited summary, reconciling candidate and department/WO counts.
- `app.js` renders desktop/mobile, cards, selectable production lines, a source freshness banner, table, WO code distribution and precise limitations. Refresh only fetches static JSON.
- `backlog.test.js` validates public privacy, source, counts, non-inferred zeros and UI rendering.
- **No live AIS data is available yet.** The published UI explicitly says AIS permission pending. It cannot honestly show ERP live until ERP Admin approves the AIS endpoint/service role/source views and the collector re-verifies operation-level status.
- To turn live, produce a **new, certified aggregate contract from MCP–AIS output** (not blindly relabel historical sources). Require WO closure/9D, current ControlPlan/Work Center, full source row count, consistent timestamp, last success time, and ERP business owner acceptance before displaying `live`, `WIP` or `overdue`. Do not publish raw JDE rows.

Related approval gate: https://github.com/popvarachat/practika-erp-architecture/issues/8

## Live/current WIP contract (19 Oct 2026)

The top panel consumes `data/live-status.json` with a strict fail-closed contract. Until AIS is Admin-approved and operation-level reconciled, it displays `PENDING_ADMIN_GATE` without fake WIP values. Once a **signed current-operation source** is certified by the private ERP module and an aggregate-only file is published, the panel shows five production lines, overdue and hold. Expired (>24 hours), conflicting, incomplete or non-AIS data are rejected in-browser. The historical 1,630 Cutting candidate group and separate Cutting40 cohort remain visibly **different scopes** and are never combined.

The only supported promotion path is private `practika-erp-architecture/collector/mcp/publish-certified-wip.js` (rechecks owner HMAC, full scope, unique Cutting and reconciliation). Public GitHub Pages must never contain any row-level JDE data. Test: `node --test backlog.test.js live-wip.test.js`.

## Rebuild and test
```powershell
cd production-control-tower/production-backlog
node build_backlog.js
node --test backlog.test.js
```
