"use client";

import { Source, Layer } from "react-map-gl/maplibre";
import type { HeatmapPoint } from "@/types";
import { useMemo } from "react";

interface HeatmapLayerProps {
  points: HeatmapPoint[];
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const geojson = useMemo((): GeoJSON.FeatureCollection => {
    const weights = points.map((p) => p.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;

    return {
      type: "FeatureCollection",
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: { weight: (p.weight - minW) / range },
      })),
    };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <Source id="heatmap" type="geojson" data={geojson}>
      <Layer
        id="heatmap-layer"
        type="heatmap"
        paint={{
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(34,197,94,0.4)",
            0.4, "rgba(34,197,94,0.8)",
            0.6, "rgba(250,204,21,0.8)",
            0.8, "rgba(249,115,22,0.8)",
            1.0, "rgba(185,28,28,1)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 30],
          "heatmap-opacity": 0.6,
        }}
      />
    </Source>
  );
}
