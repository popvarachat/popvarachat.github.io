# RDC L5 Web Studio Agent — Execution Contract

Status: DESIGNED / NOT DEPLOYED. This is an agent workflow specification, not evidence that autonomous agents are already running.

## Objective
Receive a single scoped RDC command to design, implement, inspect, and locally validate a website change, then report tested results. Never require the human to relay steps between PC and Notebook.

## Agent roles
- RDC orchestrator: scope, DAG, safety checks, dispatch and checkpoint.
- Design agent (Figma optional): design tokens, visual references, responsive layout and story hierarchy.
- Frontend agent (Codex Corporate first when available): edit HTML/CSS/JS and versioned assets.
- Visual QA agent (Playwright CLI): open local page, click controls, check layout at desktop/mobile widths, collect screenshots and errors, retry defects.
- Release agent (GitHub): backup, diff, commit only at checkpoint, rollback if failed. Local preview before publishing.

## Existing RDC L5 web
Main: executive-summary.html; interactive workflow: workflow-l5.html.
NB local path: C:\Users\varachat.num\Documents\RDC-Workflow-Local
PC local path: C:\RDC-JEV-Agent-Workbench\local-web\rdc-command-center
Preview: http://127.0.0.1:8780/executive-summary.html on each device's own local server.
Preserve interactive flow, statistical evidence, sources, and executive decision. Avoid duplicate Hero banners.

## Input contract
User instruction + URL/page + desired style/reference + scope + acceptance criteria. If scope is not explicit, default to the existing RDC L5 Local Web; no production publish.

## Batch pipeline
1. Preflight: read current source files and GitHub policy, inspect status; back up originals.
2. Plan targeted DOM/CSS/assets edits without overwriting unrelated sections.
3. Implement locally. Select images may be design references, not licensed publishing assets.
4. QA using Playwright: HTTP 200, hero position once, no duplicate sections, interactive links, workflow iframe, statistical tables, 1440px/768px/390px screenshots, no overflow; record evidence.
5. On QA failure: bounded correction cycles up to three with rollback and clear blocker if unsolved.
6. Persist audit, screenshots and patch list; GitHub checkpoint only when ready; publishing requires user approval.

## Gates
Do not weaken firewall/credentials, copy third-party copyrighted visuals into public sites, alter production infrastructure or deploy GitHub Pages without authorization. Do not report 100% before all acceptance checks pass.

## Current capability / limitation
Remote Desktop Commander: PC and Notebook control confirmed; Playwright CLI used for local visual snapshots. Figma connector is available for design collaboration. Autonomous AI designer/coder/QA orchestration under RDC is a planned integration and requires implementation and testing before calling it live.
