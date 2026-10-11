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
