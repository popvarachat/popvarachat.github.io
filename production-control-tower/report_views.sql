-- Practika Production Control Tower
-- Report semantic layer baseline
-- PostgreSQL views for Executive / Management / Operational reporting
-- IMPORTANT: v_material_readiness is gross/non-allocated readiness until an allocation rule is implemented.

CREATE OR REPLACE VIEW v_exec_production_status AS
SELECT
  c.customer_id,
  c.customer_no,
  c.customer_name,
  p.project_id,
  p.project_no,
  p.project_name,
  so.sales_order_id,
  so.order_no,
  so.promised_delivery AS so_promised_delivery,
  sol.sales_order_line_id,
  sol.line_no AS so_line_no,
  wo.work_order_id,
  wo.wo_no,
  wo.planned_complete AS wo_planned_complete,
  cj.cutting_job_id,
  cj.cutting_no,
  cj.current_status,
  cj.current_status_description,
  cj.delivery_due,
  cj.engineer_code,
  cj.engineer_name,
  cj.install_location,
  cj.actual_close_99,
  cj.actual_complete_9d,
  CASE WHEN cj.current_status IN ('99','9D') THEN true ELSE false END AS is_terminal,
  CASE
    WHEN cj.current_status IN ('99','9D') THEN 'TERMINAL'
    WHEN cj.delivery_due IS NOT NULL AND cj.delivery_due < CURRENT_DATE THEN 'OVERDUE_OPEN'
    ELSE 'OPEN'
  END AS execution_state
FROM cutting_job cj
JOIN work_order wo ON wo.work_order_id = cj.work_order_id
LEFT JOIN sales_order_line sol ON sol.sales_order_line_id = wo.sales_order_line_id
LEFT JOIN sales_order so ON so.sales_order_id = sol.sales_order_id
LEFT JOIN project p ON p.project_id = so.project_id
LEFT JOIN customer c ON c.customer_id = so.customer_id;

CREATE OR REPLACE VIEW v_wip_aging AS
WITH last_status AS (
  SELECT cutting_job_id, max(event_at) AS last_status_at
  FROM cutting_status_event
  GROUP BY cutting_job_id
),
last_operation AS (
  SELECT cutting_job_id, max(coalesce(ended_at,started_at)) AS last_operation_at
  FROM operation_event
  GROUP BY cutting_job_id
)
SELECT
  x.*,
  greatest(ls.last_status_at, lo.last_operation_at) AS last_activity_at,
  CASE
    WHEN x.is_terminal THEN 0
    WHEN greatest(ls.last_status_at, lo.last_operation_at) IS NOT NULL
      THEN CURRENT_DATE - greatest(ls.last_status_at, lo.last_operation_at)::date
    ELSE NULL
  END AS stale_days,
  CASE
    WHEN x.is_terminal THEN 'TERMINAL'
    WHEN greatest(ls.last_status_at, lo.last_operation_at) IS NULL THEN 'NO_ACTIVITY_EVIDENCE'
    WHEN CURRENT_DATE - greatest(ls.last_status_at, lo.last_operation_at)::date >= 14 THEN 'CRITICAL_STALE'
    WHEN CURRENT_DATE - greatest(ls.last_status_at, lo.last_operation_at)::date >= 7 THEN 'STALE'
    WHEN CURRENT_DATE - greatest(ls.last_status_at, lo.last_operation_at)::date >= 3 THEN 'WATCH'
    ELSE 'ACTIVE'
  END AS aging_bucket
FROM v_exec_production_status x
LEFT JOIN last_status ls ON ls.cutting_job_id = x.cutting_job_id
LEFT JOIN last_operation lo ON lo.cutting_job_id = x.cutting_job_id;

CREATE OR REPLACE VIEW v_latest_inventory_by_item AS
WITH latest AS (
  SELECT item_id, max(snapshot_at) AS snapshot_at
  FROM inventory_snapshot
  GROUP BY item_id
)
SELECT
  i.item_id,
  l.snapshot_at,
  sum(i.on_hand) AS on_hand,
  sum(i.soft_committed) AS soft_committed,
  sum(i.hard_committed) AS hard_committed,
  sum(i.on_purchase_order) AS on_purchase_order,
  sum(i.in_transit) AS in_transit,
  sum(i.in_inspection) AS in_inspection,
  sum(i.on_hand - i.soft_committed - i.hard_committed) AS net_on_hand
FROM inventory_snapshot i
JOIN latest l ON l.item_id=i.item_id AND l.snapshot_at=i.snapshot_at
GROUP BY i.item_id,l.snapshot_at;

CREATE OR REPLACE VIEW v_open_po_by_item AS
SELECT
  item_id,
  sum(coalesce(quantity_open,0)) AS open_po_qty,
  min(promised_delivery) FILTER (WHERE coalesce(quantity_open,0) > 0) AS next_po_eta,
  count(*) FILTER (WHERE coalesce(quantity_open,0) > 0) AS open_po_lines
FROM purchase_order_line
GROUP BY item_id;

CREATE OR REPLACE VIEW v_material_readiness AS
WITH component_supply AS (
  SELECT
    cc.cutting_job_id,
    cc.cutting_component_id,
    cc.item_id,
    cc.required_qty,
    cc.need_date,
    coalesce(li.net_on_hand,0) AS net_on_hand,
    coalesce(po.open_po_qty,0) AS open_po_qty,
    po.next_po_eta,
    greatest(coalesce(cc.required_qty,0) - (coalesce(li.net_on_hand,0) + coalesce(po.open_po_qty,0)),0) AS gross_shortage_qty,
    CASE
      WHEN coalesce(cc.required_qty,0) <= coalesce(li.net_on_hand,0) THEN 'ON_HAND_READY'
      WHEN coalesce(cc.required_qty,0) <= coalesce(li.net_on_hand,0) + coalesce(po.open_po_qty,0) THEN 'WAITING_PO'
      ELSE 'SHORTAGE'
    END AS component_readiness
  FROM cutting_component cc
  LEFT JOIN v_latest_inventory_by_item li ON li.item_id=cc.item_id
  LEFT JOIN v_open_po_by_item po ON po.item_id=cc.item_id
)
SELECT
  cs.cutting_job_id,
  count(*) AS component_lines,
  count(*) FILTER (WHERE component_readiness='ON_HAND_READY') AS ready_on_hand_lines,
  count(*) FILTER (WHERE component_readiness='WAITING_PO') AS waiting_po_lines,
  count(*) FILTER (WHERE component_readiness='SHORTAGE') AS shortage_lines,
  round(
    100.0 * count(*) FILTER (WHERE component_readiness <> 'SHORTAGE') / nullif(count(*),0)
  ,2) AS gross_readiness_pct,
  sum(gross_shortage_qty) AS gross_shortage_qty,
  min(next_po_eta) FILTER (WHERE component_readiness='WAITING_PO') AS earliest_supporting_po_eta,
  CASE
    WHEN count(*) FILTER (WHERE component_readiness='SHORTAGE') > 0 THEN 'SHORTAGE'
    WHEN count(*) FILTER (WHERE component_readiness='WAITING_PO') > 0 THEN 'WAITING_PO'
    ELSE 'READY'
  END AS material_state
FROM component_supply cs
GROUP BY cs.cutting_job_id;

COMMENT ON VIEW v_material_readiness IS
'Gross/non-allocated readiness. Inventory is not reserved per cutting job; implement ATP/allocation before using as final release authority.';

CREATE OR REPLACE VIEW v_delivery_risk AS
SELECT
  x.*,
  mr.material_state,
  mr.gross_readiness_pct,
  mr.shortage_lines,
  wa.last_activity_at,
  wa.stale_days,
  CASE
    WHEN x.is_terminal THEN 0
    ELSE
      (CASE WHEN x.delivery_due IS NOT NULL AND x.delivery_due < CURRENT_DATE THEN 50 ELSE 0 END) +
      (CASE WHEN mr.material_state='SHORTAGE' THEN 30 WHEN mr.material_state='WAITING_PO' THEN 15 ELSE 0 END) +
      (CASE WHEN coalesce(wa.stale_days,0) >= 14 THEN 20 WHEN coalesce(wa.stale_days,0) >= 7 THEN 10 ELSE 0 END)
  END AS risk_score,
  CASE
    WHEN x.is_terminal THEN 'CLOSED'
    WHEN
      ((CASE WHEN x.delivery_due IS NOT NULL AND x.delivery_due < CURRENT_DATE THEN 50 ELSE 0 END) +
       (CASE WHEN mr.material_state='SHORTAGE' THEN 30 WHEN mr.material_state='WAITING_PO' THEN 15 ELSE 0 END) +
       (CASE WHEN coalesce(wa.stale_days,0) >= 14 THEN 20 WHEN coalesce(wa.stale_days,0) >= 7 THEN 10 ELSE 0 END)) >= 60
      THEN 'HIGH'
    WHEN
      ((CASE WHEN x.delivery_due IS NOT NULL AND x.delivery_due < CURRENT_DATE THEN 50 ELSE 0 END) +
       (CASE WHEN mr.material_state='SHORTAGE' THEN 30 WHEN mr.material_state='WAITING_PO' THEN 15 ELSE 0 END) +
       (CASE WHEN coalesce(wa.stale_days,0) >= 14 THEN 20 WHEN coalesce(wa.stale_days,0) >= 7 THEN 10 ELSE 0 END)) >= 30
      THEN 'MEDIUM'
    ELSE 'LOW'
  END AS risk_band
FROM v_exec_production_status x
LEFT JOIN v_material_readiness mr ON mr.cutting_job_id=x.cutting_job_id
LEFT JOIN v_wip_aging wa ON wa.cutting_job_id=x.cutting_job_id;

CREATE OR REPLACE VIEW v_work_center_load AS
SELECT
  wc.work_center_id,
  wc.business_unit,
  wc.name AS work_center_name,
  count(oe.operation_event_id) AS operation_events,
  count(DISTINCT oe.cutting_job_id) AS cutting_jobs,
  sum(oe.actual_hours) AS actual_hours,
  min(oe.started_at) AS first_activity_at,
  max(coalesce(oe.ended_at,oe.started_at)) AS last_activity_at,
  count(*) FILTER (WHERE oe.ended_at IS NULL AND oe.started_at IS NOT NULL) AS open_operations
FROM work_center wc
LEFT JOIN operation_event oe ON oe.work_center_id=wc.work_center_id
GROUP BY wc.work_center_id,wc.business_unit,wc.name;

CREATE OR REPLACE VIEW v_supplier_eta_risk AS
SELECT
  pol.po_line_id,
  pol.po_no,
  pol.line_no,
  s.supplier_id,
  s.supplier_no,
  s.supplier_name,
  i.item_id,
  i.item_no,
  i.description AS item_description,
  pol.quantity_open,
  pol.promised_delivery,
  CASE
    WHEN coalesce(pol.quantity_open,0) <= 0 THEN 'CLOSED'
    WHEN pol.promised_delivery IS NULL THEN 'NO_ETA'
    WHEN pol.promised_delivery < CURRENT_DATE THEN 'OVERDUE'
    WHEN pol.promised_delivery <= CURRENT_DATE + 3 THEN 'DUE_3D'
    WHEN pol.promised_delivery <= CURRENT_DATE + 7 THEN 'DUE_7D'
    ELSE 'OPEN'
  END AS eta_state
FROM purchase_order_line pol
LEFT JOIN supplier s ON s.supplier_id=pol.supplier_id
JOIN item i ON i.item_id=pol.item_id;

CREATE OR REPLACE VIEW v_data_quality AS
SELECT 'cutting_without_work_order'::text AS check_name,
       count(*)::bigint AS issue_count,
       'CRITICAL'::text AS severity
FROM cutting_job cj
LEFT JOIN work_order wo ON wo.work_order_id=cj.work_order_id
WHERE wo.work_order_id IS NULL
UNION ALL
SELECT 'cutting_without_operation_event',
       count(*)::bigint,
       'WARN'
FROM cutting_job cj
LEFT JOIN operation_event oe ON oe.cutting_job_id=cj.cutting_job_id
WHERE oe.cutting_job_id IS NULL
UNION ALL
SELECT 'component_without_item',
       count(*)::bigint,
       'CRITICAL'
FROM cutting_component cc
LEFT JOIN item i ON i.item_id=cc.item_id
WHERE i.item_id IS NULL
UNION ALL
SELECT 'operation_missing_actual_hours',
       count(*)::bigint,
       'WARN'
FROM operation_event
WHERE actual_hours IS NULL
UNION ALL
SELECT 'open_cutting_without_delivery_due',
       count(*)::bigint,
       'WARN'
FROM cutting_job
WHERE current_status NOT IN ('99','9D') AND delivery_due IS NULL
UNION ALL
SELECT 'po_open_without_eta',
       count(*)::bigint,
       'WARN'
FROM purchase_order_line
WHERE coalesce(quantity_open,0) > 0 AND promised_delivery IS NULL;

DROP MATERIALIZED VIEW IF EXISTS mv_exec_daily_snapshot;
CREATE MATERIALIZED VIEW mv_exec_daily_snapshot AS
SELECT
  CURRENT_DATE AS snapshot_date,
  count(*) AS cutting_jobs,
  count(*) FILTER (WHERE NOT is_terminal) AS open_cutting_jobs,
  count(*) FILTER (WHERE is_terminal) AS terminal_cutting_jobs,
  count(*) FILTER (WHERE execution_state='OVERDUE_OPEN') AS overdue_open_jobs
FROM v_exec_production_status;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_exec_daily_snapshot
ON mv_exec_daily_snapshot(snapshot_date);

-- Suggested refresh after ETL:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_exec_daily_snapshot;
