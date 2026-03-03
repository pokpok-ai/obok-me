import type { PriceTrend } from "@/types";

/**
 * Simple linear regression on monthly price trend data.
 * Returns slope (PLN/m² per month) and intercept.
 */
function linearRegression(data: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (const { x, y } of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² coefficient
  const meanY = sumY / n;
  const ssTot = data.reduce((s, d) => s + (d.y - meanY) ** 2, 0);
  const ssRes = data.reduce((s, d) => s + (d.y - (slope * d.x + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

export interface ForecastPoint {
  month: string;
  avg_price_per_sqm: number;
}

/**
 * Generate 5-month price forecast from historical price trends.
 * Uses last 12 months of data for regression.
 */
export function generateForecast(
  trends: PriceTrend[],
  months: number = 5
): ForecastPoint[] {
  if (trends.length < 3) return [];

  // Use last 12 months for regression
  const recent = trends.slice(-12);
  const data = recent.map((t, i) => ({
    x: i,
    y: t.avg_price_per_sqm,
  }));

  const { slope, intercept, r2 } = linearRegression(data);

  // Don't forecast if R² is extremely low (essentially random)
  if (r2 < 0.01) return [];

  const lastIdx = data.length - 1;
  const lastMonth = recent[recent.length - 1].month; // "YYYY-MM"

  const forecast: ForecastPoint[] = [];
  for (let i = 1; i <= months; i++) {
    const predictedPrice = slope * (lastIdx + i) + intercept;
    // Don't allow negative prices
    if (predictedPrice <= 0) break;

    const nextMonth = addMonths(lastMonth, i);
    forecast.push({
      month: nextMonth,
      avg_price_per_sqm: Math.round(predictedPrice),
    });
  }

  return forecast;
}

function addMonths(yearMonth: string, count: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const date = new Date(y, m - 1 + count, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
