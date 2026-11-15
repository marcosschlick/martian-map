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

## Team — Tuxonauts

| Member | Role | GitHub |
| --- | --- | --- |
| Marcos da Silva Schlick | Team Owner | [@marcosschlick](https://github.com/marcosschlick) |
| Maximiliano Olagorta Mello | Developer | [@MaxiiMello](https://www.google.com/search?q=https://github.com/MaxiiMello) |
| Bernardo Ribeiro | Developer | [@Bernardo-Ribeiro](https://github.com/Bernardo-Ribeiro) |
| Mauricio Carvalho | Developer | [@Maure7](https://github.com/Maure7) |
| William Palhares Meireles | Developer | [@williamFRZ](https://github.com/williamFRZ) |
