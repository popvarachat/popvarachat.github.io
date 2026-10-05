# Practika Production Control Tower — Rebuild Baseline V2

Status: **Design / read-only baseline**. Production write-back remains disabled.

## Purpose
Rebuild the legacy SO/WO/Cutting Microsoft Access application as a web-first Production Intelligence & Planning Control Tower while preserving ERP traceability, routing logic, status/stage rules and source lineage.

## Second evidence pass — major change
The newer archive added the previously missing operational sources and changed the target architecture materially:

- **ControlPlan.csv** — 886,404 routing rows, 149,616 group numbers, 30,789 WO, 75 Business Units, 60 operation descriptions.
- **40.xls** — later 2021–2022 monitor extract with 30,546 unique Cutting and 6,115 WO; 99.87% of Cutting numbers link to ControlPlan and 100% of WO link to ControlPlan.
- **CuttingStatus.xlsx / CrossTable.xlsx** — 789 observed stage-mapping rows (785 unique combinations) using Cutting Type + Cutting Status + Last ControlPlan family.
- **Partlist.csv** — 14,558 unique WO and strong linkage to the 2020 SO_WO snapshot.
- **PO.csv** — 1,414 PO lines, 713 PO, 247 suppliers and promised-delivery evidence.
- **OnHand.csv** — 226 fields including soft/hard commitments, project commitments, in-transit, on-PO, inspection, unit cost, planner, buyer, cumulative lead time, make/buy and stocking type.
- **phone.xls** — 152,551 operation events with Work Center / Team / Begin-End timestamps; Hours-Actual is zero on every row, so it cannot be treated as actual duration without a quality rule.

## Critical source-lineage finding
The archive is **not one synchronized snapshot**. Different files cover different periods (for example SO_WO.xlsx is mainly 2020, ItemCutting/SaleInquiry/PO are mainly 2021, and 40.xls spans 2021–2022).

Therefore a failed cross-file join can mean “different source periods”, not “broken business key”.

V2 makes `source_batch`, valid period, extract timestamp, row hash and data-quality state first-class fields before normalization.

## Recovered Access business logic
Reverse engineering found these important constructs in the legacy Access files:

- `ControlPlanAdj`
- `CuttingProduction`
- `CuttingTypeStatusControl`
- `StatusNoControlPlan`
- `MapControlPlan`
- `Business Unit Status`

Observed logic includes:
- `SO_WO.[Cutting Number] = ControlPlanAdj.[Group Number]`
- Current stage depends on **Cutting Type + Cutting Status + Last ControlPlan family**
- Legacy fallback pattern: `IIf([StatusNow] Is Null,[StatusNow2],[StatusNow])`

This means the rebuilt system should not derive “current production department” from Cutting Status alone.

## V2 deterministic architecture
1. Source Batch / lineage gate.
2. Normalize SO / WO / Cutting.
3. Promote ControlPlan to the routing backbone.
4. Resolve current stage through an effective-dated `production_stage_rule`.
5. Keep newly observed statuses unmapped until business-approved.
6. Model material availability as components of ATP — not just On Hand.
7. Use TimeEntry timestamps only after date/time quality checks.
8. Build reports and scenario planning on top of deterministic evidence.
9. Keep AI recommendations advisory behind Human Gate.

## Newly observed Cutting statuses requiring explicit review
- 50 — จ้างผลิต RM อุปกรณ์ - PTK
- 53 — จ้างผลิตบางส่วน
- 74 — ผ่านบางส่วน
- 80 — ซ่อมงาน

The system intentionally resolves these to **UNMAPPED / REVIEW** until an approved stage rule exists.

## Dynamic scheduling boundary
Operation sequence and Work Center routing are now evidenced, but production-grade finite-capacity scheduling still needs:

- certified setup/run standard time,
- Work Center / machine / labor capacity calendar by date/shift,
- maintenance/downtime windows,
- certified actual minutes or a governed derivation rule.

Until those P0 fields are connected, Scenario Planner remains **simulation only** and Publish/write-back is disabled.

## Jev SHADOW architecture review
Jev 1.13.0 was called through RDC as a bounded SHADOW coprocessor. It selected:

- SOURCE_BATCH_FIRST
- EFFECTIVE_DATED_RULE_TABLE
- ROUTING_BACKBONE
- ATP_LEDGER
- SCENARIO_DESIGN_ONLY
- DERIVE_WITH_QUALITY_GATE
- ROUTE_STAGE_BOTTLENECK
- LINEAGE_RULES_ROUTING_FIRST

Jev has no production execution authority.

## Files
- `index.html` — Workflow, Report Center, Rebuild V2 Evidence, Scenario Planner, ERP API Contract, ERD.
- `schema.sql` — original normalized PostgreSQL baseline.
- `production_domain_v2.sql` — source lineage, stage rules, routing hardening, ATP components and TimeEntry quality.
- `scheduler_schema.sql` — scenario scheduling and fail-closed publish gate.
- `report_views.sql` — reporting semantic layer.
- `erp_api_field_contract.csv` — IT/API field contract.
- `data/source_evidence_v2.json` — public-safe second-pass evidence summary.
- `data/jev_architecture_review.json` — Jev SHADOW decisions.

## Recommended implementation sequence
1. Source-batch ingestion + date quarantine.
2. WO / Cutting / ControlPlan / Work Center normalization.
3. Import legacy stage rules as OBSERVED; verify business rules before promotion to VERIFIED.
4. ItemCutting + OnHand commitments + PO/Supplier ETA.
5. TimeEntry timestamp quality + provisional duration.
6. Route/Stage/WIP reporting.
7. Connect Standard Time + Capacity Calendar.
8. Run finite-capacity scenarios.
9. Enable Human-approved write-back only after UAT and source-of-truth verification.