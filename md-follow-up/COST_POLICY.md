# MD Follow-up — Free-First / Change-Only Cost Policy

Effective: 2026-10-22. This file is a policy and audit guide, not evidence that Cloudflare D1 or R2 has been provisioned. Do not activate paid Cloudflare services or subscriptions without explicit approval.

## Active optimizations (NB + GitHub)

| Component | Normal automatic behavior | Manual behavior |
|---|---|---|
| W: CB / ICS / ICF / ICE | Check four file mtime+size signatures hourly; skip full Excel parse and private Pivot rebuild if unchanged. Deep-verify at least once per 24 hours. | Source Scan button places a private force-deep marker and invokes the authorized Windows Scheduled Task. Always re-read original files. |
| Microsoft Planner / Todo | Graph task + checklist/details refresh every **4 hours** (6/day maximum, plus manual). | Scan Todo button forces a full Planner refresh. |
| GitHub Pages private-data connection | Local-only viewer check once when opening page; then at most every **30 minutes** while visible; no refresh from hidden tabs. | Buttons update immediately; no forced wait. |
| GitHub public metadata | W-source metadata published only when meaningful counts/status/file-signature change. Planner metadata published only after meaningful field change, or once per 24h heartbeat when unchanged. | Source file contents, employee names, order IDs and checklists must never be uploaded. |

### Safety/consistency requirements
- Hash / ETag / modified-time and source IDs are the foundation for change detection. Hourly W signature checks may miss an in-place modification that preserves both size and mtime; the forced 24-hour deep check plus manual scan mitigate this.
- Keep last verified snapshot when any collector fails; do not overwrite with zero or claim the scan succeeded.
- Detect new, removed, and modified rows. Reconcile total source counts and missing IDs before treating a snapshot as certified.
- Prevent parallel collector instances and duplicate cloud writes. Use one reconciliation batch per change and atomic replace for local snapshots.
- DO NOT call AI for ordinary scanning, comparisons, deduplication, publishing or status refresh. AI reasoning runs only when an authorized human asks for an investigation or a meaningful exception occurs.
- Use fixed, bounded retries (max three for external requests), a 429/503 Retry-After wait, then exponential backoff rather than tight retries.
- Keep evidence uploads opt-in and change-only (SHA-256 dedup); prefer compact structured metadata in D1 and compressed archives in R2.

## Cloudflare Free budgets — proposed, NOT deployed/enforced

Actual Cloudflare quotas are shared by every project in the account. MD's internal target must be far below the account quota. These project thresholds are initial conservative design targets:

| Metric | MD initial target | Free account allowance (verify before launch) |
|---|---:|---:|
| Workers requests | <= 1,000/day | 100,000/day |
| D1 rows read | <= 100,000/day | 5,000,000/day |
| D1 rows written | <= 2,000/day | 100,000/day |
| D1 storage | <= 250 MB | 5 GB total |
| R2 Standard storage | <= 1 GB-month | 10 GB-month/month |
| R2 Class A operations | <= 5,000/month | 1,000,000/month |
| R2 Class B operations | <= 50,000/month | 10,000,000/month |

R2 Free quota is for **Standard** storage, not Infrequent Access. R2 requires a storage subscription / checkout and can bill above included usage, so do not assume an automatic hard zero-cost stop. No R2 upgrade or payment setup is approved by this policy.

Before provisioning D1/R2, implement budget counters in an authenticated Worker with cost-breaker thresholds: alert at 50%, avoid optional operations at 70%, suspend non-essential operations at 85%; reserve essential reads and stop all optional R2 writes at threshold. Provide a billing dashboard and account-level budget/notifications. Fail closed, preserving local read-only view and last verified snapshots.

## GitHub Pages / Actions
- GitHub Pages is strictly the static UI and sanitized aggregate source health. Do not use it as an internal records database.
- Avoid a commit per scan; publish on actual change only. A minimum 24h heartbeat may be used for unmodified Planner health, not for every refresh.
- GitHub Pages has soft bandwidth and build limits, and may be unsuitable as enterprise SaaS hosting; consider authenticated private hosting before broader production use.

## Continuity requirements
- GitHub stores code, schema, this policy and project state; local snapshot remains source-specific and contains owner evidence.
- Cloudflare D1/R2 are an optional future durable layer: do not provision until verified free capacity, retention policy, access control, source-of-truth and account-level usage are clear.
- At next session, read state checkpoint and source last-verified timestamps first, then only requery stale or changed data. No blanket six-source rescan by AI on chat launch.

## Primary references
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
