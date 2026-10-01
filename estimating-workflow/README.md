# Practika Estimating Workflow

Live web: https://popvarachat.github.io/estimating-workflow/

Static reference for the estimating knowledge-transfer project. It includes the full workflow with parallel site-scope review, product-specific formulas, 22 observed rules, 10 human gates, 30 open questions and 20 environmental factors.

The searchable registry includes all 2,352 formula cells from 32 sheets in five supplied workbooks. It preserves hidden-sheet history, 2,322 matching source-audit values and 30 existing source error cells. It never executes arbitrary Excel formula text in the browser. Source workbook binaries and embedded quote images are not part of this web package.

## Files

- `index.html`: workflow, product recipes, gates, findings and source inventory.
- `app.js` and `styles.css`: local interactions and responsive display, with no external runtime dependencies.
- `formulas.json`: complete source formula registry. `s` is a sheet-array index; each precedent is a `[sheet index, cell]` pair.
- `workflow.md`: complete expanded formula workflow document.

All rule and numerical results describe the supplied source snapshot dated 2026-10-01. Observed rules require human approval of scope and version before use in real estimating. The site does not approve rules, modify source workbooks or issue/send quotations. G00–G08 are pre-quotation gates; G09 is post-delivery.

Publishing occurs through the existing user GitHub Pages repository. The root portal includes an explicit Estimating Workflow card and retains it if GitHub repository auto-discovery is temporarily unavailable.
