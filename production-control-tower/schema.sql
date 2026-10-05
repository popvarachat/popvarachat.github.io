-- Practika Production Control Tower
-- PostgreSQL implementation baseline
-- Rebuilt from SO_WO_Cutting legacy Access + supplied CSV extracts

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE customer (
  customer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_no text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  source_system text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project (
  project_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customer(customer_id),
  project_no text NOT NULL UNIQUE,
  project_name text,
  install_location text,
  active boolean NOT NULL DEFAULT true,
  source_system text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE item (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_no text NOT NULL UNIQUE,
  item_code_2 text,
  item_code_3 text,
  description text,
  description_2 text,
  stocking_type text,
  primary_uom text,
  material_status text,
  make_buy_code text,
  source_system text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_item_code_2 ON item(item_code_2);

CREATE TABLE supplier (
  supplier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_no text NOT NULL UNIQUE,
  supplier_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  source_system text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE work_center (
  work_center_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit text NOT NULL UNIQUE,
  name text,
  capacity_group text,
  active boolean NOT NULL DEFAULT true,
  source_system text
);

CREATE TABLE status_code (
  domain text NOT NULL,
  status_code text NOT NULL,
  description text NOT NULL,
  sequence_no integer,
  is_terminal boolean NOT NULL DEFAULT false,
  source_system text,
  PRIMARY KEY(domain,status_code)
);

CREATE TABLE sales_order (
  sales_order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customer(customer_id),
  project_id uuid REFERENCES project(project_id),
  order_no text NOT NULL UNIQUE,
  order_type text,
  order_company text,
  order_date date,
  request_date date,
  original_promised date,
  promised_delivery date,
  actual_ship_date date,
  currency_code text,
  source_system text,
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_order_project ON sales_order(project_id);
CREATE INDEX idx_sales_order_promised ON sales_order(promised_delivery);

CREATE TABLE sales_order_line (
  sales_order_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES sales_order(sales_order_id) ON DELETE CASCADE,
  item_id uuid REFERENCES item(item_id),
  line_no numeric(12,3) NOT NULL,
  description text,
  quantity_ordered numeric(18,4),
  quantity_shipped numeric(18,4),
  quantity_backordered numeric(18,4),
  uom text,
  unit_price numeric(18,4),
  request_date date,
  scheduled_pick date,
  promised_delivery date,
  last_status text,
  next_status text,
  source_system text,
  UNIQUE(sales_order_id,line_no)
);

CREATE TABLE work_order (
  work_order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_line_id uuid REFERENCES sales_order_line(sales_order_line_id),
  wo_no text NOT NULL UNIQUE,
  wo_type text,
  fg_item_id uuid REFERENCES item(item_id),
  quantity_ordered numeric(18,4),
  release_date date,
  planned_start date,
  planned_complete date,
  source_system text,
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_order_so_line ON work_order(sales_order_line_id);
CREATE INDEX idx_work_order_planned_complete ON work_order(planned_complete);

CREATE TABLE cutting_job (
  cutting_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_order(work_order_id) ON DELETE CASCADE,
  cutting_no text NOT NULL UNIQUE,
  cutting_type text,
  current_status text,
  current_status_description text,
  material_item_id uuid REFERENCES item(item_id),
  receipt_date date,
  planned_finish date,
  transfer_due date,
  delivery_due date,
  actual_transfer_60 date,
  actual_receive_70 date,
  actual_close_99 date,
  actual_complete_9d date,
  engineer_code text,
  engineer_name text,
  install_location text,
  source_system text,
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cutting_job_wo ON cutting_job(work_order_id);
CREATE INDEX idx_cutting_job_status ON cutting_job(current_status);
CREATE INDEX idx_cutting_job_due ON cutting_job(delivery_due);

CREATE TABLE cutting_component (
  cutting_component_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_job_id uuid NOT NULL REFERENCES cutting_job(cutting_job_id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES item(item_id),
  line_no numeric(12,3),
  required_qty numeric(18,4) NOT NULL,
  open_qty numeric(18,4),
  uom text,
  need_date date,
  component_description text,
  source_order_no text,
  source_group_no text,
  source_system text,
  UNIQUE(cutting_job_id,item_id,line_no)
);
CREATE INDEX idx_cutting_component_item ON cutting_component(item_id);

CREATE TABLE control_plan (
  control_plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_job_id uuid NOT NULL REFERENCES cutting_job(cutting_job_id) ON DELETE CASCADE,
  operation_seq numeric(10,2) NOT NULL,
  work_center_id uuid REFERENCES work_center(work_center_id),
  standard_minutes numeric(12,2),
  rule_version text,
  control_method text,
  effective_from date,
  effective_to date,
  source_system text,
  UNIQUE(cutting_job_id,operation_seq,rule_version)
);

CREATE TABLE operation_event (
  operation_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_job_id uuid NOT NULL REFERENCES cutting_job(cutting_job_id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_order(work_order_id),
  work_center_id uuid REFERENCES work_center(work_center_id),
  operation_seq numeric(10,2),
  team_code text,
  employee_count_daily numeric(10,2),
  employee_count_monthly numeric(10,2),
  started_at timestamptz,
  ended_at timestamptz,
  actual_hours numeric(12,4),
  operation_status text,
  source_system text,
  source_row_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX idx_operation_cutting ON operation_event(cutting_job_id,started_at);
CREATE INDEX idx_operation_work_center ON operation_event(work_center_id,started_at);

CREATE TABLE cutting_status_event (
  status_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_job_id uuid NOT NULL REFERENCES cutting_job(cutting_job_id) ON DELETE CASCADE,
  status_domain text NOT NULL DEFAULT 'CUTTING',
  status_code text NOT NULL,
  event_at timestamptz NOT NULL,
  source_system text,
  source_user text,
  evidence jsonb,
  FOREIGN KEY(status_domain,status_code) REFERENCES status_code(domain,status_code)
);
CREATE INDEX idx_cutting_status_history ON cutting_status_event(cutting_job_id,event_at);

CREATE TABLE inventory_snapshot (
  inventory_snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES item(item_id),
  branch_plant text NOT NULL,
  location text,
  lot_no text,
  on_hand numeric(18,4) NOT NULL DEFAULT 0,
  soft_committed numeric(18,4) NOT NULL DEFAULT 0,
  hard_committed numeric(18,4) NOT NULL DEFAULT 0,
  backordered numeric(18,4) NOT NULL DEFAULT 0,
  in_transit numeric(18,4) NOT NULL DEFAULT 0,
  on_purchase_order numeric(18,4) NOT NULL DEFAULT 0,
  in_inspection numeric(18,4) NOT NULL DEFAULT 0,
  unit_cost numeric(18,4),
  currency_code text,
  snapshot_at timestamptz NOT NULL,
  source_system text,
  UNIQUE(item_id,branch_plant,location,lot_no,snapshot_at)
);
CREATE INDEX idx_inventory_item_snapshot ON inventory_snapshot(item_id,snapshot_at DESC);

CREATE TABLE purchase_order_line (
  po_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES supplier(supplier_id),
  item_id uuid NOT NULL REFERENCES item(item_id),
  po_no text NOT NULL,
  po_type text,
  line_no numeric(12,3) NOT NULL,
  branch_plant text,
  quantity_ordered numeric(18,4),
  quantity_received numeric(18,4),
  quantity_open numeric(18,4),
  order_date date,
  promised_delivery date,
  cancel_date date,
  last_receipt_date date,
  status text,
  source_system text,
  UNIQUE(po_no,po_type,line_no)
);
CREATE INDEX idx_po_item_delivery ON purchase_order_line(item_id,promised_delivery);
CREATE INDEX idx_po_supplier ON purchase_order_line(supplier_id);

CREATE TABLE planning_decision (
  planning_decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_job_id uuid REFERENCES cutting_job(cutting_job_id),
  decision_type text NOT NULL,
  priority_score numeric(10,4),
  material_readiness_pct numeric(6,2),
  late_risk_pct numeric(6,2),
  recommendation jsonb,
  decision_state text NOT NULL DEFAULT 'PROPOSED',
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decision_state IN ('PROPOSED','APPROVED','REJECTED','SUPERSEDED'))
);
CREATE INDEX idx_planning_decision_cutting ON planning_decision(cutting_job_id,created_at DESC);

CREATE TABLE alert_event (
  alert_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_job_id uuid REFERENCES cutting_job(cutting_job_id),
  alert_type text NOT NULL,
  severity text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  evidence jsonb,
  source_rule text,
  CHECK (severity IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL'))
);
CREATE INDEX idx_alert_open ON alert_event(severity,detected_at DESC) WHERE resolved_at IS NULL;

CREATE TABLE source_record_map (
  source_record_map_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_table text NOT NULL,
  source_key text NOT NULL,
  target_table text NOT NULL,
  target_id uuid NOT NULL,
  source_row_hash text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_system,source_table,source_key,target_table)
);

INSERT INTO status_code(domain,status_code,description,sequence_no,is_terminal) VALUES
('CUTTING','30','พิมพ์ CUTTING / control-plan stage',30,false),
('CUTTING','40','วางแผนลงเวลารับเสร็จสิ้น',40,false),
('CUTTING','45','ส่งไป Mock Up',45,false),
('CUTTING','54','ส่ง Store',54,false),
('CUTTING','60','โอนชิ้นส่วน',60,false),
('CUTTING','65','โอนชิ้นส่วนไปหน่วยงานถัดไป',65,false),
('CUTTING','70','รับชิ้นส่วน',70,false),
('CUTTING','99','จบ CUTTING',99,true),
('CUTTING','9D','โอนชิ้นส่วนครบ',100,true)
ON CONFLICT DO NOTHING;
