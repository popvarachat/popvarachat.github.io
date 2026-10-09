# RDC System — Canonical Runtime Contract
Version: 2026-10-09 / Decision Gate v1 (implementation baseline)
Status: LOCAL PC/NB IMPLEMENTED IN `RDC-Ultimate-Runtime.py` PLAN PATH; NOT FULL L5 CERTIFIED

## Source-of-truth priority
1. Fresh local runtime source and test outputs on PC/NB (when reachable).
2. This canonical contract and GitHub commits / reviewed PR.
3. Time-stamped local Learning Store + evidence ledger, acknowledging missing data.
4. Prior handoff or conversation history is orientation, not live authority.

## Control Plane responsibilities
- Orchestrator: interpret intent, load authoritative context, dynamically plan, discover resources, compare options, route Agent/Skill/Model/Tool, enforce Human Gate, validate completion, record evidence.
- Planner: BEFORE execution call the Decision Intelligence Gate. Never silently assume the first viable approach is best.
- Capability Registry: measure availability by real probes, distinguishing installed, authenticated, authorized, healthy, stale and unknown.
- Execution Router: API/MCP/CLI first; Playwright CLI/MCP as primary browser/UI executor, using authorized existing sessions; TinyFish fallback only, then Windows MCP.
- Economic Router: optimize quality, latency, resource, quota, financial cost and maintenance burden using measured data. Shadow estimates are NOT production truth.
- Governance: SHADOW Jev/economic/canary; Skill Factory draft only; refactoring proposal only; Red Team read-only; bounded changes at Human Gate.
- Recovery: checkpoint/resume/rollback, host-aware routing, do not falsely claim failover before real proof.
- Observability: trace_id, host, latency, outcome, validation, evidence_hash, cost where known; explicit unknowns.
- Learning: Daily self-audit, RCA, failures and lesson registry, measurable before/after and safe promotion.

## Universal Decision Intelligence Gate
Applicable across EVERY domain: IT infrastructure, storage, ERP, production planning, finance, services, projects, procurement, marketing, trading and UI.
1. Clarify desired outcome and constraints; identify high-stakes gates.
2. Search EXISTING connected capabilities and previously acquired assets before proposing new purchases or installations.
3. Generate at least three materially distinct options as appropriate: reuse existing service, local/CLI, remote/cloud, hybrid, and 'do nothing' when reasonable.
4. Validate feasibility with fresh evidence. Never silently treat guesses as available services.
5. Compare quality, time-to-result, privacy/security, operational risk, reversibility, cost/quota, dependency, resilience, maintenance and user interruption.
6. Recommend option + fallback and explain any material tradeoffs; obtain permission at Human Gate if needed.
7. Execute within approved scope, then independent QA and authoritative reread.
8. Write outcome, alternatives rejected, why, uncertainty, measured results and lesson to durable store.
9. Periodically check whether a superior existing option was missed; add error pattern PREMATURE_SOLUTION_SELECTION if so.

## Implementation evidence vs missing functionality
- 2026-10-09: Local PC/NB have `scripts/rdc_decision_gate.py`, wired into `compile_dag(goal)`; commands `plan` expose `decision_gate`, `decision_required:true`, `execution_authorized:false`. Both passed 12/12 preexisting runtime checks after patch.
- Local implementation is *proposal/checklist* only: it currently enumerates templated alternatives, flags unknown cost/risk and needs evidence. It does NOT independently perform live capability searches, score measured outcomes, or enforce all executor entrypoints.
- Do not claim fully functioning automatic execution gate until all entrypoints are protected by tests, traces, dry-run, rollback and measured impact.
- SQLite was created separately on PC/NB, but collector coverage is incomplete; never equate passing synthetic checks with 100% task success.
- Cross-device storage SMB was paused by user's preference; pursue existing Google Drive with data governance, not LAN firewall changes.
- No secrets, private host logs, internal data, credentials or raw telemetry in PUBLIC repo.

## Continuity boot procedure for any new Chat, device or day
- Read this contract first, verify latest GitHub main and PR state (do not assume unmerged PR is live).
- Discover PC/NB online status and live `RDC-Ultimate-Runtime.py` contents/version; run read-only validation.
- Compare active implementation against this contract; report drift or blockers; do not silently overwrite host changes.
- Read fresh Learning Store, heartbeat, ledger and daily audits with timestamps; distinguish stale snapshots.
- Verify budget and permissions before invoking any paid, destructive or external workflow.
- Produce a plan with alternatives, selected option, Human Gate, acceptance criteria, rollback and task evidence.
- At completion update durable learning artifacts and source-control checkpoint, never raw public log dumps.

## Acceptance criteria toward L5
- 100% of task entrypaths covered by enforced decision gates (tested).
- Each eligible task has candidate alternatives and independent QA/evidence/trace.
- Measured production task outcome coverage, latency P95 and cost sufficient to compare before/after.
- Durable cross-device backups, safe failure-mode tests, and provenance.
- Promotion only with evidence, user-defined policy boundaries and rollback.
- No synthetic PASS count is represented as real-world efficiency 100%.
