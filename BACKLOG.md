# BACKLOG.md

## Project Context & Vision

**Martian Map** by **Tuxonauts** is built for the **2026 NASA Space Apps Challenge** (*Interplanetary Survival Guide: Martian Map*).

### Problem
Global Mars maps and orbital viewers lack hyperlocalized, real-time Extravehicular Activity (EVA) survival telemetry for astronauts operating on foot. Surface crews need immediate spatial awareness of terrain hazards, life-support margins, and solar radiation conditions relative to their Habitat.

### Solution
A hyperlocalized tactical EVA navigation HUD centered on **Jezero Crater** (`18.38° N, 77.58° E`), built around three core pillars:

1. **Multi-Layer NASA Data:** Combines Viking optical imagery and MOLA colorized topography/elevation from NASA Mars Trek WMTS with live space weather and CME radiation alerts from the NASA DONKI API.
2. **Point of No Return (Autonomy Circle):** Renders a dynamic safety radius around the Habitat calculated from suit oxygen/battery reserves and solar radiation penalties, validating in real time whether planned EVA waypoints remain within safe return margins.
3. **Pressurized Glove Mode:** A one-click HUD mode that switches from standard mission planning to a high-contrast, oversized-button layout engineered for astronauts operating in stiff pressurized spacesuit gloves.

---

## Task Roadmap

### Phase 1: Project Setup & Base HUD
- [x] **Vite + React + Tailwind v4 + Leaflet Setup:** Installed `tailwindcss`, `@tailwindcss/vite`, and `leaflet`; configured Tailwind v4 in `vite.config.js` and imported Tailwind + Leaflet CSS in `src/index.css`.
- [x] **ESLint & Prettier Config:** Installed `prettier` and `eslint-config-prettier`, integrated `eslint-config-prettier/flat` in `eslint.config.js`, and added the `format` script in `package.json`.
- [x] **Environment Template:** Created `.env.example` and `.env` with `VITE_NASA_API_KEY=DEMO_KEY` and verified `.env` is ignored in `.gitignore`.
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
- [ ] **Click-to-Place EVA Waypoint:** Allow astronauts/planners to click the map to place a target EVA waypoint and compute surface distance from the Habitat.
- [ ] **Real-Time Safe / Danger Route Status:** Trigger clear visual risk warnings in the HUD and route line styling when a waypoint exceeds the Autonomy Circle radius.

### Phase 4: Space Weather Integration (NASA DONKI)
- [ ] **DONKI API Fetch & Fallback:** Query CME/solar radiation notifications from `https://api.nasa.gov/DONKI/notifications` using `import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY'` wrapped in `try/catch` with realistic static fallback data.
- [ ] **Solar Storm Alert Badge:** Display active space weather status and radiation alert badges in the HUD.
- [ ] **Radiation Autonomy Penalty:** Automatically shrink the Autonomy Circle safety radius when active solar storm / CME alerts are detected.

### Phase 5: Pressurized Glove Mode & Final Polish
- [ ] **Pressurized Glove Mode Toggle:** Implement a one-click HUD mode switch that enlarges interactive controls to oversized touch targets and boosts visual contrast for stiff spacesuit gloves.
- [ ] **Responsive Layout Verification:** Verify full-viewport rendering without unintended scrollbars across desktop and tablet screen sizes.
- [ ] **Final Build & Quality Check:** Run `npm run format`, `npm run lint`, and `npm run build` to ensure a clean production bundle ready for deployment.
