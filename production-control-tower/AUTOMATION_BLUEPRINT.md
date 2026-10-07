# Production Planning Automation Blueprint

## New direction

The Production Control Tower is now **automation-first**, with production planning as the system core.

The target is not a dashboard that merely explains ERP data. The target is a closed planning loop:

**Demand → Normalize → Material Readiness → Capacity Feasibility → Auto Schedule → Exception Detection → Scenario Recommendation → Human Approval → Publish → Monitor Actual → Re-plan**

## Key ERP lessons applied

1. **Status is not operational state.** Resolve state from document status, Cutting status, routing/last operation, material, quality and downstream progress.
2. **Plan at operation grain.** WO-level planning is insufficient for bottleneck and finite-capacity scheduling.
3. **On Hand is not Material Ready.** Use requirements, commitments, inspection/hold and inbound ETA.
4. **Calendar is not Capacity.** Resource units and certified standard time are required.
5. **Rules must be versioned.** ERP behavior can depend on versions/options; rebuilt rules need effective dates, evidence and approval.
6. **Source lineage is mandatory.** Different extract periods must not be treated as one snapshot.
7. **Planner becomes automation supervisor.** The system computes normal plans; humans handle exceptions and policy decisions.
8. **AI is not the scheduling engine.** Deterministic rules/solver first, AI explanation/recommendation second, Human Gate before publish.

## Automation authority levels

- Level 0 — Observe
- Level 1 — Detect exceptions
- Level 2 — Recommend actions
- Level 3 — Simulate finite-capacity scenarios
- Level 4 — Human-approved publish/write-back
- Level 5 — Closed-loop re-planning under approved policy

Current design can proceed through Levels 1–2 immediately. Level 3 requires certified Work Center capacity and Standard Time. Levels 4–5 require UAT, allowlisted write-back and audit controls.

## Publish gate

A scenario cannot publish if any hard constraint is unresolved:

- incomplete routing
- material shortage / hold
- capacity over policy
- frozen/locked order conflict
- quality hold
- invalid/missing critical source
- missing human approval

The scheduler must fail closed.

## Target scheduler flow

1. Create immutable planning baseline.
2. Clone scenario.
3. Apply trigger or priority change.
4. Recalculate routing precedence.
5. Recalculate material readiness.
6. Recalculate capacity/load.
7. Recalculate due-date risk.
8. Compare scenarios.
9. Rank by policy score.
10. Human approve.
11. Publish through governed adapter.
12. Monitor actual-vs-plan drift.
13. Auto-create a new exception/re-plan cycle when thresholds are exceeded.

## Separation of responsibilities

### ERP
System of record for operational transactions and master data.

### Production Control Tower
System of planning intelligence, scheduling, exception management and scenario control.

### Rules / Solver
Deterministic feasibility and scheduling logic.

### AI
Explanation, comparison, recommendation and management narrative.

### Human Gate
Production authority.

## Admin evidence still required

- Manufacturing Work Center / Resource Capacity
- Certified Standard Time
- Routing Master technical source
- Processing Options / UBE definitions for key flows
- Supported integration path (AIS / Orchestrator / API / governed DB read)

These items do not block the automation architecture. They unlock production-grade finite-capacity scheduling and controlled write-back.
