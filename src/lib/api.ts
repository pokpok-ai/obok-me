import { getSupabase } from "./supabase";
import type {
  ViewBounds,
  Filters,
  Transaction,
  ViewportStats,
  PriceTrend,
  FloorAnalysis,
  RoomsAnalysis,
  AreaAnalysis,
  VolumeTrend,
  PartyAnalysis,
  InsightsData,
} from "@/types";

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

// --- Correlation / Insights API ---

export async function fetchPriceTrends(
  bounds: ViewBounds,
  filters: Filters
): Promise<PriceTrend[]> {
  const { data, error } = await getSupabase().rpc("viewport_price_trends", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    prop_type: filters.propertyType || null,
  });

  if (error) throw error;
  return (data as PriceTrend[]) || [];
}

export async function fetchFloorAnalysis(
  bounds: ViewBounds,
  filters: Filters
): Promise<FloorAnalysis[]> {
  const { data, error } = await getSupabase().rpc("viewport_floor_analysis", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
  });

  if (error) throw error;
  return (data as FloorAnalysis[]) || [];
}

export async function fetchRoomsAnalysis(
  bounds: ViewBounds,
  filters: Filters
): Promise<RoomsAnalysis[]> {
  const { data, error } = await getSupabase().rpc("viewport_rooms_analysis", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
  });

  if (error) throw error;
  return (data as RoomsAnalysis[]) || [];
}

export async function fetchAreaAnalysis(
  bounds: ViewBounds,
  filters: Filters
): Promise<AreaAnalysis[]> {
  const { data, error } = await getSupabase().rpc("viewport_area_analysis", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
  });

  if (error) throw error;
  return (data as AreaAnalysis[]) || [];
}

export async function fetchVolumeTrends(
  bounds: ViewBounds,
  filters: Filters
): Promise<VolumeTrend[]> {
  const { data, error } = await getSupabase().rpc("viewport_volume_trends", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    prop_type: filters.propertyType || null,
  });

  if (error) throw error;
  return (data as VolumeTrend[]) || [];
}

export async function fetchPartyAnalysis(
  bounds: ViewBounds,
  filters: Filters
): Promise<PartyAnalysis[]> {
  const { data, error } = await getSupabase().rpc("viewport_party_analysis", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
  });

  if (error) throw error;
  return (data as PartyAnalysis[]) || [];
}

export async function fetchAllInsights(
  bounds: ViewBounds,
  filters: Filters
): Promise<InsightsData> {
  const [
    priceTrends,
    floorAnalysis,
    roomsAnalysis,
    areaAnalysis,
    volumeTrends,
    partyAnalysis,
  ] = await Promise.all([
    fetchPriceTrends(bounds, filters),
    fetchFloorAnalysis(bounds, filters),
    fetchRoomsAnalysis(bounds, filters),
    fetchAreaAnalysis(bounds, filters),
    fetchVolumeTrends(bounds, filters),
    fetchPartyAnalysis(bounds, filters),
  ]);

  return {
    priceTrends,
    floorAnalysis,
    roomsAnalysis,
    areaAnalysis,
    volumeTrends,
    partyAnalysis,
  };
}
