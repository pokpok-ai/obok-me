import { useState, useEffect } from "react";
import { fetchHeatmapPoints } from "@/lib/api";
import type { ViewBounds, Filters, HeatmapPoint } from "@/types";

export function useHeatmap(
  bounds: ViewBounds | null,
  filters: Filters,
  enabled: boolean
) {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bounds || !enabled) {
      setPoints([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchHeatmapPoints(bounds, filters)
      .then((data) => {
        if (!cancelled) setPoints(data);
      })
      .catch((err) => {
        if (!cancelled) console.error("Heatmap fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bounds, filters, enabled]);

  return { points, loading };
}
