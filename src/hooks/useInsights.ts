import { useState, useEffect, useCallback } from "react";
import { fetchAllInsights } from "@/lib/api";
import type { ViewBounds, Filters, InsightsData } from "@/types";

const EMPTY_INSIGHTS: InsightsData = {
  priceTrends: [],
  floorAnalysis: [],
  roomsAnalysis: [],
  areaAnalysis: [],
  volumeTrends: [],
  partyAnalysis: [],
  yoyChange: null,
};

export function useInsights(bounds: ViewBounds | null, filters: Filters) {
  const [insights, setInsights] = useState<InsightsData>(EMPTY_INSIGHTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!bounds) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAllInsights(bounds, filters)
      .then((data) => {
        if (!cancelled) setInsights(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch insights:", err);
          setError(err.message || "Failed to load insights");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bounds, filters]);

  // Auto-fetch is intentionally not enabled — insights are fetched on demand
  // to avoid hammering the DB on every viewport change.

  return { insights, loading, error, refresh };
}
