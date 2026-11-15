import { useEffect, useImperativeHandle, useRef, useState } from "react";
import L from "leaflet";
import { createEnvelope, JEZERO_CRATER_COORDS } from "./evaModel.js";

const VIKING_OPTICAL_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg";
const MOLA_ELEVATION_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg";
const MARS_TREK_ATTRIBUTION = "NASA / JPL / USGS Mars Trek";
const CTX_TILE_URL =
  "https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}";
const CTX_ATTRIBUTION = "NASA / JPL / MSSS / Caltech Murray Lab / Esri";
const CTX_MAX_SERVICE_LEVEL = 12;
const MAX_ZOOM = CTX_MAX_SERVICE_LEVEL + 1;
const CTX_DETAIL_ZOOM = MAX_ZOOM;
const TILE_TIMEOUT_MS = 15000;
const PNG_HEADER = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_END = [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];
const SOURCE_LABELS = {
  optical: "Viking optical",
  elevation: "MOLA elevation",
  blended: "Viking + MOLA",
  ctx: "CTX historical orbital mosaic",
};

const HABITAT_ICON = L.divIcon({
  className: "",
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  tooltipAnchor: [0, -18],
  html: `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Habitat Base">
    <circle class="habitat-pulse-ring" cx="22" cy="22" r="13" stroke="#06B6D4" stroke-width="1.5" fill="none" />
    <circle cx="22" cy="22" r="13" fill="#020617" fill-opacity="0.9" stroke="#06B6D4" stroke-width="2" />
    <path d="M22 7v5M22 32v5M7 22h5M32 22h5" stroke="#06B6D4" stroke-width="1.5" stroke-linecap="round" />
    <path d="M16.5 26v-4a5.5 5.5 0 0 1 11 0v4h-11Z" fill="#06B6D4" />
    <circle cx="22" cy="22" r="1.75" fill="#020617" />
  </svg>`,
});

export default function MarsMap({
  activeLayer = "optical",
  radiusMeters,
  envelopeStatus,
  reservesPanelRef,
  ref,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const opticalLayerRef = useRef(null);
  const elevationLayerRef = useRef(null);
  const ctxLayerRef = useRef(null);
  const envelopeRef = useRef(null);
  const sourcePanelRef = useRef(null);
  const [zoom, setZoom] = useState(6);
  const [availability, setAvailability] = useState({
    optical: "loading",
    elevation: "loading",
    ctx: "loading",
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      crs: L.CRS.EPSG4326,
      center: JEZERO_CRATER_COORDS,
      zoom: 6,
      minZoom: 2,
      maxZoom: MAX_ZOOM,
    });

    const opticalLayer = L.tileLayer(VIKING_OPTICAL_TILE_URL, {
      maxNativeZoom: 7,
      maxZoom: MAX_ZOOM,
      attribution: MARS_TREK_ATTRIBUTION,
    });

    const elevationLayer = L.tileLayer(MOLA_ELEVATION_TILE_URL, {
      maxNativeZoom: 6,
      maxZoom: MAX_ZOOM,
      attribution: MARS_TREK_ATTRIBUTION,
    });

    // EPSG:4326 has 512 * 2^zoom pixels across 360 degrees. CTX level n
    // has 2^(n+1) tiles of 512 pixels, so Leaflet zoom = CTX level + 1.
    const ctxLayer = L.tileLayer(CTX_TILE_URL, {
      tileSize: 512,
      zoomOffset: -1,
      minZoom: 2,
      maxNativeZoom: CTX_MAX_SERVICE_LEVEL + 1,
      maxZoom: MAX_ZOOM,
      attribution: CTX_ATTRIBUTION,
    });
    const pendingRequests = new Map();

    // Some HTTP 200 PNGs are truncated but still decode in Chromium.
    // Check the PNG envelope as well as decoding before revealing a tile.
    ctxLayer.createTile = function (coords, done) {
      const tile = document.createElement("img");
      tile.alt = "";
      tile.style.visibility = "hidden";
      const controller = new AbortController();
      pendingRequests.set(tile, controller);
      const timeout = setTimeout(() => controller.abort(), TILE_TIMEOUT_MS);

      const load = async () => {
        let objectUrl;
        try {
          const response = await fetch(this.getTileUrl(coords), {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("CTX request failed");
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (
            bytes.length < PNG_HEADER.length + PNG_END.length ||
            !PNG_HEADER.every((byte, index) => bytes[index] === byte) ||
            !PNG_END.every(
              (byte, index) =>
                bytes[bytes.length - PNG_END.length + index] === byte,
            )
          ) {
            throw new Error("Incomplete CTX PNG");
          }
          objectUrl = URL.createObjectURL(
            new Blob([bytes], { type: "image/png" }),
          );
          tile.src = objectUrl;
          await tile.decode();
          if (tile.naturalWidth !== 512 || tile.naturalHeight !== 512) {
            throw new Error("Unexpected CTX tile size");
          }
          if (controller.signal.aborted) throw new Error("CTX request aborted");
          if (pendingRequests.has(tile)) {
            tile.style.visibility = "";
            done(null, tile);
          }
        } catch (error) {
          if (pendingRequests.has(tile)) done(error, tile);
        } finally {
          clearTimeout(timeout);
          pendingRequests.delete(tile);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
      };
      load();
      return tile;
    };
    ctxLayer.on("tileunload tileabort", ({ tile }) => {
      const controller = pendingRequests.get(tile);
      pendingRequests.delete(tile);
      controller?.abort();
    });

    for (const [id, layer] of [
      ["optical", opticalLayer],
      ["elevation", elevationLayer],
      ["ctx", ctxLayer],
    ]) {
      const failedTiles = new Set();
      const report = (status) =>
        setAvailability((current) =>
          current[id] === status ? current : { ...current, [id]: status },
        );
      layer.on({
        loading: () => report("loading"),
        tileerror: ({ tile }) => {
          tile.style.visibility = "hidden";
          failedTiles.add(tile);
          report("unavailable");
        },
        tileunload: ({ tile }) => failedTiles.delete(tile),
        load: () => report(failedTiles.size ? "unavailable" : "ready"),
      });
    }

    L.marker(JEZERO_CRATER_COORDS, { icon: HABITAT_ICON })
      .addTo(map)
      .bindTooltip("Habitat Base · Jezero Crater", { direction: "top" });

    mapRef.current = map;
    opticalLayerRef.current = opticalLayer;
    elevationLayerRef.current = elevationLayer;
    ctxLayerRef.current = ctxLayer;
    envelopeRef.current = L.polygon([], {
      className: "eva-return-envelope",
      interactive: false,
      weight: 2,
      fillOpacity: 0.06,
    });
    map.on("zoomend", () => setZoom(map.getZoom()));

    return () => {
      for (const controller of pendingRequests.values()) controller.abort();
      pendingRequests.clear();
      map.remove();
      mapRef.current = null;
      opticalLayerRef.current = null;
      elevationLayerRef.current = null;
      ctxLayerRef.current = null;
      envelopeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const envelope = envelopeRef.current;
    if (!map || !envelope) return;
    envelope.setLatLngs(createEnvelope(radiusMeters));
    envelope.setStyle({
      color:
        envelopeStatus === "warning"
          ? "#F59E0B"
          : envelopeStatus === "empty"
            ? "#EF4444"
            : "#10B981",
    });
    if (radiusMeters > 0) {
      if (!map.hasLayer(envelope)) envelope.addTo(map);
    } else if (map.hasLayer(envelope)) {
      map.removeLayer(envelope);
    }
  }, [radiusMeters, envelopeStatus]);

  useImperativeHandle(
    ref,
    () => ({
      showEnvelope() {
        const map = mapRef.current;
        const envelope = envelopeRef.current;
        if (!map || !envelope || !map.hasLayer(envelope)) return;
        map.invalidateSize({ pan: false });
        const container = map.getContainer();
        const bounds = container.getBoundingClientRect();
        const controls = [
          sourcePanelRef.current,
          container.querySelector(".leaflet-control-zoom"),
          container
            .closest("main")
            .querySelector('[aria-label="Map data layer"]'),
        ];
        const overlays = controls
          .filter(Boolean)
          .map((element) => element.getBoundingClientRect());
        let top =
          Math.max(...overlays.map((overlay) => overlay.bottom)) -
          bounds.top +
          12;
        let left = 12;
        const panel = reservesPanelRef.current?.getBoundingClientRect();
        const right =
          panel && panel.top < bounds.bottom && panel.bottom > bounds.top
            ? bounds.right - panel.left + 12
            : 12;
        const attribution = container
          .querySelector(".leaflet-control-attribution")
          .getBoundingClientRect();
        const bottom = bounds.bottom - attribution.top + 12;
        // Short landscape viewports have more room beside the top overlays.
        if (bounds.height - top - bottom < 16) {
          top = 12;
          left =
            Math.max(...overlays.map((overlay) => overlay.right)) -
            bounds.left +
            12;
        }
        if (
          bounds.width - left - right <= 0 ||
          bounds.height - top - bottom <= 0
        )
          return;
        map.fitBounds(envelope.getBounds(), {
          paddingTopLeft: [left, top],
          paddingBottomRight: [right, bottom],
          maxZoom: MAX_ZOOM,
          animate: false,
        });
      },
    }),
    [reservesPanelRef],
  );

  useEffect(() => {
    const map = mapRef.current;
    const opticalLayer = opticalLayerRef.current;
    const elevationLayer = elevationLayerRef.current;
    const ctxLayer = ctxLayerRef.current;
    if (!map || !opticalLayer || !elevationLayer || !ctxLayer) return;

    const showCtx = activeLayer === "ctx";
    if (showCtx && map.getZoom() < 9) map.setZoom(CTX_DETAIL_ZOOM);
    const showOptical = activeLayer !== "elevation";
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

    if (showCtx) {
      if (!map.hasLayer(ctxLayer)) ctxLayer.addTo(map);
      ctxLayer.bringToFront();
    } else if (map.hasLayer(ctxLayer)) {
      map.removeLayer(ctxLayer);
    }
  }, [activeLayer]);

  const sourceIds =
    activeLayer === "blended" ? ["optical", "elevation"] : [activeLayer];
  const unavailable = sourceIds.some(
    (id) => availability[id] === "unavailable",
  );
  const loading = sourceIds.some((id) => availability[id] === "loading");
  const enlarged =
    activeLayer === "optical"
      ? zoom > 7
      : activeLayer === "elevation" || activeLayer === "blended"
        ? zoom > 6
        : false;
  let message = unavailable
    ? "Imagery incomplete / unavailable"
    : loading
      ? "Loading imagery"
      : "Loaded";
  if (activeLayer === "ctx") {
    message = unavailable
      ? availability.optical === "unavailable"
        ? "CTX and Viking context unavailable"
        : "CTX unavailable · Viking fallback"
      : loading
        ? "Loading CTX · Viking context"
        : "CTX loaded";
  } else if (enlarged) {
    message += " · Enlarged beyond native detail";
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-slate-950" />
      <div
        ref={sourcePanelRef}
        aria-label="Imagery source"
        className="absolute top-20 left-14 z-[1000] max-w-[calc(100%-4.25rem)] rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-2 text-[11px] backdrop-blur-sm sm:top-14"
      >
        <p className="text-slate-50">
          {SOURCE_LABELS[activeLayer]} · Zoom {zoom}
        </p>
        <p
          role="status"
          className={`mt-0.5 ${unavailable ? "text-amber-500" : "text-slate-400"}`}
        >
          {message}
        </p>
        {activeLayer === "ctx" && (
          <p className="mt-0.5 text-slate-400">Preliminary / uncontrolled</p>
        )}
      </div>
    </div>
  );
}
