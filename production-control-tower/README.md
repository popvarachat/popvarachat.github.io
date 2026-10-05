# Practika Production Control Tower — Rebuild Baseline

Status: **Design baseline / ready for implementation**. No production write-back is enabled.

## Purpose
Rebuild the legacy SO/WO/Cutting Microsoft Access application as a web-first Production Intelligence & Planning Control Tower while preserving traceability to the original operational data.

## Evidence used
- SO_WO_Cutting.accdb
- SO_WO_Cutting_Inventory.accdb
- SO_WO.csv
- TimeEntry.csv
- ItemCutting.csv
- OnHand.csv
- SaleInquiry.csv

Legacy Access also references sources not supplied in the current package: PO.csv, ControlPlan.csv, Partlist.csv, WOPrice.csv, WOPrice2.csv.

## Confirmed legacy joins
- SO_WO.[Cutting Number] = ItemCutting.[Group Number] — 100% coverage for the 9,335 cutting jobs in the supplied SO_WO extract.
- SO_WO.[Cutting Number] = TimeEntry.[Cutting Number] — 84.9% coverage for the supplied period.
- SO_WO.[Related SO No] ≈ SaleInquiry.[Order Number] — 97.7% of distinct related SO numbers in the supplied extract.
- SO_WO.[WO Number] = ItemCutting.[Order Number] — 100% coverage for the 2,003 WO in the supplied SO_WO extract.
- Legacy Access metadata contains ItemCutting.[Item Number] = OnHandSum.[Item Number].

## Target architecture
1. Immutable raw ingestion and source row hashes.
2. Normalized PostgreSQL schema.
3. Rules engine for material readiness, late risk, WIP aging, bottleneck and stale status.
4. Read API for browser and agent consumers.
5. Production Control Tower UI.
6. AI recommendation layer behind Human Gate.
7. Controlled write-back only after UAT, approval and source-of-truth verification.

## Core normalized flow
Customer / Project
→ Sales Order
→ Sales Order Line
→ Work Order
→ Cutting Job
→ Cutting Component / Control Plan
→ Inventory Snapshot / Purchase Order
→ Work Center / Operation Event / Status Event
→ Planning Decision / Alert
→ Delivery outcome

## Design rules
- No hidden business rules in Access query/form logic.
- No direct browser-to-database writes.
- Preserve status transition history; do not overwrite history.
- Inventory is a time-stamped snapshot.
- Planning recommendation is not production authorization.
- AI outputs begin as PROPOSED; release, reprioritization and override remain Human Gate.
- Every imported record should be traceable using source_record_map.

## Files
- index.html — interactive executive workflow, target ERD, legacy evidence and implementation baseline.
- schema.sql — normalized PostgreSQL DDL baseline.

## Recommended implementation sequence
1. Create staging PostgreSQL from schema.sql.
2. Build deterministic ETL for the five supplied CSV sources.
3. Add data-quality gates: orphan FK, duplicate key, impossible dates, broken status sequence, missing TimeEntry after release.
4. Connect PO / ControlPlan / Partlist exports.
5. Build read-only API and Control Tower dashboard.
6. Add rule-based material readiness and exception scoring.
7. Add AI recommendations.
8. Enable Human-approved write-back only after UAT and audit controls are accepted.
