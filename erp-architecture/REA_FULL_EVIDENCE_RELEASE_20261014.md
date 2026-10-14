# ERP REA Public Evidence Catalog — Release and Privacy Boundary

## What is included
- Complete observed JDE metadata menu/task inventory (856 paths); 268 P/R object/form/version combinations; 103 Report/UBE lookup rows; 19 Business View source associations; 37 technical gates; 5 real RCA case acceptance tickets; selected prior inquiry/support observations; curated historical registries.
- SHA-256 and original private GitHub URL for every evidence source (60 source files in the baseline snapshot), including internal scripts and documents.
- Interactive search, filters, paginated rows, row-level drilldown, field-level descriptions and direct links to the original private evidence file.

## What's NOT in public GitHub Pages (even with project-owner approval)
JDE credentials, cookies, auth tokens, confidential row-level customer/supplier/employee/financial records, raw internal infrastructure and security exports. Users can access these under existing authorization in the private GitHub repo.

## Important evidence status
- Menu task metadata means "observed under the authorized scan", not "all JDE menus, all roles, or correct execution semantics certified".
- Report lookup is not an approved report execution list; UBE Update Y/N and Processing Options require developer certification.
- Business View observations do not certify physical tables/joins. 0 physical mappings have authorized certification in the published baseline.
- Six gates A–F total 37 records, currently 0 signed, five real paired RCA cases currently 0 certified.
- JDE dashboard Data Pool NOT_CONNECTED; no fabricated operational KPIs or report output.

## Technical generation and provenance
- Private source: popvarachat/practika-erp-architecture, exact local clone snapshot on 14 Oct 2026.
- Generated with `build_erp_evidence.py` on authorized POP-FARM01 PC. This script is intended as an internal build tool, not public code containing credentials.
- Public `evidence-data.json` materializes selected read-only metadata with field names preserved and case/topic links.
- The Private Vault full hashed index lives at `docs/28_rea_full_evidence_vault_20261014.md` and machine manifest at `data/rea_evidence_vault_manifest_20261014.json`.
- Do NOT equate the public JSON with a direct live ERP interface. This is a static evidence catalog with an observed-at cutoff.

## New web surfaces
1. `/erp-architecture/evidence.html`: full interactive JDE technical evidence explorer + private provenance.
2. `/erp-architecture/rea.html`: three-tier interactive REA story + support and certification.
3. Main architecture home, Scan Audit, Executive Dashboard, Mind Map: all link the Evidence Explorer.
