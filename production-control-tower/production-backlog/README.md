# Production backlog report — MCP–AIS-first interface

Public route: `/production-control-tower/production-backlog/`

## What it does
Shows a **clearly labeled, historic source observation** of Cutting candidates grouped into Thai production departments. The source is the verified anonymised `../production-daily/data/historical-status-audit.json` aggregate from read-only JDE P594801C collection dated 18 October 2026; filters = Cutting created 2026, Cutting statuses 40/45/60/70, WO statuses 10/30/40.

At release: 1,630 candidate Cuttings, 395 uniquely classifiable by historical Access Type/Status Reference (ผลิต1 74, ผลิต2 48, ผลิต3 2, ผลิต5 271), 1,235 unknown. ผลิต4 = **null**, not zero. These are NOT certified physically located/open factory WIP; no certified overdue numbers. Counts are distinct Cutting, not WO or SO. The 160-Cutting legacy cohort is separate and not additive.

All data in public JSON is strictly aggregated; no Cutting/WO/SO/customer/employee IDs.

## Source governance
- `build_backlog.js` builds `data/backlog-focus.json` from the previously published audited summary, reconciling candidate and department/WO counts.
- `app.js` renders desktop/mobile, cards, selectable production lines, a source freshness banner, table, WO code distribution and precise limitations. Refresh only fetches static JSON.
- `backlog.test.js` validates public privacy, source, counts, non-inferred zeros and UI rendering.
- **No live AIS data is available yet.** The published UI explicitly says AIS permission pending. It cannot honestly show ERP live until ERP Admin approves the AIS endpoint/service role/source views and the collector re-verifies operation-level status.
- To turn live, produce a **new, certified aggregate contract from MCP–AIS output** (not blindly relabel historical sources). Require WO closure/9D, current ControlPlan/Work Center, full source row count, consistent timestamp, last success time, and ERP business owner acceptance before displaying `live`, `WIP` or `overdue`. Do not publish raw JDE rows.

Related approval gate: https://github.com/popvarachat/practika-erp-architecture/issues/8

## Rebuild and test
```powershell
cd production-control-tower/production-backlog
node build_backlog.js
node --test backlog.test.js
```
