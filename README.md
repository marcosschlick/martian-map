# Martian Map — Tuxonauts

Tactical hyperlocalized EVA navigation HUD for Mars surface exploration, built for the **2026 NASA Space Apps Challenge** (*Interplanetary Survival Guide: Martian Map*).

## Overview

**Martian Map** focuses on **Jezero Crater** and combines NASA planetary imagery, contextual space-weather notifications and illustrative planning tools for Extravehicular Activities (EVAs):

- **Multi-Layer Mars Visualization:** Combines Viking optical imagery, MOLA elevation tiles and the historical CTX mosaic.
- **Space Weather Context:** Shows NASA DONKI CME notifications with their original issue dates, source links and query availability. These are not local radiation measurements.
- **Modeled EVA Return Envelope and Target:** Illustrates outward-and-return travel reach from simulated oxygen/battery budgets and evaluates a selected target's direct travel budget. Terrain, traversability and space weather remain unevaluated.
- **Pressurized Glove Mode:** Toggles between detailed mission planning and an oversized, high-contrast interface designed for astronauts wearing pressurized spacesuit gloves.

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
cp .env.example .env
npm run dev
```

Open `.env` and set `VITE_NASA_API_KEY` to your personal NASA API key (get a free key at [https://api.nasa.gov/](https://api.nasa.gov/)). An unset or empty value uses NASA's public demonstration credential, subject to its request limits. Credentials are supplied at runtime and are not included in query messages or source-page links.

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

Viking remains underneath CTX as context. The HUD identifies loading, loaded and incomplete/unavailable imagery. CTX requests have a 15-second timeout, HTTP status checks, PNG signature/end-marker checks, image decoding and dimension checks. Failed tiles stay hidden to expose the context layer; if context also fails, the HUD reports that. Requests are cancelled on tile removal and StrictMode cleanup. There is no automatic retry loop or per-tile alert; revisiting an area or selecting the layer again can issue fresh requests.

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

For simulated percentages `O` and `B` in 0–100:

```text
oxygenBudgetMinutes = 240 * max(0, O - 20) / 100
batteryBudgetMinutes = 180 * max(0, B - 20) / 100
excursionBudgetMinutes = min(oxygenBudgetMinutes, batteryBudgetMinutes)
radiusMeters = excursionBudgetMinutes * (2000 / 60) / 2
```

The 20% is subtracted as **20 percentage points of full capacity**, not 20% of the resource remaining. `Excursion budget` covers both travel directions; the factor of two allocates half to outward travel and half to return. `Estimated reach` is the corresponding one-way radius from the Habitat. `Limiting resource` identifies the smaller time budget, or `Both` for equal budgets. Reaching the protected reserve in either resource gives **zero excursion budget even though resources may remain**.

| Oxygen | Battery | Excursion budget | Radius | Limiting resource |
| --- | --- | --- | --- | --- |
| 100% | 100% | 144 min | 2,400 m | Battery |
| 100% | 50% | 54 min | 900 m | Battery |
| 30% | 100% | 24 min | 400 m | Oxygen |
| 29% | 100% | 21.6 min | 360 m | Oxygen |
| 20% or less | Any | 0 min | 0 m | Oxygen, or Both if both budgets are zero |
| Any | 20% or less | 0 min | 0 m | Battery, or Both if both budgets are zero |

Budgets are derived in `src/evaModel.js` from the existing App state; they are not stored separately. Available budgets use green, a positive budget with either resource below 30% uses amber, and zero budget uses red with **No excursion budget**. The original individual reserve warnings remain independent. `Reset reserves` restores 100/100, 144 min and 2,400 m without changing the layer or view. Unrounded numbers drive geometry; the HUD formats numbers for readability.

### Mars geometry and map behavior

The planetary radius is **3,396,190 metres**, taken from the `GCS_Mars_2000_Sphere` WKT in the [CTX provider metadata](https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson), rechecked on 2026-11-15. This geometric reference comes from the imagery provider; it does not validate the demo resource assumptions. Both forward spherical destinations and the haversine distance calculation share that radius. Leaflet global objects and Earth distance settings remain untouched; `L.CRS.EPSG4326` is used only for display.

For each of 96 equally spaced bearings, the model uses angular distance `radiusMeters / MARS_RADIUS_METERS` to calculate a destination from the Habitat at 18.38 N, 77.58 E. Leaflet renders these vertices with one `L.polygon`; its line segments approximate the circular envelope. The fill opacity is 0.06 and the polygon is non-interactive, so it does not capture map clicks. Changes update the existing polygon's geometry/style without rebuilding the map or moving the view. At zero radius, the polygon is removed while the Habitat marker remains.

Only **Show envelope** fits the perimeter into the view. It measures the current layer/source overlays, attribution and reserve panel to leave them outside the fitted perimeter area, and respects the existing maximum display zoom. The button is disabled when there is no envelope. A height-limited reserve panel scrolls internally on smaller viewports; its assumptions remain available through the keyboard-accessible **Model assumptions** disclosure. CTX and the three existing modes retain their imagery, native zoom limits and fallback behavior.

Numeric verification covered all 10,201 integer Oxygen/Battery combinations. Their 121 distinct radii include zero; 11,520 generated vertices at the 120 positive radii had a maximum absolute spherical-distance error of **4.17 × 10⁻⁹ m** relative to their requested radius. This is floating-point consistency on the assumed sphere, not a claim about map registration, walking accuracy or physical suit performance.

The model assumes constant walking speed and resource consumption, direct travel and no stops. It evaluates a selected target's direct displacement budget, but does not evaluate terrain, slopes, obstacles, radiation, science tasks or traversable routes. Real navigation and life-support decisions require information that this illustration does not provide.

Interactive Chromium review covered the required numeric cases, reset, zero-budget removal, one persistent map instance, positive-budget geometry updates, and reserve preservation across all four imagery modes. Show envelope kept the perimeter clear of HUD panels at 1440 × 900, 768 × 1024, 390 × 844, 320 × 568 and 667 × 375; short landscape framing uses space beside the overlays. Keyboard activation and visible focus were checked for the controls, framing button and assumptions disclosure. Opening assumptions and reaching zero budget did not resize or move the mobile map. CTX fallback was checked with both the damaged service-level-11 images and a simulated HTTP 503. Physical devices, other browser engines and screen readers were not verified. No test files or testing frameworks were added.

Review captures: [full reserves](output/playwright/envelope-full.png), [reduced reserves](output/playwright/envelope-reduced.png), [zero excursion budget with resources remaining](output/playwright/envelope-zero.png).

## EVA target direct budget estimate

Click or tap the map to select one target; another selection replaces it. **Use map center** selects the current center without moving the view: focus the map, pan with its arrow keys and activate the button using Tab and Enter/Space. **Clear target** removes only the target, its reference line, tooltip and evaluation. Reserve edits, Reset reserves, imagery changes and Show envelope retain the selected target. Clicking HUD/Leaflet controls or dragging the map does not select a target. Selecting a point or changing reserves does not recenter or zoom the map.

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

The reference line connects the two coordinates in the map projection; distance is computed separately on the Mars sphere. It is **not a navigable route**, terrain survey or guarantee of return. The calculation retains the same illustrative capacities, 20 percentage-point protected reserve, constant 2 km/h speed/consumption and no-stop assumptions. Space-weather notifications are separate contextual data; terrain, slopes, obstacles, science objectives, notification interpretation and glove mode remain outside this travel-budget calculation.

Numeric checks generated target coordinates with the existing Mars envelope geometry for 1,800, 2,400 and 3,000 m. Additional checks covered distances 0.009 m and 0.011 m on either side of the limit, low reserves, null selection and zero budget at the Habitat. Interactive Chromium checks covered click/touch selection, replacement, clear, keyboard center selection and focus, unchanged view on selection/reserve edits, persistence across reset/framing/pan/zoom and the four imagery modes, and a simulated CTX HTTP 503 fallback. Marker/line counts remained one when selected and zero after clearing. Layouts were reviewed at 1440 × 900, 768 × 1024, 390 × 844, 320 × 568 and 667 × 375, including a touch-enabled browser context. Small panels scroll internally. These checks do not verify physical devices, screen readers, other browser engines or real terrain suitability.

Review captures: [within budget](output/playwright/target-within.png), [budget exceeded with the same target](output/playwright/target-exceeded.png), [zero budget with target retained](output/playwright/target-zero.png). Browser clicks select map coordinates at display-pixel precision; the numeric reference cases above use generated spherical coordinates before display rounding.

## DONKI notifications and historical fallback

The **Space weather** card provides notification context only: **Solar event context · Mars surface radiation not evaluated.** It does not assign a dose, a danger level in Jezero, or a numerical modifier to either the return envelope or target evaluation. A CME's presence, speed or mention of Mars is insufficient for that purpose. Empty results and unavailable queries do not establish local radiation conditions. Interpretation and any future modifier require a documented Mars-relevant model or an explicitly identified simulation.

Official references: [DONKI overview](https://ccmc.gsfc.nasa.gov/tools/DONKI/), [API documentation](https://ccmc.gsfc.nasa.gov/DONKI/api/), [notification guide](https://ccmc.gsfc.nasa.gov/DONKI/guide/notifications/).

### Query and lifecycle

Endpoint: `https://api.nasa.gov/DONKI/notifications`. The application sends `type=CME` and explicit `startDate`/`endDate` parameters. Each query computes the last **seven UTC calendar dates including today**, so on 2026-11-15 the period is 2026-11-09 through 2026-11-15. This is a calendar-date interval, not a rolling 168-hour window. The configured Vite NASA credential is used, with the public demonstration credential as a fallback; request URLs and credentials are never included in displayed error messages.

The component queries once at startup and only again through **Refresh**. Reserve edits, target changes, imagery switches, pan and zoom do not trigger a query. A synchronous active-request guard and disabled Refresh prevent concurrent requests. The initial request is scheduled for the next task so StrictMode cleanup cancels its probe before it reaches the network. Cleanup cancels both a pending start and the active request; mounted/identity guards ignore obsolete completion. There is no retry loop, polling or midnight refresh. A later manual Refresh recalculates its UTC period.

Requests have a **12-second timeout** covering fetch/body reading. HTTP status, JSON parsing and notification structure are checked separately. Network failure, HTTP 429, other HTTP errors, invalid JSON and unexpected contents produce a clearly identified historical fallback. Errors contain controlled explanations, not native fetch messages or credential-bearing URLs. A valid `[]` is preserved as **No CME notifications in queried period**, without substituting the historical example. Loading hides previous results rather than relabeling stale contents as current.

### Fields and provenance

The response is an array containing `messageID`, `messageType`, `messageIssueTime`, `messageURL` and `messageBody`. The application validates nonempty string fields, CME type, a valid UTC issue time within the queried dates, and official CCMC links without embedded credentials. Legacy CCMC page hosts are normalized to the current HTTPS host. Duplicate identifiers retain the newest issue, results sort newest first, and at most **three** are shown. The API's original issue timestamp is retained, including its source precision. Message bodies are selectable, wrapped plain text inside disclosures; external HTML is not inserted into the DOM.

The card separates the queried UTC period, the current attempt's start time, each notification's original UTC issue time and the source. **Query attempt** is not the notification time or a last-success timestamp. NASA response and historical availability states do not represent a storm/radiation risk classification.

The fallback is a verified historical NASA notification: [20240510-AL-003](https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30674/1), originally issued **2024-05-10 13:38 UTC**. Its short original excerpt describes detection by STEREO A/SOHO and the event start at 2024-05-10 07:12 UTC. The fallback keeps that original issue date and link; it is labeled **Historical demo**, **Historical example**, and explicitly says that the current query was unavailable. It is never dated as a new event or substituted for a valid empty response.

The first live verification on 2026-11-15 returned HTTP 200 and four CME notifications for 2026-11-09–2026-11-15, with all five fields present. A later, unintercepted browser query displayed the latest three, including the newly issued `20261115-AL-002`. The historical record and its official page were separately checked against NASA. Independent requests can return newer data as notifications are issued.

The card lives inside the existing scrollable HUD panel. Its entire visible rectangle is already included by **Show envelope** when calculating padding; no extra map overlay is introduced. The map, modeled budgets and destination calculations remain independent of the notification component.

### Verification and review captures

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
