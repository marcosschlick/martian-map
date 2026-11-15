# BACKLOG.md

## Project Context & Vision

**Martian Map** by **Tuxonauts** is built for the **2026 NASA Space Apps Challenge** (*Interplanetary Survival Guide: Martian Map*).

### Problem
Global Mars maps and orbital viewers lack hyperlocalized, real-time Extravehicular Activity (EVA) survival telemetry for astronauts operating on foot. Surface crews need immediate spatial awareness of terrain hazards, life-support margins, and solar radiation conditions relative to their Habitat.

### Solution
A hyperlocalized tactical EVA navigation HUD centered on **Jezero Crater** (`18.38° N, 77.58° E`), built around three core pillars:

1. **Multi-Layer NASA Data:** Combines Viking optical imagery and MOLA colorized topography/elevation from NASA Mars Trek WMTS with contextual CME notifications from NASA DONKI. Notifications do not measure local Mars surface radiation.
2. **Point of No Return (Autonomy Circle):** Renders an illustrative return envelope from simulated suit budgets and an optional dose allowance, then evaluates direct target travel against the smallest time budget. DONKI supplies separate event context.
3. **Pressurized Glove Mode:** A one-click HUD mode that switches from standard mission planning to a high-contrast, oversized-button layout engineered for astronauts operating in stiff pressurized spacesuit gloves.

---

## Task Roadmap

### Phase 1: Project Setup & Base HUD
- [x] **Vite + React + Tailwind v4 + Leaflet Setup:** Installed `tailwindcss`, `@tailwindcss/vite`, and `leaflet`; configured Tailwind v4 in `vite.config.js` and imported Tailwind + Leaflet CSS in `src/index.css`.
- [x] **ESLint & Prettier Config:** Installed `prettier` and `eslint-config-prettier`, integrated `eslint-config-prettier/flat` in `eslint.config.js`, and added the `format` script in `package.json`.
- [x] **Environment Template:** Document the optional server-side `NASA_API_KEY` in `.env.example` and use an ignored `.env.local` for the local key. The static build uses `DEMO_KEY`.
- [x] **Tuxonauts Branding:** Placed `/astrotux.png` in `public/`, configured the favicon and page title in `index.html`, and removed unused Vite template boilerplate.
- [x] **Full-Viewport Tactical HUD Shell:** Configured full-screen `html, body, #root` layout in `src/index.css` and built the compact dark space-themed header and map placeholder in `src/App.jsx`.

### Phase 2: Mars Trek Map & Multi-Layer Visualization
- [x] **Leaflet `EPSG:4326` Map Initialization:** Initialize a `L.map` instance via `useRef`/`useEffect` in `src/MarsMap.jsx` using `crs: L.CRS.EPSG4326`, centered on Jezero Crater (`18.38° N, 77.58° E`), with proper React `StrictMode` cleanup (`map.remove()`).
- [x] **NASA Mars Trek Viking Optical Layer:** Add the global 232m Viking color mosaic WMTS tile layer with appropriate zoom bounds (`maxZoom`) to prevent 404 tile requests.
- [x] **NASA Mars Trek MOLA Elevation Layer:** Add the global 463m MOLA colorized shaded relief WMTS tile layer for topography visualization.
- [x] **Habitat Base Marker:** Place a distinct Habitat Base marker with tactical styling/inline SVG icon at the Jezero Crater landing site.
- [x] **Floating HUD Layer Switcher:** Build a floating overlay control (`z-[1000]+`) to toggle between Optical, Elevation, and blended layer views.
- [x] **CTX Detailed Imagery:** Add historical CTX orbital imagery for Jezero with verified tile geometry and zoom limits, source/loading states, corruption handling, Viking context fallback, and responsive browser verification.

### Phase 3: Point of No Return & EVA Waypoint Engine
- [x] **Suit Telemetry Controls:** Add interactive suit oxygen and battery reserve sliders in the tactical HUD.
- [x] **Dynamic Autonomy Circle:** Render an illustrative round-trip return envelope as a 96-vertex Mars-sphere geodesic `L.polygon`, derived from simulated oxygen/battery budgets after a protected reserve; update without moving the view, remove at zero budget, and provide explicit Show envelope framing.
- [x] **Click-to-Place EVA Waypoint:** Select or replace one EVA target by map click/tap or Use map center, preserve it across reserve/layer/view changes, and clear its marker, direct reference line and results with Clear target.
- [x] **Modeled EVA Target Budget Status:** Compare unrounded Mars-sphere target distance with the analytic return radius, recognize the limit within 0.01 m, and display direct round-trip time, signed time margin, limiting resource and independent target colors without evaluating terrain or validating a route.

### Phase 4: Space Weather Integration (NASA DONKI)
- [x] **DONKI API Fetch & Fallback:** Query CME notifications for seven UTC calendar days on startup/manual Refresh, validate and normalize responses, and distinguish NASA results, valid empty results and an original-dated Historical demo fallback with provenance and bounded request handling.
- [x] **Solar Storm Alert Badge:** Highlight the latest NASA CME notification and its original UTC issue time in the HUD. Link to weather details and show distinct loading, empty, and unavailable states. Local radiation remains unevaluated.
- [x] **Radiation Autonomy Penalty:** Offer an opt-in simulation with constant dose-rate presets and an adjustable demo allowance. Apply the resulting time cap to the EVA envelope and target, expose simulated dose and margins, and keep DONKI notifications independent.

### Phase 5: Pressurized Glove Mode & Final Polish
- [x] **Pressurized Glove Mode Toggle:** Add an accessible HUD toggle with 44 px controls, opaque panels, and high-contrast active and focus states.
- [x] **Responsive Layout Verification:** Verify the HUD and return envelope across desktop, tablet, portrait phone, and short landscape viewports in Chromium.
- [x] **Final Build & Quality Check:** Verify formatting, lint, the production build, and the application logo under a nested deploy path.
