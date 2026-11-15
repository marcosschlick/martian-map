import { useEffect, useImperativeHandle, useRef, useState } from "react";
import L from "leaflet";
import {
  createDirectReference,
  createEnvelope,
  isMarsCoordinate,
  JEZERO_CRATER_COORDS,
  MARS_BOUNDS,
} from "./evaModel.js";

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
const BUDGET_COLORS = {
  available: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};
const PNG_HEADER = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_END = [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];
const LAYER_OPTIONS = [
  { id: "optical", label: "OPTICAL" },
  { id: "elevation", label: "ELEVATION" },
  { id: "blended", label: "BLENDED" },
  { id: "ctx", label: "CTX Detail" },
];
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

function watchTileCoverage(map, layer, report) {
  const tiles = new Map();
  let frame = null;

  function schedule() {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!map.hasLayer(layer)) return;

      const viewport = map.getContainer().getBoundingClientRect();
      const tileZoom = Math.min(map.getZoom(), layer.options.maxNativeZoom);
      const visible = { loading: 0, ready: 0, failed: 0 };
      for (const [tile, { coords, status }] of tiles) {
        if (coords.z !== tileZoom) continue;
        const rect = tile.getBoundingClientRect();
        if (
          rect.right > viewport.left &&
          rect.left < viewport.right &&
          rect.bottom > viewport.top &&
          rect.top < viewport.bottom
        ) {
          visible[status] += 1;
        }
      }
      if (visible.loading) report("loading");
      else if (visible.ready && visible.failed) report("partial");
      else report(visible.ready ? "ready" : "unavailable");
    });
  }

  const record =
    (status) =>
    ({ tile, coords }) => {
      tiles.set(tile, { coords, status });
      if (status === "failed") tile.style.visibility = "hidden";
      schedule();
    };
  const forget = ({ tile }) => {
    tiles.delete(tile);
    schedule();
  };
  const events = {
    add: schedule,
    tileloadstart: record("loading"),
    tileload: record("ready"),
    tileerror: record("failed"),
    tileunload: forget,
    tileabort: forget,
  };
  layer.on(events);
  map.on("moveend resize", schedule);
  return () => {
    layer.off(events);
    map.off("moveend resize", schedule);
    if (frame !== null) cancelAnimationFrame(frame);
  };
}

export default function MarsMap({
  activeLayer = "optical",
  onLayerChange,
  radiusMeters,
  envelopeStatus,
  reservesPanelRef,
  target,
  targetTone,
  onTargetSelect,
  ref,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const opticalLayerRef = useRef(null);
  const elevationLayerRef = useRef(null);
  const ctxLayerRef = useRef(null);
  const envelopeRef = useRef(null);
  const mapControlsRef = useRef(null);
  const targetMarkerRef = useRef(null);
  const directLineRef = useRef(null);
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
      maxBounds: MARS_BOUNDS,
      maxBoundsViscosity: 1,
    });

    const opticalLayer = L.tileLayer(VIKING_OPTICAL_TILE_URL, {
      maxNativeZoom: 7,
      maxZoom: MAX_ZOOM,
      noWrap: true,
      attribution: MARS_TREK_ATTRIBUTION,
    });

    const elevationLayer = L.tileLayer(MOLA_ELEVATION_TILE_URL, {
      maxNativeZoom: 6,
      maxZoom: MAX_ZOOM,
      noWrap: true,
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
      noWrap: true,
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

    const stopWatching = [
      ["optical", opticalLayer],
      ["elevation", elevationLayer],
      ["ctx", ctxLayer],
    ].map(([id, layer]) =>
      watchTileCoverage(map, layer, (status) =>
        setAvailability((current) =>
          current[id] === status ? current : { ...current, [id]: status },
        ),
      ),
    );

    function selectTarget({ lat, lng }) {
      const coordinate = [lat, lng];
      if (isMarsCoordinate(coordinate)) onTargetSelect(coordinate);
    }

    L.marker(JEZERO_CRATER_COORDS, {
      icon: HABITAT_ICON,
      bubblingMouseEvents: true,
    })
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
    targetMarkerRef.current = L.circleMarker(JEZERO_CRATER_COORDS, {
      className: "eva-target-marker",
      radius: 7,
      weight: 2,
      fillOpacity: 0.85,
      interactive: false,
    }).bindTooltip("Direct estimate", {
      permanent: true,
      direction: "auto",
      offset: [8, 0],
    });
    directLineRef.current = L.polyline([], {
      className: "eva-direct-estimate",
      weight: 2,
      dashArray: "6 5",
      interactive: false,
    });
    const handleMapClick = (event) => {
      if (event.originalEvent?.target?.closest?.(".leaflet-control")) return;
      selectTarget(event.latlng);
    };
    map.on("click", handleMapClick);
    map.on("zoomend", () => setZoom(map.getZoom()));

    return () => {
      map.off("click", handleMapClick);
      stopWatching.forEach((stop) => stop());
      for (const controller of pendingRequests.values()) controller.abort();
      pendingRequests.clear();
      map.remove();
      mapRef.current = null;
      opticalLayerRef.current = null;
      elevationLayerRef.current = null;
      ctxLayerRef.current = null;
      envelopeRef.current = null;
      targetMarkerRef.current = null;
      directLineRef.current = null;
    };
  }, [onTargetSelect]);

  useEffect(() => {
    const map = mapRef.current;
    const envelope = envelopeRef.current;
    if (!map || !envelope) return;
    envelope.setLatLngs(createEnvelope(radiusMeters));
    envelope.setStyle({
      color:
        BUDGET_COLORS[envelopeStatus === "empty" ? "danger" : envelopeStatus],
    });
    if (radiusMeters > 0) {
      if (!map.hasLayer(envelope)) envelope.addTo(map);
    } else if (map.hasLayer(envelope)) {
      map.removeLayer(envelope);
    }
  }, [radiusMeters, envelopeStatus]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = targetMarkerRef.current;
    const line = directLineRef.current;
    if (!map || !marker || !line) return;
    if (!target) {
      if (map.hasLayer(marker)) map.removeLayer(marker);
      if (map.hasLayer(line)) map.removeLayer(line);
      return;
    }
    const color = BUDGET_COLORS[targetTone];
    line.setLatLngs(createDirectReference(target)).setStyle({ color });
    marker.setLatLng(target).setStyle({ color, fillColor: color });
    if (!map.hasLayer(line)) line.addTo(map);
    if (!map.hasLayer(marker)) marker.addTo(map);
    marker.bringToFront();
  }, [target, targetTone]);

  useImperativeHandle(
    ref,
    () => ({
      useMapCenter() {
        const map = mapRef.current;
        if (!map) return;
        const { lat, lng } = map.getCenter();
        const coordinate = [lat, lng];
        if (isMarsCoordinate(coordinate)) onTargetSelect(coordinate);
      },
      showEnvelope() {
        const map = mapRef.current;
        const envelope = envelopeRef.current;
        if (!map || !envelope || !map.hasLayer(envelope)) return;
        map.invalidateSize({ pan: false });
        const container = map.getContainer();
        const bounds = container.getBoundingClientRect();
        const controls = [
          mapControlsRef.current,
          container.querySelector(".leaflet-control-zoom"),
        ];
        const overlays = controls
          .filter(Boolean)
          .map((element) => element.getBoundingClientRect());
        const belowControls =
          Math.max(...overlays.map((overlay) => overlay.bottom)) -
          bounds.top +
          12;
        const besideControls =
          Math.max(...overlays.map((overlay) => overlay.right)) -
          bounds.left +
          12;
        const panel = reservesPanelRef.current?.getBoundingClientRect();
        const right =
          panel && panel.top < bounds.bottom && panel.bottom > bounds.top
            ? bounds.right - panel.left + 12
            : 12;
        const attribution = container.querySelector(
          ".leaflet-control-attribution",
        );
        const bottom =
          bounds.bottom -
          (attribution?.getBoundingClientRect().top ?? bounds.bottom) +
          12;
        const room = (left, top) =>
          Math.min(bounds.width - left - right, bounds.height - top - bottom);
        const [left, top] =
          room(12, belowControls) >= room(besideControls, 12)
            ? [12, belowControls]
            : [besideControls, 12];
        if (room(left, top) <= 0) return;
        map.fitBounds(envelope.getBounds(), {
          paddingTopLeft: [left, top],
          paddingBottomRight: [right, bottom],
          maxZoom: MAX_ZOOM,
          animate: false,
        });
      },
    }),
    [reservesPanelRef, onTargetSelect],
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
  const statuses = sourceIds.map((id) => availability[id]);
  const loading = statuses.includes("loading");
  const unavailable = statuses.every((status) => status === "unavailable");
  const partial =
    statuses.includes("partial") ||
    (!unavailable && statuses.includes("unavailable"));
  const enlarged =
    activeLayer === "optical"
      ? zoom > 7
      : activeLayer === "elevation" || activeLayer === "blended"
        ? zoom > 6
        : false;
  let message = loading
    ? "Loading imagery"
    : unavailable
      ? "Imagery unavailable"
      : partial
        ? "Imagery incomplete"
        : "Loaded";
  if (activeLayer === "ctx") {
    const vikingContext = {
      loading: "Viking loading",
      ready: "Viking fallback",
      partial: "Viking incomplete",
      unavailable: "Viking unavailable",
    }[availability.optical];
    message =
      availability.ctx === "ready"
        ? "CTX loaded"
        : `${loading ? "Loading CTX" : partial ? "CTX incomplete" : "CTX unavailable"} · ${vikingContext}`;
  } else if (enlarged && !loading && !unavailable) {
    message += " · Enlarged beyond native detail";
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        role="region"
        aria-label="Mars map"
        className="h-full w-full bg-slate-950"
      />
      <div
        ref={mapControlsRef}
        className="pointer-events-none absolute top-2.5 left-14 z-[1000] flex max-w-[calc(100%-4.25rem)] flex-col items-start gap-2"
      >
        <div
          role="group"
          aria-label="Map data layer"
          className="hud-panel pointer-events-auto grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1 backdrop-blur-sm sm:flex"
        >
          {LAYER_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === activeLayer}
              onClick={() => onLayerChange(id)}
              className="hud-control cursor-pointer rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-500 aria-pressed:bg-cyan-500 aria-pressed:text-slate-950 sm:px-2.5 sm:text-xs"
            >
              {label}
            </button>
          ))}
        </div>
        <div
          aria-label="Imagery source"
          className="hud-panel pointer-events-auto rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-2 text-[11px] backdrop-blur-sm"
        >
          <p className="text-slate-50">
            {SOURCE_LABELS[activeLayer]} · Zoom {zoom}
          </p>
          <p
            role="status"
            className={`mt-0.5 ${!loading && (unavailable || partial) ? "text-amber-500" : "text-slate-400"}`}
          >
            {message}
          </p>
          {activeLayer === "ctx" && (
            <p className="mt-0.5 text-slate-400">Preliminary / uncontrolled</p>
          )}
        </div>
      </div>
    </div>
  );
}
