-- Practika Production Control Tower
-- Production Domain V2 - legacy-intelligence hardening
-- Apply AFTER schema.sql and BEFORE scheduler_schema.sql/report_views.sql as applicable.
-- Design principle: deterministic source lineage + routing + stage rules first; AI remains advisory.

CREATE TABLE IF NOT EXISTS source_batch (
  source_batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  batch_name text NOT NULL,
  extracted_at timestamptz,
  valid_from date,
  valid_to date,
  source_timezone text,
  source_file_name text,
  source_file_hash text,
  row_count bigint,
  schema_fingerprint text,
  ingest_state text NOT NULL DEFAULT 'DISCOVERED',
  quality_state text NOT NULL DEFAULT 'UNASSESSED',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_system,batch_name,source_file_name,source_file_hash),
  CHECK (ingest_state IN ('DISCOVERED','STAGED','NORMALIZED','REJECTED','SUPERSEDED')),
  CHECK (quality_state IN ('UNASSESSED','PASS','WARN','FAIL'))
);

CREATE TABLE IF NOT EXISTS source_dataset (
  source_dataset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_batch_id uuid NOT NULL REFERENCES source_batch(source_batch_id) ON DELETE CASCADE,
  dataset_name text NOT NULL,
  grain text,
  natural_key_definition jsonb,
  min_business_date date,
  max_business_date date,
  row_count bigint,
  distinct_key_count bigint,
  data_profile jsonb,
  UNIQUE(source_batch_id,dataset_name)
);

CREATE TABLE IF NOT EXISTS data_quality_event (
  data_quality_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_batch_id uuid REFERENCES source_batch(source_batch_id),
  dataset_name text,
  source_key text,
  quality_code text NOT NULL,
  severity text NOT NULL,
  field_name text,
  raw_value text,
  normalized_value text,
  evidence jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (severity IN ('INFO','WARN','ERROR','CRITICAL'))
);
CREATE INDEX IF NOT EXISTS idx_dq_open
ON data_quality_event(severity,detected_at DESC)
WHERE resolved_at IS NULL;

ALTER TABLE source_record_map
  ADD COLUMN IF NOT EXISTS source_batch_id uuid REFERENCES source_batch(source_batch_id);
CREATE INDEX IF NOT EXISTS idx_source_record_batch
ON source_record_map(source_batch_id,source_table,source_key);

ALTER TABLE work_center
  ADD COLUMN IF NOT EXISTS family_code text,
  ADD COLUMN IF NOT EXISTS stage_family text,
  ADD COLUMN IF NOT EXISTS work_center_description text;

CREATE INDEX IF NOT EXISTS idx_work_center_family
ON work_center(family_code);

ALTER TABLE control_plan
  ADD COLUMN IF NOT EXISTS operation_description text,
  ADD COLUMN IF NOT EXISTS operation_code text,
  ADD COLUMN IF NOT EXISTS source_batch_id uuid REFERENCES source_batch(source_batch_id),
  ADD COLUMN IF NOT EXISTS route_family text;

CREATE INDEX IF NOT EXISTS idx_control_plan_cutting_seq
ON control_plan(cutting_job_id,operation_seq);

CREATE TABLE IF NOT EXISTS production_stage_rule (
  production_stage_rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_type text NOT NULL,
  cutting_status text NOT NULL,
  last_controlplan_family text,
  resolved_stage text NOT NULL,
  stage_group text,
  rule_priority integer NOT NULL DEFAULT 100,
  effective_from date NOT NULL,
  effective_to date,
  rule_state text NOT NULL DEFAULT 'OBSERVED',
  source_reference text,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (rule_state IN ('OBSERVED','VERIFIED','RETIRED','REJECTED')),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX IF NOT EXISTS idx_stage_rule_lookup
ON production_stage_rule(cutting_type,cutting_status,last_controlplan_family,effective_from DESC);

ALTER TABLE item
  ADD COLUMN IF NOT EXISTS planner_no text,
  ADD COLUMN IF NOT EXISTS planner_name text,
  ADD COLUMN IF NOT EXISTS buyer_no text,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS leadtime_cumulative numeric(12,2),
  ADD COLUMN IF NOT EXISTS make_buy_description text,
  ADD COLUMN IF NOT EXISTS planning_code text,
  ADD COLUMN IF NOT EXISTS planning_code_description text,
  ADD COLUMN IF NOT EXISTS abc_sales text,
  ADD COLUMN IF NOT EXISTS abc_margin text,
  ADD COLUMN IF NOT EXISTS abc_investment text,
  ADD COLUMN IF NOT EXISTS purchase_uom text,
  ADD COLUMN IF NOT EXISTS production_uom text,
  ADD COLUMN IF NOT EXISTS component_uom text;

ALTER TABLE inventory_snapshot
  ADD COLUMN IF NOT EXISTS wo_hard_committed numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wo_soft_committed numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_hard_committed numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_po_qty numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inbound_qty numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outbound_qty numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS future_qty numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_batch_id uuid REFERENCES source_batch(source_batch_id);

ALTER TABLE purchase_order_line
  ADD COLUMN IF NOT EXISTS confirmed_delivery date,
  ADD COLUMN IF NOT EXISTS buyer_id text,
  ADD COLUMN IF NOT EXISTS source_batch_id uuid REFERENCES source_batch(source_batch_id),
  ADD COLUMN IF NOT EXISTS original_promise date,
  ADD COLUMN IF NOT EXISTS request_date date;

ALTER TABLE operation_event
  ADD COLUMN IF NOT EXISTS operation_status_code text,
  ADD COLUMN IF NOT EXISTS daily_headcount numeric(10,2),
  ADD COLUMN IF NOT EXISTS monthly_headcount numeric(10,2),
  ADD COLUMN IF NOT EXISTS derived_elapsed_minutes numeric(12,2),
  ADD COLUMN IF NOT EXISTS duration_quality text,
  ADD COLUMN IF NOT EXISTS source_batch_id uuid REFERENCES source_batch(source_batch_id),
  ADD COLUMN IF NOT EXISTS source_begin_raw text,
  ADD COLUMN IF NOT EXISTS source_end_raw text;

ALTER TABLE cutting_job
  ADD COLUMN IF NOT EXISTS source_batch_id uuid REFERENCES source_batch(source_batch_id),
  ADD COLUMN IF NOT EXISTS route_profile text,
  ADD COLUMN IF NOT EXISTS stage_resolution_state text;

ALTER TABLE work_order
  ADD COLUMN IF NOT EXISTS source_batch_id uuid REFERENCES source_batch(source_batch_id);

ALTER TABLE sales_order
  ADD COLUMN IF NOT EXISTS source_batch_id uuid REFERENCES source_batch(source_batch_id);

INSERT INTO status_code(domain,status_code,description,sequence_no,is_terminal)
VALUES
('CUTTING','50','จ้างผลิต RM อุปกรณ์ - PTK',50,false),
('CUTTING','53','จ้างผลิตบางส่วน',53,false),
('CUTTING','74','ผ่านบางส่วน',74,false),
('CUTTING','80','ซ่อมงาน',80,false)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE VIEW v_cutting_route_profile AS
WITH ranked AS (
  SELECT
    cp.cutting_job_id,
    cp.operation_seq,
    cp.work_center_id,
    coalesce(cp.route_family,wc.family_code) AS family_code,
    row_number() OVER (
      PARTITION BY cp.cutting_job_id
      ORDER BY cp.operation_seq DESC, cp.control_plan_id DESC
    ) AS rn_last,
    count(*) OVER (PARTITION BY cp.cutting_job_id) AS operation_count
  FROM control_plan cp
  LEFT JOIN work_center wc ON wc.work_center_id=cp.work_center_id
)
SELECT
  cutting_job_id,
  max(operation_count) AS operation_count,
  max(family_code) FILTER (WHERE rn_last=1) AS last_controlplan_family
FROM ranked
GROUP BY cutting_job_id;

CREATE OR REPLACE VIEW v_cutting_stage_resolution AS
SELECT
  cj.cutting_job_id,
  cj.cutting_no,
  cj.cutting_type,
  cj.current_status AS cutting_status,
  rp.last_controlplan_family,
  rule.resolved_stage,
  rule.rule_state,
  rule.production_stage_rule_id,
  CASE
    WHEN rule.production_stage_rule_id IS NULL THEN 'UNMAPPED'
    WHEN rule.rule_state='VERIFIED' THEN 'VERIFIED'
    ELSE 'OBSERVED_RULE'
  END AS resolution_state
FROM cutting_job cj
LEFT JOIN v_cutting_route_profile rp
  ON rp.cutting_job_id=cj.cutting_job_id
LEFT JOIN LATERAL (
  SELECT r.*
  FROM production_stage_rule r
  WHERE r.cutting_type=cj.cutting_type
    AND r.cutting_status=cj.current_status
    AND (r.last_controlplan_family=rp.last_controlplan_family OR r.last_controlplan_family IS NULL)
    AND r.effective_from <= coalesce(cj.receipt_date,CURRENT_DATE)
    AND (r.effective_to IS NULL OR r.effective_to >= coalesce(cj.receipt_date,CURRENT_DATE))
    AND r.rule_state IN ('OBSERVED','VERIFIED')
  ORDER BY
    CASE WHEN r.last_controlplan_family=rp.last_controlplan_family THEN 0 ELSE 1 END,
    CASE WHEN r.rule_state='VERIFIED' THEN 0 ELSE 1 END,
    r.rule_priority ASC,
    r.effective_from DESC
  LIMIT 1
) rule ON true;

CREATE OR REPLACE VIEW v_inventory_availability_components AS
SELECT
  i.item_id,
  i.snapshot_at,
  i.branch_plant,
  i.location,
  i.lot_no,
  i.on_hand,
  i.soft_committed,
  i.hard_committed,
  i.wo_hard_committed,
  i.wo_soft_committed,
  i.project_hard_committed,
  i.in_transit,
  i.on_purchase_order,
  i.in_inspection,
  i.other_po_qty,
  i.inbound_qty,
  i.outbound_qty,
  greatest(
    i.on_hand
    - i.soft_committed
    - i.hard_committed
    - i.wo_hard_committed
    - i.wo_soft_committed
    - i.project_hard_committed
    - i.outbound_qty,
    0
  ) AS available_now_unallocated,
  greatest(i.in_transit,0)
    + greatest(i.on_purchase_order,0)
    + greatest(i.other_po_qty,0)
    + greatest(i.inbound_qty,0) AS future_supply_unallocated,
  i.in_inspection AS inspection_not_released
FROM inventory_snapshot i;

COMMENT ON VIEW v_inventory_availability_components IS
'Component-level availability only. Values remain unallocated until an explicit ATP/reservation policy assigns supply to demand.';

CREATE OR REPLACE VIEW v_operation_duration_quality AS
SELECT
  oe.*,
  CASE
    WHEN oe.started_at IS NULL OR oe.ended_at IS NULL THEN 'MISSING_TIMESTAMP'
    WHEN oe.ended_at < oe.started_at THEN 'NEGATIVE_DURATION'
    WHEN extract(epoch FROM (oe.ended_at-oe.started_at))/60.0 > 1440 THEN 'OVER_24H_REVIEW'
    WHEN extract(year FROM oe.started_at) NOT BETWEEN 2000 AND 2100
      OR extract(year FROM oe.ended_at) NOT BETWEEN 2000 AND 2100 THEN 'DATE_OUTLIER'
    ELSE 'DERIVABLE'
  END AS derived_duration_state,
  CASE
    WHEN oe.started_at IS NOT NULL
      AND oe.ended_at IS NOT NULL
      AND oe.ended_at >= oe.started_at
      AND extract(epoch FROM (oe.ended_at-oe.started_at))/60.0 <= 1440
      AND extract(year FROM oe.started_at) BETWEEN 2000 AND 2100
      AND extract(year FROM oe.ended_at) BETWEEN 2000 AND 2100
    THEN round((extract(epoch FROM (oe.ended_at-oe.started_at))/60.0)::numeric,2)
    ELSE NULL
  END AS provisional_elapsed_minutes
FROM operation_event oe;

CREATE OR REPLACE VIEW v_source_batch_health AS
SELECT
  b.source_batch_id,
  b.source_system,
  b.batch_name,
  b.extracted_at,
  b.valid_from,
  b.valid_to,
  b.row_count,
  b.ingest_state,
  b.quality_state,
  count(q.data_quality_event_id) FILTER (WHERE q.resolved_at IS NULL) AS open_quality_events,
  count(q.data_quality_event_id) FILTER (
    WHERE q.resolved_at IS NULL AND q.severity IN ('ERROR','CRITICAL')
  ) AS blocking_quality_events
FROM source_batch b
LEFT JOIN data_quality_event q ON q.source_batch_id=b.source_batch_id
GROUP BY b.source_batch_id;

-- Legacy evidence to seed OUTSIDE public repository:
-- CuttingStatus.xlsx contains 789 observed mappings and 785 unique
-- (cutting_type, cutting_status, last_controlplan_family, resolved_stage) combinations.
-- Import those rows as rule_state='OBSERVED'; promote to VERIFIED only after business validation.
--
-- Newly observed status codes in 2021-2022 monitor data: 50,53,74,80.
-- They intentionally resolve UNMAPPED until explicit stage rules are approved.
--
-- Important lineage rule:
-- Do not interpret a failed join between files from different source periods as a broken business key.
-- Reconcile by source_batch/effective window first.