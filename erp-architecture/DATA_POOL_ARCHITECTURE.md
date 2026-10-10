# Executive Dashboard — Data Pool Contract

## Current status (2026-10-10)
- UI: static read-only dashboard that fetches `data-pool.json`.
- Catalog: 11 ERP Report families; initial 6 KPI definitions.
- Data connectivity: **NOT_CONNECTED**; public metrics show "—" (never fabricated zero).
- Data safety: public repository contains **metadata only**; no raw SO/WO, suppliers, clients, costs, prices, journals, credentials, or internal JDE version settings.
- No live JDE data was extracted and no UBE was executed.

## Source-of-truth boundary
Private ERP evidence lives in `popvarachat/practika-erp-architecture`. This public dashboard is for approved, sanitized executive aggregate data only.

## Intended data flow
JDE Inquiry / certified report export / approved API
→ private staging immutable source batches (source ID, extract timestamp, hash)
→ validation & quarantine (grain, null-vs-zero, calendar, cross-source consistency, freshness)
→ certified aggregation, review and Public Release Approval
→ `data-pool.json` (public-safe KPI aggregates only)
→ Executive Dashboard

## Schema: datasets
For each report family key, e.g. `production`:
```json
{
  "status": "CERTIFIED",
  "source_report": "Approved source report name",
  "extracted_at": "2026-10-10T10:00:00+07:00",
  "as_of": "2026-10-10",
  "grain": "SO line / WO / Cutting",
  "row_count": 0,
  "metrics": {"open_jobs": 0},
  "records": [],
  "quality": {"passed": true},
  "public_release_approved": true
}
```
**The sample above is a schema illustration, not actual business data.** Publishing a dataset requires review by the business owner and explicit approval; leave `datasets` empty otherwise. `records` must remain empty on the public web unless individually reviewed as safe.

## Validation rules
1. Must be `CERTIFIED` and `quality.passed=true`.
2. Must be explicitly `public_release_approved=true`.
3. Metrics are finite numbers, even when zero.
4. Dataset has source, extracted timestamp and nonnegative integer row count.
5. Do not combine mismatched grains; do not interpret missing as 0.
6. As-of, extraction freshness, promise/OTD policy and capacity standards must remain explicit.
7. Never publish private ERP screenshots or raw operational exceptions in GitHub Pages.

## Implementation gates
1. ERP Admin selects supported source (AIS/Orchestrator or governed read-only views or approved exports).
2. Technical owner certifies versions/UBE Update Y/N, keys, timestamps and source lineage.
3. Build private scheduled collector/data quality pipeline with service account.
4. Owner reviews aggregation policy and public publication permission; consider private authenticated dashboard for sensitive executive data.
5. Add tests for freshness, reconciliation, sample counts and row-level drilldown in private layer.
6. Deploy sanitized aggregates only when appropriate; this static public dashboard is **not a production data warehouse**.

## Architecture rule
Report/Inquiry is source evidence. The Data Pool is the governed semantic layer. Dashboard is the decision surface. HTML is not a data store.
