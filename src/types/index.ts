export interface Transaction {
  id: number;
  price: number;
  price_per_sqm: number | null;
  transaction_date: string;
  property_type: "apartment" | "house" | "plot" | "commercial";
  market_type: "primary" | "secondary" | null;
  area_sqm: number | null;
  rooms: number | null;
  floor: number | null;
  address: string | null;
  lat: number;
  lng: number;
  transaction_type: string | null;
  seller_type: string | null;
  buyer_type: string | null;
  property_right: string | null;
  share_fraction: string | null;
  apartment_number: string | null;
  function_type: string | null;
  ancillary_area_sqm: number | null;
  building_type: string | null;
  zoning: string | null;
  land_use: string | null;
  additional_info: string | null;
}

export interface ViewBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Filters {
  dateFrom: string | null;
  dateTo: string | null;
  functionType: string | null;
}

export interface ViewportStats {
  total_count: number;
  avg_price_per_sqm: number | null;
  median_price_per_sqm: number | null;
  min_price: number | null;
  max_price: number | null;
}

// --- Correlation / Enrichment Types ---

export interface PriceTrend {
  month: string;
  avg_price_per_sqm: number;
  median_price_per_sqm: number;
  transaction_count: number;
  market_primary_avg: number | null;
  market_secondary_avg: number | null;
}

export interface FloorAnalysis {
  floor: number;
  avg_price_per_sqm: number;
  median_price_per_sqm: number;
  transaction_count: number;
}

export interface RoomsAnalysis {
  rooms: number;
  avg_price_per_sqm: number;
  avg_total_price: number;
  avg_area: number;
  transaction_count: number;
}

export interface AreaAnalysis {
  area_bucket: string;
  bucket_order: number;
  avg_price_per_sqm: number;
  avg_total_price: number;
  transaction_count: number;
}

export interface VolumeTrend {
  month: string;
  transaction_count: number;
  total_value: number;
  avg_price: number;
}

export interface PartyAnalysis {
  buyer_type: string | null;
  seller_type: string | null;
  avg_price_per_sqm: number | null;
  avg_total_price: number;
  transaction_count: number;
}

export interface YoYChange {
  current_avg: number | null;
  previous_avg: number | null;
  pct_change: number | null;
  current_count: number;
  previous_count: number;
}

export interface InsightsData {
  priceTrends: PriceTrend[];
  floorAnalysis: FloorAnalysis[];
  roomsAnalysis: RoomsAnalysis[];
  areaAnalysis: AreaAnalysis[];
  volumeTrends: VolumeTrend[];
  partyAnalysis: PartyAnalysis[];
  yoyChange: YoYChange | null;
}
