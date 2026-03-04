"use client";

import type { GusDemographics } from "@/lib/gus-api";
import { latestValue, yoyChange } from "@/lib/gus-api";
import type { ViewportStats } from "@/types";

interface DemographicsGridProps {
  data: GusDemographics | null;
  viewportStats: ViewportStats | null;
}

interface DemoCard {
  label: string;
  value: string;
  sub: string;
  change: number | null;
  color: string;
  icon: string;
}

export function DemographicsGrid({ data, viewportStats }: DemographicsGridProps) {
  if (!data) return null;

  const { population, salary, unemployment, crime } = data.data;

  const popLatest = latestValue(population);
  const salaryLatest = latestValue(salary);
  const unemploymentLatest = latestValue(unemployment);
  const crimeLatest = latestValue(crime);

  // Price-to-income ratio: avg apartment price / (yearly salary)
  const avgPrice = viewportStats?.avg_price_per_sqm;
  const avgArea = 50; // typical Warsaw flat ~50m²
  const yearlyIncome = salaryLatest ? salaryLatest.val * 12 : null;
  const priceToIncome =
    avgPrice && yearlyIncome
      ? ((avgPrice * avgArea) / yearlyIncome).toFixed(1)
      : null;

  const cards: DemoCard[] = [];

  if (popLatest) {
    cards.push({
      label: "Populacja",
      value: formatLargeNumber(popLatest.val),
      sub: `${popLatest.year}`,
      change: yoyChange(population),
      color: "#3b82f6",
      icon: "👤",
    });
  }

  if (salaryLatest) {
    cards.push({
      label: "Sr. wynagrodzenie",
      value: `${Math.round(salaryLatest.val).toLocaleString("pl-PL")} zl`,
      sub: `brutto/mies. ${salaryLatest.year}`,
      change: yoyChange(salary),
      color: "#059669",
      icon: "💰",
    });
  }

  if (unemploymentLatest) {
    cards.push({
      label: "Bezrobotni",
      value: formatLargeNumber(unemploymentLatest.val),
      sub: `zarejestrowani ${unemploymentLatest.year}`,
      change: yoyChange(unemployment),
      color: "#d97706",
      icon: "📊",
    });
  }

  if (crimeLatest) {
    cards.push({
      label: "Przestepstwa",
      value: formatLargeNumber(crimeLatest.val),
      sub: `stwierdzone ${crimeLatest.year}`,
      change: yoyChange(crime),
      color: "#dc2626",
      icon: "🔒",
    });
  }

  if (priceToIncome) {
    cards.push({
      label: "Cena / dochod",
      value: `${priceToIncome}x`,
      sub: `rocznych pensji na 50m²`,
      change: null,
      color: "#7c3aed",
      icon: "🏠",
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">
        Warszawa — dane demograficzne
      </p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-gray-50 p-3"
          >
            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-lg font-bold"
                style={{ color: card.color }}
              >
                {card.value}
              </span>
              {card.change !== null && (
                <span
                  className={`text-xs font-medium ${
                    card.change > 0 ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {card.change > 0 ? "+" : ""}
                  {card.change}%
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>
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
