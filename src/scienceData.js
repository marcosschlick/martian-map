import {
  isMarsCoordinate,
  JEZERO_CRATER_COORDS,
  marsDistanceMeters,
} from "./evaModel.js";

// Continuous pixel-edge coordinates in CTX service tile 10/407/1465.
// Placement is a project interpretation, not a NASA-named landing/science site.
export function studyPixelCoordinate([x, y]) {
  const tileSpan = 180 / 2 ** 10;
  return [90 - (407 + y / 512) * tileSpan, -180 + (1465 + x / 512) * tileSpan];
}

export const SCIENCE_SOURCES = {
  geology:
    "https://www.usgs.gov/maps/geologic-map-jezero-crater-and-nili-planum-region-mars",
  imagery:
    "https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/10/407/1465",
  metadata:
    "https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson",
};

export const SCIENCE_SITE = {
  id: "east-crater-survey",
  name: "East crater survey",
  coordinate: studyPixelCoordinate([290, 260]),
  objective: "Investigate how a small crater modifies Jezero's floor.",
  observation:
    "CTX imagery shows an arcuate rim and a contrasting interior. This is a project interpretation of the orbital mosaic.",
  activity:
    "Photograph rim and floor textures from an eastern observation point and compare them with the orbital view.",
};

export const SCIENCE_AREA_BOUNDS = [
  studyPixelCoordinate([165, 218]),
  studyPixelCoordinate([306, 294]),
];

// Manually interpreted outer rim plus a conservative planning margin.
// This contour is defined by Tuxonauts, not a NASA hazard product.
const exclusionPixels = [
  [228, 254],
  [239, 247],
  [254, 243],
  [270, 242],
  [282, 247],
  [289, 253],
  [284, 266],
  [278, 277],
  [268, 284],
  [253, 288],
  [239, 287],
  [229, 281],
  [226, 269],
];

export const CRATER_EXCLUSION = {
  name: "Project exclusion · Crater interior and rim",
  pixelRing: exclusionPixels,
  coordinates: exclusionPixels.map(studyPixelCoordinate),
  reason:
    "Keep outside the interpreted crater interior and rim margin until ground conditions can be assessed.",
};

export const DEMO_TRAVERSE_POINTS = [
  JEZERO_CRATER_COORDS,
  ...[
    [222, 236],
    [275, 234],
    [298, 246],
  ].map(studyPixelCoordinate),
  SCIENCE_SITE.coordinate,
];

function studyPixel([latitude, longitude]) {
  return [
    (((longitude + 180) * 1024) / 180 - 1465) * 512,
    (((90 - latitude) * 1024) / 180 - 407) * 512,
  ];
}

const EPSILON = 1e-7;
const cross = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function onSegment(a, b, point) {
  return (
    Math.abs(cross(a, b, point)) <= EPSILON &&
    point.every(
      (value, axis) =>
        value >= Math.min(a[axis], b[axis]) - EPSILON &&
        value <= Math.max(a[axis], b[axis]) + EPSILON,
    )
  );
}

function segmentsIntersect(a, b, c, d) {
  if (
    onSegment(a, b, c) ||
    onSegment(a, b, d) ||
    onSegment(c, d, a) ||
    onSegment(c, d, b)
  )
    return true;
  return (
    cross(a, b, c) > 0 !== cross(a, b, d) > 0 &&
    cross(c, d, a) > 0 !== cross(c, d, b) > 0
  );
}

function insidePolygon(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j],
      b = ring[i];
    if (onSegment(a, b, point)) return true;
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

export function reviewTraverse(
  points,
  exclusions = [CRATER_EXCLUSION.coordinates],
) {
  const unavailable = (reason) => ({
    available: false,
    lengthMeters: null,
    reason,
  });
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(isMarsCoordinate)
  ) {
    return unavailable("Invalid traverse coordinates.");
  }
  if (
    marsDistanceMeters(points[0], JEZERO_CRATER_COORDS) > 0.01 ||
    marsDistanceMeters(points.at(-1), SCIENCE_SITE.coordinate) > 0.01
  ) {
    return unavailable(
      "The traverse must connect the Habitat and science site.",
    );
  }
  const [[north, west], [south, east]] = SCIENCE_AREA_BOUNDS;
  if (
    points.some(
      ([lat, lon]) => lat < south || lat > north || lon < west || lon > east,
    )
  ) {
    return unavailable("The traverse leaves the reviewed CTX window.");
  }
  const pixels = points.map(studyPixel);
  for (const polygon of exclusions) {
    const ring = polygon.map(studyPixel);
    if (pixels.some((point) => insidePolygon(point, ring))) {
      return unavailable(
        "A traverse point enters or touches a project exclusion.",
      );
    }
    for (let segment = 1; segment < pixels.length; segment++) {
      for (let edge = 0; edge < ring.length; edge++) {
        if (
          segmentsIntersect(
            pixels[segment - 1],
            pixels[segment],
            ring[edge],
            ring[(edge + 1) % ring.length],
          )
        ) {
          return unavailable(
            "A traverse segment crosses or touches a project exclusion.",
          );
        }
      }
    }
  }
  return {
    available: true,
    lengthMeters: points
      .slice(1)
      .reduce(
        (total, point, index) =>
          total + marsDistanceMeters(points[index], point),
        0,
      ),
    reason:
      "Segments avoid one project exclusion; other terrain is unassessed.",
  };
}

export const DEMO_TRAVERSE_REVIEW = reviewTraverse(DEMO_TRAVERSE_POINTS);
export const DIRECT_TERRAIN_REVIEW = reviewTraverse([
  JEZERO_CRATER_COORDS,
  SCIENCE_SITE.coordinate,
]);
