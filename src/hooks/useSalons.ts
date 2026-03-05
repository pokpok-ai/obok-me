import { useState, useEffect } from "react";
import { fetchSalons } from "@/lib/salon-api";
import type { ViewBounds, Salon } from "@/types";

export function useSalons(
  bounds: ViewBounds | null,
  visible: boolean = true,
  categoryId?: number | null,
  promoOnly?: boolean
) {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bounds || !visible) {
      setSalons([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchSalons(bounds, categoryId, promoOnly)
      .then((data) => {
        if (cancelled) return;
        setSalons(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch salons:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bounds, visible, categoryId, promoOnly]);

  return { salons, loading };
}
