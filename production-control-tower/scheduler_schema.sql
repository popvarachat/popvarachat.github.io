-- Practika Production Control Tower
-- Dynamic / What-if Scheduling additive schema
-- Apply AFTER schema.sql
-- Scenario changes never overwrite baseline schedule directly.

CREATE TABLE IF NOT EXISTS capacity_calendar (
  capacity_calendar_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id uuid NOT NULL REFERENCES work_center(work_center_id),
  calendar_date date NOT NULL,
  shift_code text NOT NULL,
  available_minutes integer NOT NULL CHECK (available_minutes >= 0),
  labor_available_minutes integer,
  machine_available_minutes integer,
  overtime_available_minutes integer NOT NULL DEFAULT 0,
  planned_downtime_minutes integer NOT NULL DEFAULT 0,
  frozen_flag boolean NOT NULL DEFAULT false,
  locked_reason text,
  source_system text,
  source_updated_at timestamptz,
  UNIQUE(work_center_id,calendar_date,shift_code)
);

CREATE TABLE IF NOT EXISTS schedule_scenario (
  schedule_scenario_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name text NOT NULL,
  base_snapshot_at timestamptz NOT NULL,
  scenario_state text NOT NULL DEFAULT 'DRAFT',
  objective_policy text NOT NULL DEFAULT 'MINIMIZE_TOTAL_RISK',
  frozen_horizon_until date,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  notes text,
  CHECK (scenario_state IN ('DRAFT','SIMULATED','VALIDATED','APPROVED','PUBLISHED','REJECTED','SUPERSEDED'))
);

CREATE TABLE IF NOT EXISTS scheduled_operation (
  scheduled_operation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_scenario_id uuid NOT NULL REFERENCES schedule_scenario(schedule_scenario_id) ON DELETE CASCADE,
  cutting_job_id uuid NOT NULL REFERENCES cutting_job(cutting_job_id),
  work_order_id uuid REFERENCES work_order(work_order_id),
  work_center_id uuid NOT NULL REFERENCES work_center(work_center_id),
  operation_seq numeric(10,2) NOT NULL,
  planned_start_at timestamptz NOT NULL,
  planned_end_at timestamptz NOT NULL,
  required_minutes integer NOT NULL CHECK (required_minutes >= 0),
  allocated_minutes integer NOT NULL CHECK (allocated_minutes >= 0),
  lock_state text NOT NULL DEFAULT 'FLEX',
  source_plan text NOT NULL DEFAULT 'SCENARIO',
  baseline_start_at timestamptz,
  baseline_end_at timestamptz,
  move_reason text,
  CHECK (planned_end_at >= planned_start_at),
  CHECK (lock_state IN ('LOCKED','FROZEN','FLEX')),
  UNIQUE(schedule_scenario_id,cutting_job_id,operation_seq)
);
CREATE INDEX IF NOT EXISTS idx_sched_op_lane
ON scheduled_operation(schedule_scenario_id,work_center_id,planned_start_at,planned_end_at);

CREATE TABLE IF NOT EXISTS schedule_change_request (
  schedule_change_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_scenario_id uuid NOT NULL REFERENCES schedule_scenario(schedule_scenario_id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_key text NOT NULL,
  requested_action text NOT NULL,
  requested_delta_days integer,
  requested_start date,
  requested_complete date,
  reason text,
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_type IN ('SO','WO','CUTTING','OPERATION')),
  CHECK (requested_action IN ('MOVE_EARLIER','MOVE_LATER','SET_DATE','REPRIORITIZE','HOLD','RELEASE'))
);

CREATE TABLE IF NOT EXISTS constraint_violation (
  constraint_violation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_scenario_id uuid NOT NULL REFERENCES schedule_scenario(schedule_scenario_id) ON DELETE CASCADE,
  scheduled_operation_id uuid REFERENCES scheduled_operation(scheduled_operation_id) ON DELETE CASCADE,
  violation_type text NOT NULL,
  severity text NOT NULL,
  constraint_key text,
  evidence jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (severity IN ('INFO','SOFT','HARD','CRITICAL')),
  CHECK (violation_type IN (
    'CAPACITY_OVERLOAD','MATERIAL_NOT_READY','PRECEDENCE_BROKEN',
    'FROZEN_SLOT_CHANGED','LOCKED_JOB_MOVED','DUE_DATE_MISS',
    'QC_HOLD','MAINTENANCE_CONFLICT','CALENDAR_GAP','ALTERNATE_ROUTE_REQUIRED'
  ))
);
CREATE INDEX IF NOT EXISTS idx_constraint_open
ON constraint_violation(schedule_scenario_id,severity)
WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS schedule_slot_metric (
  schedule_slot_metric_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_scenario_id uuid NOT NULL REFERENCES schedule_scenario(schedule_scenario_id) ON DELETE CASCADE,
  work_center_id uuid NOT NULL REFERENCES work_center(work_center_id),
  calendar_date date NOT NULL,
  shift_code text NOT NULL,
  capacity_minutes integer NOT NULL,
  load_minutes integer NOT NULL,
  remaining_minutes integer NOT NULL,
  utilization_pct numeric(7,2) NOT NULL,
  hard_violation_count integer NOT NULL DEFAULT 0,
  soft_violation_count integer NOT NULL DEFAULT 0,
  slot_health text NOT NULL,
  CHECK (slot_health IN ('GREEN','AMBER','RED','LOCKED')),
  UNIQUE(schedule_scenario_id,work_center_id,calendar_date,shift_code)
);

CREATE TABLE IF NOT EXISTS schedule_impact (
  schedule_impact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_scenario_id uuid NOT NULL REFERENCES schedule_scenario(schedule_scenario_id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_key text NOT NULL,
  metric_name text NOT NULL,
  baseline_value numeric(18,4),
  scenario_value numeric(18,4),
  delta_value numeric(18,4),
  impact_band text,
  evidence jsonb,
  CHECK (impact_band IN ('IMPROVED','NEUTRAL','WATCH','WORSE','CRITICAL'))
);

CREATE TABLE IF NOT EXISTS schedule_publish_audit (
  schedule_publish_audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_scenario_id uuid NOT NULL REFERENCES schedule_scenario(schedule_scenario_id),
  action text NOT NULL,
  actor text NOT NULL,
  action_at timestamptz NOT NULL DEFAULT now(),
  before_snapshot jsonb,
  after_snapshot jsonb,
  source_verification jsonb
);

-- Baseline publish gate.
CREATE OR REPLACE VIEW v_schedule_publish_gate AS
SELECT
  s.schedule_scenario_id,
  s.scenario_name,
  s.scenario_state,
  count(v.constraint_violation_id) FILTER (
    WHERE v.resolved_at IS NULL AND v.severity IN ('HARD','CRITICAL')
  ) AS hard_violation_count,
  count(v.constraint_violation_id) FILTER (
    WHERE v.resolved_at IS NULL AND v.severity='SOFT'
  ) AS soft_violation_count,
  count(m.schedule_slot_metric_id) FILTER (WHERE m.slot_health='RED') AS red_slot_count,
  CASE
    WHEN s.scenario_state NOT IN ('VALIDATED','APPROVED') THEN false
    WHEN count(v.constraint_violation_id) FILTER (
      WHERE v.resolved_at IS NULL AND v.severity IN ('HARD','CRITICAL')
    ) > 0 THEN false
    WHEN count(m.schedule_slot_metric_id) FILTER (WHERE m.slot_health='RED') > 0 THEN false
    ELSE true
  END AS publish_ready
FROM schedule_scenario s
LEFT JOIN constraint_violation v ON v.schedule_scenario_id=s.schedule_scenario_id
LEFT JOIN schedule_slot_metric m ON m.schedule_scenario_id=s.schedule_scenario_id
GROUP BY s.schedule_scenario_id,s.scenario_name,s.scenario_state;

COMMENT ON VIEW v_schedule_publish_gate IS
'Fail-closed gate: a scenario cannot be published if any unresolved HARD/CRITICAL violation or RED production slot remains.';

-- Suggested slot-health policy (configurable in app):
-- GREEN  : utilization < 85%
-- AMBER  : utilization >= 85% and <= 100%
-- RED    : utilization > 100% OR hard constraint breach
-- LOCKED : frozen/maintenance/no-change window

-- Solver recommendation for implementation:
-- finite-capacity job-shop / RCPSP model using OR-Tools CP-SAT or equivalent.
-- Objective is multi-criteria: minimize due-date lateness, hard violations,
-- total moved minutes, setup change, overtime and material risk.
