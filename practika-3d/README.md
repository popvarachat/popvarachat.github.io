# PRACTIKA 3D Experience — REA evidence and test record

**Status:** published 3D concept prototype, not a production corporate-site replacement.  
Live: https://popvarachat.github.io/practika-3d/

## Purpose

Apply REA (Reverse Engineering & Analysis) to inspect the public Practika website, preserve its navigation/content structure, link each 3D scene to original evidence, simulate representative scenarios, and validate with Playwright before any full migration.

Primary authoritative source: https://www.practika.com/

The user-provided Facebook HTML features a post about interactive 3D web simulations of ports, airports, railways, plants and infrastructure. This informs the **theme and learning-by-exploration goals**, but is not a CAD, Blender or technical source asset.

## Source-to-scene REA trace

| Original Practika section | Source URL | 3D scene | Maturity |
|---|---|---|---|
| Home | https://www.practika.com/ | Overview showroom | Interactive concept |
| Industrial Customized Furniture | https://www.practika.com/Industrial_Und_Customized_Und_Furniture/Customize_Und_Your_Und_Identity | Materials lab | Procedural |
| Workplace | https://www.practika.com/Workplace/Workplace | Workplace | Procedural |
| Retail | https://www.practika.com/RETAILS/RETAILS | Retail | Procedural |
| Education | https://www.practika.com/Education/Education | Classroom | Procedural |
| Health | https://www.practika.com/Health/Health | Care space | Procedural |
| Residential | https://www.practika.com/Residential/Residential | Residential | Procedural |
| Hospitality | https://www.practika.com/Hospitality/Hospitality | Hospitality | Procedural |
| Products | https://www.practika.com/PRODUCTS/PRODUCTS | Product Explorer | Procedural; catalog not mirrored |
| Project References | https://www.practika.com/PROJECT_Und_REFERENCES/PROJECT_Und_REFERENCES | Gallery | Concept |
| Services & Warranty | https://www.practika.com/Our_Und_Service_Und__Amp__Und_Warranty/Our_Und_Service_Und__Amp__Und_Warranty | Lifecycle | Concept |
| News, Sustainability, About, Contact, Join Us | present in original navigation | pending | Not migrated |

Destination URL mapping comes from the site's public navigation; individual deep-page contents, images, dimensions, specification sheets and behavior are **not all verified**.

## Prototype function and limits

The 3D prototype uses procedural WebGL meshes: office desks, chairs, shelving, sofas, plants and spatial scenes. These models **are not scans or dimension-accurate reproductions** of Practika furniture. The version-pinned Three.js library loads over a public CDN; a hardened production implementation should bundle the dependency.

Controls: rotate and zoom, mode switching, pause/resume, camera reset, quality toggle. Six business scenes, materials/products/projects/lifecycle screens, and an adjustable workplace scene.

The spatial calculator is solely demonstrative: approximate percent utilization = min(100, round((desk_count × 4.6 + people_count × 1.4) / 180 × 100)). The area, unit coefficients and aisle warning thresholds are assumed teaching values, **not engineering or fire/evacuation standards**. Human avatars use indicative animation, not calibrated collision-avoidance path planning.

## Playwright test record — 2026-10-15

Authorized Notebook: PTKCMT-R-NB02. Chrome channel, Playwright headless.

- Original site visited and full-page screenshot captured: Documents/practika-baseline.png.
- Local prototype: HTTP 200; WebGL canvas present; title correct; no startup JavaScript exception.
- Published GitHub Pages prototype: HTTP 200; WebGL canvas present.
- Education selector navigates to its unique scene. Source-page link displayed.
- Simulator inputs: 20 desks, 0.8 m aisle, 30 people. Output counters and narrow-aisle warning updated.
- A nonfatal 404 request occurred during the multi-navigation browser test; no page crash or WebGL rendering failure was found. Follow up by classifying resource requests.
- QA snapshots: Documents/practika-3d-local-preview.png and Documents/practika-3d-test-simulation.png (Notebook).

## Next agent workflow

1. **Playwright Auditor / Researcher:** Crawl authorized public pages, rate-limited. Inventory URLs, screenshots, navigation and controls. Generate unique page/element IDs and compare pages at desktop/tablet/mobile; record failures and missing pages.
2. **REA Mapper:** Record source URL, target 3D zone, content fields, images, interactions, destination links and confidence/status for every source element; escalate unresolved parts.
3. **3D Artist / Builder:** Obtain original product models or official dimension/texture evidence, map product SKU to glTF and inspect geometry/fidelity. Keep all unverified models labeled as illustrative.
4. **Simulation Agent:** Define goals, entities, interaction laws, metrics, input assumptions and validation datasets before implementing collision avoidance, movement or factory simulation.
5. **QA Agent:** Run route-parity, accessibility, visual-regression and low-end WebGL performance tests; include failed checks in release evidence.
6. **Release Agent:** Local preview and staging first; publish only at agreed checkpoints. Never alter the live practika.com infrastructure without separate approval.

## Release gates

- Page-by-page sitemap and navigation behavior certification.
- Exact product materials, content and dimensions from source of truth.
- Consistent mobile accessibility, SEO, cookie/privacy and contact mechanisms.
- Reproducible, validated simulation with scenario IDs and published assumptions.
- Performance metrics (frame rate, memory), monitored across target devices.
- Human sign-off to migrate any portion of the production site.

**Do not mistake a functioning 3D demo for a full cloned site or validated digital twin.**
