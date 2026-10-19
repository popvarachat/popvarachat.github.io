# Production backlog report — MCP–AIS-first interface

Public route: `/production-control-tower/production-backlog/`

## What it does
Shows a **clearly labeled, historic source observation** of Cutting candidates grouped into Thai production departments. The source is the verified anonymised `../production-daily/data/historical-status-audit.json` aggregate from read-only JDE P594801C collection dated 18 October 2026; filters = Cutting created 2026, Cutting statuses 40/45/60/70, WO statuses 10/30/40.

At release: 1,630 candidate Cuttings, 395 uniquely classifiable by historical Access Type/Status Reference (ผลิต1 74, ผลิต2 48, ผลิต3 2, ผลิต5 271), 1,235 unknown. ผลิต4 = **null**, not zero. These are NOT certified physically located/open factory WIP; no certified overdue numbers. Counts are distinct Cutting, not WO or SO. The 160-Cutting legacy cohort is separate and not additive.

The page also independently presents the **fixed 160-Cutting ControlPlan-reviewed cohort** from `../adaptive-so-wo-timeentry/data/current-production.json` (156 reported open Cutting, 4 transferred excluded, ControlPlan coverage 100% within cohort, production4 131, production2 17, store 6, production1 1, production5 1). These are a DIFFERENT cohort from the 1,630 candidate group and MUST NOT BE ADDED. Status 99 within this cohort is flagged for reconciliation; physical location and whole-factory totals remain unverified.

All data in public JSON is strictly aggregated; no Cutting/WO/SO/customer/employee IDs.

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
