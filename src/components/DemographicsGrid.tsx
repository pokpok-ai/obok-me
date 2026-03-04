"use client";

import type { GusDemographics, GusDataPoint } from "@/lib/gus-api";
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
import { usePathLength } from "@/hooks/usePathLength";
import { useInView } from "@/hooks/useInView";

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
  sparkline: number[]; // last N values for mini chart
  invertColor?: boolean; // true = lower is better (crime, unemployment)
}

/** Mini sparkline SVG with area fill — shows last N data points */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const { ref: polyRef, length } = usePathLength<SVGPolylineElement>();

  if (data.length < 3) return null;
  const recent = data.slice(-12);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pad = 2;

  const coords = recent.map((val, i) => ({
    x: (i / (recent.length - 1)) * (w - pad * 2) + pad,
    y: h - pad - ((val - min) / range) * (h - pad * 2 - 2),
  }));

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  // Area fill path
  const areaPath = `M ${coords[0].x},${h} ${coords.map((c) => `L ${c.x},${c.y}`).join(" ")} L ${coords[coords.length - 1].x},${h} Z`;

  return (
    <svg width={w} height={h} className="shrink-0">
      <path d={areaPath} fill={color} opacity={0.1} className="animate-fade-in" style={{ animationDelay: "400ms" }} />
      <polyline
        ref={polyRef}
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.6}
        className={length ? "animate-draw-line" : ""}
        style={length ? { strokeDasharray: length, "--path-length": length } as React.CSSProperties : undefined}
      />
      {/* End dot */}
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r="2.5"
        fill={color}
        className="animate-fade-in"
        style={{ animationDelay: "600ms" }}
      />
    </svg>
  );
}

export function DemographicsGrid({ data, viewportStats }: DemographicsGridProps) {
  const { ref, inView } = useInView();
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

  const toValues = (d: GusDataPoint[] | null): number[] =>
    d ? d.map((p) => p.val) : [];

  const cards: DemoCard[] = [];

  if (crimeLatest) {
    cards.push({
      label: "Bezpieczenstwo",
      value: `${crimeLatest.val.toFixed(1)}/1k`,
      sub: `przestepstw/1000 mieszk.`,
      grade: gradeCrimeRate(crimeLatest.val),
      change: yoyChange(crimePer1000),
      sparkline: toValues(crimePer1000),
      invertColor: true,
    });
  }

  if (salaryLatest) {
    cards.push({
      label: "Dochody",
      value: `${Math.round(salaryLatest.val).toLocaleString("pl-PL")} zl`,
      sub: `brutto/mies.`,
      grade: gradeSalary(salaryLatest.val),
      change: yoyChange(salary),
      sparkline: toValues(salary),
    });
  }

  if (unempLatest) {
    cards.push({
      label: "Bezrobocie",
      value: `${unempLatest.val}%`,
      sub: `stopa rejestrowa`,
      grade: gradeUnemployment(unempLatest.val),
      change: yoyChange(unemploymentRate),
      sparkline: toValues(unemploymentRate),
      invertColor: true,
    });
  }

  if (priceToIncome !== null) {
    cards.push({
      label: "Dostepnosc",
      value: `${priceToIncome}x`,
      sub: `pensji na 50m²`,
      grade: gradePriceToIncome(priceToIncome),
      change: null,
      sparkline: [],
    });
  }

  if (popLatest) {
    cards.push({
      label: "Populacja",
      value: formatLargeNumber(popLatest.val),
      sub: `mieszkancow`,
      grade: null,
      change: yoyChange(population),
      sparkline: toValues(population),
    });
  }

  if (cards.length === 0) return null;

  return (
    <div ref={ref} data-in-view={inView} className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">
        Warszawa — wskazniki
      </p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="rounded-xl p-3 animate-fade-in-up"
            style={{
              backgroundColor: card.grade?.bgColor || "#f9fafb",
              animationDelay: `${i * 80}ms`,
            }}
          >
            {/* Top row: label + sparkline */}
            <div className="flex items-start justify-between mb-1">
              <p className="text-[11px] text-gray-500 font-medium">
                {card.label}
              </p>
              <Sparkline
                data={card.sparkline}
                color={card.grade?.color || "#6b7280"}
              />
            </div>

            {/* Grade + value row */}
            <div className="flex items-baseline gap-2">
              {card.grade && (
                <span
                  className="text-2xl font-black leading-none"
                  style={{ color: card.grade.color }}
                >
                  {card.grade.grade}
                </span>
              )}
              <span
                className="text-sm font-semibold"
                style={{ color: card.grade?.color || "#374151" }}
              >
                {card.value}
              </span>
            </div>

            {/* Sub text + YoY */}
            <div className="flex items-baseline gap-1.5 mt-1">
              <p className="text-[10px] text-gray-400 leading-tight">
                {card.sub}
              </p>
              {card.change !== null && (
                <span
                  className={`text-[10px] font-medium ${
                    card.invertColor
                      ? card.change > 0
                        ? "text-red-500"
                        : "text-green-500"
                      : card.change > 0
                        ? "text-green-500"
                        : "text-red-500"
                  }`}
                >
                  {card.change > 0 ? "+" : ""}
                  {card.change}%
                </span>
              )}
            </div>
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
