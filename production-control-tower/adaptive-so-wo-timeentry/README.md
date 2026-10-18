# Production ControlPlan Pivot
The page shows the established 160-Cutting cohort selected from JDE Cutting 40 on 18 October 2026. It is not a factory-wide WIP census. The published snapshot discloses lifecycle and operation collection timestamps separately; opening the page does not query ERP or schedule an automatic refresh.

## Data and calculation
- Cutting lifecycle, transfer due, close date and completed-transfer date: P594801C / PTK0002 / W594801CE, refreshed by exact Cutting Number.
- Operation evidence: P5511026 / ZPTK0001, exact Cutting Number, with request/result identity checks, pagination completeness and batch checkpoints.
- Reference only: original Access CuttingStatus and StatusNoControlPlan tables. No historical CSV production data is used as current data.
- The collector executes the original ControlPlanAdj and CuttingProduction SQL through DAO ACE on an isolated database. Raw Business Unit leading spaces are retained for Mid(Business Unit,7,2). Max operation sequence and Last Business Unit remain independent aggregate outputs.
- Resolution joins Cutting Type + Cutting Status + derived ControlPlan. Fallback is accepted only when the distinct reference result is unique; otherwise the row remains unresolved.
- Labels such as “ผลิต4 โอนรอทำระบบ” retain their complete meaning in detail while grouping under ผลิต4 for the Pivot.
- Count is distinct Cutting. Rows with a completed-transfer date or Cutting status 9D are excluded from open WIP. Dates use day/month/year; late days use the Bangkok calendar date.

## Interpretation
Department from ControlPlan is the Access business classification, not certified physical tracking. The first non-complete regular operation is shown separately. Rework remains visible in operation evidence.
A status disagreement between the Cutting and WO Monitor sources is explicitly flagged. Cutting lifecycle remains authoritative; a Monitor-only 9D does not silently remove a Cutting without matching Cutting lifecycle evidence. One such conflict was observed in this extraction.

## Build and verification
The immutable data/cutting40-cohort.json defines the selection. build_cutting40_web.js reads validated, normalized lifecycle snapshots; build_live_controlplan.js enriches in memory and validates totals before atomic replacement of current-production.json.
Raw JSON is retained privately. PowerShell CP437/UTF-8 console corruption is normalized only by a strict, reversible transformation, with a normalization proof and unchanged raw evidence.
Browser checks cover distinct totals, 9D exclusion, Pivot totals, department columns, drill-down, operation dialogs, reset, exact search, view switching, desktop/mobile rendering and JavaScript errors.
CLI Codex provided an independent review of SQL semantics, source priority and failure behavior.
