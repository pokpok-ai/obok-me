import { useState, useEffect } from "react";
import { fetchTransactions, fetchViewportStats } from "@/lib/api";
import type { ViewBounds, Filters, Transaction, ViewportStats } from "@/types";

export function useTransactions(
  bounds: ViewBounds | null,
  filters: Filters
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<ViewportStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bounds) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchTransactions(bounds, filters),
      fetchViewportStats(bounds, filters),
    ])
      .then(([txns, viewStats]) => {
        if (cancelled) return;
        setTransactions(txns);
        setStats(viewStats);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch transactions:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bounds, filters]);

  return { transactions, stats, loading };
}
