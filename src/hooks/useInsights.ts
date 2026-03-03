import { useState, useEffect, useCallback } from "react";
import { fetchAllInsights, fetchWarsawStats } from "@/lib/api";
import type { ViewBounds, Filters, InsightsData, WarsawStats } from "@/types";

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
  const [warsawStats, setWarsawStats] = useState<WarsawStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!bounds) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchAllInsights(bounds, filters),
      fetchWarsawStats(filters),
    ])
      .then(([data, wStats]) => {
        if (!cancelled) {
          setInsights(data);
          setWarsawStats(wStats);
        }
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

  return { insights, warsawStats, loading, error, refresh };
}
