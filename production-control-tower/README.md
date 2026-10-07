# Practika Production Control Tower — Automation-First V3

Status: **Planning automation architecture ready. ERP write-back remains disabled.**

## Purpose

Build a Production Planning Automation system on top of ERP evidence — not a web clone of legacy Access and not merely a reporting dashboard.

Core loop:

**Demand → Material → Routing → Capacity → Auto Schedule → Exception → Scenario → Human Approve → Publish → Monitor → Re-plan**

## What changed after ERP reverse engineering

The ERP investigation materially changed the design:

- Status alone is insufficient; operational state must include routing/last operation, material, quality and downstream progress.
- Production planning must reach operation/work-center grain.
- On Hand cannot be treated as Material Ready; commitments, inspection and inbound supply matter.
- Work calendar alone cannot drive finite capacity; certified resource capacity and Standard Time are required.
- Business rules must be versioned and evidence-backed.
- Source batches and effective periods are mandatory because historical extracts are not synchronized.
- Planner work should shift from manual checking to exception supervision.
- AI remains advisory behind deterministic rules and a Human Gate.

## Automation maturity

1. Observe
2. Detect
3. Recommend
4. Simulate
5. Human-approved publish
6. Closed-loop re-plan

The rebuild can proceed now on Observe / Detect / Recommend. Finite-capacity simulation requires certified capacity and standard-time sources from ERP Admin.

## Files

- `index.html` — new automation-first Control Tower web
- `AUTOMATION_BLUEPRINT.md` — planning automation design
- `REBUILD_BLUEPRINT.md` — consolidated rebuild architecture
- `schema.sql` — normalized PostgreSQL baseline
- `production_domain_v2.sql` — lineage, stage, routing, ATP hardening
- `scheduler_schema.sql` — scenario scheduling and fail-closed publish gate
- `report_views.sql` — reporting semantic layer
- `erp_api_field_contract.csv` — source/API field contract
- `data/source_evidence_v2.json` — public-safe evidence summary
- `data/jev_architecture_review.json` — bounded SHADOW architecture review

## ERP boundary

Detailed ERP objects, versions, tables, Processing Options, security and Admin evidence belong in the separate **private ERP Workflow & Architecture Deep Dive repository**. This public web exposes only the planning architecture and public-safe design.

## Current technical gap

ERP Admin certification is still required for:
- Work Center / Resource Capacity
- Standard Time
- Routing Master technical source
- Processing Options / UBE
- supported integration path

Those gaps block production-grade finite-capacity scheduling and write-back, but do **not** block implementation of the planning automation architecture.
