import { getSupabase } from "./supabase";

export interface SalonSearchResult {
  id: number;
  name: string;
  category_name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
}

export async function searchSalonsByName(
  query: string
): Promise<SalonSearchResult[]> {
  const { data, error } = await getSupabase().rpc("booksy_salons_by_name", {
    search_query: query,
    max_results: 10,
  });
  if (error) {
    console.error("Salon search error:", error);
    return [];
  }
  return (data as SalonSearchResult[]) || [];
}
