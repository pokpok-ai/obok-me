import { getSupabase } from "./supabase";
import type { ViewBounds, Filters, Transaction, ViewportStats } from "@/types";

export async function fetchTransactions(
  bounds: ViewBounds,
  filters: Filters
): Promise<Transaction[]> {
  const { data, error } = await getSupabase().rpc("transactions_in_view", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    prop_type: filters.propertyType || null,
    max_results: 500,
  });

  if (error) throw error;
  return (data as Transaction[]) || [];
}

export async function fetchViewportStats(
  bounds: ViewBounds,
  filters: Filters
): Promise<ViewportStats | null> {
  const { data, error } = await getSupabase().rpc("viewport_stats", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
  });

  if (error) throw error;
  return (data as ViewportStats[])?.[0] || null;
}
