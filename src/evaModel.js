export const JEZERO_CRATER_COORDS = [18.38, 77.58];
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

export function calculateExcursion({ oxygen, battery }) {
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
  const excursionBudgetMinutes = Math.min(
    oxygenBudgetMinutes,
    batteryBudgetMinutes,
  );
  return {
    oxygenBudgetMinutes,
    batteryBudgetMinutes,
    excursionBudgetMinutes,
    radiusMeters: (excursionBudgetMinutes * (walkingMetersPerHour / 60)) / 2,
    limitingResource:
      oxygenBudgetMinutes === batteryBudgetMinutes
        ? "Both"
        : oxygenBudgetMinutes < batteryBudgetMinutes
          ? "Oxygen"
          : "Battery",
    status:
      excursionBudgetMinutes === 0
        ? "empty"
        : Math.min(oxygen, battery) < RESERVE_WARNING_PERCENT
          ? "warning"
          : "available",
  };
}

const radians = (degrees) => (degrees * Math.PI) / 180;
const degrees = (angle) => (angle * 180) / Math.PI;

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
  if (!target) return null;
  const distanceMeters = marsDistanceMeters(JEZERO_CRATER_COORDS, target);
  const roundTripMinutes =
    (2 * distanceMeters) / (MODEL_ASSUMPTIONS.walkingMetersPerHour / 60);
  const timeMarginMinutes = excursion.excursionBudgetMinutes - roundTripMinutes;
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
