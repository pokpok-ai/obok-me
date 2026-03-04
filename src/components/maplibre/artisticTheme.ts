/**
 * Artistic "vintage parchment" theme for MapLibre.
 * Applied as runtime paint-property overrides on top of the liberty base style.
 *
 * Palette: warm aged-paper tones, muted watercolor washes, dark-brown ink for text.
 */
import type { Map as MaplibreMap, LayerSpecification } from "maplibre-gl";

/* ── palette ─────────────────────────────────────────────────────── */
const P = {
  paper: "#f2ece3",
  paperLight: "#f7f2eb",
  ink: "#3d2e1f",
  inkLight: "#6b5744",
  water: "#9dbdd6",
  waterDark: "#7ba8c4",
  green: "#a5b88f",
  greenLight: "#c3d1af",
  building: "#e0d6c8",
  buildingStroke: "#c4b5a2",
  roadMajor: "#d8ccba",
  roadMajorCasing: "#c4b5a2",
  roadMinor: "#e8e0d4",
  roadMinorCasing: "#d8ccba",
  roadMotorway: "#c9b99a",
  roadMotorwayCasing: "#b0a08a",
  rail: "#b8a898",
  boundary: "#b8a898",
  halo: "#f2ece3",
  landuse: "#ede5da",
  industrial: "#e2d8cc",
  commercial: "#e8ddd0",
};

/* ── helpers ──────────────────────────────────────────────────────── */

function trySet(map: MaplibreMap, id: string, prop: string, value: unknown) {
  try {
    map.setPaintProperty(id, prop, value);
  } catch {
    /* expression-typed property — skip */
  }
}

function trySetLayout(map: MaplibreMap, id: string, prop: string, value: unknown) {
  try {
    map.setLayoutProperty(id, prop, value);
  } catch {
    /* skip */
  }
}

/* ── road color expression ───────────────────────────────────────── */
const roadFillColor = [
  "match",
  ["get", "class"],
  "motorway", P.roadMotorway,
  "trunk", P.roadMotorway,
  "primary", P.roadMajor,
  "secondary", P.roadMajor,
  "tertiary", P.roadMinor,
  P.roadMinor,
];

const roadCasingColor = [
  "match",
  ["get", "class"],
  "motorway", P.roadMotorwayCasing,
  "trunk", P.roadMotorwayCasing,
  "primary", P.roadMajorCasing,
  "secondary", P.roadMajorCasing,
  "tertiary", P.roadMinorCasing,
  P.roadMinorCasing,
];

/* ── apply theme ─────────────────────────────────────────────────── */

export function applyArtisticTheme(map: MaplibreMap) {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const l = layer as LayerSpecification & Record<string, unknown>;
    const sl = l["source-layer"] as string | undefined;
    const id = l.id;

    const type = l.type as string;

    /* ── background ── */
    if (type === "background") {
      trySet(map, id, "background-color", P.paper);
      continue;
    }

    /* ── water ── */
    if (sl === "water") {
      if (type === "fill") {
        trySet(map, id, "fill-color", P.water);
        trySet(map, id, "fill-opacity", 0.85);
      }
      if (type === "line") {
        trySet(map, id, "line-color", P.waterDark);
      }
      continue;
    }
    if (sl === "waterway") {
      if (type === "line") {
        trySet(map, id, "line-color", P.waterDark);
        trySet(map, id, "line-opacity", 0.7);
      }
      continue;
    }

    /* ── green areas ── */
    if (sl === "park") {
      if (type === "fill") {
        trySet(map, id, "fill-color", P.green);
        trySet(map, id, "fill-opacity", 0.45);
      }
      continue;
    }
    if (sl === "landcover") {
      if (type === "fill") {
        trySet(map, id, "fill-color", P.greenLight);
        trySet(map, id, "fill-opacity", 0.35);
      }
      continue;
    }

    /* ── landuse ── */
    if (sl === "landuse") {
      if (type === "fill") {
        // Use a match expression for different landuse types
        trySet(map, id, "fill-color", [
          "match",
          ["get", "class"],
          "residential", P.landuse,
          "commercial", P.commercial,
          "industrial", P.industrial,
          "retail", P.commercial,
          "railway", P.industrial,
          P.landuse,
        ]);
        trySet(map, id, "fill-opacity", 0.4);
      }
      continue;
    }

    /* ── buildings ── */
    if (sl === "building") {
      if (type === "fill") {
        trySet(map, id, "fill-color", P.building);
        trySet(map, id, "fill-opacity", 0.8);
      }
      if (type === "fill-extrusion") {
        trySet(map, id, "fill-extrusion-color", P.building);
        trySet(map, id, "fill-extrusion-opacity", 0.7);
      }
      if (type === "line") {
        trySet(map, id, "line-color", P.buildingStroke);
        trySet(map, id, "line-opacity", 0.6);
      }
      continue;
    }

    /* ── roads ── */
    if (sl === "transportation") {
      if (type === "line") {
        const isCasing = id.toLowerCase().includes("casing") || id.toLowerCase().includes("case");
        const isBridge = id.toLowerCase().includes("bridge");
        const isTunnel = id.toLowerCase().includes("tunnel");
        const isRail = id.toLowerCase().includes("rail");
        const isPath = id.toLowerCase().includes("path") || id.toLowerCase().includes("pedestrian");

        if (isRail) {
          trySet(map, id, "line-color", P.rail);
          trySet(map, id, "line-opacity", 0.5);
        } else if (isPath) {
          trySet(map, id, "line-color", P.roadMinor);
          trySet(map, id, "line-opacity", 0.4);
          trySet(map, id, "line-dasharray", [2, 2]);
        } else if (isCasing) {
          trySet(map, id, "line-color", roadCasingColor);
          if (isTunnel) trySet(map, id, "line-opacity", 0.3);
        } else {
          trySet(map, id, "line-color", roadFillColor);
          if (isTunnel) trySet(map, id, "line-opacity", 0.4);
          if (isBridge) trySet(map, id, "line-opacity", 0.9);
        }
      }
      continue;
    }

    /* ── boundaries ── */
    if (sl === "boundary") {
      if (type === "line") {
        trySet(map, id, "line-color", P.boundary);
        trySet(map, id, "line-opacity", 0.4);
      }
      continue;
    }

    /* ── aeroway ── */
    if (sl === "aeroway") {
      if (type === "fill") {
        trySet(map, id, "fill-color", P.industrial);
        trySet(map, id, "fill-opacity", 0.4);
      }
      if (type === "line") {
        trySet(map, id, "line-color", P.rail);
        trySet(map, id, "line-opacity", 0.4);
      }
      continue;
    }

    /* ── labels / symbols ── */
    if (type === "symbol") {
      // Warm up text colors
      trySet(map, id, "text-color", P.ink);
      trySet(map, id, "text-halo-color", P.halo);
      trySet(map, id, "text-halo-width", 1.5);

      // Make road labels lighter
      if (sl === "transportation_name") {
        trySet(map, id, "text-color", P.inkLight);
        trySet(map, id, "text-halo-width", 2);
      }

      // Place labels → dark ink
      if (sl === "place") {
        trySet(map, id, "text-color", P.ink);
      }

      // POI labels → lighter
      if (sl === "poi") {
        trySet(map, id, "text-color", P.inkLight);
        trySet(map, id, "text-opacity", 0.8);
      }
      continue;
    }
  }
}
