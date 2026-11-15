import { useEffect, useRef } from "react";
import L from "leaflet";

const JEZERO_CRATER_COORDS = [18.38, 77.58];
const VIKING_OPTICAL_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg";

export default function MarsMap() {
  const containerRef = useRef(null);

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

    L.tileLayer(VIKING_OPTICAL_TILE_URL, {
      maxNativeZoom: 7,
      maxZoom: 8,
      attribution: "NASA / JPL / USGS Mars Trek",
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full bg-slate-950" />;
}
