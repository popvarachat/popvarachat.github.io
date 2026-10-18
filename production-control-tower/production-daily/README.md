# Production daily aggregate snapshot

Run with Node 24 (built-in modules only), from this directory:

```
node --test report.test.js
node build_report.js
node build_report.js --allow-partial
```

Default build reads only existing local `collector/runtime/raw/daily-census-20261018` exports and the validated Access reference. No ERP request, collection, deployment or refresh service runs. The prior fixed 160 cohort is never joined or added. Classification uses Type/Status only when the reference gives one department across all routing variants. Unknown assignments remain explicit.

Default publication requires all four lifecycle partitions 40/45/60/70, contiguous zero-based chunk numbers, valid observation timestamps, pagination ranges matching row counts, a terminal complete chunk with no next page, matching summary distinct counts and no conflicting Cutting versions or close-date/status contradictions. Failure exits nonzero and preserves existing outputs. Repeated identical rows are deduplicated; conflicting versions are quarantined and prevent publication. Order dates use Bangkok build date for overdue calculations; this is not historical flow.

The public `data/report.json` contains only aggregate counts, fixed explanatory metadata, build/source observation timestamps and partition coverage. No row identities, products, customers, raw rows or individual order dates are emitted. The UI provides no row drilldown. Counts describe observed lifecycle candidates, not a certified factory-wide physical WIP census. Incoming/outgoing, hold, subcontract and responsibility remain unknown.

Private row details are written first, only to `%USERPROFILE%/Documents/Practika-ERP-Architecture/collector/runtime/normalized/production-daily-details.json`. No configurable path or public fallback is supported. The directory must already exist and must not resolve through a redirected path. This session cannot write outside the authorized workspace; the private artifact must be generated later with appropriate filesystem access after validated complete inputs are available.

`--allow-partial` writes **only aggregate** `.local-preview/report.json`, with `preview_only: true` and `scope.complete: false`, even when inputs pass. It never changes public or private outputs automatically. A separately authorized manual publication of this clearly flagged provisional aggregate may be made for coverage monitoring only; it must never be presented as certified factory WIP or used for operational decisions. The checked-in public placeholder contains no observations and is explicitly incomplete.

Refresh safety: retain the last accepted snapshot on build failure, review source timestamps separately from build time, validate all local exports and rerun tests before replacing outputs. Publish only index.html, app.js, styles.css and data/report.json after a separate authorized review; do not serve the entire work directory. No deployment is included here.

Remaining risks: source pages were collected over time rather than in a transactional snapshot; matching pagination metadata cannot prove upstream completeness or detect silently omitted records. Current exports have missing partition summaries and inconsistent pagination labels. Reference routing may be stale; no current ControlPlan evidence is joined. Ambiguous or nonproduction routing remains unknown. Overdue is based on ERP finish due dates, not verified causes or responsibility. Small aggregate groups may still permit inference when combined with outside information. A failed refresh leaves an older snapshot, so consumers must inspect source observation timestamps. Private/public file replacement is ordered but not a two-file transaction.
