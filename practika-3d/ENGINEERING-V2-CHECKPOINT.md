# PRACTIKA 3D — Senior Engineering Harness staging checkpoint

- Date: 2026-10-15 (Thailand)
- Task: Increase architectural and simulation complexity of the existing REA-backed Practika 3D prototype without modifying the live production/default branch.
- Project repo: popvarachat/popvarachat.github.io
- Branch: feature/practika-3d-harness-v2
- Last patched commit: 0d519537eccecc5b6d784decad85800aa29e0e9f
- Target: isolated notebook fixture PTKCMT-R-NB02
- Test method: Playwright + installed Google Chrome, HTTP localhost server (temporary, stopped after test)
- Corporate-first preflight: Corporate launcher present, "Logged in using ChatGPT"; corporate REA MCP registration enabled; rea.cmd version 6.4.0. Specific account billing and actual Corporate review completion not certified.
- Original-source permissions: only public website navigation/screenshots and public GitHub branch; no changes to practika.com.
- Baseline: first staging Playwright suite at earlier commit produced 17/21 PASS, 4 FAIL. Causes observed: newly created mode-nav buttons not bound to original event registry, one missing /favicon.ico request (verified local HTTP logs).
- Minimal patch: explicitly bind new buttons; add inline SVG favicon.
- Regression test: 21/21 PASS at commit 7b1ef0b0796cfd1850f15a56a826dbf09c804a65. Exit code 0. Verified desktop/mobile canvas, initial model geometry, no console/page errors, studio route, parametric size/finish/chair/explode, simulation route, A* path reachable 8/8, scenario B loading, route/heatmap visibility, factory route, mobile no horizontal overflow.
- Visual inspection findings at 7b1ef0b: Studio product appeared too small because architecture ceiling framing dominated stage; factory showed stale scenario metrics.
- Bounded final patch at 0d519537: studio product camera close-up, remove studio ceiling structure; reduce visual ceiling occlusion; reset out-of-simulation metrics; dispose some generated materials.
- Latest patch runtime regression verdict: INCONCLUSIVE / NOT YET VERIFIED. An attempted combined remote test invocation was denied by tool safety. No alternate route was used to bypass denial.
- Corporate read-only independent code-review task: initiated on Notebook but stalled waiting for stdin; session terminated; no valid review verdict or deployment certification is claimed.
- Cost/tokens/latency: UNKNOWN except observed test counts.
- Raw screenshots/logs: local Notebook Documents/ paths only; not uploaded to GitHub.
- Suggested rollback: do not merge branch; delete or revert branch-specific commits if owner declines. Production/default branch remains untouched.
- Human Gate: explicit permission required before merging/publishing enhanced version and any full-site parity claim.

## Scope boundaries

The scene contains procedural furniture and architectural geometry. The simulator uses grid A* route search, route overlays and illustrative heatmap, not a validated crowd simulator, legal occupancy calculation or certified evacuation model. Product dimensions and materials are demonstrative, not accurate SKU/CAD data. REA map covers selected public navigation sections, not every page or interaction on practika.com.

## Next QA actions

1. Confirm previous tool-permission blocker has been resolved through the authorized route; do not bypass.
2. Replay Playwright 21-assertion suite against the final commit and save result.
3. Independent code review with separate reviewer and read-only scope; report substantive defects and follow-up.
4. Check product close-up, factory labels, top view, mobile screenshots and memory growth across repeated scene switching.
5. Request Human Gate for any merge/release.
