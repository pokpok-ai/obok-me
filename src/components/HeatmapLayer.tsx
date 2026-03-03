"use client";

import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { HeatmapPoint } from "@/types";

interface HeatmapLayerProps {
  points: HeatmapPoint[];
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const visualization = useMapsLibrary("visualization");
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !visualization || points.length === 0) return;

    // Compute min/max for normalization
    const weights = points.map((p) => p.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;

    const heatmapData = points.map((p) => ({
      location: new google.maps.LatLng(p.lat, p.lng),
      weight: ((p.weight - minW) / range) * 10, // normalize 0-10
    }));

    if (heatmapRef.current) {
      heatmapRef.current.setData(heatmapData);
    } else {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map,
        radius: 30,
        opacity: 0.6,
        gradient: [
          "rgba(0, 0, 0, 0)",
          "rgba(34, 197, 94, 0.4)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(250, 204, 21, 0.8)",
          "rgba(249, 115, 22, 0.8)",
          "rgba(239, 68, 68, 0.9)",
          "rgba(185, 28, 28, 1)",
        ],
      });
    }

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
    };
  }, [map, visualization, points]);

  return null;
}
