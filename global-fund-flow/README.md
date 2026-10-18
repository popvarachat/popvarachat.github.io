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


## V8: August–October 2026 Fed rate impact (published 18 October 2026)

- The Federal Reserve **raised** its policy rate on September 16, 2026 by **25bp**, from 3.50–3.75% to 3.75–4.00%. This was NOT a rate cut.
- **August 2026** LSEG/Reuters foreign net equity transactions in seven Asian markets +$4.72B. U.S. TIC complete monthly net inflow +$199.8B, with net foreign long-term purchases of +$300.7B; NEVER add TIC long-term purchases to TIC overall net capital inflow, since the two are different measures and overlap.
- **September 2026** same seven Asian equity markets had −$23.49B in foreign transactions; five Asian bond markets had −$8.21B foreign transactions. IIF wider emerging-market asset flows −$26.3B. THESE SAMPLES OVERLAP and MUST NOT be summed into a single universal outflow.
- **October** only the week ending Oct 14 LSEG Lipper sample is reported (NOT monthly figures): U.S. equity funds +$13B, Asian equity funds +$2.93B, European equity funds +$1.5B, worldwide bond funds +$7.79B. Lipper fund subscriptions are NOT exchange foreign net trades.
- September U.S. TIC (official) is not due until **November 18, 2026**, so the interface labels it unavailable, rather than filling the gap with a guess.
- We cannot infer a country A → country B cash transfer from correlated net flow out of one exchange and purchases of another country. FX, settlement and the ultimate investor's jurisdiction matter.
- Separately, the **World financial account** tab uses IMF balance of payments data via World Bank WDI for 2024 and 2025, with **169/138 economies** reporting net financial accounts. BPM6 sign: positive is net lending, negative net borrowing. National data are not bilateral tracing and do not claim 2026 monthly coverage.

Sources: https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm ; https://home.treasury.gov/news/press-releases/sb0662/ ; https://www.reuters.com/world/asia-pacific/asian-stocks-draw-foreign-buyers-after-nine-month-selloff-2026-09-10/ ; https://www.reuters.com/world/asia-pacific/asian-bonds-record-biggest-monthly-foreign-outflow-since-march-2020-2026-10-16/ ; https://www.reuters.com/business/finance/hawkish-fed-triggers-emerging-market-outflows-september-2026-10-07/ ; https://www.reuters.com/world/china/global-markets-flows-graphic-2026-10-16/ ; https://data.worldbank.org/indicator/BN.FIN.TOTL.CD .

Release management: Static evidence-led snapshot only. No background polling or routine automatic GitHub Pages deployment; updates are reviewed before publication.
