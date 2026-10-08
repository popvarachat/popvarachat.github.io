# RDC Learning Store — Zero-cost Foundation

Status: DESIGN / NO PRODUCTION COLLECTOR ENABLED
Scope: Public-safe contract; sensitive telemetry remains local or in an access-controlled private repository.

## Purpose
Persist verifiable outcomes and improvements across PC and Notebook without turning GitHub Pages into a raw-log database.

## Architecture
- PC / Notebook: local SQLite, append-only events, evidence hashes, secure checkpointing.
- Private archive (not yet provisioned): redacted daily/weekly summaries, lessons, evaluation outcomes.
- Public RDC Command Center: aggregate published snapshots only, released by explicit checkpoint.
- No automatic GitHub push by heartbeat, scheduled collector or agent.

## Required event fields
event_id, trace_id, host_alias, task_type, started_at, ended_at, outcome, validation_status, evidence_hash, retry_count, duration_ms, cost_estimate_usd, confidence, risk_class, failure_category, lesson_id, schema_version.
Deduplicate by stable event_id and host_alias; never publish raw command, credentials, IP, usernames or user content.

## Daily audit questions
1. What finished, failed, was blocked, or remains unverified?
2. Why? Evidence first; label hypotheses separately.
3. What policy, tool, skill or route changed?
4. Did quality improve versus an adequate baseline without extra risk or cost?

## Promotion control
Observe → Baseline → Proposal → Shadow → Canary → Compare → Human/Policy Gate → Promote or Roll Back.
Do not auto-promote; do not claim statistical improvement from tiny samples.

## Billing / cost guard
- No Codespaces, hosted Models, paid Actions runners, Packages or Git LFS required.
- Local recording does not trigger GitHub jobs.
- Public release only on approval or significant milestone; prefer batching.
- Target incremental metered GitHub spending: USD 0, not merely under USD 4.
- Before enabling any billable service, verify actual monthly usage and an account-level hard-stop budget.
- Stop automatically when spend would exceed approved limit; never infer remaining quota from a screenshot of the product tabs.

## Launch checklist
- [ ] Confirm GitHub budget hard stop and live billed usage from authenticated Billing page.
- [ ] Provision private repository/approved private archive, verify visibility.
- [ ] Build local SQLite schema and migrations.
- [ ] Read-only ingestion from PC/NB with sensitive-field redaction.
- [ ] Deduplication, integrity and restore tests.
- [ ] First real daily audit and measured baseline.
- [ ] Explicit publish authorization.
