# RDC Command Center — Public Update Cost Policy

## Default
- Telemetry collection stays local and may run frequently.
- Raw telemetry and live snapshots are not committed continuously.
- GitHub Pages public snapshots are batch-published only.
- No automatic push is performed by the telemetry collector.

## Publish triggers
Publish only when one of these is true:
1. Human explicitly approves a public refresh/deploy.
2. Architecture/UI/runtime policy materially changes.
3. A meaningful KPI snapshot is intentionally promoted for public viewing.

## Cost guard
GitHub Pages in this repository can create a Pages build/deployment run on pushes to the publishing source. Therefore the primary cost-control mechanism is reducing push frequency, not reducing local telemetry frequency.

## Data boundary
Public: aggregated snapshot/schema/backlog only.
Local-only: raw runtime events, task traces, collector health/logs, temporary build artifacts.
