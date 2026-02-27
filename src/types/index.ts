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
  propertyType: string | null;
}

export interface ViewportStats {
  total_count: number;
  avg_price_per_sqm: number | null;
  median_price_per_sqm: number | null;
  min_price: number | null;
  max_price: number | null;
}
