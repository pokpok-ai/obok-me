import { useState, useEffect } from "react";
import { fetchNbpRates, type NbpRatesResponse } from "@/lib/nbp-api";
import { fetchDemographics, type GusDemographics } from "@/lib/gus-api";

export function useExternalData() {
  const [nbpRates, setNbpRates] = useState<NbpRatesResponse | null>(null);
  const [demographics, setDemographics] = useState<GusDemographics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [rates, demo] = await Promise.allSettled([
        fetchNbpRates(),
        fetchDemographics(),
      ]);

      if (cancelled) return;

      if (rates.status === "fulfilled") setNbpRates(rates.value);
      if (demo.status === "fulfilled") setDemographics(demo.value);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { nbpRates, demographics, loading };
}
