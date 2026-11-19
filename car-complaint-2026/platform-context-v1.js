/* Public safe metrics only. Source files, PII, passwords and original PDF bytes never published. */
window.PTK_PLATFORM_CONTEXT={
 "schema":"practika.qmr.platform_monitor.public.v1",
 "assessed_at":"2026-11-19",
 "data_scope":"Cross-source audit; management signals, not QMR effectiveness signoff",
 "secondary_report":{"delivery_car_mismatches":2,"qc_pass_without_evidence_link":3,"qc_stale_car_reference":1},
 "ingestion":{"register_count":15,"audited_case_count":15,
   "last_auto_success":"2026-10-26",
   "last_sync_status":"FAILED",
   "last_source_snapshot":"2026-11-17T09:06:50Z",
   "failure_class":"STALE_CALCULATION_CACHE",
   "source_mismatch_note":"Summary26 cached total 14 while October PMO allocation includes one extra event. Do not overwrite authoritative 15-case register with stale cached formulas."},
 "governance":{"intake_can_be_pending":true,"qmr_human_gate":true,
  "public_source_is_sanitized":true,"originals_read_only":true}
};
