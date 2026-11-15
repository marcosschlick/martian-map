export const JEZERO_CRATER_COORDS = [18.38, 77.58];
export const MARS_BOUNDS = [
  [-90, -180],
  [90, 180],
];
// GCS_Mars_2000_Sphere, verified against the CTX provider's WKT.
export const MARS_RADIUS_METERS = 3396190;
export const RESERVE_WARNING_PERCENT = 30;
// Only recognizes the analytic boundary; it does not add usable reach.
export const TARGET_LIMIT_TOLERANCE_METERS = 0.01;
export const MODEL_ASSUMPTIONS = {
  oxygenCapacityMinutes: 240,
  batteryCapacityMinutes: 180,
  walkingMetersPerHour: 2000,
  protectedReservePercent: 20,
  envelopeVertices: 96,
};

export const RADIATION_SIMULATION = {
  maxRemainingDoseMicroSv: 300,
  doseStepMicroSv: 10,
  doseRatesMicroSvPerHour: { low: 100, high: 500 },
};

function calculateRadiationBudget(scenario, remainingDoseMicroSv) {
  const { doseRatesMicroSvPerHour, maxRemainingDoseMicroSv } =
    RADIATION_SIMULATION;
  if (!Object.hasOwn(doseRatesMicroSvPerHour, scenario)) return null;

  const doseRateMicroSvPerHour = doseRatesMicroSvPerHour[scenario];
  const availableDose = Number.isFinite(remainingDoseMicroSv)
    ? Math.min(maxRemainingDoseMicroSv, Math.max(0, remainingDoseMicroSv))
    : 0;
  return {
    doseRateMicroSvPerHour,
    remainingDoseMicroSv: availableDose,
    budgetMinutes: (60 * availableDose) / doseRateMicroSvPerHour,
  };
}

export function calculateExcursion(
  { oxygen, battery },
  {
    scenario = "off",
    remainingDoseMicroSv = RADIATION_SIMULATION.maxRemainingDoseMicroSv,
  } = {},
) {
  const {
    oxygenCapacityMinutes,
    batteryCapacityMinutes,
    protectedReservePercent,
    walkingMetersPerHour,
  } = MODEL_ASSUMPTIONS;
  const oxygenBudgetMinutes =
    (oxygenCapacityMinutes * Math.max(0, oxygen - protectedReservePercent)) /
    100;
  const batteryBudgetMinutes =
    (batteryCapacityMinutes * Math.max(0, battery - protectedReservePercent)) /
    100;
  const suitBudgetMinutes = Math.min(oxygenBudgetMinutes, batteryBudgetMinutes);
  const doseBudget = calculateRadiationBudget(scenario, remainingDoseMicroSv);
  const budgets = {
    Oxygen: oxygenBudgetMinutes,
    Battery: batteryBudgetMinutes,
  };
  if (doseBudget) budgets.Radiation = doseBudget.budgetMinutes;

  const excursionBudgetMinutes = Math.min(...Object.values(budgets));
  const limitingResource = Object.keys(budgets)
    .filter((resource) => budgets[resource] === excursionBudgetMinutes)
    .join(" + ");
  const timeReductionMinutes = suitBudgetMinutes - excursionBudgetMinutes;
  return {
    oxygenBudgetMinutes,
    batteryBudgetMinutes,
    excursionBudgetMinutes,
    radiusMeters: (excursionBudgetMinutes * (walkingMetersPerHour / 60)) / 2,
    limitingResource:
      limitingResource === "Oxygen + Battery" ? "Both" : limitingResource,
    radiation: doseBudget && { ...doseBudget, timeReductionMinutes },
    status:
      excursionBudgetMinutes === 0
        ? "empty"
        : timeReductionMinutes > 0 ||
            Math.min(oxygen, battery) < RESERVE_WARNING_PERCENT
          ? "warning"
          : "available",
  };
}

const radians = (degrees) => (degrees * Math.PI) / 180;
const degrees = (angle) => (angle * 180) / Math.PI;

export function isMarsCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length !== 2) return false;
  const [latitude, longitude] = coordinate;
  const [[south, west], [north, east]] = MARS_BOUNDS;
  return (
    Number.isFinite(latitude) &&
    latitude >= south &&
    latitude <= north &&
    Number.isFinite(longitude) &&
    longitude >= west &&
    longitude <= east
  );
}

export function createDirectReference(target) {
  const [latitude, longitude] = JEZERO_CRATER_COORDS;
  const [targetLatitude, targetLongitude] = target;
  const longitudeDelta = targetLongitude - longitude;
  if (Math.abs(longitudeDelta) <= 180) return [JEZERO_CRATER_COORDS, target];

  const direction = -Math.sign(longitudeDelta);
  const edge = 180 * direction;
  const wrappedDelta = longitudeDelta + 360 * direction;
  const edgeLatitude =
    latitude +
    ((edge - longitude) / wrappedDelta) * (targetLatitude - latitude);
  return [
    [JEZERO_CRATER_COORDS, [edgeLatitude, edge]],
    [[edgeLatitude, -edge], target],
  ];
}

export function createEnvelope(radiusMeters, center = JEZERO_CRATER_COORDS) {
  if (radiusMeters <= 0) return [];
  const latitude = radians(center[0]);
  const longitude = radians(center[1]);
  const angularDistance = radiusMeters / MARS_RADIUS_METERS;
  return Array.from(
    { length: MODEL_ASSUMPTIONS.envelopeVertices },
    (_, index) => {
      const bearing =
        (2 * Math.PI * index) / MODEL_ASSUMPTIONS.envelopeVertices;
      const destinationLatitude = Math.asin(
        Math.sin(latitude) * Math.cos(angularDistance) +
          Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
      );
      const destinationLongitude =
        longitude +
        Math.atan2(
          Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
          Math.cos(angularDistance) -
            Math.sin(latitude) * Math.sin(destinationLatitude),
        );
      return [
        degrees(destinationLatitude),
        ((degrees(destinationLongitude) + 540) % 360) - 180,
      ];
    },
  );
}

export function marsDistanceMeters(from, to) {
  const latitudeDelta = radians(to[0] - from[0]);
  const longitudeDelta = radians(to[1] - from[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from[0])) *
      Math.cos(radians(to[0])) *
      Math.sin(longitudeDelta / 2) ** 2;
  const clamped = Math.min(1, Math.max(0, haversine));
  return (
    2 *
    MARS_RADIUS_METERS *
    Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped))
  );
}

export function evaluateTarget(target, excursion) {
  if (!isMarsCoordinate(target)) return null;
  const distanceMeters = marsDistanceMeters(JEZERO_CRATER_COORDS, target);
  const roundTripMinutes =
    (2 * distanceMeters) / (MODEL_ASSUMPTIONS.walkingMetersPerHour / 60);
  const timeMarginMinutes = excursion.excursionBudgetMinutes - roundTripMinutes;
  const doseBudget = excursion.radiation;
  const estimatedDoseMicroSv = doseBudget
    ? (doseBudget.doseRateMicroSvPerHour * roundTripMinutes) / 60
    : 0;
  const state =
    excursion.excursionBudgetMinutes === 0
      ? "empty"
      : Math.abs(distanceMeters - excursion.radiusMeters) <=
          TARGET_LIMIT_TOLERANCE_METERS
        ? "limit"
        : distanceMeters < excursion.radiusMeters
          ? "within"
          : "exceeded";
  const labels = {
    empty: "No excursion budget",
    limit: "At modeled limit",
    within: "Within modeled budget",
    exceeded: "Exceeds modeled budget",
  };
  return {
    distanceMeters,
    roundTripMinutes,
    timeMarginMinutes,
    radiation: doseBudget
      ? {
          estimatedDoseMicroSv,
          doseMarginMicroSv:
            doseBudget.remainingDoseMicroSv - estimatedDoseMicroSv,
        }
      : null,
    state,
    label: labels[state],
    tone:
      state === "empty" || state === "exceeded"
        ? "danger"
        : state === "limit" || excursion.status === "warning"
          ? "warning"
          : "available",
  };
}
