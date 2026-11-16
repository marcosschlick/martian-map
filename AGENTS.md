# AGENTS.md

## Project Overview
**Martian Map** by **Tuxonauts** — built for the 2026 NASA Space Apps Challenge (*Interplanetary Survival Guide: Martian Map*).

We are building a hyperlocalized tactical HUD for astronauts on Mars surface walks (EVAs) in Jezero Crater. The core concept combines NASA optical imagery, topography/elevation, and space-weather notifications as context, with two human-centric planning mechanics. DONKI notifications are not measurements of Mars surface radiation:
1. **Point of No Return (Autonomy Circle):** An illustrative return envelope around the Habitat calculated from simulated suit oxygen/battery budgets and an optional, explicitly labeled radiation dose simulation. DONKI provides space-weather context independently. Terrain and local exposure require additional data.
2. **Pressurized Glove Mode:** A UI toggle that switches from mission planning mode to a high-contrast, oversized-button layout designed for astronauts wearing stiff pressurized gloves.

## Tech Stack & Dependencies
- **Stack:** React + Vite + Tailwind CSS + Leaflet (`leaflet` via `useRef`/`useEffect`, no wrapper libraries).
- **Minimal Dependencies:** Do not install icon packs, state managers, or UI libraries. Use inline SVGs and Tailwind classes only.

## NASA Data Endpoints
- **Optical Layer (Mars Trek WMTS):** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg`
- **Elevation Layer (Mars Trek WMTS):** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg`
- **CTX Detail Layer (Esri / Caltech Murray Lab):** `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}` (`zoomOffset: -1`, `maxNativeZoom: 13`, historical beta01 orbital mosaic)
- **Space Weather (NASA DONKI):** `https://api.nasa.gov/DONKI/notifications` (contextual CME notifications; supply explicit UTC dates and credentials at runtime).

## Coding Rules
- **KISS (Keep It Simple, Stupid):** Write the simplest, cleanest code possible. Keep logic concentrated in focused modules under `src/` (`App.jsx`, `MarsMap.jsx`, `SpaceWeather.jsx`, `HudKit.jsx`, `evaModel.js`, `scienceData.js`, `spaceWeather.js`, `useSpaceWeather.js`, `hudStyles.js`). Avoid unnecessary abstractions.
- **DRY (Don't Repeat Yourself):** Reuse helper functions, constants (like NASA URLs, coordinates, and risk thresholds), and UI styles instead of duplicating logic across components.
- **Zero Tests:** Do not write unit, integration, or E2E tests. Do not install testing frameworks.
- **API Resilience:** Wrap NASA API calls in `try/catch` and provide a clearly labeled historical fallback. The local Vite proxy forwards `NASA_API_KEY` server-side when configured. The browser uses NASA's public `DEMO_KEY` for direct requests.
- **Map CRS:** Initialize Leaflet with `crs: L.CRS.EPSG4326` to match Mars Trek WMTS tiles.
- **Language:** All UI text, code, comments, and commits must be in English.
- **Formatting & Linting:** Always run `npm run format` and `npm run lint` after every code modification and fix any issues before finishing.
- **Backlog Tracking:** Always check `BACKLOG.md` before starting work and mark completed tasks with `- [x]` whenever a feature or task is finished.
- **Color Palette:** Follow `PALETTE.md` for all UI and map styling.

## Git Commit Convention
- Use **Conventional Commits** in English.
- **No scope** and **no body/description** (single-line title only).
- Examples:
  - `feat: add oxygen autonomy circle to mars map`
  - `fix: add fallback data for nasa donki api`
  - `style: implement pressurized glove mode layout`
