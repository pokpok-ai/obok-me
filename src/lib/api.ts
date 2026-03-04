import { getSupabase } from "./supabase";
import type {
  ViewBounds,
  Filters,
  Transaction,
  ViewportStats,
  WarsawStats,
  HeatmapPoint,
  PriceTrend,
  FloorAnalysis,
  RoomsAnalysis,
  AreaAnalysis,
  VolumeTrend,
  PartyAnalysis,
  YoYChange,
  InsightsData,
  ComparableTransaction,
  PriceEstimate,
  DistrictRanking,
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
    func_type: filters.functionType || null,
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
    func_type: filters.functionType || null,
  });

  if (error) throw error;
  return (data as ViewportStats[])?.[0] || null;
}

// --- Warsaw-wide stats API ---

export async function fetchWarsawStats(
  filters: Filters
): Promise<WarsawStats | null> {
  const { data, error } = await getSupabase().rpc("warsaw_wide_stats", {
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    func_type: filters.functionType || null,
  });

  if (error) {
    console.warn("Warsaw stats not available:", error.message);
    return null;
  }
  const row = (data as WarsawStats[])?.[0];
  if (!row) return null;
  // SQL may return numeric strings — coerce to numbers
  return {
    total_count: Number(row.total_count),
    avg_price_per_sqm: row.avg_price_per_sqm != null ? Number(row.avg_price_per_sqm) : null,
    median_price_per_sqm: row.median_price_per_sqm != null ? Number(row.median_price_per_sqm) : null,
  };
}

// --- Heatmap API ---

export async function fetchHeatmapPoints(
  bounds: ViewBounds,
  filters: Filters
): Promise<HeatmapPoint[]> {
  const { data, error } = await getSupabase().rpc("heatmap_points", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    func_type: filters.functionType || null,
    max_results: 5000,
  });

  if (error) throw error;
  return (data as HeatmapPoint[]) || [];
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
    func_type: filters.functionType || null,
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
    func_type: filters.functionType || null,
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
    func_type: filters.functionType || null,
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
    func_type: filters.functionType || null,
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
    func_type: filters.functionType || null,
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
    func_type: filters.functionType || null,
  });

  if (error) throw error;
  return (data as PartyAnalysis[]) || [];
}

export async function fetchYoYChange(
  bounds: ViewBounds,
  filters: Filters
): Promise<YoYChange | null> {
  const { data, error } = await getSupabase().rpc("viewport_yoy_change", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    func_type: filters.functionType || null,
  });

  if (error) {
    console.warn("YoY change function not available:", error.message);
    return null;
  }
  return (data as YoYChange[])?.[0] || null;
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
    yoyChange,
  ] = await Promise.all([
    fetchPriceTrends(bounds, filters),
    fetchFloorAnalysis(bounds, filters),
    fetchRoomsAnalysis(bounds, filters),
    fetchAreaAnalysis(bounds, filters),
    fetchVolumeTrends(bounds, filters),
    fetchPartyAnalysis(bounds, filters),
    fetchYoYChange(bounds, filters),
  ]);

  return {
    priceTrends,
    floorAnalysis,
    roomsAnalysis,
    areaAnalysis,
    volumeTrends,
    partyAnalysis,
    yoyChange,
  };
}

// --- Phase 4: Smart Intelligence API ---

export async function fetchNearbyComps(
  lat: number,
  lng: number,
  rooms: number | null,
  area: number | null,
  funcType: string | null
): Promise<ComparableTransaction[]> {
  const { data, error } = await getSupabase().rpc("nearby_comparable_transactions", {
    target_lat: lat,
    target_lng: lng,
    target_rooms: rooms,
    target_area: area,
    func_type: funcType || "mieszkalna",
    radius_m: 1000,
    max_results: 6,
  });

  if (error) {
    console.warn("Nearby comps not available:", error.message);
    return [];
  }
  return (data as ComparableTransaction[]) || [];
}

export async function fetchPriceEstimate(
  lat: number,
  lng: number,
  funcType: string | null
): Promise<PriceEstimate | null> {
  const { data, error } = await getSupabase().rpc("estimate_price_at_point", {
    target_lat: lat,
    target_lng: lng,
    radius_m: 500,
    func_type: funcType || "mieszkalna",
  });

  if (error) {
    console.warn("Price estimate not available:", error.message);
    return null;
  }
  const row = (data as PriceEstimate[])?.[0];
  if (!row || !row.comp_count) return null;
  return {
    p20_price_per_sqm: Number(row.p20_price_per_sqm),
    median_price_per_sqm: Number(row.median_price_per_sqm),
    p80_price_per_sqm: Number(row.p80_price_per_sqm),
    avg_price_per_sqm: Number(row.avg_price_per_sqm),
    comp_count: Number(row.comp_count),
    avg_area: Number(row.avg_area),
    radius_used: Number(row.radius_used),
  };
}

export async function fetchDistrictRankings(
  filters: Filters
): Promise<DistrictRanking[]> {
  const { data, error } = await getSupabase().rpc("district_rankings", {
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    func_type: filters.functionType || "mieszkalna",
  });

  if (error) {
    console.warn("District rankings not available:", error.message);
    return [];
  }
  return ((data as DistrictRanking[]) || []).map((d) => ({
    ...d,
    avg_price_per_sqm: Number(d.avg_price_per_sqm),
    median_price_per_sqm: Number(d.median_price_per_sqm),
    transaction_count: Number(d.transaction_count),
    avg_area: Number(d.avg_area),
    center_lat: Number(d.center_lat),
    center_lng: Number(d.center_lng),
  }));
}
