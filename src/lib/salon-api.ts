import { getSupabase } from "./supabase";
import type { ViewBounds, Salon } from "@/types";

export async function fetchSalons(
  bounds: ViewBounds,
  categoryId?: number | null,
  promoOnly?: boolean,
  promotedOnly?: boolean
): Promise<Salon[]> {
  const { data, error } = await getSupabase().rpc("booksy_salons_in_view", {
    min_lat: bounds.south,
    min_lng: bounds.west,
    max_lat: bounds.north,
    max_lng: bounds.east,
    cat: categoryId || null,
    promo_only: promoOnly || false,
    promoted_only: promotedOnly || false,
    max_results: 300,
  });

  if (error) throw error;
  return (data as Salon[]) || [];
}
