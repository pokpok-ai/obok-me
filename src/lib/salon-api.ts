import { getSupabase } from "./supabase";
import type { ViewBounds, Salon } from "@/types";

export async function fetchSalons(
  bounds: ViewBounds,
  categoryName?: string | null,
  promoOnly?: boolean,
  promotedOnly?: boolean
): Promise<Salon[]> {
  // Use booksy_salons_json to bypass PostgREST's 1000-row limit
  // It returns a single json value wrapping the full result set
  const { data, error } = await getSupabase().rpc("booksy_salons_json", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    cat: categoryName || null,
    promo_only: promoOnly || false,
    promoted_only: promotedOnly || false,
    max_results: 5000,
  });

  if (error) throw error;
  return (data as Salon[]) || [];
}
