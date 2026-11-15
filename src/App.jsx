import { useRef, useState } from "react";
import MarsMap from "./MarsMap.jsx";
import SpaceWeather, { SpaceWeatherBadge } from "./SpaceWeather.jsx";
import { CardHeader, Icon, Meter, StatusDot } from "./HudKit.jsx";
import {
  ALERT,
  BUTTON,
  CARD,
  FOCUS_RING,
  INSET,
  LABEL,
  SUMMARY,
  TOGGLE,
  TONE_HEX,
  TONE_TEXT,
  VALUE,
} from "./hudStyles.js";
import {
  calculateExcursion,
  evaluateTarget,
  MODEL_ASSUMPTIONS,
  RADIATION_SIMULATION,
  RESERVE_WARNING_PERCENT,
} from "./evaModel.js";
import { useSpaceWeather } from "./useSpaceWeather.js";

const RESERVE_OPTIONS = [
  { id: "oxygen", label: "Oxygen", budgetKey: "oxygenBudgetMinutes" },
  { id: "battery", label: "Battery", budgetKey: "batteryBudgetMinutes" },
];
const RADIATION_SCENARIOS = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low rate" },
  { id: "high", label: "High rate" },
];
const FULL_RESERVES = { oxygen: 100, battery: 100 };
const FULL_REACH_METERS = calculateExcursion(FULL_RESERVES).radiusMeters;

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

const reserveState = (value) =>
  value === 0
    ? { tone: "danger", status: "Critical · Depleted" }
    : value < RESERVE_WARNING_PERCENT
      ? { tone: "warning", status: "Warning · Low reserve" }
      : { tone: "accent", status: "Normal reserve" };

function RadiationSimulation({
  scenario,
  radiation,
  onScenarioChange,
  onDoseChange,
}) {
  const selected = RADIATION_SCENARIOS.find(({ id }) => id === scenario);
  const doseShare = radiation
    ? radiation.remainingDoseMicroSv /
      RADIATION_SIMULATION.maxRemainingDoseMicroSv
    : 0;
  return (
    <details className="mt-3 border-t border-slate-800 pt-2 text-xs">
      <summary className={`${SUMMARY} py-1.5 font-semibold text-slate-50`}>
        <Icon
          name="chevron"
          className="size-3 text-slate-400 transition-transform duration-200 ease-hud group-open:rotate-90"
        />
        <Icon name="radiation" className="size-3.5 text-cyan-500" />
        Radiation simulation
        <span
          className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${scenario === "off" ? "border-slate-800 text-slate-400" : "border-amber-500/40 text-amber-500"}`}
        >
          {selected.label}
        </span>
      </summary>
      <div className="motion-safe:animate-hud-fade">
        <p className={`mt-1 ${LABEL}`}>
          Demo inputs for a constant dose rate over the round trip.
        </p>
        <div
          role="group"
          aria-label="Radiation scenario"
          className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1"
        >
          {RADIATION_SCENARIOS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={scenario === id}
              onClick={() => onScenarioChange(id)}
              className={`${TOGGLE} border-transparent bg-transparent`}
            >
              {label}
            </button>
          ))}
        </div>
        {radiation && (
          <div className={`mt-3 ${INSET} motion-safe:animate-hud-enter`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <label
                htmlFor="radiation-dose-allowance"
                className="text-slate-50"
              >
                Remaining demo dose
              </label>
              <span className="font-mono text-slate-50 tabular-nums">
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
              style={{
                "--range-fill": `${doseShare * 100}%`,
                "--range-tone":
                  radiation.remainingDoseMicroSv === 0
                    ? TONE_HEX.danger
                    : TONE_HEX.accent,
                "--range-reserve": "0%",
              }}
              className={`hud-range mt-1 ${FOCUS_RING}`}
            />
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <dt className={LABEL}>Demo dose rate</dt>
                <dd className={`${VALUE} text-slate-50`}>
                  {formatDose(radiation.doseRateMicroSvPerHour)}/h
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Dose time cap</dt>
                <dd
                  id="radiation-time-cap"
                  className={`${VALUE} text-slate-50`}
                >
                  {formatNumber(radiation.budgetMinutes)} min
                </dd>
              </div>
              <div className="col-span-2">
                <dt className={LABEL}>Time lost to simulated dose</dt>
                <dd
                  id="radiation-time-loss"
                  className={`${VALUE} ${radiation.timeReductionMinutes > 0 ? "text-amber-500" : "text-slate-50"}`}
                >
                  {formatNumber(radiation.timeReductionMinutes)} min
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </details>
  );
}

export default function App() {
  const [activeLayer, setActiveLayer] = useState("optical");
  const [reserves, setReserves] = useState(FULL_RESERVES);
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
  const targetTone = targetEvaluation?.tone ?? "neutral";
  const targetColor = TONE_TEXT[targetTone];
  const modelTone = excursion.status === "empty" ? "danger" : excursion.status;
  const modelColor = TONE_TEXT[modelTone];
  const budgetShare =
    targetEvaluation && excursion.excursionBudgetMinutes > 0
      ? targetEvaluation.roundTripMinutes / excursion.excursionBudgetMinutes
      : null;
  const reachShare = excursion.radiusMeters / FULL_REACH_METERS;
  const isFullReserves =
    reserves.oxygen === FULL_RESERVES.oxygen &&
    reserves.battery === FULL_RESERVES.battery;

  return (
    <div
      data-glove-mode={gloveMode || undefined}
      className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-50 select-none"
    >
      <header className="hud-panel relative grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-b border-slate-800 bg-slate-950/90 px-3 py-1.5 backdrop-blur-sm min-[400px]:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <img
            src={`${import.meta.env.BASE_URL}astrotux.png`}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-slate-800 bg-slate-900 object-contain shadow-[0_0_12px_rgb(6_182_212/0.25)] sm:h-9 sm:w-9"
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
          className={`${TOGGLE} min-h-10 font-semibold`}
        >
          <Icon name="glove" className="size-4" />
          Glove mode
        </button>
        <SpaceWeatherBadge weather={weather} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-cyan-500/50 to-transparent"
        />
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
          className="hud-panel hud-scroll mission-panel z-[1000] h-[45dvh] shrink-0 space-y-3 overflow-y-auto overscroll-contain border-t border-slate-800 bg-slate-950/90 p-3 backdrop-blur-sm"
        >
          <div className={CARD}>
            <CardHeader
              as="h2"
              id="suit-reserves-title"
              icon="gauge"
              title="Suit reserves"
            >
              <button
                type="button"
                disabled={isFullReserves}
                onClick={() => setReserves(FULL_RESERVES)}
                className={BUTTON}
              >
                <Icon name="reset" />
                Reset reserves
              </button>
            </CardHeader>
            <p id="reserve-simulation" className={`mt-1 ${LABEL}`}>
              Simulated input · No sensors connected
            </p>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-1">
              {RESERVE_OPTIONS.map(({ id, label, budgetKey }) => {
                const value = reserves[id];
                const { tone, status } = reserveState(value);
                const isLow = value < RESERVE_WARNING_PERCENT;
                const isLimiting =
                  excursion.limitingResource === "Both" ||
                  excursion.limitingResource.split(" + ").includes(label);

                return (
                  <div key={id} className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`${id}-reserve`}
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-50"
                      >
                        <Icon name={id} className="size-4 text-slate-400" />
                        {label}
                      </label>
                      <output
                        htmlFor={`${id}-reserve`}
                        className={`font-mono text-lg leading-6 tabular-nums transition-colors duration-300 ${tone === "accent" ? "text-slate-50" : TONE_TEXT[tone]}`}
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
                      style={{
                        "--range-fill": `${value}%`,
                        "--range-tone": TONE_HEX[tone],
                        "--range-reserve": `${MODEL_ASSUMPTIONS.protectedReservePercent}%`,
                      }}
                      className={`hud-range mt-1 ${FOCUS_RING}`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-x-2 text-[11px] leading-4">
                      <p
                        id={`${id}-status`}
                        aria-live="polite"
                        className={`transition-colors duration-300 ${isLow ? TONE_TEXT[tone] : "text-slate-400"}`}
                      >
                        {status}
                      </p>
                      <p className="font-mono text-slate-400 tabular-nums">
                        {formatNumber(excursion[budgetKey])} min
                        {isLimiting && (
                          <span className="ml-1 rounded border border-slate-800 px-1 text-[10px] tracking-wide text-slate-50 uppercase">
                            Limiting
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-4 rounded-full bg-slate-800 bg-[repeating-linear-gradient(135deg,rgb(148_163_184/0.6)_0_2px,transparent_2px_5px)]"
              />
              Hatched zone · {MODEL_ASSUMPTIONS.protectedReservePercent}%
              protected reserve
            </p>
          </div>

          <section
            className={CARD}
            style={{ animationDelay: "60ms" }}
            aria-labelledby="eva-target-title"
          >
            <CardHeader
              id="eva-target-title"
              icon="target"
              title="EVA target"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => mapRef.current?.useMapCenter()}
                className={BUTTON}
              >
                <Icon name="crosshair" />
                Use map center
              </button>
              <button
                type="button"
                disabled={!target}
                onClick={() => setTarget(null)}
                className={BUTTON}
              >
                <Icon name="close" />
                Clear target
              </button>
            </div>
            <p
              id="target-status"
              role="status"
              className={`mt-3 flex items-center gap-2 text-xs font-medium transition-colors duration-300 ${targetColor}`}
            >
              <StatusDot tone={targetTone} pulse={targetTone === "danger"} />
              <span
                key={targetEvaluation?.label || "none"}
                className="motion-safe:animate-hud-fade"
              >
                {targetEvaluation?.label || "Select an EVA target"}
              </span>
            </p>
            <p className={`mt-1 ${LABEL}`}>
              Direct estimate · Terrain not evaluated
            </p>
            {!targetEvaluation && (
              <p className="mt-2 rounded-md border border-dashed border-slate-800 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400">
                Click or tap the map to place a target, or pan the map and use
                its center.
              </p>
            )}
            {targetEvaluation && (
              <div className="motion-safe:animate-hud-enter">
                <dl
                  aria-label="EVA target estimate"
                  className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"
                >
                  <div className="col-span-2">
                    <dt className={LABEL}>Position</dt>
                    <dd
                      id="target-position"
                      className={`${VALUE} text-slate-50`}
                    >
                      {formatCoordinate(target[0], "N", "S")},{" "}
                      {formatCoordinate(target[1], "E", "W")}
                    </dd>
                  </div>
                  <div>
                    <dt className={LABEL}>Distance</dt>
                    <dd
                      id="target-distance"
                      className={`${VALUE} ${targetColor}`}
                    >
                      {formatDistance(targetEvaluation.distanceMeters)}
                    </dd>
                  </div>
                  <div>
                    <dt className={LABEL}>Round-trip time</dt>
                    <dd
                      id="target-round-trip"
                      className={`${VALUE} ${targetColor}`}
                    >
                      {formatNumber(targetEvaluation.roundTripMinutes)} min
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className={LABEL}>Time margin</dt>
                    <dd
                      id="target-time-margin"
                      className={`${VALUE} ${targetColor}`}
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
                        <dt className={LABEL}>Demo round-trip dose</dt>
                        <dd
                          id="target-dose"
                          className={`${VALUE} text-slate-50`}
                        >
                          {formatDose(
                            targetEvaluation.radiation.estimatedDoseMicroSv,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className={LABEL}>Demo dose margin</dt>
                        <dd
                          id="target-dose-margin"
                          className={`${VALUE} text-slate-50`}
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
                {budgetShare !== null && (
                  <div className="mt-3 space-y-1">
                    <Meter value={budgetShare} tone={targetTone} />
                    <p className={LABEL}>
                      {budgetShare > 10
                        ? "Needs more than 10× the excursion budget"
                        : `${budgetShare <= 1 ? "Uses" : "Needs"} ${formatNumber(budgetShare * 100)}% of excursion budget`}
                    </p>
                  </div>
                )}
                {targetEvaluation.timeMarginMinutes < 0 &&
                  targetEvaluation.state !== "limit" && (
                    <p id="target-shortfall" className={`mt-2 ${ALERT.danger}`}>
                      Exceeds budget by{" "}
                      {-targetEvaluation.timeMarginMinutes < 0.1
                        ? "<0.1"
                        : formatNumber(
                            -targetEvaluation.timeMarginMinutes,
                          )}{" "}
                      min. Limiting factor: {excursion.limitingResource}.
                    </p>
                  )}
              </div>
            )}
          </section>

          <div className={CARD} style={{ animationDelay: "120ms" }}>
            <CardHeader icon="gauge" title="Simplified model">
              <button
                type="button"
                disabled={excursion.radiusMeters === 0}
                aria-describedby="model-status"
                onClick={() => mapRef.current?.showEnvelope()}
                className={BUTTON}
              >
                <Icon name="expand" />
                Show envelope
              </button>
            </CardHeader>
            <p
              id="model-status"
              role="status"
              className={`mt-2 flex items-center gap-2 text-xs font-medium transition-colors duration-300 ${modelColor}`}
            >
              <StatusDot tone={modelTone} pulse={modelTone === "danger"} />
              <span
                key={`${excursion.status}-${excursion.radiation?.timeReductionMinutes > 0}`}
                className="motion-safe:animate-hud-fade"
              >
                {excursion.status === "empty"
                  ? "No excursion budget"
                  : excursion.radiation?.timeReductionMinutes > 0
                    ? "Simulated radiation reduces budget"
                    : excursion.status === "warning"
                      ? "Low reserves · Budget available"
                      : "Excursion budget available"}
              </span>
            </p>
            <div className="mt-3 space-y-1">
              <Meter value={reachShare} tone={modelTone} />
              <p className={LABEL}>
                {formatNumber(reachShare * 100)}% of full-reserve reach
              </p>
            </div>
            <dl
              aria-label="Modeled excursion summary"
              className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs"
            >
              <div>
                <dt className={LABEL}>Estimated reach</dt>
                <dd id="estimated-reach" className={`${VALUE} ${modelColor}`}>
                  {formatDistance(excursion.radiusMeters)}
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Excursion budget</dt>
                <dd id="excursion-budget" className={`${VALUE} ${modelColor}`}>
                  {formatNumber(excursion.excursionBudgetMinutes)} min
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Limiting factor</dt>
                <dd id="limiting-resource" className="mt-0.5 text-slate-50">
                  {excursion.limitingResource}
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Protected reserve</dt>
                <dd className="mt-0.5 text-slate-50">
                  {MODEL_ASSUMPTIONS.protectedReservePercent}% of full capacity
                </dd>
              </div>
            </dl>
            {(excursion.oxygenBudgetMinutes === 0 ||
              excursion.batteryBudgetMinutes === 0) && (
              <p className={`mt-2 ${ALERT.danger}`}>
                Protected suit reserve reached.
              </p>
            )}
            {excursion.radiation?.remainingDoseMicroSv === 0 && (
              <p className={`mt-2 ${ALERT.danger}`}>
                Simulated dose allowance depleted.
              </p>
            )}
            <RadiationSimulation
              scenario={radiationScenario}
              radiation={excursion.radiation}
              onScenarioChange={setRadiationScenario}
              onDoseChange={setRemainingDoseMicroSv}
            />
            <details className="mt-1 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-400">
              <summary className={SUMMARY}>
                <Icon
                  name="chevron"
                  className="size-3 transition-transform duration-200 ease-hud group-open:rotate-90"
                />
                Model assumptions
              </summary>
              <p className="mt-1 motion-safe:animate-hud-fade">
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
