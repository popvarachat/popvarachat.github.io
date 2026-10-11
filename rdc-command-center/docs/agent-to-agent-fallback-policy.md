# RDC L5 — Agent-to-Agent / MCP Fallback Policy (Pilot)

Status: PILOT VALIDATED (orchestrator-mediated transfer only), not production-certified.

## Authority and routing
- Human is an approval gate, not a message relay between agents.
- For cross-device tasks, the orchestration layer dispatches independently to PC and Notebook using authorized Remote Desktop Commander MCP devices; gather results and correlate by job_id.
- Prefer local API/MCP and authenticated private channels. SMB failure should trigger MCP-mediated evidence transfer without disabling firewall, guest login or encryption.
- Distinguish **orchestrator-mediated** messaging from true peer-to-peer agent communication; this pilot validates only the former.
- Keep GitHub as versioned policy/source of truth for code and decisions, while a separate private data hub retains logs/evidence. Never publish internal IPs, credentials, payloads, or proprietary logs here.

## Transfer envelope
Use job_id, origin, destination, schema_version, event_type, timestamp, payload_hash, status, next_step. Reject mismatched job_id or hash. Persist checkpoints before acknowledging transfer. Support idempotent resume and duplicate detection; log PASS/FAIL and UTC timestamp.

## Human gate
Request user intervention only for OS elevation, authorization, secrets, physical changes, or production-affecting decisions. Do not request copy-and-paste of results that the orchestration layer can obtain.

## Test evidence (2026-10-11)
- Authorized NB→orchestrator→PC small JSON transfer: PASS; content readback verified.
- Sample transfer wall time: 7.855 seconds, single small sample (not representative latency baseline).
- Synthetic checkpoint reload, source SHA-256 verification, resumed status to complete: PASS.
- Direct SMB share access from Notebook: NOT VERIFIED / FAIL (separate issue).
- Synology DSM / ChatPlus / Bot integration: NOT TESTED.

## Next gates
1. Repeat transfer with a statistically useful sample; record p50/p95 latency and failure rate.
2. Test interrupted transfer, duplicate event, tampered payload, controlled access permissions.
3. Assess authenticated and encrypted cross-device messaging transport; do not use browser-based insecure directory serving.
4. Approve production adoption only after reliability, permissions and rollback verification.

## Reliability extension — 2026-10-11
- Five sequential orchestrator-mediated small payload transfers with PC readback: PASS 5/5. Elapsed wall-time milliseconds: 6128, 5626, 5793, 5902, 6095; arithmetic mean 5909 ms. This includes tool-call overhead and is not network throughput.
- Synthetic interruption state transition (`queued` → `interrupted` → `completed`) and checkpoint re-read: PASS. It does not represent an actual process kill or link outage.
- Direct SMB from NB and Synology ChatPlus remain NOT VERIFIED.
- Main pilot progress is 6/8 original basic test categories = 75%; do not treat this as production readiness or 100% completion. Pending direct SMB and Synology functional validation; additional production qualification also remains.

## Continuation validation — 2026-10-11
- Both Desktop Commander devices Online; previous PC checkpoint persisted with `complete` status and source SHA-256.
- Three replays of a synthetic event ID recorded only one processing entry in a persisted JSON ledger: PASS for demonstration-level deduplication, NOT production-grade concurrency/idempotency.
- NB ping to PC PASS; SMB TCP/445 retry FAIL (intermittent across checks). Direct SMB path is NOT accepted as available. Do not weaken firewall or deploy pilot data to public networks to force pass.
- Coverage remains 6/8 fundamental pilot areas = 75%, with dedup a supplemental validation; Production readiness not assessed as 75%.

## Process-boundary persistence check — 2026-10-11
- Orchestrator-mediated notebook-to-PC JSON write/readback: PASS for one additional synthetic job (RDC-L5-RECOVER-20261011-B).
- Resume state transition with persisted JSON: PASS; still simulated, not a real crashed agent.
- Separate PowerShell process wrote `waiting_restart` checkpoint (PID 2584); a newly launched PowerShell process (PID 20796) loaded and completed it: PASS for persistence across process boundaries. No crash or system restart was induced.
- Completion remains 6/8 basic categories = 75%. Neither direct SMB nor Synology ChatPlus passed; do not claim 100% or unattended production recovery.
