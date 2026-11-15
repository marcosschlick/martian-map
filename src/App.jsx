import { useRef, useState } from "react";
import MarsMap from "./MarsMap.jsx";
import SpaceWeather, { SpaceWeatherBadge } from "./SpaceWeather.jsx";
import {
  calculateExcursion,
  evaluateTarget,
  MODEL_ASSUMPTIONS,
  RADIATION_SIMULATION,
  RESERVE_WARNING_PERCENT,
} from "./evaModel.js";
import { useSpaceWeather } from "./useSpaceWeather.js";

const RESERVE_OPTIONS = [
  { id: "oxygen", label: "Oxygen" },
  { id: "battery", label: "Battery" },
];
const RADIATION_SCENARIOS = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low rate" },
  { id: "high", label: "High rate" },
];

const formatNumber = (value) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 1 });
const formatDistance = (value) =>
  value >= 1000
    ? `${formatNumber(value / 1000)} km`
    : `${formatNumber(value)} m`;
const formatCoordinate = (value, positive, negative) =>
  `${Math.abs(value).toFixed(5)}° ${value < 0 ? negative : positive}`;
const formatDose = (microSv, signDisplay = "auto") =>
  `${(microSv / 1000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
    signDisplay,
  })} mSv`;

function RadiationSimulation({
  scenario,
  radiation,
  onScenarioChange,
  onDoseChange,
}) {
  const selected = RADIATION_SCENARIOS.find(({ id }) => id === scenario);
  return (
    <details className="mt-3 border-t border-slate-800 pt-2 text-xs">
      <summary className="hud-control cursor-pointer rounded py-1.5 font-semibold text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
        Radiation simulation{" "}
        <span className="ml-1 font-normal text-slate-400">
          · {selected.label}
        </span>
      </summary>
      <p className="mt-1 text-[11px] text-slate-400">
        Demo inputs for a constant dose rate over the round trip.
      </p>
      <div
        role="group"
        aria-label="Radiation scenario"
        className="mt-2 flex flex-wrap gap-1.5"
      >
        {RADIATION_SCENARIOS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={scenario === id}
            onClick={() => onScenarioChange(id)}
            className="hud-control cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 aria-pressed:border-cyan-500 aria-pressed:bg-cyan-500 aria-pressed:text-slate-950"
          >
            {label}
          </button>
        ))}
      </div>
      {radiation && (
        <>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2">
            <label htmlFor="radiation-dose-allowance">
              Remaining demo dose
            </label>
            <span className="font-mono tabular-nums">
              {formatDose(radiation.remainingDoseMicroSv)}
            </span>
          </div>
          <input
            id="radiation-dose-allowance"
            type="range"
            min="0"
            max={RADIATION_SIMULATION.maxRemainingDoseMicroSv}
            step={RADIATION_SIMULATION.doseStepMicroSv}
            value={radiation.remainingDoseMicroSv}
            aria-valuetext={formatDose(radiation.remainingDoseMicroSv)}
            onChange={(event) => onDoseChange(Number(event.target.value))}
            className="block h-7 w-full cursor-pointer rounded accent-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          />
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <dt className="text-[11px] text-slate-400">Demo dose rate</dt>
              <dd className="mt-0.5 font-mono tabular-nums">
                {formatDose(radiation.doseRateMicroSvPerHour)}/h
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-400">Dose time cap</dt>
              <dd
                id="radiation-time-cap"
                className="mt-0.5 font-mono tabular-nums"
              >
                {formatNumber(radiation.budgetMinutes)} min
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] text-slate-400">
                Time lost to simulated dose
              </dt>
              <dd
                id="radiation-time-loss"
                className={`mt-0.5 font-mono tabular-nums ${radiation.timeReductionMinutes > 0 ? "text-amber-500" : "text-slate-50"}`}
              >
                {formatNumber(radiation.timeReductionMinutes)} min
              </dd>
            </div>
          </dl>
        </>
      )}
    </details>
  );
}

export default function App() {
  const [activeLayer, setActiveLayer] = useState("optical");
  const [reserves, setReserves] = useState({ oxygen: 100, battery: 100 });
  const [target, setTarget] = useState(null);
  const [radiationScenario, setRadiationScenario] = useState("off");
  const [remainingDoseMicroSv, setRemainingDoseMicroSv] = useState(
    RADIATION_SIMULATION.maxRemainingDoseMicroSv,
  );
  const [gloveMode, setGloveMode] = useState(false);
  const { weather, refresh } = useSpaceWeather();
  const mapRef = useRef(null);
  const reservesPanelRef = useRef(null);
  const excursion = calculateExcursion(reserves, {
    scenario: radiationScenario,
    remainingDoseMicroSv,
  });
  const targetEvaluation = evaluateTarget(target, excursion);
  const targetColor = !targetEvaluation
    ? "text-slate-400"
    : targetEvaluation.tone === "danger"
      ? "text-red-500"
      : targetEvaluation.tone === "warning"
        ? "text-amber-500"
        : "text-emerald-500";
  const modelColor =
    excursion.status === "empty"
      ? "text-red-500"
      : excursion.status === "warning"
        ? "text-amber-500"
        : "text-emerald-500";

  return (
    <div
      data-glove-mode={gloveMode || undefined}
      className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-50 select-none"
    >
      <header className="hud-panel grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-b border-slate-800 bg-slate-950/90 px-3 py-1.5 backdrop-blur-sm min-[400px]:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <img
            src={`${import.meta.env.BASE_URL}astrotux.png`}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-slate-800 bg-slate-900 object-contain sm:h-9 sm:w-9"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xs font-bold tracking-wider text-slate-50 uppercase sm:text-sm">
              MARTIAN MAP
              <span className="sr-only min-[480px]:not-sr-only">
                {" "}
                — TUXONAUTS
              </span>
            </h1>
            <p className="font-mono text-[10px] text-slate-400 tabular-nums sm:text-[11px]">
              <span className="hidden sm:inline">Jezero Crater · </span>
              18.38° N, 77.58° E
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-pressed={gloveMode}
          onClick={() => setGloveMode((current) => !current)}
          className="hud-control min-h-10 cursor-pointer rounded-md border border-slate-800 bg-slate-900 px-2 text-xs font-semibold text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          Glove mode
        </button>
        <SpaceWeatherBadge weather={weather} />
      </header>

      <main className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950">
        <div className="relative min-h-0 flex-1">
          <MarsMap
            ref={mapRef}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            radiusMeters={excursion.radiusMeters}
            envelopeStatus={excursion.status}
            reservesPanelRef={reservesPanelRef}
            target={target}
            targetTone={targetEvaluation?.tone}
            onTargetSelect={setTarget}
          />
        </div>

        <section
          ref={reservesPanelRef}
          aria-labelledby="suit-reserves-title"
          className="hud-panel mission-panel z-[1000] h-[45dvh] shrink-0 overflow-y-auto border-t border-slate-800 bg-slate-950/90 p-3 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="suit-reserves-title" className="text-sm font-semibold">
              Suit reserves
            </h2>
            <button
              type="button"
              onClick={() => setReserves({ oxygen: 100, battery: 100 })}
              className="hud-control cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 [@media(hover:hover)_and_(pointer:fine)]:hover:border-cyan-500"
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

          <div
            className="mt-3 border-t border-slate-800 pt-3"
            aria-labelledby="eva-target-title"
          >
            <h3
              id="eva-target-title"
              className="text-xs font-semibold text-slate-50"
            >
              EVA target
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => mapRef.current?.useMapCenter()}
                className="hud-control cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 [@media(hover:hover)_and_(pointer:fine)]:hover:border-cyan-500"
              >
                Use map center
              </button>
              <button
                type="button"
                disabled={!target}
                onClick={() => setTarget(null)}
                className="hud-control cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:text-slate-400 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:border-cyan-500"
              >
                Clear target
              </button>
            </div>
            <p
              id="target-status"
              role="status"
              className={`mt-2 text-xs ${targetColor}`}
            >
              {targetEvaluation?.label || "Select an EVA target"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Direct estimate · Terrain not evaluated
            </p>
            {targetEvaluation && (
              <>
                <dl
                  aria-label="EVA target estimate"
                  className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"
                >
                  <div className="col-span-2">
                    <dt className="text-[11px] text-slate-400">Position</dt>
                    <dd
                      id="target-position"
                      className="mt-0.5 font-mono text-slate-50 tabular-nums"
                    >
                      {formatCoordinate(target[0], "N", "S")},{" "}
                      {formatCoordinate(target[1], "E", "W")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">Distance</dt>
                    <dd
                      id="target-distance"
                      className={`mt-0.5 font-mono tabular-nums ${targetColor}`}
                    >
                      {formatDistance(targetEvaluation.distanceMeters)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">
                      Round-trip time
                    </dt>
                    <dd
                      id="target-round-trip"
                      className={`mt-0.5 font-mono tabular-nums ${targetColor}`}
                    >
                      {formatNumber(targetEvaluation.roundTripMinutes)} min
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[11px] text-slate-400">Time margin</dt>
                    <dd
                      id="target-time-margin"
                      className={`mt-0.5 font-mono tabular-nums ${targetColor}`}
                    >
                      {targetEvaluation.state === "exceeded" &&
                      -targetEvaluation.timeMarginMinutes < 0.1
                        ? "<0.1 min short"
                        : `${targetEvaluation.timeMarginMinutes.toLocaleString("en-US", { maximumFractionDigits: 1, signDisplay: "exceptZero" })} min`}
                    </dd>
                  </div>
                  {targetEvaluation.radiation && (
                    <>
                      <div>
                        <dt className="text-[11px] text-slate-400">
                          Demo round-trip dose
                        </dt>
                        <dd
                          id="target-dose"
                          className="mt-0.5 font-mono tabular-nums"
                        >
                          {formatDose(
                            targetEvaluation.radiation.estimatedDoseMicroSv,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-slate-400">
                          Demo dose margin
                        </dt>
                        <dd
                          id="target-dose-margin"
                          className="mt-0.5 font-mono tabular-nums"
                        >
                          {formatDose(
                            targetEvaluation.radiation.doseMarginMicroSv,
                            "exceptZero",
                          )}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
                {targetEvaluation.timeMarginMinutes < 0 &&
                  targetEvaluation.state !== "limit" && (
                    <p
                      id="target-shortfall"
                      className="mt-2 text-[11px] text-red-500"
                    >
                      Exceeds budget by{" "}
                      {-targetEvaluation.timeMarginMinutes < 0.1
                        ? "<0.1"
                        : formatNumber(
                            -targetEvaluation.timeMarginMinutes,
                          )}{" "}
                      min. Limiting factor: {excursion.limitingResource}.
                    </p>
                  )}
              </>
            )}
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
                className="hud-control cursor-pointer rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:text-slate-400 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:border-cyan-500"
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
                : excursion.radiation?.timeReductionMinutes > 0
                  ? "Simulated radiation reduces budget"
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
                  {formatDistance(excursion.radiusMeters)}
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
                <dt className="text-[11px] text-slate-400">Limiting factor</dt>
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
            {(excursion.oxygenBudgetMinutes === 0 ||
              excursion.batteryBudgetMinutes === 0) && (
              <p className="mt-2 text-[11px] text-red-500">
                Protected suit reserve reached.
              </p>
            )}
            {excursion.radiation?.remainingDoseMicroSv === 0 && (
              <p className="mt-2 text-[11px] text-red-500">
                Simulated dose allowance depleted.
              </p>
            )}
            <RadiationSimulation
              scenario={radiationScenario}
              radiation={excursion.radiation}
              onScenarioChange={setRadiationScenario}
              onDoseChange={setRemainingDoseMicroSv}
            />
            <details className="mt-2 text-[11px] leading-relaxed text-slate-400">
              <summary className="hud-control cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
                Model assumptions
              </summary>
              <p className="mt-1">
                Demo suit capacities. Oxygen at full capacity{" "}
                {MODEL_ASSUMPTIONS.oxygenCapacityMinutes} min; Battery at full
                capacity {MODEL_ASSUMPTIONS.batteryCapacityMinutes} min; walking
                speed {MODEL_ASSUMPTIONS.walkingMetersPerHour / 1000} km/h.
                Subtract {MODEL_ASSUMPTIONS.protectedReservePercent} percentage
                points of full capacity from each suit reserve. The smallest
                time budget, including the dose time cap when enabled, covers
                both travel legs. Assumes constant speed and consumption, direct
                travel and no stops. Terrain and actual exposure at Jezero
                require separate data.
              </p>
            </details>
          </div>
          <SpaceWeather weather={weather} refresh={refresh} />
        </section>
      </main>
    </div>
  );
}
