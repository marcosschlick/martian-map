# Martian Map — Tuxonauts

Tactical hyperlocalized EVA navigation HUD for Mars surface exploration, built for the **2026 NASA Space Apps Challenge** (*Interplanetary Survival Guide: Martian Map*).

## Overview

**Martian Map** focuses on **Jezero Crater** and combines NASA planetary imagery, contextual space-weather notifications and illustrative planning tools for Extravehicular Activities (EVAs):

- **Multi-Layer Mars Visualization:** Combines Viking optical imagery, MOLA elevation tiles and the historical CTX mosaic.
- **Local Science Objective:** Select an image-localized crater observation point with a proposed astronaut activity and source provenance.
- **Suggested Traverse:** Compare direct travel with a curated detour around one project-interpreted crater exclusion, including the longer out-and-back budget.
- **Space Weather Context:** Shows NASA DONKI CME notifications with their original issue dates, source links and query availability. These are not local radiation measurements.
- **Modeled EVA Return Envelope and Target:** Illustrates outward-and-return travel reach from simulated oxygen/battery budgets and evaluates a selected target's direct travel budget. An optional radiation scenario adds a demo dose cap.
- **Pressurized Glove Mode:** Use **Glove mode** in the header for 44 px controls, opaque panels, and high-contrast active and keyboard focus states. The toggle preserves the current map, target, and reserves.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Map Engine:** Leaflet (`EPSG:4326` equirectangular projection)
- **NASA Data Sources:**
  - [NASA Mars Trek WMTS](https://trek.nasa.gov/mars/) (Viking Optical Mosaic & MOLA Colorized Elevation)
  - [NASA DONKI API](https://api.nasa.gov/) (Space Weather / CME Notifications)

## Running Locally

```bash
git clone git@github.com:marcosschlick/martian-map.git
cd martian-map
npm install
cp .env.example .env.local
npm run dev
```

For local development, set `NASA_API_KEY` in the Git-ignored `.env.local` using a key from [NASA Open APIs](https://api.nasa.gov/) and restart Vite. Vite routes the DONKI query through its local proxy and adds the key as an [upstream `X-Api-Key` header](https://api.data.gov/docs/developer-manual/). Existing local `VITE_NASA_API_KEY` values also work through this proxy. With a blank key or the `DEMO_KEY` value, the browser uses NASA's public demonstration credential. The static production bundle also uses the public credential.

## CTX Detail imagery

**CTX Detail** displays the historical Mars Reconnaissance Orbiter Context Camera mosaic **beta01**, produced by Caltech's Murray Lab and hosted by Esri. This is a **preliminary, uncontrolled orbital mosaic**, not a live camera feed. Its nominal source sampling is approximately 5 m/pixel; source coverage, registration and mosaic seams vary. The service describes lossy JPEG compression of 8-bit imagery, while its current tile metadata and actual responses use PNG containers.

Sources and credits:

- [NASA Mars Trek service catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars).
- [CTX WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0/WMTSCapabilities.xml), whose ResourceURL points to the Esri-hosted tile service.
- [Provider metadata](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson).
- Tile template: `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{level}/{row}/{column}`.
- Attribution: **NASA / JPL / MSSS / Caltech Murray Lab / Esri**. Viking context retains **NASA / JPL / USGS Mars Trek** attribution.

### Tile geometry and zoom correspondence

Both descriptions give a global extent of longitude -180 to 180 and latitude -90 to 90, origin **(-180, 90)**, north-to-south rows, **512 × 512** pixels per tile, and two columns by one row at service level 0. This advertised extent does not guarantee complete imagery everywhere. The capabilities identify CRS 104905; the provider identifies **GCS_Mars_2000_Sphere (104971)** with a sphere radius of 3,396,190 m. The angular grid aligns with Leaflet's `L.CRS.EPSG4326` display grid; the application keeps that CRS and does not use its Earth-based distance calculations for Mars.

For service level `n`, resolution is `0.3515625 / 2^n` degrees/pixel, and a tile spans `180 / 2^n` degrees. Leaflet EPSG:4326 spans `512 × 2^z` display pixels across 360 degrees, giving `0.703125 / 2^z` degrees/pixel. Equating these resolutions yields **Leaflet zoom `z = n + 1`**. Therefore CTX uses `tileSize: 512`, `zoomOffset: -1`, and no retina level adjustment. Row/column indices are `floor((90 - latitude) / tileSpan)` and `floor((longitude + 180) / tileSpan)`.

| Leaflet zoom | CTX service level | Tile containing 18.38 N, 77.58 E | Observation on 2026-11-15 |
| --- | --- | --- | --- |
| 9 | 8 | `/tile/8/101/366` | Complete, decoded PNG |
| 10 | 9 | `/tile/9/203/732` | Complete, decoded PNG |
| 11 | 10 | `/tile/10/407/1465` | Complete, decoded PNG |
| 12 | 11 | `/tile/11/814/2930` | HTTP 200 but truncated PNG; Viking fallback |
| 13 | 12 | `/tile/12/1629/5861` | Complete PNG; also checked all eight neighboring tiles |

The capabilities advertise levels **0–11**, while provider metadata lists **0–17**. Actual central tiles at levels **13, 14 and 17 returned HTTP 400**; those advertisements cannot be treated as proof of availability. Level 12 and its neighbors were verified directly, so the application deliberately permits service levels through **12**, with `maxNativeZoom: 13` and map `maxZoom: 13`. It never requests the unavailable higher levels. Service level 12 provides about 5.09 m/pixel in the north-south direction on the provider's Mars sphere; the mosaic's nominal sampling is not a positional accuracy guarantee.

All four modes share a display range of **Leaflet zoom 2–13**. Selecting CTX below zoom 9 moves to zoom 13 while preserving the current center. Viking and MOLA retain native maximum zooms **7** and **6** respectively; at closer display zooms they are enlarged, with that limitation stated in the HUD. Switching modes preserves the map instance, center and simulated suit reserves.

### Availability and limitations

Viking remains underneath CTX as context. The HUD distinguishes loading, complete, incomplete and unavailable imagery using the tiles in the current viewport at the active layer's native zoom. Failed tiles retained outside the viewport do not affect its status. CTX requests have a 15-second timeout, HTTP status checks, PNG signature/end-marker checks, image decoding and dimension checks. Failed tiles stay hidden to expose the context layer; the HUD also reports when Viking is incomplete or unavailable. Requests are cancelled on tile removal and StrictMode cleanup. Revisiting an area or selecting the layer again can issue fresh requests.

In Chromium, the damaged level-11 sample **passed `image.decode()` despite lacking the PNG IEND marker**. The additional container check rejects that response. This is an envelope check, not an exhaustive PNG CRC or scientific-quality validation. A complete, decodable tile can still contain mosaic gaps or registration errors. Cross-origin fetch permission is required by the integrity checks and was verified against the current provider.

This imagery **cannot certify safe EVA routes or measure terrain slopes**. It does not supply current surface conditions, validated hazard boundaries or an elevation model. Network availability and coverage outside the inspected Jezero area remain provider-dependent. No new production dependency or test framework is required.

Review capture: [CTX Detail at Jezero](output/playwright/ctx-jezero.png).

Browser review used Chromium at 1440 × 900, 768 × 1024, 390 × 844 and 320 × 568. It covered CTX at display zooms 11–13, switching all four modes at zoom 13, keyboard activation/focus, panning, and preservation of non-default Oxygen/Battery values. Matching the central level-10 tile's decoded pixels against the displayed image placed the Habitat coordinate within half a display pixel of the expected tile location; this checks grid alignment, not scientific registration accuracy. HTTP 503, an undecodable PNG and a delayed response were simulated interactively to verify fallback and the request timeout. Physical devices, other browser engines and worldwide coverage were not verified.

## Illustrative EVA return model

The **Simplified model** panel and perimeter are an illustration, not an operational safety boundary. These resource capacities, speed and reserve are demo assumptions chosen for the application; they are **not NASA specifications or parameters of a real suit**.

| Demonstration assumption | Value |
| --- | --- |
| Oxygen at full capacity | 240 minutes |
| Battery at full capacity | 180 minutes |
| Constant walking speed | 2,000 metres/hour (2 km/h) |
| Protected reserve | 20% of each resource's **total** capacity |

For simulated percentages `O` and `B` in 0–100 with **Radiation simulation** off:

```text
oxygenBudgetMinutes = 240 * max(0, O - 20) / 100
batteryBudgetMinutes = 180 * max(0, B - 20) / 100
excursionBudgetMinutes = min(oxygenBudgetMinutes, batteryBudgetMinutes)
radiusMeters = excursionBudgetMinutes * (2000 / 60) / 2
```

The 20% is subtracted as **20 percentage points of full capacity**, not 20% of the resource remaining. `Excursion budget` covers both travel directions; the factor of two allocates half to outward travel and half to return. `Estimated reach` is the corresponding one-way radius from the Habitat. `Limiting factor` identifies the smallest time budget, or `Both` when oxygen and battery share the limit. Reaching the protected reserve in either suit resource gives **zero excursion budget even though resources may remain**.

| Oxygen | Battery | Excursion budget | Radius | Limiting resource |
| --- | --- | --- | --- | --- |
| 100% | 100% | 144 min | 2,400 m | Battery |
| 100% | 50% | 54 min | 900 m | Battery |
| 30% | 100% | 24 min | 400 m | Oxygen |
| 29% | 100% | 21.6 min | 360 m | Oxygen |
| 20% or less | Any | 0 min | 0 m | Oxygen, or Both if both budgets are zero |
| Any | 20% or less | 0 min | 0 m | Battery, or Both if both budgets are zero |

Budgets are derived in `src/evaModel.js` from App state. The HUD uses amber for low reserves or a positive budget reduced by the dose scenario, and red for zero budget. `Reset reserves` restores 100/100; with radiation off this gives 144 min and 2,400 m. Unrounded numbers drive geometry; the HUD formats numbers for readability.

### Mars geometry and map behavior

The planetary radius is **3,396,190 metres**, taken from the `GCS_Mars_2000_Sphere` WKT in the [CTX provider metadata](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson), rechecked on 2026-11-15. This geometric reference comes from the imagery provider; it does not validate the demo resource assumptions. Both forward spherical destinations and the haversine distance calculation share that radius. Leaflet global objects and Earth distance settings remain untouched; `L.CRS.EPSG4326` is used only for display.

For each of 96 equally spaced bearings, the model uses angular distance `radiusMeters / MARS_RADIUS_METERS` to calculate a destination from the Habitat at 18.38 N, 77.58 E. Leaflet renders these vertices with one `L.polygon`; its line segments approximate the circular envelope. The fill opacity is 0.06 and the polygon is non-interactive, so it does not capture map clicks. Changes update the existing polygon's geometry/style without rebuilding the map or moving the view. At zero radius, the polygon is removed while the Habitat marker remains.

Only **Show envelope** fits the perimeter into the view. It measures the current layer/source overlays, attribution and reserve panel to leave them outside the fitted perimeter area, and respects the existing maximum display zoom. The button is disabled when there is no envelope. A height-limited reserve panel scrolls internally on smaller viewports; its assumptions remain available through the keyboard-accessible **Model assumptions** disclosure. CTX and the three existing modes retain their imagery, native zoom limits and fallback behavior.

Numeric verification covered all 10,201 integer Oxygen/Battery combinations. Their 121 distinct radii include zero; 11,520 generated vertices at the 120 positive radii had a maximum absolute spherical-distance error of **4.17 × 10⁻⁹ m** relative to their requested radius. This is floating-point consistency on the assumed sphere, not a claim about map registration, walking accuracy or physical suit performance.

The model assumes constant walking speed and resource consumption, direct travel and no stops. It estimates the budget for a selected target's direct displacement. Terrain, obstacles, science stops, and actual exposure at Jezero require separate data.

Interactive Chromium review covered the required numeric cases, reset, zero-budget removal, one persistent map instance, positive-budget geometry updates, and reserve preservation across all four imagery modes. Show envelope kept the perimeter clear of HUD panels at 1440 × 900, 768 × 1024, 390 × 844, 320 × 568 and 667 × 375; short landscape framing uses space beside the overlays. Keyboard activation and visible focus were checked for the controls, framing button and assumptions disclosure. Opening assumptions and reaching zero budget did not resize or move the mobile map. CTX fallback was checked with both the damaged service-level-11 images and a simulated HTTP 503. Physical devices, other browser engines and screen readers were not verified. No test files or testing frameworks were added.

Review captures: [full reserves](output/playwright/envelope-full.png), [reduced reserves](output/playwright/envelope-reduced.png), [zero excursion budget with resources remaining](output/playwright/envelope-zero.png).

## EVA target direct budget estimate

Click or tap inside the mapped globe to select one target and see its coordinates. Another valid selection replaces it. **Use map center** selects the current center without moving the view: focus the map, pan with its arrow keys and activate the button using Tab and Enter/Space. **Clear target** removes the target, its reference line, tooltip and evaluation. Reserve edits, Reset reserves, imagery changes and Show envelope retain the selected target. The map constrains panning to Mars, and clicks outside the globe, on HUD/Leaflet controls, or during dragging leave the target alone.

App owns the selected coordinate alongside the simulated reserves. `evaluateTarget` in `src/evaModel.js` derives the estimate using the existing haversine distance and the same **3,396,190 m Mars sphere** as the perimeter:

```text
distanceMeters = marsDistanceMeters(habitat, target)
roundTripMinutes = 2 * distanceMeters / (2000 / 60)
timeMarginMinutes = excursionBudgetMinutes - roundTripMinutes
```

Classification uses the unrounded distance and **analytic radius**, not containment in the rendered 96-vertex polygon. A **0.01 m** absolute distance tolerance recognizes `At modeled limit` on either side of the boundary; it does not add travel time, increase the budget or adjust the raw time margin. The HUD rounds only displayed numbers, avoids signed zero, and describes sub-0.1-minute shortfalls explicitly.

| Condition | Evaluation | Target color |
| --- | --- | --- |
| No target | Select an EVA target | Neutral |
| Zero excursion budget, including a target at the Habitat | No excursion budget | Red |
| Positive budget and distance within 0.01 m of the radius | At modeled limit | Amber |
| Positive budget and distance below the radius, outside the limit tolerance | Within modeled budget | Green, or amber with low reserves |
| Positive budget and distance above the radius, outside the limit tolerance | Exceeds modeled budget | Red |

The target color applies to one pixel-sized marker and a dashed **Direct estimate** reference line. It is independent of the perimeter color, which continues to describe the reserve state. The HUD shows **Terrain not evaluated**, Distance, Round-trip time, Time margin and the evaluation text. A shortfall explicitly states the missing minutes and limiting resource. Zero budget takes priority over the distance classification. Neither marker nor line captures map input; they are updated using existing Leaflet layer references, with one map click listener removed during cleanup.

| Oxygen / Battery | Target distance | Round trip | Time margin | Evaluation |
| --- | --- | --- | --- | --- |
| 100% / 100% | 1,800 m | 108 min | +36 min | Within modeled budget |
| 100% / 50% | Same 1,800 m target | 108 min | -54 min | Exceeds modeled budget; Battery limits |
| 100% / 100% | 2,400 m | 144 min | 0 min | At modeled limit |
| 100% / 100% | 3,000 m | 180 min | -36 min | Exceeds modeled budget |
| Either resource at 20% or below | Target retained | Depends on distance | Zero budget minus round-trip time | No excursion budget |

The reference line connects the two coordinates in the map projection and splits at the antimeridian when the shorter longitudinal span crosses it. Distance is computed separately on the Mars sphere. The illustrative calculation uses the same capacities, 20 percentage-point protected reserve, constant 2 km/h speed and consumption, and direct travel without stops. Terrain, obstacles, measured radiation and time spent on science still require separate data and analysis.

Numeric checks generated target coordinates with the existing Mars envelope geometry for 1,800, 2,400 and 3,000 m. Additional checks covered distances 0.009 m and 0.011 m on either side of the limit, low reserves, null selection and zero budget at the Habitat. Interactive Chromium checks covered click/touch selection, replacement, clear, keyboard center selection and focus, unchanged view on selection/reserve edits, persistence across reset/framing/pan/zoom and the four imagery modes, and a simulated CTX HTTP 503 fallback. Marker/line counts remained one when selected and zero after clearing. Layouts were reviewed at 1440 × 900, 768 × 1024, 390 × 844, 320 × 568 and 667 × 375, including a touch-enabled browser context. Small panels scroll internally. These checks do not verify physical devices, screen readers, other browser engines or real terrain suitability.

Review captures: [within budget](output/playwright/target-within.png), [budget exceeded with the same target](output/playwright/target-exceeded.png), [zero budget with target retained](output/playwright/target-zero.png). Browser clicks select map coordinates at display-pixel precision; the numeric reference cases above use generated spherical coordinates before display rounding.

## Science objective and local destination

**Science objective** proposes investigating how a small crater modifies Jezero's floor. **East crater survey** is a Tuxonauts descriptive label for an observation point beside the eastern rim, not an official NASA place name or a rover sampling location. The historical CTX mosaic visibly contains an arcuate rim and a contrasting interior. The proposed astronaut activity is to photograph rim/floor textures and compare them with the orbital view. No local composition, age, slope, or confirmed traversability is inferred from these images.

The [USGS regional geologic map](https://www.usgs.gov/maps/geologic-map-jezero-crater-and-nili-planum-region-mars) supplies scientific context: its 1:75,000 mapping distinguishes surface units using image morphology, tone and texture, including crater units. It does not provide the point used here, and no regional geologic unit has been assigned to this small feature. The NASA [delta sampling example](https://science.nasa.gov/resource/two-perseverance-sampling-locations-in-jezeros-delta/) provides broader mission context; its delta observations are not transferred to this site.

### Image-derived coordinates

The point is **18.367767333984375 N, 77.61909484863281 E**, interpreted from the georeferenced [CTX service tile 10/407/1465](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/10/407/1465). The [provider metadata](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson) specifies the angular grid. With service level 10, origin (-180, 90), tile size 512 and tile span 180 / 2^10 degrees, continuous pixel-edge offsets `(x, y)` map to:

```text
longitude = -180 + (1465 + x / 512) * 180 / 1024
latitude  =   90 - (407  + y / 512) * 180 / 1024
```

The chosen offset is **(290, 260)**. This tile samples approximately 20.4 m/pixel north–south and 19.3 m/pixel east–west here; the level-12 tiles listed below provide approximately 5.1 / 4.8 m/pixel and were also inspected. A 1st–99th percentile display stretch was used for inspection only. The application's map keeps the source imagery unchanged. Manual placement precision is of order **50 m relative to the mosaic**, not an absolute-position accuracy guarantee. This preliminary/uncontrolled mosaic has unquantified registration error and variable source coverage.

Reference tile, fetched and decoded on 2026-11-15: [unchanged local snapshot](public/science/ctx-reference.png), SHA-256 `0b6a0b8f8053291738d15cd82dfdafd2e00026fc6b4c42634bf5117cfc7e48f0`. Credits: NASA / JPL / MSSS / Caltech Murray Lab / Esri. Higher-detail inspection used service tiles [12/1629/5861](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/12/1629/5861), [12/1629/5862](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/12/1629/5862), [12/1630/5861](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/12/1630/5861) and [12/1630/5862](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/12/1630/5862). These four tiles all returned complete 512 × 512 PNGs during inspection.

### Selection and budget

**Select science site** and the keyboard-accessible diamond marker set the same destination and existing direct budget estimate. The marker appears at display zoom 10 or closer to avoid overlapping the Habitat at regional zooms. **Show science area** explicitly frames the local area, independently of remaining reserves. Choosing a free target, including Use map center, removes the scientific association; Clear target removes the selection. Imagery, weather and reserve changes retain its identity.

The unchanged Habitat and Mars sphere give **2,315.646731 m one way**, **138.938804 min round trip** and **+5.061196 min** at 100/100 reserves with radiation simulation off. This fits the illustrative 2,400 m radial budget. Neither the Habitat nor suit assumptions were moved to obtain that result. **Science work and stops are not included in the travel budget**; this is a proposed observation activity, not a complete mission timeline.

Interactive Chromium verification covered button and marker selection by keyboard, visible marker focus, correct coordinates/budget, free-target reassociation and clearing. Review capture: [science objective and destination](output/playwright/science-objective.png).

## Suggested traverse and project exclusion

For the selected science site, **Direct estimate** and **Suggested traverse** are separate choices. A direct estimate is a displacement/time reference and visibly warns that it crosses the project exclusion. Suggested traverse draws a solid line through three intermediate points north of the crater. The amber **Project exclusion** contour appears while the science destination is selected. Free-target selection and Clear target remove this local review and traverse mode; reselecting the same science marker retains the current mode. No general route search is performed.

### Exclusion provenance and review coverage

Tuxonauts manually traced the visible outer rim/interior in the four georeferenced level-12 CTX images identified above, using the level-10 reference grid for recording the contour. The outline includes approximately 2–5 overview pixels (roughly 40–100 m) of additional planning space in most directions; it is a hand-drawn conservative contour, not a fixed-distance geodesic buffer. The policy is to keep outside this feature until ground conditions can be assessed. **This is a project-defined exclusion, not a published NASA hazard polygon or a measured slope threshold.**

The closed contour's continuous reference-pixel offsets, in order, are:

```text
(228,254), (239,247), (254,243), (270,242), (282,247),
(289,253), (284,266), (278,277), (268,284), (253,288),
(239,287), (229,281), (226,269), then back to (228,254)
```

The reviewed image window runs from reference offsets **(165,218) to (306,294)**, approximately **2.7 × 1.5 km**. Only this one crater contour is included in the exclusion check. Other craters, rocks, loose material, slopes and current surface conditions remain unassessed. Manual contour/point placement is approximately 50 m relative to the mosaic, with unquantified absolute registration error. Geometric clearance from this contour does not establish walking suitability or an operational safety margin. [Annotated project interpretation](public/science/ctx-interpretation.png) shows the outline, direct segment and detour on the source pixels; its 1st–99th percentile stretch is only for visual inspection.

The NASA [Ingenuity terrain article](https://www.nasa.gov/solar-system/nasas-mars-helicopter-reveals-intriguing-terrain-for-rover-team/) documents rover entrapment concerns at Séítah dunes elsewhere in Jezero. It does not locate this crater or establish a human walking limit. No Séítah boundary or vehicle-specific threshold was transferred to this project exclusion.

Level-12 source SHA-256 values, fetched on 2026-11-15, allow checking the inspected source responses:

| Service tile | SHA-256 |
| --- | --- |
| 12/1629/5861 | `8e50c49873c36695e32d0dcc95aeffd42b03e85e4818eadfd822325f5ad11cd4` |
| 12/1629/5862 | `605ad23f4db8b0e14a85daaeccc4e3404371c413b777ca827358491196a5ab6a` |
| 12/1630/5861 | `f3c42dc51f8b1e8ac0ed09b746458b24d1c5e7c02d3aa8dfbf0a3c6bf7c0d300` |
| 12/1630/5862 | `343950ae776f0fae471092c62f784ad80162cb6f1baf01b72b623c42932ecbd3` |

### Waypoints, complete-segment checks and budget

The outbound path starts at the unchanged Habitat, passes reference offsets **(222,236), (275,234), (298,246)** and ends at the science point **(290,260)**. Coordinates use the same pixel-to-angle formula as the destination. `src/scienceData.js` checks the entire rendered segments against every polygon edge in the local angular/image plane, including boundary contact and collinear overlap, and checks point containment. All waypoints must lie inside the rectangular review window; because it is convex, the straight segments stay inside it too. The route must connect the Habitat to the science point. A failed check yields **Suggested traverse unavailable**, with no traverse line or numerical travel evaluation. It does not silently substitute direct travel.

Length uses the sum of the **Mars-sphere distances between successive waypoints**, reusing the existing 3,396,190 m radius. These are waypoint segment estimates, not measured ground-following distances. **Return follows the same waypoints in reverse**, so travel time is twice the one-way length divided by the existing 2 km/h speed. The same resource budget, protected reserve and optional dose simulation then determine the margin. Science work and stops remain excluded.

| Calculation reference at 100/100, radiation simulation off | Direct estimate | Suggested traverse |
| --- | --- | --- |
| One-way length | 2,315.646731 m | 2,772.348210 m |
| Outbound time | 69.469402 min | 83.170446 min |
| Return time | 69.469402 min | 83.170446 min |
| Round-trip time | 138.938804 min | 166.340893 min |
| Time margin against 144 min | +5.061196 min | -22.340893 min |

The destination lies within the 2,400 m radial envelope, while the detour exceeds the modeled budget. The radial envelope remains a **direct-reach reference**, not a contour of reachable locations along the suggested traverse. Extra digits above are calculation references, not physical accuracy claims. With Battery at 50%, the budget is 54 min and the same traverse margin is -112.340893 min; Reset reserves restores the 144-minute budget without changing the destination or mode.

Independent Python haversine calculations agreed with the application to under 0.000001 m. Matplotlib's independent complete-path intersection check found no crossing for all four suggested segments and a crossing for the direct segment. Invalid coordinates, a point inside/on the exclusion and an out-of-window route were rejected. Interactive Chromium checks covered mode switching, keyboard selection, reduced/depleted reserves, reset, clearing/free selection, and all four imagery modes; selection changes did not move the map or issue extra DONKI queries. Captures: [suggested traverse and exclusion](output/playwright/suggested-traverse.png), [mobile traverse](output/playwright/suggested-traverse-mobile.png).

A browser-only waypoint fixture placed an intermediate point inside the contour: **Suggested traverse unavailable** appeared, with no line or numerical travel fields. This was a controlled data scenario, not a change to the stored terrain interpretation. Desktop 1440 × 900, tablet 768 × 1024 and phone 390 × 844 were reviewed. At **320 × 568**, the shared HUD-aware framing can leave only a few pixels for the study area and zoom below the science marker's display threshold; a taller viewport is needed to inspect the complete map proposal comfortably. This limitation is tracked by the open **Responsive Layout Verification** task in [BACKLOG.md](BACKLOG.md); responsive verification remains incomplete until the framing is corrected and rechecked in standard and glove modes. Physical devices and other browser engines remain unverified.

## Radiation dose simulation

Open **Radiation simulation** under **Simplified model**. The app starts at **Off**. **Low rate** and **High rate** apply a constant demo rate of **0.10 mSv/h** or **0.50 mSv/h** for the entire round trip. The initial remaining allowance is **0.30 mSv**. The slider adjusts it between **0 and 0.30 mSv** in **0.01 mSv** steps. The rates and allowance are illustrative inputs. Operational exposure assessment depends on the mission environment and shielding. [NASA Space Radiation Analysis Group](https://srag.jsc.nasa.gov/spaceradiation/how/how.cfm)

```text
doseBudgetMinutes = 60 * remainingDose / doseRatePerHour
excursionBudgetMinutes = min(oxygenBudgetMinutes, batteryBudgetMinutes, doseBudgetMinutes)
simulatedTargetDose = doseRatePerHour * roundTripMinutes / 60
doseMargin = remainingDose - simulatedTargetDose
```

The model stores dose inputs in µSv and displays mSv. At full suit reserves and 0.30 mSv remaining, **Low rate** caps the dose budget at 180 min and battery still limits the trip to 144 min and 2.4 km. **High rate** caps the trip at 36 min and 600 m. A zero allowance removes the circle and retains the target. Selecting a scenario recalculates the circle and the target's time and dose margins in place. Selecting **Off** restores the suit-only calculation, and reactivating a scenario reuses the last allowance. DONKI data supplies event context separately from this calculation. [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/)

### Try it with one target

1. Click **Reset reserves** and set **Radiation simulation** to **Off**. Use **Show envelope** and select a point about 1 km from the habitat.
2. Switch to **High rate** with **Remaining demo dose** at 0.30 mSv. Keep the same target and compare **Time margin** and **Demo dose margin**.

At exactly 1 km, the modeled round trip takes 60 min. The target moves from **Within modeled budget** with 84 min to spare to **Exceeds modeled budget** by 24 min. The high-rate trip uses 0.50 mSv of the simulated allowance, leaving a dose margin of −0.20 mSv.

Numeric verification covered 642,663 combinations of integer suit reserves, rate presets, and selectable dose allowances. The checks included a depleted allowance and ties between limiting factors.

## DONKI notifications and historical fallback

The **Space weather** card displays NASA notices about coronal mass ejections (CMEs) as context for the EVA planning demo. Assessing radiation at Jezero or applying a modifier to the return model would require a documented Mars-relevant model or an explicitly identified simulation.

Official references: [DONKI overview](https://ccmc.gsfc.nasa.gov/tools/DONKI/), [API documentation](https://ccmc.gsfc.nasa.gov/DONKI/api/), [notification guide](https://ccmc.gsfc.nasa.gov/DONKI/guide/notifications/).

The HUD header highlights the latest CME notice in the queried period with its original UTC issue time. Amber draws attention to a published notice. The same control shows when the query is loading, returned no notices, or is unavailable. Selecting it opens the **Space weather** section with the query period and links to the original NASA messages.

### Query and lifecycle

Endpoint: `https://api.nasa.gov/DONKI/notifications`. The application sends `type=CME` and explicit `startDate`/`endDate` parameters. Each query computes the last **seven UTC calendar dates including today**, so on 2026-11-15 the period is 2026-11-09 through 2026-11-15. The local Vite proxy supplies the configured personal key. Direct browser requests use `DEMO_KEY`. Displayed errors contain controlled status text.

The badge and detail section share one query at startup and on **Refresh**. A synchronous guard prevents concurrent requests. During loading, **Refresh** is unavailable but retains keyboard focus. The initial request is scheduled for the next task so StrictMode cleanup cancels its probe before it reaches the network. Cleanup cancels both a pending start and the active request; mounted/identity guards ignore obsolete completion. Each manual refresh recalculates its UTC period.

Requests have a **12-second timeout** covering fetch and body reading. HTTP errors, invalid JSON, a malformed response, or a nonempty response with zero valid entries produce a clearly identified historical fallback. If at least one entry is valid, the panel shows the valid notices and the number of omitted entries. A valid `[]` displays **No CME notifications in queried period**. Loading clears the previous results and errors use controlled messages.

### Fields and provenance

The response is an array containing `messageID`, `messageType`, `messageIssueTime`, `messageURL` and `messageBody`. The application validates nonempty string fields, CME type, a valid UTC issue time within the queried dates, and official CCMC links without embedded credentials. Legacy CCMC page hosts are normalized to the current HTTPS host. Duplicate identifiers retain the newest issue, results sort newest first, and at most **three** are shown. The API's original issue timestamp is retained, including its source precision. Message bodies are selectable, wrapped plain text inside disclosures; external HTML is not inserted into the DOM.

The card separates the queried UTC period, the current attempt's start time, each notification's original UTC issue time and the source. **Query attempt** is not the notification time or a last-success timestamp. NASA response and historical availability states do not represent a storm/radiation risk classification.

The fallback is a verified historical NASA notification: [20240510-AL-003](https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30674/1), originally issued **2024-05-10 13:38 UTC**. Its short original excerpt describes detection by STEREO A/SOHO and the event start at 2024-05-10 07:12 UTC. The fallback keeps that original issue date and link; it is labeled **Historical demo**, **Historical example**, and explicitly says that the current query was unavailable. It is never dated as a new event or substituted for a valid empty response.

The first live verification on 2026-11-15 returned HTTP 200 and four CME notifications for 2026-11-09–2026-11-15, with all five fields present. A later, unintercepted browser query displayed the latest three, including the newly issued `20261115-AL-002`. The historical record and its official page were separately checked against NASA. Independent requests can return newer data as notifications are issued.

The card lives inside the existing scrollable HUD panel. Its entire visible rectangle is already included by **Show envelope** when calculating padding; no extra map overlay is introduced. The map, modeled budgets and destination calculations remain independent of the notification component.

### Verification and review captures

After Vite restarted with a personal NASA key, a live request through the local `/api/donki/notifications` proxy returned HTTP 200 and five CME notices. The normalized result selected the three newest notices for display.

Interactive Chromium checks covered the real NASA response and intercepted responses for valid empty results, HTTP 429/503, invalid JSON, unexpected structure, a network failure and a response delayed beyond the 12-second timeout. Manual Refresh recovered after failures; repeated activation while loading produced one request, and a late response did not overwrite the recovery. Duplicate records were normalized and HTML-like message contents stayed literal text. Startup produced one request under React StrictMode. UTC date calculations were checked across month/year boundaries and leap day.

Reserves, selected target, evaluation, imagery, center and zoom stayed unchanged through notification state transitions. Keyboard Tab/Enter and visible focus were checked, along with internal panel scrolling and **Show envelope** at 1440 × 900, 768 × 1024, 390 × 844, 320 × 568 and 667 × 375. The envelope stayed inside the map without intersecting the HUD panel. These checks do not verify physical devices, screen readers, other browser engines or NASA service availability beyond the observed requests. No automated test files or testing dependencies were added.

Captures: [real NASA response](output/playwright/donki-nasa-real.png), [simulated valid empty response](output/playwright/donki-empty-simulated.png), [simulated HTTP 503 with the real historical example](output/playwright/donki-fallback-simulated.png). Only the first capture uses an unintercepted live query. The two other captures demonstrate controlled availability scenarios, not observed NASA outages or an observed absence of CME notifications.

## Team — Tuxonauts

| Member | Role | GitHub |
| --- | --- | --- |
| Marcos da Silva Schlick | Team Owner | [@marcosschlick](https://github.com/marcosschlick) |
| Maximiliano Olagorta Mello | Developer | [@MaxiiMello](https://www.google.com/search?q=https://github.com/MaxiiMello) |
| Bernardo Ribeiro | Developer | [@Bernardo-Ribeiro](https://github.com/Bernardo-Ribeiro) |
| Mauricio Carvalho | Developer | [@Maure7](https://github.com/Maure7) |
| William Palhares Meireles | Developer | [@williamFRZ](https://github.com/williamFRZ) |
