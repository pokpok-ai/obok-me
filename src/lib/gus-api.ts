export interface GusDataPoint {
  year: number;
  val: number;
}

export interface GusDemographics {
  unitId: string;
  unitName: string;
  data: {
    population: GusDataPoint[] | null;
    salary: GusDataPoint[] | null;
    unemployment: GusDataPoint[] | null;
    crime: GusDataPoint[] | null;
  };
  fetchedAt: string;
}

export async function fetchDemographics(): Promise<GusDemographics | null> {
  try {
    const res = await fetch("/api/gus?action=demographics");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    console.warn("Failed to fetch GUS demographics");
    return null;
  }
}

/** Get the most recent value from a data series */
export function latestValue(data: GusDataPoint[] | null): { year: number; val: number } | null {
  if (!data || data.length === 0) return null;
  return data[data.length - 1];
}

/** Get year-over-year change */
export function yoyChange(data: GusDataPoint[] | null): number | null {
  if (!data || data.length < 2) return null;
  const curr = data[data.length - 1].val;
  const prev = data[data.length - 2].val;
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}
