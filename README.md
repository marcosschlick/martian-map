# Martian Map (Tuxonauts)

EVA planning HUD for Jezero Crater (`18.38° N, 77.58° E`), built by Tuxonauts for the 2026 NASA Space Apps Challenge (*Interplanetary Survival Guide: Martian Map*).

## Overview

Martian Map puts orbital imagery, elevation, simulated suit budgets, and NASA space weather notices into a single browser view:

- Multi-layer Mars map: switches between Viking optical imagery, MOLA colorized shaded relief, a `0.55`-opacity blended overlay, and the historical CTX orbital mosaic.
- Local science objective: locates `East crater survey`, an image-derived crater rim observation point with source links and a proposed astronaut activity.
- Suggested traverse: compares straight-line travel against a four-segment detour around one project-defined crater exclusion.
- Space weather context: fetches NASA DONKI CME notifications with original UTC issue timestamps, source links, and a historical fallback when the API is unavailable. These notices do not measure surface radiation on Mars.
- EVA return envelope and target check: computes a round-trip reach circle from simulated oxygen and battery reserves (plus an optional radiation dose cap) and evaluates direct travel to any selected point.
- Pressurized Glove Mode: the **Glove mode** header toggle switches controls to `44 px` minimum targets, opaque `#020617` panels, `#22D3EE` active states, and `#FACC15` focus outlines while keeping the current map view, target, and reserves intact.

## Tech stack

- Frontend: React 19, Vite, Tailwind CSS v4
- Map engine: Leaflet (`L.CRS.EPSG4326` equirectangular display grid)
- Data sources:
  - [NASA Mars Trek WMTS](https://trek.nasa.gov/mars/) (Viking optical mosaic at 232 m/px, `maxNativeZoom: 7`; MOLA shaded relief at 463 m/px, `maxNativeZoom: 6`)
  - [Esri OnMars CTX MapServer](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson) (Caltech Murray Lab beta01 mosaic, ~5 m/px)
  - [NASA DONKI API](https://api.nasa.gov/) (Space weather CME notifications)

## Running locally

```bash
git clone git@github.com:marcosschlick/martian-map.git
cd martian-map
npm install
cp .env.example .env.local
npm run dev
```

To use a personal key from [NASA Open APIs](https://api.nasa.gov/) during local development, set `NASA_API_KEY` in the git-ignored `.env.local` and restart Vite. In `vite` dev mode (`command === "serve" && !isPreview`), requests to `/api/donki/notifications` are proxied to `https://api.nasa.gov/DONKI/notifications` with an [upstream `X-Api-Key` header](https://api.data.gov/docs/developer-manual/) and any `api_key` query parameter stripped. Existing `VITE_NASA_API_KEY` entries in `.env.local` work through the same proxy, and `envPrefix: "MARTIAN_PUBLIC_"` in [vite.config.js](vite.config.js) prevents client-side bundling of `VITE_*` secrets. Blank keys, `DEMO_KEY`, `vite preview`, and static `vite build` bundles query NASA directly with `DEMO_KEY`.

## CTX Detail imagery

**CTX Detail** displays the Mars Reconnaissance Orbiter Context Camera mosaic **beta01**, produced by Caltech's Murray Lab and hosted by Esri. It is a preliminary, uncontrolled historical mosaic rather than a live camera feed. Nominal source sampling is about 5 m/pixel, though coverage, registration, and seams vary across tiles. Although the service metadata mentions lossy JPEG compression of 8-bit imagery, current tiles arrive as PNGs.

Sources and credits:

- [NASA Mars Trek service catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars)
- [CTX WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0/WMTSCapabilities.xml) (ResourceURL points to the Esri tile service)
- [Provider metadata](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson)
- Tile template: `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}`
- Attribution: `NASA / JPL / MSSS / Caltech Murray Lab / Esri` (Viking context keeps `NASA / JPL / USGS Mars Trek`)

### Tile geometry and zoom correspondence

Both capability documents give a global extent of `-180` to `180` longitude and `-90` to `90` latitude, origin `(-180, 90)`, north-to-south rows, `512 × 512` pixels per tile, and two columns by one row at service level 0. That advertised extent does not guarantee full coverage everywhere. Capabilities list CRS `104905`, while provider metadata specifies `GCS_Mars_2000_Sphere` (`104971`) with radius `3,396,190 m`. The angular tile grid aligns with `L.CRS.EPSG4326`, which the map uses only for display; planetary distances come from Mars-sphere formulas in [src/evaModel.js](src/evaModel.js).

At service level `n`, angular resolution is `0.3515625 / 2^n` degrees/pixel and each tile spans `180 / 2^n` degrees. Leaflet `EPSG:4326` spans `512 × 2^z` pixels across 360 degrees (`0.703125 / 2^z` degrees/pixel), so matching resolutions requires `z = n + 1`. `ctxLayer` sets `tileSize: 512`, `zoomOffset: -1`, `minZoom: 2`, `maxNativeZoom: 13`, and `maxZoom: 13`. Row and column indices are `floor((90 - latitude) / tileSpan)` and `floor((longitude + 180) / tileSpan)`.

| Leaflet zoom | CTX service level | Tile at `18.38° N, 77.58° E` | Status on 2026-11-15 |
| --- | --- | --- | --- |
| 9 | 8 | `/tile/8/101/366` | Complete, decoded PNG |
| 10 | 9 | `/tile/9/203/732` | Complete, decoded PNG |
| 11 | 10 | `/tile/10/407/1465` | Complete, decoded PNG |
| 12 | 11 | `/tile/11/814/2930` | HTTP 200 but truncated PNG; Viking fallback |
| 13 | 12 | `/tile/12/1629/5861` | Complete PNG (checked with all 8 neighbors) |

Capabilities advertise levels 0 to 11 and provider metadata lists 0 to 17, but central tiles at levels 13, 14, and 17 returned HTTP 400. Because level 12 and its neighbors returned complete tiles, the app caps CTX requests at service level 12 (`maxNativeZoom: 13`, ~5.09 m/pixel north/south on the Mars sphere) and never requests higher levels.

All four modes share display zoom `2` to `13`. Switching to **CTX Detail** below zoom 9 moves to zoom 13 at the current map center. Viking (`maxNativeZoom: 7`) and MOLA (`maxNativeZoom: 6`) stay available at closer zooms, and the HUD marks them as enlarged beyond native detail. Switching layers keeps the map instance, center, target, and reserves unchanged.

### Availability and limitations

Viking stays active underneath **CTX Detail** so failed or truncated CTX tiles reveal background context rather than blank squares. `watchTileCoverage` in [src/MarsMap.jsx](src/MarsMap.jsx) tracks only tiles visible inside the current viewport at the active layer's native zoom, ignoring off-screen cached failures. Each CTX request enforces a 15-second timeout (`TILE_TIMEOUT_MS = 15000`), checks HTTP status, verifies the 8-byte PNG header and 12-byte `IEND` trailer, runs `tile.decode()`, and requires `512 × 512` natural dimensions. In Chromium, the damaged level-11 sample passed `image.decode()` even without an `IEND` chunk, which the byte-level check catches. This check verifies container framing and dimensions, not PNG CRCs or scientific registration quality. Pending tile fetches abort on tile unload and React `StrictMode` cleanup.

Orbital imagery alone cannot certify EVA routes, ground slopes, or surface hazards. Network availability and coverage outside Jezero depend on the Esri and Mars Trek hosts.

Capture: [CTX Detail at Jezero](output/playwright/ctx-jezero.png).

## Illustrative EVA return model

The **Simplified model** panel and map envelope are an illustration using demonstration assumptions, not real spacesuit specifications or operational safety limits.

| Demonstration assumption | Value |
| --- | --- |
| Oxygen at full capacity | 240 minutes |
| Battery at full capacity | 180 minutes |
| Constant walking speed | 2,000 meters/hour (2 km/h) |
| Protected reserve | 20 percentage points of full capacity |

For suit percentages `O` and `B` in `0` to `100` with **Radiation simulation** off:

```text
oxygenBudgetMinutes = 240 * max(0, O - 20) / 100
batteryBudgetMinutes = 180 * max(0, B - 20) / 100
excursionBudgetMinutes = min(oxygenBudgetMinutes, batteryBudgetMinutes)
radiusMeters = excursionBudgetMinutes * (2000 / 60) / 2
```

The protected 20% comes off each resource's full capacity rather than its remaining level. Dividing by two splits the smallest time budget evenly between outbound and return legs, so dropping either resource to 20% or below leaves zero excursion budget even while suit reserves remain. Amber marks reserves below 30% or a suit budget trimmed by simulated radiation; red marks zero excursion budget. **Reset reserves** restores `100%` Oxygen and `100%` Battery (`144 min`, `2,400 m`). Geometry uses unrounded values, while the HUD formats numbers for readability.

| Oxygen | Battery | Excursion budget | Radius | Limiting factor |
| --- | --- | --- | --- | --- |
| 100% | 100% | 144 min | 2,400 m | Battery |
| 100% | 50% | 54 min | 900 m | Battery |
| 30% | 100% | 24 min | 400 m | Oxygen |
| 29% | 100% | 21.6 min | 360 m | Oxygen |
| 20% or less | Any | 0 min | 0 m | Oxygen, or Both if both budgets are zero |
| Any | 20% or less | 0 min | 0 m | Battery, or Both if both budgets are zero |

### Mars geometry and map framing

[src/evaModel.js](src/evaModel.js) computes spherical destinations and haversine distances using `MARS_RADIUS_METERS = 3,396,190` from the `GCS_Mars_2000_Sphere` WKT in the [CTX provider metadata](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson). `createEnvelope` generates 96 vertices at angular distance `radiusMeters / MARS_RADIUS_METERS` around the Habitat (`18.38° N, 77.58° E`) and updates a single non-interactive `L.polygon` without moving the map view. At zero radius, the polygon is removed while the Habitat marker stays visible. Across all 10,201 integer Oxygen/Battery pairs (11,520 vertices over 120 positive radii), spherical distance error relative to the requested radius stayed within `4.17 × 10^-9 m`.

**Show envelope** and **Show science area** share `frameMapBounds` in [src/MarsMap.jsx](src/MarsMap.jsx). It measures the zoom control, layer/source overlays, attribution, and side-docked mission panel (ignoring stacked portrait panels below the map) so fitted bounds sit clear of HUD panels. On tight viewports such as `320 × 568`, the `Imagery source` status moves into a compact bar below the map, the portrait panel uses `35dvh`, and `frameMapBounds` enforces a `76 px` minimum legible frame so geometries stay clear and readable instead of shrinking to a few pixels.

Captures: [full reserves](output/playwright/envelope-full.png), [reduced reserves](output/playwright/envelope-reduced.png), [zero excursion budget](output/playwright/envelope-zero.png).

## EVA target direct budget estimate

Clicking or tapping the map places one EVA target; **Use map center** selects the current center without moving the view, and **Clear target** removes the marker, reference line, and readout. Reserve edits, **Reset reserves**, imagery switches, and **Show envelope** keep the active target. Panning stays bounded to `[-90, -180]` through `[90, 180]`, and clicks on controls or drags leave the target alone.

`evaluateTarget` in [src/evaModel.js](src/evaModel.js) compares unrounded haversine distance against the analytic return radius:

```text
distanceMeters = marsDistanceMeters(habitat, target)
roundTripMinutes = 2 * distanceMeters / (2000 / 60)
timeMarginMinutes = excursionBudgetMinutes - roundTripMinutes
```

A `0.01 m` tolerance (`TARGET_LIMIT_TOLERANCE_METERS`) labels points on the perimeter as **At modeled limit** without adding travel time or changing the raw margin. The HUD avoids `-0` formatting and displays `<0.1 min short` for sub-0.1-minute shortfalls. Target marker and dashed **Direct estimate** line colors follow the target budget status independently of the envelope's reserve color, and `createDirectReference` splits lines that cross the `±180°` antimeridian.

| Condition | Evaluation | Target color |
| --- | --- | --- |
| No target | Select an EVA target | Neutral |
| Zero excursion budget (even at the Habitat) | No excursion budget | Red |
| Positive budget within `0.01 m` of radius | At modeled limit | Amber |
| Positive budget strictly inside radius | Within modeled budget | Green, or amber with low reserves |
| Positive budget strictly outside radius | Exceeds modeled budget | Red |

| Oxygen / Battery | Target distance | Round trip | Time margin | Evaluation |
| --- | --- | --- | --- | --- |
| 100% / 100% | 1,800 m | 108 min | +36 min | Within modeled budget |
| 100% / 50% | 1,800 m | 108 min | -54 min | Exceeds modeled budget (Battery limits) |
| 100% / 100% | 2,400 m | 144 min | 0 min | At modeled limit |
| 100% / 100% | 3,000 m | 180 min | -36 min | Exceeds modeled budget |
| 20% or below in either | Target retained | Depends on distance | `0 - roundTripMinutes` | No excursion budget |

Captures: [within budget](output/playwright/target-within.png), [budget exceeded](output/playwright/target-exceeded.png), [zero budget with target retained](output/playwright/target-zero.png).

## Science objective and local destination

**East crater survey** (`18.367767333984375° N, 77.61909484863281° E`) is a Tuxonauts label for an observation point east of a small crater on Jezero's floor, not an official NASA site or rover sampling location. The historical CTX mosaic shows an arcuate rim and contrasting interior; the proposed astronaut activity is photographing rim and floor textures to compare with orbital views. Local composition, age, slope, and footing remain unassessed.

Context links in the HUD point to the [USGS regional geologic map](https://www.usgs.gov/maps/geologic-map-jezero-crater-and-nili-planum-region-mars) (1:75,000 regional morphology context; no unit is assigned to this small crater) and a NASA [delta sampling example](https://science.nasa.gov/resource/two-perseverance-sampling-locations-in-jezeros-delta/) (broader mission context only).

### Image-derived coordinates

Coordinates in [src/scienceData.js](src/scienceData.js) come from continuous pixel-edge offsets `(x, y)` in [CTX tile `10/407/1465`](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/10/407/1465) (`512 × 512`, `tileSpan = 180 / 2^10` degrees, origin `(-180, 90)`):

```text
longitude = -180 + (1465 + x / 512) * 180 / 1024
latitude  =   90 - (407  + y / 512) * 180 / 1024
```

`SCIENCE_SITE` uses offset `(290, 260)` (~20.4 m/px north/south and ~19.3 m/px east/west at level 10). Manual placement precision is roughly 50 m relative to the mosaic, with unquantified absolute registration accuracy. Reference snapshots and inspected level-12 tiles from 2026-11-15:

- Level-10 reference tile: [public/science/ctx-reference.png](public/science/ctx-reference.png) (`SHA-256: 0b6a0b8f8053291738d15cd82dfdafd2e00026fc6b4c42634bf5117cfc7e48f0`)
- [12/1629/5861](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/12/1629/5861): `8e50c49873c36695e32d0dcc95aeffd42b03e85e4818eadfd822325f5ad11cd4`
- [12/1629/5862](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/12/1629/5862): `605ad23f4db8b0e14a85daaeccc4e3404371c413b777ca827358491196a5ab6a`
- [12/1630/5861](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/12/1630/5861): `f3c42dc51f8b1e8ac0ed09b746458b24d1c5e7c02d3aa8dfbf0a3c6bf7c0d300`
- [12/1630/5862](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/12/1630/5862): `343950ae776f0fae471092c62f784ad80162cb6f1baf01b72b623c42932ecbd3`

### Selection and budget

**Select science site** and the keyboard-accessible diamond marker (`zoom >= 10` to avoid overlapping the Habitat at regional zooms) select `SCIENCE_SITE`. **Show science area** frames `SCIENCE_AREA_BOUNDS` (`(165, 218)` to `(306, 294)`), keeping the marker visible even on `320 × 568` screens in both standard and Pressurized Glove Mode. Choosing a free target or **Clear target** clears the science association. At `100%` Oxygen and `100%` Battery with radiation simulation off, direct travel is `2,315.646731 m` one way (`138.938804 min` round trip, `+5.061196 min` margin against `144 min`). Science work and stops are excluded from the travel budget.

Capture: [science objective and destination](output/playwright/science-objective.png).

## Suggested traverse and project exclusion

When **East crater survey** is selected, the user can switch between **Direct estimate** (which warns that the straight segment crosses the project exclusion) and **Suggested traverse** (a curated three-waypoint detour north of the crater). Free-target selection or **Clear target** hides the `CRATER_EXCLUSION` polygon and resets traverse mode.

### Exclusion provenance and segment checks

Tuxonauts traced `CRATER_EXCLUSION` manually across the four level-12 CTX tiles above and recorded a 13-point closed contour in level-10 pixel coordinates with roughly 2 to 5 overview pixels (~40 to 100 m) of margin around the visible outer rim:

```text
(228,254), (239,247), (254,243), (270,242), (282,247),
(289,253), (284,266), (278,277), (268,284), (253,288),
(239,287), (229,281), (226,269), back to (228,254)
```

This contour is a project-defined planning outline inside the `2.7 × 1.5 km` (`(165, 218)` to `(306, 294)`) review window, not a published NASA hazard polygon or measured slope limit. Other craters, rocks, loose regolith, and slopes remain unassessed. The NASA [Ingenuity terrain article](https://www.nasa.gov/solar-system/nasas-mars-helicopter-reveals-intriguing-terrain-for-rover-team/) describes rover entrapment at Séítah dunes elsewhere in Jezero and is not the source of this contour. See [public/science/ctx-interpretation.png](public/science/ctx-interpretation.png) for an annotated view (stretched 1st to 99th percentile for inspection only).

`DEMO_TRAVERSE_POINTS` runs from the Habitat through `(222, 236)`, `(275, 234)`, and `(298, 246)` to `(290, 260)`. `reviewTraverse` in [src/scienceData.js](src/scienceData.js) validates that endpoints match the Habitat and `SCIENCE_SITE` within `0.01 m`, all waypoints lie inside `SCIENCE_AREA_BOUNDS`, and no vertex or full line segment touches or crosses `CRATER_EXCLUSION`. Failing any check renders **Suggested traverse unavailable** with no line or numerical travel estimate rather than falling back silently to direct travel.

One-way length sums Mars-sphere haversine distances across successive waypoints, and return retraces the outbound waypoints at `2 km/h`:

| Calculation reference (100% / 100%, radiation off) | Direct estimate | Suggested traverse |
| --- | --- | --- |
| One-way length | 2,315.646731 m | 2,772.348210 m |
| Outbound time | 69.469402 min | 83.170446 min |
| Return time | 69.469402 min | 83.170446 min |
| Round-trip time | 138.938804 min | 166.340893 min |
| Time margin against 144 min | +5.061196 min | -22.340893 min |

Even though the destination sits inside the `2,400 m` direct envelope, the detour exceeds the `144 min` budget by `22.340893 min` (or `-112.340893 min` at `50%` Battery). The envelope remains a direct-reach reference rather than a routed contour.

Captures: [suggested traverse and exclusion](output/playwright/suggested-traverse.png), [mobile traverse](output/playwright/suggested-traverse-mobile.png).

## Radiation dose simulation

**Radiation simulation** under **Simplified model** defaults to **Off**. **Low rate** (`0.10 mSv/h`, `100 µSv/h`) and **High rate** (`0.50 mSv/h`, `500 µSv/h`) apply a constant illustrative dose rate across the round trip against an adjustable demo allowance (`0` to `0.30 mSv` in `0.01 mSv` steps, stored internally in `µSv`). Real exposure assessment depends on mission shielding and environment ([NASA Space Radiation Analysis Group](https://srag.jsc.nasa.gov/spaceradiation/how/how.cfm)).

```text
doseBudgetMinutes = 60 * remainingDose / doseRatePerHour
excursionBudgetMinutes = min(oxygenBudgetMinutes, batteryBudgetMinutes, doseBudgetMinutes)
simulatedTargetDose = doseRatePerHour * roundTripMinutes / 60
doseMargin = remainingDose - simulatedTargetDose
```

At full suit reserves and `0.30 mSv` remaining, **Low rate** sets a 180-minute dose cap (so Battery still limits the excursion to `144 min` and `2,400 m`), while **High rate** caps the trip at `36 min` (`600 m`). Setting the allowance to `0` removes the envelope while retaining any selected target; switching back to **Off** restores suit-only limits while remembering the slider value. For example, a `1 km` target (`60 min` round trip) drops from `+84 min` (**Within modeled budget**) to `-24 min` (**Exceeds modeled budget**) under **High rate**, consuming `0.50 mSv` (`-0.20 mSv` demo dose margin).

## DONKI notifications and historical fallback

The **Space weather** card and header badge share one query (`useSpaceWeather` in [src/useSpaceWeather.js](src/useSpaceWeather.js)) for CME notifications from `https://api.nasa.gov/DONKI/notifications` (`type=CME`, 7 UTC calendar days ending today). Official docs: [DONKI overview](https://ccmc.gsfc.nasa.gov/tools/DONKI/), [API documentation](https://ccmc.gsfc.nasa.gov/DONKI/api/), and [notification guide](https://ccmc.gsfc.nasa.gov/DONKI/guide/notifications/).

- Startup schedules the initial request in a `setTimeout(..., 0)` task so React `StrictMode` cleanup cancels the first probe before it hits the network. A synchronous ref guard blocks concurrent requests while loading, and cleanup aborts active fetches on unmount.
- Requests enforce a `12,000 ms` timeout covering `fetch` and JSON parsing. Controlled error strings avoid exposing credentialed URLs.
- [src/spaceWeather.js](src/spaceWeather.js) checks that each entry has non-empty `messageID`, `messageType === "CME"`, `messageIssueTime` (valid UTC timestamp inside the queried `startDate` to `endDate` window without calendar rollover), `messageBody`, and an official CCMC link (`ccmc.gsfc.nasa.gov` or `kauai.ccmc.gsfc.nasa.gov` under `/DONKI/` with no embedded credentials, port, or secret-like query parameters, normalized to `https://ccmc.gsfc.nasa.gov`).
- Results deduplicate by `messageID` (keeping the latest timestamp), sort newest first, keep at most three notices, and render message bodies as literal text inside `<details>` disclosures.
- Valid `[]` responses show **No CME notifications in queried period**. HTTP errors (such as `429`), timeouts, invalid JSON, or nonempty arrays with zero valid entries fall back to the verified historical NASA record [20240510-AL-003](https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30674/1) (`2024-05-10 13:38 UTC`), labeled **Historical demo** / **Historical example**.

Captures: [real NASA response](output/playwright/donki-nasa-real.png), [simulated empty response](output/playwright/donki-empty-simulated.png), [simulated HTTP 503 historical fallback](output/playwright/donki-fallback-simulated.png).

## Team (Tuxonauts)

| Member | Role | GitHub |
| --- | --- | --- |
| Marcos da Silva Schlick | Team Owner | [@marcosschlick](https://github.com/marcosschlick) |
| Maximiliano Olagorta Mello | Developer | [@MaxiiMello](https://github.com/MaxiiMello) |
| Bernardo Ribeiro | Developer | [@Bernardo-Ribeiro](https://github.com/Bernardo-Ribeiro) |
| Mauricio Carvalho | Developer | [@Maure7](https://github.com/Maure7) |
| William Palhares Meireles | Developer | [@williamFRZ](https://github.com/williamFRZ) |
