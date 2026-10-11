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

## Actual child-process failure test — 2026-10-11
- On PC wrote `D:\RDC-L5-NAS-Pilot\recovery\real-crash-checkpoint.json` (pending), then deliberately invoked PowerShell `[Environment]::FailFast` in isolated test child process PID 24988. Process finished with nonzero exit code 2148734499; RDC remote agent remained connected.
- New PowerShell process PID 16664 read persisted checkpoint and transitioned to recovered, attempt 2: PASS.
- This demonstrates crash persistence and manual resume by orchestrator command, not automatic crash monitoring or self-healing service.
- NB direct SMB 445 retried and failed; Synology ChatPlus unavailable. Original pilot coverage remains 6/8 (75%).

## Final connectivity diagnostic (2026-10-11)
- Devices remain online through Remote Desktop Commander MCP.
- NB -> PC ping works; TCP 445 test is intermittent, including both PASS and FAIL during same diagnostic round.
- Hostname POP-FARM01 resolution via DNS failed on NB. Connecting directly by IP also failed with Windows `net view` error 53 and `net use` error 67.
- Windows SMB server share is configured; direct cross-device SMB is not certified. Do not regard sporadic TCP success as SMB success.
- Do not ask human to relay diagnostics; use authorized PC/NB MCP access directly. No firewall weakening or guest share changes.
- Remaining deliverables: direct SMB access and actual Synology DSM/ChatPlus environment. Original score remains 6/8 = 75%, not production readiness.

## Alternative transport decision — 2026-10-11
- SMB intermittent: not suited as a required execution dependency in present pilot; cause remains unconfirmed.
- Executed NB → orchestrator (Remote Desktop Commander MCP) → PC JSON payload, with source/destination readback: PASS, 8.522 seconds end-to-end.
- Executed PC → orchestrator → NB acknowledgment JSON, with readback: PASS, 7.748 seconds.
- Two-way exchange requires the orchestrator to be active; **not** independent unattended device-to-device transport or proof of a continuous service. Use authorized MCP only; secure credentials and sensitive evidence must not go to public repository.
- Revised deployment recommendation: use MCP-mediated transfer as pilot primary; treat SMB as optional/diagnostic and do not weaken Windows security to force SMB working.
- Important scope accounting: original Synology/SMB pilot remains 6/8 = 75%. A separate MCP transport proof-of-concept passes both directional tests; neither proves Synology ChatPlus integration or a production-ready autonomous self-healing agent.

## Autonomous local queue worker demonstration — 2026-10-11
- PC staging folder `D:\RDC-L5-NAS-Pilot\service\queue.db` uses SQLite with unique job IDs, job states and attempt counters.
- Script `service-pilot.py` demonstrates queued→retry (attempt 1)→acked (attempt 2) and insert-or-ignore duplicate protection: PASS, one record for one job ID.
- Separate, temporary `worker-pilot.py` ran a 20-second polling window. An independent process enqueued `AUTO-WORKER-TEST`, and the worker logged `AUTO_ACK AUTO-WORKER-TEST` without an orchestrator call to acknowledge: PASS.
- The worker deliberately exited after the test (`WORKER_EXIT_TEST_COMPLETE`). NOT a Windows service, not installed at startup, not an unattended production solution. SQLite queue is local to PC; external NB jobs still require orchestrator-mediated delivery.
- Keep original 75% (6/8) Synology+SMB pilot accounting: real Synology ChatPlus missing, direct SMB remains unverified. The local queue worker tests strengthen alternative architecture but do not close those gates.

## Execution policy — Batch Auto-Continue (approved 2026-10-11)
- Once the user authorizes RDC to complete the scoped work, execute the whole safe task DAG without asking for "continue" after each step. Report blockers, human approval gates, and validated results only.
- API/MCP/CLI first. Dispatch independent NB/PC tasks in parallel with at most one heavy task per device; execute dependent stages in order.
- Persist job IDs, checkpoints, outputs, error codes, timing, version and SHA-256 evidence. On recoverable errors retry with a bounded backoff and independent fallback; never weaken firewall or access controls to force a PASS.
- Automatic continuation is within the active authorized workflow, not a promise that ChatGPT remains running after the chat ends. An unattended worker must be installed, configured and tested separately before calling it persistent.
- Human Gate only for explicit authorization, privileged OS actions, credentials or irreversible production changes. Avoid asking the user to relay PC/NB diagnostics.
- Close tasks only after objective end-to-end QA, status in GitHub and remaining-blocker disclosure. No percentage inflation; base 75% (6/8) refers to original Synology/SMB pilot, not RDC L5 production readiness.

## Batch policy applied / persistent pilot worker — 2026-10-11
- Policy updated to batch / auto-continue under approved scope. GitHub commit `19749a9`.
- PC `POP-FARM01` registered Windows Scheduled Task `RDC-L5-Pilot-Worker`, AtLogOn trigger, worker script `D:\RDC-L5-NAS-Pilot\service\persistent-worker.py`, local SQLite queue and heartbeat. Task was observed Running; heartbeat status alive, PID 15848. Logon trigger is not equivalent to tested reboot auto-start.
- End-to-end staged run: Notebook wrote small synthetic JSON -> orchestrator transferred to PC -> PC enqueued id `PILOT-AUTO-ENDTOEND-001` -> independent worker changed queue status to `acked` in one attempt, without orchestration per-step command: PASS. Orchestrator is still required for cross-device transfer; only PC queue consumption is autonomous.
- Safety limitation: worker ACK means validated JSON consumption in a *pilot*, not a real external action being executed. Worker processes only IDs prefixed `PILOT-`/`AUTO-`; no production queue/actions. Full retry backoff, access control, restart and rollback need qualification.
- Original combined Synology+SMB pilot remains 75% 6/8; do not claim actual Synology or SMB completion.

## Incident loop pilot 2026-10-11
- Synthetic single-node `192.0.2.10` (documentation-only test address): baseline online -> offline DETECTED -> NOTIFICATION_STAGED -> online REVERIFIED_AND_CLOSED, audit rows persisted in PC `D:\RDC-L5-NAS-Pilot\incident\incidents.db`: PASS simulation.
- Live **read-only two-host monitor** installed as Windows Scheduled Task `RDC-L5-Pilot-IncidentMonitor` on POP-FARM01 and observed Running. PC file `D:\RDC-L5-NAS-Pilot\incident\live-last-scan.json` records observations; loop every 30 seconds. This is a scoped prototype, not enterprise Network Twin full scan.
- Live monitor observed Notebook online in one probe then offline in another while Desktop Commander reported online; ICMP may give false negatives. Incident logic requires 2 consecutive failed probes before opening and 2 successful before closing, but no independent health confirmation is implemented. Do not use it for production decisions.
- ChatPlus IT delivery is NOT implemented: notification outbox only with `NOT_SENT` / unconfigured destination. No production auto remediation; any live incident closes only after positive probes recover, without claiming RDC fixed the cause.
- To certify full 5-stage production workflow: authoritative health probes + snapshot history, actual approved IT notification channel, allowlisted remediation with rollback, repeated verification and audit durability/permissions, reboot test.
