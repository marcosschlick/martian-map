import { useEffect, useRef } from "react";
import L from "leaflet";

const JEZERO_CRATER_COORDS = [18.38, 77.58];
const VIKING_OPTICAL_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg";
const MOLA_ELEVATION_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg";
const MARS_TREK_ATTRIBUTION = "NASA / JPL / USGS Mars Trek";

const HABITAT_ICON = L.divIcon({
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  tooltipAnchor: [0, -16],
  html: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Habitat Base">
    <circle cx="16" cy="16" r="13" fill="#020617" fill-opacity="0.85" stroke="#06B6D4" stroke-width="2" />
    <path d="M16 1v5M16 26v5M1 16h5M26 16h5" stroke="#06B6D4" stroke-width="1.5" stroke-linecap="round" />
    <path d="M10.5 20v-4a5.5 5.5 0 0 1 11 0v4H10.5Z" fill="#06B6D4" />
    <circle cx="16" cy="16" r="1.75" fill="#020617" />
  </svg>`,
});

export default function MarsMap({ activeLayer = "optical" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const opticalLayerRef = useRef(null);
  const elevationLayerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      crs: L.CRS.EPSG4326,
      center: JEZERO_CRATER_COORDS,
      zoom: 6,
      minZoom: 2,
      maxZoom: 8,
    });

    const opticalLayer = L.tileLayer(VIKING_OPTICAL_TILE_URL, {
      maxNativeZoom: 7,
      maxZoom: 8,
      attribution: MARS_TREK_ATTRIBUTION,
    });

    const elevationLayer = L.tileLayer(MOLA_ELEVATION_TILE_URL, {
      maxNativeZoom: 6,
      maxZoom: 8,
      attribution: MARS_TREK_ATTRIBUTION,
    });

    L.marker(JEZERO_CRATER_COORDS, { icon: HABITAT_ICON })
      .addTo(map)
      .bindTooltip("Habitat Base · Jezero Crater", { direction: "top" });

    mapRef.current = map;
    opticalLayerRef.current = opticalLayer;
    elevationLayerRef.current = elevationLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      opticalLayerRef.current = null;
      elevationLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const opticalLayer = opticalLayerRef.current;
    const elevationLayer = elevationLayerRef.current;
    if (!map || !opticalLayer || !elevationLayer) return;

    const showOptical = activeLayer === "optical" || activeLayer === "blended";
    const showElevation =
      activeLayer === "elevation" || activeLayer === "blended";

    if (showOptical) {
      opticalLayer.setOpacity(1);
      if (!map.hasLayer(opticalLayer)) opticalLayer.addTo(map);
    } else if (map.hasLayer(opticalLayer)) {
      map.removeLayer(opticalLayer);
    }

    if (showElevation) {
      elevationLayer.setOpacity(activeLayer === "blended" ? 0.55 : 1);
      if (!map.hasLayer(elevationLayer)) elevationLayer.addTo(map);
      elevationLayer.bringToFront();
    } else if (map.hasLayer(elevationLayer)) {
      map.removeLayer(elevationLayer);
    }
  }, [activeLayer]);

  return <div ref={containerRef} className="h-full w-full bg-slate-950" />;
}
