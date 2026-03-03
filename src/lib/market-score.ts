import type { PriceTrend, VolumeTrend, YoYChange } from "@/types";

/**
 * Compute market score (0-100) from price trends, volume trends, and YoY change.
 *
 * 0-20:  Strong buyer's market (prices dropping fast)
 * 20-40: Buyer's market
 * 40-60: Balanced market
 * 60-80: Seller's market
 * 80-100: Strong seller's market (prices rising fast)
 */
export function computeMarketScore(
  priceTrends: PriceTrend[],
  volumeTrends: VolumeTrend[],
  yoyChange: YoYChange | null
): number | null {
  if (priceTrends.length < 3) return null;

  // 1. Price trend slope (last 6 months) — normalized to -1..+1
  const recent = priceTrends.slice(-6);
  const firstPrice = recent[0].avg_price_per_sqm;
  const lastPrice = recent[recent.length - 1].avg_price_per_sqm;
  const pricePctChange = firstPrice > 0 ? (lastPrice - firstPrice) / firstPrice : 0;
  // Clamp to ±20% range, map to -1..+1
  const priceSignal = Math.max(-1, Math.min(1, pricePctChange / 0.2));

  // 2. Volume trend (last 6 months) — rising volume = seller pressure
  let volumeSignal = 0;
  if (volumeTrends.length >= 3) {
    const recentVol = volumeTrends.slice(-6);
    const firstVol = recentVol[0].transaction_count;
    const lastVol = recentVol[recentVol.length - 1].transaction_count;
    const volChange = firstVol > 0 ? (lastVol - firstVol) / firstVol : 0;
    volumeSignal = Math.max(-1, Math.min(1, volChange / 0.5));
  }

  // 3. YoY change — direct signal
  let yoySignal = 0;
  if (yoyChange?.pct_change != null) {
    yoySignal = Math.max(-1, Math.min(1, yoyChange.pct_change / 20));
  }

  // Weighted composite: price trend 50%, YoY 30%, volume 20%
  const composite = priceSignal * 0.5 + yoySignal * 0.3 + volumeSignal * 0.2;

  // Map -1..+1 to 0..100
  return Math.round((composite + 1) * 50);
}

export interface MarketSignal {
  label: string;
  color: string;
  bgColor: string;
}

export function getMarketSignal(score: number): MarketSignal {
  if (score <= 20) return { label: "SILNY ZAKUP", color: "#16a34a", bgColor: "#f0fdf4" };
  if (score <= 40) return { label: "ZAKUP", color: "#22c55e", bgColor: "#f0fdf4" };
  if (score <= 60) return { label: "NEUTRALNY", color: "#ca8a04", bgColor: "#fefce8" };
  if (score <= 80) return { label: "SPRZEDAZ", color: "#ea580c", bgColor: "#fff7ed" };
  return { label: "SILNA SPRZEDAZ", color: "#dc2626", bgColor: "#fef2f2" };
}

export function getMarketCategory(score: number): {
  label: string;
  description: string;
} {
  if (score <= 35) return { label: "Rynek kupujacego", description: "Ceny spadaja" };
  if (score <= 65) return { label: "Rynek zrownowazony", description: "Stabilnie" };
  return { label: "Rynek sprzedajacego", description: "Ceny rosna" };
}
