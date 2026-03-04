"use client";

import { useState } from "react";
import type { GusDemographics, GusDataPoint } from "@/lib/gus-api";
import { latestValue, yoyChange } from "@/lib/gus-api";
import type { NbpRatesResponse } from "@/lib/nbp-api";
import type { ViewportStats } from "@/types";
import type { InsightsData } from "@/types";
import {
  gradeCrimeRate,
  gradeSalary,
  gradeUnemployment,
  gradePriceToIncome,
  computePriceToIncome,
  type GradeResult,
} from "@/lib/demographics-scoring";

interface MarketFactorsProps {
  demographics: GusDemographics | null;
  nbpRates: NbpRatesResponse | null;
  viewportStats: ViewportStats | null;
  insights: InsightsData;
}

type Tab = "growth" | "decline";

interface Factor {
  label: string;
  value: string;
  grade: GradeResult | null;
  sparkline: number[];
  explanation: string;
  invertSparkline?: boolean; // true = downward trend is good
}

/** Mini sparkline SVG */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 3) return null;
  const recent = data.slice(-10);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const pad = 2;

  const points = recent
    .map((val, i) => {
      const x = (i / (recent.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((val - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0 opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function toValues(d: GusDataPoint[] | null): number[] {
  return d ? d.map((p) => p.val) : [];
}

export function MarketFactors({ demographics, nbpRates, viewportStats, insights }: MarketFactorsProps) {
  const [tab, setTab] = useState<Tab>("growth");

  if (!demographics) return null;

  const { population, salary, unemploymentRate, crimePer1000 } = demographics.data;

  const salaryLatest = latestValue(salary);
  const unempLatest = latestValue(unemploymentRate);
  const crimeLatest = latestValue(crimePer1000);
  const popLatest = latestValue(population);

  const avgPrice = viewportStats?.avg_price_per_sqm;
  const priceToIncome =
    avgPrice && salaryLatest
      ? computePriceToIncome(avgPrice, salaryLatest.val)
      : null;

  const refRate = nbpRates?.rates.find((r) =>
    r.name.toLowerCase().includes("referencyjna")
  );

  // Price trend from insights
  const priceTrends = insights.priceTrends;
  const priceValues = priceTrends.map((p) => p.avg_price_per_sqm);
  const priceYoY = insights.yoyChange?.pct_change;

  // Classify factors
  const growthFactors: Factor[] = [];
  const declineFactors: Factor[] = [];

  // 1. Unemployment — low = growth driver
  if (unempLatest) {
    const grade = gradeUnemployment(unempLatest.val);
    const change = yoyChange(unemploymentRate);
    if (grade.grade === "A" || grade.grade === "B") {
      growthFactors.push({
        label: "Bezrobocie",
        value: `${unempLatest.val}%`,
        grade,
        sparkline: toValues(unemploymentRate),
        explanation: "Niskie bezrobocie = silny rynek pracy, wysoki popyt",
        invertSparkline: true,
      });
    } else {
      declineFactors.push({
        label: "Bezrobocie",
        value: `${unempLatest.val}%`,
        grade,
        sparkline: toValues(unemploymentRate),
        explanation: "Wysokie bezrobocie = slabszy popyt na mieszkania",
      });
    }
  }

  // 2. Crime rate — low = growth driver
  if (crimeLatest) {
    const grade = gradeCrimeRate(crimeLatest.val);
    if (grade.grade === "A" || grade.grade === "B") {
      growthFactors.push({
        label: "Bezpieczenstwo",
        value: `${crimeLatest.val.toFixed(0)}/1k`,
        grade,
        sparkline: toValues(crimePer1000),
        explanation: "Niska przestepczosc = atrakcyjna lokalizacja",
        invertSparkline: true,
      });
    } else {
      declineFactors.push({
        label: "Przestepczosc",
        value: `${crimeLatest.val.toFixed(0)}/1k`,
        grade,
        sparkline: toValues(crimePer1000),
        explanation: "Wysoka przestepczosc obniza atrakcyjnosc",
      });
    }
  }

  // 3. Salary growth — high growth = growth driver
  if (salaryLatest) {
    const grade = gradeSalary(salaryLatest.val);
    const change = yoyChange(salary);
    if (grade.grade === "A" || grade.grade === "B") {
      growthFactors.push({
        label: "Wzrost wynagrodzen",
        value: change !== null ? `+${change}% r/r` : `${Math.round(salaryLatest.val).toLocaleString("pl-PL")} zl`,
        grade,
        sparkline: toValues(salary),
        explanation: "Rosnace zarobki zwiekszaja sile nabywcza",
      });
    } else {
      declineFactors.push({
        label: "Niskie dochody",
        value: `${Math.round(salaryLatest.val).toLocaleString("pl-PL")} zl`,
        grade,
        sparkline: toValues(salary),
        explanation: "Niskie zarobki ograniczaja popyt",
      });
    }
  }

  // 4. Population trend
  if (popLatest) {
    const change = yoyChange(population);
    if (change !== null && change >= 0) {
      growthFactors.push({
        label: "Populacja",
        value: change > 0 ? `+${change}% r/r` : "stabilna",
        grade: null,
        sparkline: toValues(population),
        explanation: "Stabilna/rosnaca populacja utrzymuje popyt",
      });
    } else if (change !== null && change < -0.5) {
      declineFactors.push({
        label: "Spadek populacji",
        value: `${change}% r/r`,
        grade: null,
        sparkline: toValues(population),
        explanation: "Spadek mieszkancow = malejacy popyt",
      });
    }
  }

  // 5. Price-to-income — high = decline factor
  if (priceToIncome !== null) {
    const grade = gradePriceToIncome(priceToIncome);
    if (grade.grade === "D" || grade.grade === "F") {
      declineFactors.push({
        label: "Dostepnosc mieszkan",
        value: `${priceToIncome}x pensji`,
        grade,
        sparkline: [],
        explanation: "Wysoki wskaznik cena/dochod ogranicza popyt",
      });
    } else if (grade.grade === "A" || grade.grade === "B") {
      growthFactors.push({
        label: "Dostepnosc mieszkan",
        value: `${priceToIncome}x pensji`,
        grade,
        sparkline: [],
        explanation: "Dobra relacja ceny do dochodu przyciaga kupujacych",
      });
    }
  }

  // 6. Interest rates — high = decline factor
  if (refRate) {
    if (refRate.value > 5) {
      declineFactors.push({
        label: "Stopy procentowe",
        value: `${refRate.value}%`,
        grade: { grade: "D", color: "#ea580c", bgColor: "#fff7ed" },
        sparkline: [],
        explanation: "Wysokie stopy = drogie kredyty, mniejszy popyt",
      });
    } else if (refRate.value <= 3) {
      growthFactors.push({
        label: "Stopy procentowe",
        value: `${refRate.value}%`,
        grade: { grade: "A", color: "#16a34a", bgColor: "#f0fdf4" },
        sparkline: [],
        explanation: "Niskie stopy = tanie kredyty, wiekszy popyt",
      });
    }
  }

  // 7. Price trend — rising = growth, falling = decline
  if (priceYoY !== null && priceYoY !== undefined) {
    if (priceYoY > 0) {
      growthFactors.push({
        label: "Trend cenowy",
        value: `+${priceYoY}% r/r`,
        grade: null,
        sparkline: priceValues,
        explanation: "Rosnace ceny potwierdzaja silny popyt",
      });
    } else {
      declineFactors.push({
        label: "Trend cenowy",
        value: `${priceYoY}% r/r`,
        grade: null,
        sparkline: priceValues,
        explanation: "Spadajace ceny sygnalizuja slabszy popyt",
      });
    }
  }

  const factors = tab === "growth" ? growthFactors : declineFactors;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
        Czynniki rynkowe
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab("growth")}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            tab === "growth"
              ? "bg-green-50 text-green-700 ring-1 ring-green-200"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          Wzrost ({growthFactors.length})
        </button>
        <button
          onClick={() => setTab("decline")}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            tab === "decline"
              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          Hamowanie ({declineFactors.length})
        </button>
      </div>

      {/* Factor cards */}
      <div className="grid grid-cols-2 gap-3">
        {factors.map((factor) => (
          <div
            key={factor.label}
            className="rounded-xl bg-gray-50 p-3 relative group"
          >
            {/* Sparkline top-right */}
            {factor.sparkline.length > 2 && (
              <div className="float-right ml-1">
                <Sparkline
                  data={factor.sparkline}
                  color={tab === "growth" ? "#22c55e" : "#ef4444"}
                />
              </div>
            )}

            {/* Grade */}
            {factor.grade && (
              <span
                className="text-xl font-black"
                style={{ color: factor.grade.color }}
              >
                {factor.grade.grade}
              </span>
            )}

            {/* Value */}
            <p
              className={`text-lg font-bold ${
                tab === "growth" ? "text-green-600" : "text-red-500"
              }`}
            >
              {factor.value}
            </p>

            {/* Label */}
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              {factor.label}
            </p>

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {factor.explanation}
            </div>
          </div>
        ))}
      </div>

      {factors.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">
          Brak czynnikow w tej kategorii
        </p>
      )}
    </div>
  );
}
