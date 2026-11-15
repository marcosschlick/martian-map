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
