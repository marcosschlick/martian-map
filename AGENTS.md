# AGENTS.md

## Project Overview
**Martian Map** by **Tuxonauts** — built for the 2026 NASA Space Apps Challenge (*Interplanetary Survival Guide: Martian Map*).

We are building a hyperlocalized tactical HUD for astronauts on Mars surface walks (EVAs) in Jezero Crater. The core concept combines 3 NASA data layers (optical imagery, topography/elevation, and solar radiation/space weather) with two human-centric safety mechanics:
1. **Point of No Return (Autonomy Circle):** A dynamic safety radius around the Habitat calculated from suit oxygen/battery levels and real-time solar radiation alerts. Routes crossing outside this radius or entering steep terrain trigger immediate visual risk warnings.
2. **Pressurized Glove Mode:** A UI toggle that switches from mission planning mode to a high-contrast, oversized-button layout designed for astronauts wearing stiff pressurized gloves.

## Tech Stack & Dependencies
- **Stack:** React + Vite + Tailwind CSS + Leaflet (`leaflet` via `useRef`/`useEffect`, no wrapper libraries).
- **Minimal Dependencies:** Do not install icon packs, state managers, or UI libraries. Use inline SVGs and Tailwind classes only.

## NASA Data Endpoints
- **Optical Layer (Mars Trek WMTS):** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg`
- **Elevation Layer (Mars Trek WMTS):** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg`
- **Space Weather (NASA DONKI):** `https://api.nasa.gov/DONKI/notifications?type=CME&api_key=DEMO_KEY`

## Coding Rules
- **KISS (Keep It Simple, Stupid):** Write the simplest, cleanest code possible. Keep logic concentrated in a few files (`App.jsx`, `MarsMap.jsx`). Avoid unnecessary abstractions.
- **DRY (Don't Repeat Yourself):** Reuse helper functions, constants (like NASA URLs, coordinates, and risk thresholds), and UI styles instead of duplicating logic across components.
- **Zero Tests:** Do not write unit, integration, or E2E tests. Do not install testing frameworks.
- **API Resilience:** Always wrap NASA API calls in `try/catch` with realistic static fallback data so the app never breaks if `DEMO_KEY` hits rate limits. Use `import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY'` for NASA API calls.
- **Map CRS:** Initialize Leaflet with `crs: L.CRS.EPSG4326` to match Mars Trek WMTS tiles.
- **Language:** All UI text, code, comments, and commits must be in English.
- **Formatting & Linting:** Always run `npm run format` and `npm run lint` after every code modification and fix any issues before finishing.
- **Backlog Tracking:** Always check `BACKLOG.md` before starting work and mark completed tasks with `- [x]` whenever a feature or task is finished.

## Git Commit Convention
- Use **Conventional Commits** in English.
- **No scope** and **no body/description** (single-line title only).
- Examples:
  - `feat: add oxygen autonomy circle to mars map`
  - `fix: add fallback data for nasa donki api`
  - `style: implement pressurized glove mode layout`
