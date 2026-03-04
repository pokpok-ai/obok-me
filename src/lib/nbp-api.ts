export interface NbpRate {
  name: string;
  value: number;
  effectiveDate: string;
}

export interface NbpRatesResponse {
  rates: NbpRate[];
  fetchedAt: string;
}

const RATE_LABELS: Record<string, string> = {
  "Stopa referencyjna": "Stopa referencyjna",
  "Stopa lombardowa": "Stopa lombardowa",
  "Stopa depozytowa": "Stopa depozytowa",
  "Stopa redyskontowa weksli": "Stopa redyskontowa",
  "Stopa dyskontowa weksli": "Stopa dyskontowa",
};

export function formatRateName(name: string): string {
  return RATE_LABELS[name] || name;
}

export async function fetchNbpRates(): Promise<NbpRatesResponse | null> {
  try {
    const res = await fetch("/api/nbp/rates");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    console.warn("Failed to fetch NBP rates");
    return null;
  }
}
