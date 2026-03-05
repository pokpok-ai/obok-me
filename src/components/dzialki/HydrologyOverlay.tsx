"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { queryWaterways, type WaterwayLine } from "@/lib/overpass";

interface HydrologyOverlayProps {
  enabled: boolean;
}

export function HydrologyOverlay({ enabled }: HydrologyOverlayProps) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const lastBoundsRef = useRef<string>("");

  const clearLines = useCallback(() => {
    for (const p of polylinesRef.current) p.setMap(null);
    polylinesRef.current = [];
  }, []);

  const renderLines = useCallback(
    (data: WaterwayLine[]) => {
      if (!map) return;
      clearLines();
      for (const w of data) {
        const path = w.coords.map(([lat, lng]) => ({ lat, lng }));
        const polyline = new google.maps.Polyline({
          path,
          strokeColor: "#3b82f6",
          strokeWeight: w.isArea ? 2 : 1.5,
          strokeOpacity: 0.7,
          map,
        });
        polylinesRef.current.push(polyline);
      }
    },
    [map, clearLines]
  );

  const fetchData = useCallback(() => {
    if (!map || !enabled) return;
    const bounds = map.getBounds();
    if (!bounds) return;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const key = `${sw.lat().toFixed(4)},${sw.lng().toFixed(4)},${ne.lat().toFixed(4)},${ne.lng().toFixed(4)}`;
    if (key === lastBoundsRef.current) return;
    lastBoundsRef.current = key;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    queryWaterways(sw.lat(), sw.lng(), ne.lat(), ne.lng(), ctrl.signal)
      .then(renderLines)
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Hydrology query failed:", err);
      });
  }, [map, enabled, renderLines]);

  useEffect(() => {
    if (!map) return;
    if (!enabled) {
      clearLines();
      lastBoundsRef.current = "";
      return;
    }

    fetchData();
    const listener = map.addListener("idle", fetchData);
    return () => {
      google.maps.event.removeListener(listener);
      abortRef.current?.abort();
    };
  }, [map, enabled, fetchData, clearLines]);

  return null;
}
