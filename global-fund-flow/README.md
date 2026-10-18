# Global Fund Flow Intelligence — V6

Evidence-led dashboard: https://popvarachat.github.io/global-fund-flow/

## Official layers

| Layer | Official source | Vintage | Meaning | Coverage |
|---|---|---|---|---|
| Global banking corridors | BIS LBS WS_LBS_D_PUB | 2026-Q1 | FX and break-adjusted quarterly change in cross-border bank claims: **flow proxy**, not stock exchange trades | 3,521 corridor changes; 31 banking jurisdictions; 218 counterpart economies |
| Portfolio securities positions | IMF PIP | 2025-S2 | Holder-residence to issuer-residence portfolio **holdings**, NOT transactions | 12,893 bilateral records; 79 holders; 237 issuer economies |
| US securities transactions | US Treasury TIC | August 2026 | Net long-term US securities trading by country and asset | 20 published country samples displayed in the existing tab |

## Critical interpretation policy

BIS source → counterparty shows a change in cross-border bank claims. Negative values reflect claim contraction, NOT a proven cash transfer back along the edge. IMF source → issuer shows **stock**, not newly invested money. Positions change because of buying/selling, valuation and FX. Data vintages differ. Missing bilateral data is not zero. A jurisdiction hosting investment funds or custody assets may not be the ultimate beneficial owner.

Original reported global IMF portfolio headline of US$103.6 trillion is not the sum of the subset in this publication; incomplete country breakdown, reserve/unallocated positions and reporting definitions matter. Never add BIS and IMF quantities into a single global Fund Flow figure.

## Operational procedures

The dashboard is a **static verified snapshot**, not live trading, investment advice, background automation, or a guaranteed complete money migration map. Filter by continent / ASEAN / country / asset type. Select a node to drill down; pan/zoom; export the exact filtered observations to CSV. The Intelligence Workflow clearly distinguishes actual connected data from planned analytical methods.

To refresh the bilateral snapshots intentionally (not automatically):

    python scripts/refresh_bilateral.py --bis-quarter 2026-Q1 --imf-half 2025-S2

Requires the requests Python package. Run source QA and verify periods, coverage and API definitions before committing and manually dispatching GitHub Pages deploy. Avoid repeated GitHub Pages builds.

## Source references

- BIS LBS methodology: https://data.bis.org/topics/LBS
- BIS API: https://stats.bis.org/api-doc/v2/
- IMF PIP: https://data.imf.org/datasets/IMF.STA%3APIP
- IMF PIP release October 7, 2026: https://data.imf.org/en/news/imf%20data%20brief%20october%207
- US Treasury TIC: https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table1.html
- Country region codes: https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes
