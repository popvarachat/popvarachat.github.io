# Practika Production Control Tower · Rebuild Blueprint

Status: **Architecture baseline complete from current user-level evidence (99% reverse-engineered)**  
Safety boundary: **Read-only / Observe-first. No production write-back.**

## 1. Executive intent

Practika Production Control Tower is not a web rewrite of the legacy Access files. It is a production intelligence and planning layer that preserves ERP traceability while separating:

1. source evidence,
2. deterministic business rules,
3. normalized operational data,
4. reporting and risk detection,
5. scenario planning,
6. AI recommendations,
7. human-approved actions.

The operational loop is:

**Demand → Plan → Material → Execute → Detect Risk → Decide → Re-plan**

The rebuild must answer one management question continuously:

> What is at risk now, why is it at risk, what can be changed safely, and what evidence supports that decision?

---

## 2. Recovered business topology

The validated production chain is:

**Customer / Project → Sales Order → Work Order → Cutting → BOM / Component → Routing / Operation → Work Center / Business Unit → Time Entry / Execution → Inventory / PO → Finish / Delivery**

A key design finding is that **Cutting Number is a major operational spine**, not merely a display field. It links legacy WO/Cutting data, components, control-plan routing, stage resolution and production execution.

The rebuilt model therefore treats these as distinct but related entities:

- Customer / Project
- Sales Order / Sales Order Line
- Work Order
- Cutting Job
- Component Requirement
- Routing Operation
- Work Center / Business Unit
- Operation Execution Event
- Inventory Position / Commitment
- Purchase Order / Supplier ETA
- Quality Hold / Exception
- Delivery / Promise Outcome

---

## 3. Source evidence and lineage

Historical evidence confirms that the supplied files are **not one synchronized snapshot**. Different extracts cover different periods.

Therefore every ingestion must carry:

- `source_batch_id`
- dataset/source name
- extract timestamp
- effective/valid period
- source primary key
- source row hash
- data-quality state
- quarantine reason when applicable

A failed cross-file join must never automatically be interpreted as a broken business key. It may simply be a different source period.

### Historical evidence already strong enough to design from

- Routing / control-plan backbone: **886,404 operation-route rows**
- Control-plan groups: **149,616**
- Work Orders represented in control-plan evidence: **30,789**
- Business Units observed: **75**
- Cutting → component coverage in the principal historical extract: **100%**
- Related SO → demand evidence: **~97.7%**
- Cutting → Time Entry evidence: **~84.9%**
- Later Cutting → routing evidence: **~99.87%**

These values are evidence-quality indicators, not live-production KPIs.

---

## 4. Deterministic stage engine

The legacy system does not determine the current production department from Cutting Status alone.

Recovered logic demonstrates a combination of:

**Cutting Type + Cutting Status + Last Routing / ControlPlan Family**

with fallback behavior when the primary mapping does not resolve.

The V2 architecture replaces hidden query logic with an explicit effective-dated rule table:

`production_stage_rule`

Recommended rule fields:

- cutting_type
- cutting_status
- last_work_center_family
- resolved_stage
- effective_from / effective_to
- rule_state: OBSERVED / VERIFIED / RETIRED
- source_evidence
- approved_by
- approved_at

Unknown combinations must resolve to:

**UNMAPPED / REVIEW**

AI is not allowed to invent a stage.

---

## 5. Routing and execution model

Routing is now sufficiently evidenced to be a first-class production domain.

Each WO/Cutting can have ordered operations with:

- operation sequence
- work center / BU
- operation description
- planned start / finish
- actual start / finish
- setup time
- run time
- labor time
- machine time
- operation status
- remaining quantity / remaining minutes

Live ERP observation additionally confirms that operation-level screens expose actual machine, labor and setup hours and an operation status. This is the correct grain for productivity, queue and bottleneck analysis.

The Production Control Tower should therefore never stop at:

> Cutting is in Production 2.

It should be able to reach:

> WO X / Cutting Y is at Operation 30, Work Center Z, planned 420 minutes, actual 510 minutes, next operation blocked by material or capacity.

---

## 6. Material readiness / ATP

Material readiness must not be calculated from On Hand alone.

The required model is:

**Requirement → Allocation / Commitment → Available → Shortage → Inbound PO → Confirmed ETA → Material Ready Date**

Inventory evidence should preserve separately:

- on hand
- soft commitment
- hard commitment
- project commitment
- inspection / hold
- in transit
- quantity on PO
- quantity on WO
- available-to-promise components
- item planner / buyer
- lead time
- make / buy
- stocking type

The material gate should return deterministic states such as:

- READY
- PARTIAL
- SHORT
- WAIT_PO
- HOLD
- DATA_INCOMPLETE

---

## 7. Capacity and calendar model

The system already has evidence for routing, actual execution hours and a work-day calendar structure.

A production-grade finite-capacity scheduler still requires certified:

- standard setup minutes
- standard run minutes / unit
- labor standard
- machine standard
- work-center resource count
- shift calendar
- working minutes / shift
- overtime
- maintenance / planned downtime
- efficiency / utilization policy
- alternate work centers where allowed

Until these are certified, the Scenario Planner stays **simulation-only**.

---

## 8. Dynamic scheduling architecture

The scheduler must use a scenario boundary:

**Baseline → Clone Scenario → Move / Re-prioritize → Recalculate precedence → Recalculate material → Recalculate capacity → Recalculate due-date exposure → Compare → Validate hard constraints → Human Approve → Publish**

The production baseline is never directly edited by a what-if action.

Hard gates include:

- material availability
- routing precedence
- work-center capacity
- calendar availability
- frozen / locked orders
- approved outsourcing constraints
- quality hold
- promised delivery constraints

Recommended scenario states:

- DRAFT
- CALCULATED
- BLOCKED
- READY_FOR_REVIEW
- APPROVED
- REJECTED
- PUBLISHED
- SUPERSEDED

---

## 9. Risk engine

Risk detection must be deterministic before AI interpretation.

Core risk classes:

- Late / due-date risk
- Material shortage
- Supplier ETA risk
- Capacity overload
- Routing bottleneck
- Excessive WIP aging
- Stale status / stale execution
- Rework / quality hold
- Data-quality risk

Each risk record should retain:

- entity and grain
- rule id / version
- severity
- first detected
- last evaluated
- evidence fields
- recommended owner
- resolution state

This makes every management alert auditable.

---

## 10. AI operating boundary

AI is a recommendation layer, not production authority.

Expected AI tasks:

- explain why an order is at risk,
- summarize bottlenecks,
- propose safe reprioritization,
- compare scheduling scenarios,
- draft expedite recommendations,
- detect contradictory data,
- generate management narrative.

AI must not independently:

- release WO,
- change production status,
- close Cutting,
- post Time Entry,
- approve PO,
- alter master data,
- publish a schedule,
- write back to ERP.

Recommendation lifecycle:

**PROPOSED → APPROVED / REJECTED → PUBLISHED / SUPERSEDED**

with a Human Gate before write-back.

---

## 11. Target technical architecture

```text
ERP / Legacy / Supporting Sources
          │
          ▼
Immutable Source Batch + DQ Gate
          │
          ▼
Staging / Quarantine
          │
          ▼
Normalized PostgreSQL
          │
          ├── Demand / Order domain
          ├── Production / Routing domain
          ├── Material / Procurement domain
          ├── Execution domain
          ├── Quality domain
          └── Delivery domain
          │
          ▼
Deterministic Rules Engine
          │
          ├── Stage resolver
          ├── Material readiness
          ├── Risk detection
          ├── Capacity calculation
          └── Schedule validation
          │
          ▼
Semantic Views / APIs
          │
          ▼
Production Control Tower
          │
          ▼
AI / Agent Recommendation Layer
          │
          ▼
Human Gate
          │
          ▼
Governed ERP Write-back (future phase only)
```

---

## 12. Decision surfaces

The Control Tower should expose reports as **Decision Surfaces**, not passive reports.

Priority surfaces:

1. Executive Production Health
2. Customer / Project Due-Date Risk
3. WIP / Aging / Current Stage
4. Material Readiness / Shortage
5. Routing / Stage Bottleneck
6. Work Center Load / Capacity
7. Productivity / Actual vs Standard
8. Supplier / PO ETA Risk
9. Promise / OTD Governance
10. Data Quality / Integration Health

Every KPI must provide drill-down to evidence.

---

## 13. Data governance rules

- Blank is not zero.
- Text business keys must remain text.
- Source dates are normalized before KPI calculation.
- Invalid Buddhist/Gregorian conversions are quarantined.
- Historical extracts are not assumed to be synchronized.
- Actual time must be sourced or governed; never fabricated.
- OTD is not certified until promise policy and grain are approved.
- Material readiness must account for commitments and inbound supply.
- New production statuses remain unmapped until approved.
- Scenario output cannot publish when a hard gate fails.

---

## 14. Implementation sequence

### Phase A — Foundation
1. Source-batch ingestion
2. Data-quality quarantine
3. SO / WO / Cutting normalization
4. Routing and stage-rule normalization
5. Component / inventory / PO normalization

### Phase B — Operational intelligence
6. WIP and stage reports
7. Material readiness
8. Supplier ETA risk
9. Operation actual-time integration
10. Bottleneck / aging detection

### Phase C — Capacity
11. Certified standard time
12. Capacity / resource calendar
13. Work-center load model
14. Scenario scheduling
15. Hard publish gate

### Phase D — AI and action
16. AI narrative / recommendations
17. Human approval workflow
18. UAT
19. Controlled ERP write-back
20. Continuous rule/version governance

---

## 15. What remains before technical certification

The current reverse-engineering baseline is approximately **99% complete from the available user-level access**.

The remaining technical certification is intentionally separated and requires ERP Admin / Developer evidence for:

- manufacturing Work Center / Capacity / Resource master,
- certified Standard Time source,
- Processing Options for key application versions,
- UBE Data Selection and Processing Options,
- physical table / business-view mapping for selected custom objects,
- approved status-transition configuration,
- preferred read-only integration path such as API / AIS / Orchestrator / governed DB read.

These are not blockers to blueprint completion. They are blockers only to **production-grade finite-capacity scheduling and governed write-back**.

---

## 16. Definition of Done for V2

The rebuild is considered production-ready only when:

- every live KPI has a certified data source,
- every status/stage rule is versioned and approved,
- routing and standard time are certified,
- capacity is date/shift aware,
- material readiness includes commitments and inbound supply,
- scenario calculations are reproducible,
- hard constraints fail closed,
- AI recommendations are traceable,
- Human Gate is enforced,
- write-back is explicitly authorized and audited.

Until then, the system remains **read-only Production Intelligence + Scenario Planning**.
