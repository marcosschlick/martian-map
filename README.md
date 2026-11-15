# Martian Map — Tuxonauts

Tactical hyperlocalized EVA navigation HUD for Mars surface exploration, built for the **2026 NASA Space Apps Challenge** (*Interplanetary Survival Guide: Martian Map*).

## Overview

**Martian Map** focuses on **Jezero Crater** and integrates **3 official NASA data layers** with survival-oriented UX mechanics for Extravehicular Activities (EVAs):

- **Multi-Layer Mars Visualization:** Combines Viking optical imagery and MOLA elevation tiles from **NASA Mars Trek WMTS** with solar radiation/CME alerts from the **NASA DONKI API**.
- **Point of No Return (Autonomy Circle):** Renders a dynamic safe return radius around the Habitat based on suit oxygen/battery reserves and active space weather conditions, flagging routes that enter high-risk slopes or exceed safe return margins.
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

Open `.env` and set `VITE_NASA_API_KEY` to your personal NASA API key (get a free key at [https://api.nasa.gov/](https://api.nasa.gov/)). Leaving it as `DEMO_KEY` still works as a fallback, subject to NASA's hourly rate limits.

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

## Team — Tuxonauts

| Member | Role | GitHub |
| --- | --- | --- |
| Marcos da Silva Schlick | Team Owner | [@marcosschlick](https://github.com/marcosschlick) |
| Maximiliano Olagorta Mello | Developer | [@MaxiiMello](https://www.google.com/search?q=https://github.com/MaxiiMello) |
| Bernardo Ribeiro | Developer | [@Bernardo-Ribeiro](https://github.com/Bernardo-Ribeiro) |
| Mauricio Carvalho | Developer | [@Maure7](https://github.com/Maure7) |
| William Palhares Meireles | Developer | [@williamFRZ](https://github.com/williamFRZ) |
