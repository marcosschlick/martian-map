import { useRef, useState } from "react";
import MarsMap from "./MarsMap.jsx";
import {
  calculateExcursion,
  MODEL_ASSUMPTIONS,
  RESERVE_WARNING_PERCENT,
} from "./evaModel.js";

const LAYER_OPTIONS = [
  { id: "optical", label: "OPTICAL" },
  { id: "elevation", label: "ELEVATION" },
  { id: "blended", label: "BLENDED" },
  { id: "ctx", label: "CTX Detail" },
];

const RESERVE_OPTIONS = [
  { id: "oxygen", label: "Oxygen" },
  { id: "battery", label: "Battery" },
];

export default function App() {
  const [activeLayer, setActiveLayer] = useState("optical");
  const [reserves, setReserves] = useState({ oxygen: 100, battery: 100 });
  const mapRef = useRef(null);
  const reservesPanelRef = useRef(null);
  const excursion = calculateExcursion(reserves);
  const modelColor =
    excursion.status === "empty"
      ? "text-red-500"
      : excursion.status === "warning"
        ? "text-amber-500"
        : "text-emerald-500";
  const formatNumber = (value) =>
    value.toLocaleString("en-US", { maximumFractionDigits: 1 });

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-50 select-none">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/90 px-3 backdrop-blur-sm sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <img
            src="/astrotux.png"
            alt="Tuxonauts"
            className="h-8 w-8 shrink-0 rounded-full border border-slate-800 bg-slate-900 object-contain sm:h-9 sm:w-9"
          />
          <h1 className="truncate text-xs font-bold tracking-wider text-slate-50 uppercase sm:text-sm">
            MARTIAN MAP — TUXONAUTS
          </h1>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-slate-400 tabular-nums sm:text-xs">
          <span className="hidden sm:inline">Jezero Crater · </span>
          18.38° N, 77.58° E
        </span>
      </header>

      <main className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950">
        <div className="relative min-h-0 flex-1">
          <div
            role="group"
            aria-label="Map data layer"
            className="absolute top-2.5 left-14 z-[1000] grid max-w-[calc(100vw-4.25rem)] grid-cols-2 items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1 backdrop-blur-sm sm:flex"
          >
            {LAYER_OPTIONS.map(({ id, label }) => {
              const isActive = activeLayer === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveLayer(id)}
                  className={`cursor-pointer rounded px-2 py-1 text-[11px] font-semibold tracking-wider transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-500 active:scale-[0.97] sm:px-2.5 sm:text-xs ${
                    isActive
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-slate-900 text-slate-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <MarsMap
            ref={mapRef}
            activeLayer={activeLayer}
            radiusMeters={excursion.radiusMeters}
            envelopeStatus={excursion.status}
            reservesPanelRef={reservesPanelRef}
          />
        </div>

        <section
          ref={reservesPanelRef}
          aria-labelledby="suit-reserves-title"
          className="z-[1000] h-[45dvh] shrink-0 overflow-y-auto border-t border-slate-800 bg-slate-950/90 p-3 backdrop-blur-sm md:absolute md:top-3 md:right-3 md:h-auto md:max-h-[calc(100%-1.5rem)] md:w-72 md:rounded-lg md:border"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="suit-reserves-title" className="text-sm font-semibold">
              Suit reserves
            </h2>
            <button
              type="button"
              onClick={() => setReserves({ oxygen: 100, battery: 100 })}
              className="cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 [@media(hover:hover)_and_(pointer:fine)]:hover:border-cyan-500"
            >
              Reset reserves
            </button>
          </div>
          <p
            id="reserve-simulation"
            className="mt-1 text-[11px] text-slate-400"
          >
            Simulated input · No sensors connected
          </p>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-1">
            {RESERVE_OPTIONS.map(({ id, label }) => {
              const value = reserves[id];
              const isCritical = value === 0;
              const isLow = value < RESERVE_WARNING_PERCENT;
              const status = isCritical
                ? "Critical · Depleted"
                : isLow
                  ? "Warning · Low reserve"
                  : "Normal reserve";
              const statusColor = isCritical
                ? "text-red-500 accent-red-500"
                : isLow
                  ? "text-amber-500 accent-amber-500"
                  : "text-slate-50 accent-cyan-500";

              return (
                <div key={id} className={statusColor}>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`${id}-reserve`}
                      className="text-sm font-medium text-slate-50"
                    >
                      {label}
                    </label>
                    <output
                      htmlFor={`${id}-reserve`}
                      className="font-mono text-lg leading-6 tabular-nums"
                    >
                      {value}%
                    </output>
                  </div>
                  <input
                    id={`${id}-reserve`}
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={value}
                    aria-describedby={`reserve-simulation ${id}-status`}
                    aria-valuetext={`${value}% — ${status}`}
                    onChange={(event) =>
                      setReserves((current) => ({
                        ...current,
                        [id]: Number(event.target.value),
                      }))
                    }
                    className="block h-7 w-full cursor-pointer rounded accent-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                  />
                  <p
                    id={`${id}-status`}
                    aria-live="polite"
                    className={`text-[11px] leading-4 ${isLow ? "" : "text-slate-400"}`}
                  >
                    {status}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-50">
                Simplified model
              </h3>
              <button
                type="button"
                disabled={excursion.radiusMeters === 0}
                aria-describedby="model-status"
                onClick={() => mapRef.current?.showEnvelope()}
                className="cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:text-slate-400 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:border-cyan-500"
              >
                Show envelope
              </button>
            </div>
            <p
              id="model-status"
              role="status"
              className={`mt-1 text-xs ${modelColor}`}
            >
              {excursion.status === "empty"
                ? "No excursion budget"
                : excursion.status === "warning"
                  ? "Low reserves · Budget available"
                  : "Excursion budget available"}
            </p>
            <dl
              aria-label="Modeled excursion summary"
              className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"
            >
              <div>
                <dt className="text-[11px] text-slate-400">Estimated reach</dt>
                <dd
                  id="estimated-reach"
                  className={`mt-0.5 font-mono tabular-nums ${modelColor}`}
                >
                  {excursion.radiusMeters >= 1000
                    ? `${formatNumber(excursion.radiusMeters / 1000)} km`
                    : `${formatNumber(excursion.radiusMeters)} m`}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Excursion budget</dt>
                <dd
                  id="excursion-budget"
                  className={`mt-0.5 font-mono tabular-nums ${modelColor}`}
                >
                  {formatNumber(excursion.excursionBudgetMinutes)} min
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">
                  Limiting resource
                </dt>
                <dd id="limiting-resource" className="mt-0.5 text-slate-50">
                  {excursion.limitingResource}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">
                  Protected reserve
                </dt>
                <dd className="mt-0.5 text-slate-50">
                  {MODEL_ASSUMPTIONS.protectedReservePercent}% of full capacity
                </dd>
              </div>
            </dl>
            {excursion.status === "empty" && (
              <p className="mt-2 text-[11px] text-red-500">
                Protected reserve reached; resources may still remain.
              </p>
            )}
            <details className="mt-2 text-[11px] leading-relaxed text-slate-400">
              <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
                Model assumptions
              </summary>
              <p className="mt-1">
                Illustrative assumptions, not NASA specifications or a real
                suit: Oxygen at full capacity{" "}
                {MODEL_ASSUMPTIONS.oxygenCapacityMinutes} min; Battery at full
                capacity {MODEL_ASSUMPTIONS.batteryCapacityMinutes} min; walking
                speed {MODEL_ASSUMPTIONS.walkingMetersPerHour / 1000} km/h.
                Subtract {MODEL_ASSUMPTIONS.protectedReservePercent} percentage
                points of each resource's full capacity, then split the limiting
                time between outward and return travel. At the protected
                reserve, excursion budget is zero even with resources remaining.
                Assumes constant speed and consumption, direct travel and no
                stops. Excludes terrain, slopes, obstacles, radiation and
                science tasks.
              </p>
            </details>
          </div>
        </section>
      </main>
    </div>
  );
}
