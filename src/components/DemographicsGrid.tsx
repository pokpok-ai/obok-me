"use client";

import type { GusDemographics } from "@/lib/gus-api";
import { latestValue, yoyChange } from "@/lib/gus-api";
import type { ViewportStats } from "@/types";
import {
  gradeCrimeRate,
  gradeSalary,
  gradeUnemployment,
  gradePriceToIncome,
  computePriceToIncome,
  type GradeResult,
} from "@/lib/demographics-scoring";

interface DemographicsGridProps {
  data: GusDemographics | null;
  viewportStats: ViewportStats | null;
}

interface DemoCard {
  label: string;
  value: string;
  sub: string;
  grade: GradeResult | null;
  change: number | null;
}

export function DemographicsGrid({ data, viewportStats }: DemographicsGridProps) {
  if (!data) return null;

  const { population, salary, unemploymentRate, crimePer1000 } = data.data;

  const popLatest = latestValue(population);
  const salaryLatest = latestValue(salary);
  const unempLatest = latestValue(unemploymentRate);
  const crimeLatest = latestValue(crimePer1000);

  // Price-to-income ratio using viewport avg price + GUS salary
  const avgPrice = viewportStats?.avg_price_per_sqm;
  const priceToIncome =
    avgPrice && salaryLatest
      ? computePriceToIncome(avgPrice, salaryLatest.val)
      : null;

  const cards: DemoCard[] = [];

  if (crimeLatest) {
    cards.push({
      label: "Bezpieczenstwo",
      value: `${crimeLatest.val.toFixed(1)}/1k`,
      sub: `przestepstw na 1000 mieszk. (${crimeLatest.year})`,
      grade: gradeCrimeRate(crimeLatest.val),
      change: yoyChange(crimePer1000),
    });
  }

  if (salaryLatest) {
    cards.push({
      label: "Dochody",
      value: `${Math.round(salaryLatest.val).toLocaleString("pl-PL")} zl`,
      sub: `brutto/mies. (${salaryLatest.year})`,
      grade: gradeSalary(salaryLatest.val),
      change: yoyChange(salary),
    });
  }

  if (unempLatest) {
    cards.push({
      label: "Bezrobocie",
      value: `${unempLatest.val}%`,
      sub: `stopa rejestrowa (${unempLatest.year})`,
      grade: gradeUnemployment(unempLatest.val),
      change: yoyChange(unemploymentRate),
    });
  }

  if (priceToIncome) {
    cards.push({
      label: "Dostepnosc",
      value: `${priceToIncome}x`,
      sub: `rocznych pensji na 50m²`,
      grade: gradePriceToIncome(priceToIncome),
      change: null,
    });
  }

  if (popLatest) {
    cards.push({
      label: "Populacja",
      value: formatLargeNumber(popLatest.val),
      sub: `mieszkancow (${popLatest.year})`,
      grade: null,
      change: yoyChange(population),
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">
        Warszawa — wskazniki
      </p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-3"
            style={{
              backgroundColor: card.grade?.bgColor || "#f9fafb",
            }}
          >
            <p className="text-[11px] text-gray-500 mb-1.5 font-medium">
              {card.label}
            </p>

            {/* Letter grade */}
            {card.grade && (
              <span
                className="text-2xl font-black"
                style={{ color: card.grade.color }}
              >
                {card.grade.grade}
              </span>
            )}

            {/* Value + YoY change */}
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className="text-sm font-semibold"
                style={{ color: card.grade?.color || "#374151" }}
              >
                {card.value}
              </span>
              {card.change !== null && (
                <span
                  className={`text-[10px] font-medium ${
                    card.label === "Bezpieczenstwo" || card.label === "Bezrobocie"
                      ? card.change > 0
                        ? "text-red-500"
                        : "text-green-500"
                      : card.change > 0
                        ? "text-green-500"
                        : "text-red-500"
                  }`}
                >
                  {card.change > 0 ? "+" : ""}
                  {card.change}% r/r
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
              {card.sub}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-3">
        Zrodlo: GUS Bank Danych Lokalnych (CC BY 4.0)
      </p>
    </div>
  );
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("pl-PL");
}
