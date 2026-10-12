# Practika CRM Workflow — Persistent RDC Policy
Last updated: 2026-10-12
Owner / Human Gate: User. Repo: popvarachat/popvarachat.github.io
Scope: /crm-workflow/ (public-safe presentation only)

## Operating policy — MUST follow
1. FAST EXECUTION MODE: API/MCP/CLI first; parallelize independent operations; browser automation through authorized Playwright extension only when necessary; Windows desktop automation last fallback. Avoid repeated discussion and unnecessary approvals. Stop only on completion or genuine Human Gate; report blockers with concrete remedy.
2. Do not claim completion without verifying GitHub commit, manual publish-pages workflow (workflow_dispatch), successful deployment, HTTP 200 and real browser QA. This repo DOES NOT auto-publish on commit. To deploy, dispatch `.github/workflows/publish-pages.yml` and verify its run.
3. The user's approved CRM Workflow style is a visually curated, connected graph—not a rectangular grid. Use non-overlapping thematic groups, curved Bézier connectors, differentiated colors, click-to-inspect nodes, and focus modes (Business / Reports / CRM↔ERP). No nested vertical/horizontal scrolling inside workflow and no page-level horizontal scrolling. Prefer auto-fit to the available viewport. Test desktop and mobile viewports after layout changes.
4. Source of Truth for this web: `crm-workflow/index.html`. Reference design: `erp-architecture/index.html`. Preserve the existing ERP and Production Control Tower pages. Don't overwrite unrelated work.
5. Keep the web understandable for non-IT colleagues: executive story, business lifecycle, domain map, decision-first report workflow/catalog, CRM–ERP mapping, RCA/controls, guided learning, evidence/QA. Clickable nodes must explain business purpose, fields, decision, evidence and remaining uncertainty.
6. Read-only investigation of production CRM/JDE. Never create, edit, move, delete, export customer data or trigger bulk actions; avoid side-effecting RUNREPORT / QP41 email dispatch without explicit approval. No passwords, access tokens, customer names, quote IDs, personal data, contract values or sensitive internal architecture in the PUBLIC repository.
7. Separate website deployment QA from business-data certification. Website V3 QA passed on desktop 1440x900: 12 nodes, 6 groups, 17 edges, 3 modes, click inspector, no nested workflow scroll, no body horizontal overflow, no JS errors. CRM/JDE business Deep Dive remains at **90%** pending sample-level reconciliation, report monetary accuracy, role matrix and controlled report execution. Never quietly convert these into 100%.
8. Maintain status updates based only on measured results, evidence and tests. If a tool fails, try authorized alternative routes, not a bypass of tool-level safety controls. Remote RDC devices: Notebook PTKCMT-R-NB02, PC POP-FARM01; PC was useful fallback when Notebook timeout occurred.
9. GitHub Pages URL: https://popvarachat.github.io/crm-workflow/ . If Chrome ERR_TIMED_OUT but PowerShell HTTPS HTTP 200, inspect browser/proxy/extension/network rather than redeploying needlessly. Only claim repaired after real Chrome/browser check.
10. Save policy and changes in GitHub with a commit. On a new chat or next day, **read this file and the latest `crm-workflow/index.html` before making changes**. Do not infer current deployment status from yesterday's response.

## Evidence and acceptance
- Verified CRM menu routes: 38 HTTP 200, various EditView fields and report entry points.
- Verified BIRT Quotation date filter: 15 records over 3 pages within Oct 10–11 2026; Order Summary renders. This is not amount reconciliation.
- ERP fields discovered in CRM: account ERP/STK IDs, product ERP codes, project ERP IDs, quote ERP Document. Their existence does NOT verify sync.
- JDE authenticated in browser with role ITSQMR JPD920 during inspection; not a successful CRM↔JDE record match.
- Internal Notebook evidence files (NOT for publication): `C:\Users\varachat.num\Documents\RDC-Browser\practika-crm-deep-dive-evidence.md` and `practika-crm-qa-open-items.md`.

## Next-session checklist
1. Fetch this policy, current CRM index and latest GitHub deployment state.
2. Verify no overlapping nodes and zero internal scroll at 1440x900 and narrower screens; inspect screenshot if visuals are disputed.
3. Continue unresolved CRM–JDE record mapping and QA using authorized read-only routes. Do not claim 100% before tests.
4. For any new public-safe web change: commit, manually deploy once at checkpoint, verify HTTP 200 and actual browser interactivity, and report exact status and blockers.

Policy change control: user owns Human Gate. Any update to these rules should preserve explicit audit trail in Git history.
