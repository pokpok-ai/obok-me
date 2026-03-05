"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { queryForests, type ForestPolygon } from "@/lib/overpass";

interface ForestsOverlayProps {
  enabled: boolean;
}

export function ForestsOverlay({ enabled }: ForestsOverlayProps) {
  const map = useMap();
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const lastBoundsRef = useRef<string>("");

  const clearPolygons = useCallback(() => {
    for (const p of polygonsRef.current) p.setMap(null);
    polygonsRef.current = [];
  }, []);

  const renderPolygons = useCallback(
    (data: ForestPolygon[]) => {
      if (!map) return;
      clearPolygons();
      for (const f of data) {
        const path = f.coords.map(([lat, lng]) => ({ lat, lng }));
        const polygon = new google.maps.Polygon({
          paths: path,
          strokeColor: "#22c55e",
          strokeWeight: 1,
          strokeOpacity: 0.6,
          fillColor: "#22c55e",
          fillOpacity: 0.2,
          map,
        });
        polygonsRef.current.push(polygon);
      }
    },
    [map, clearPolygons]
  );

  const fetchData = useCallback(() => {
    if (!map || !enabled) return;
    const zoom = map.getZoom();
    if (zoom !== undefined && zoom < 12) return; // Too zoomed out for Overpass
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

    queryForests(sw.lat(), sw.lng(), ne.lat(), ne.lng(), ctrl.signal)
      .then(renderPolygons)
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Forests query failed:", err);
      });
  }, [map, enabled, renderPolygons]);

  useEffect(() => {
    if (!map) return;
    if (!enabled) {
      clearPolygons();
      lastBoundsRef.current = "";
      return;
    }

    fetchData();
    const listener = map.addListener("idle", fetchData);
    return () => {
      google.maps.event.removeListener(listener);
      abortRef.current?.abort();
    };
  }, [map, enabled, fetchData, clearPolygons]);

  return null;
}
