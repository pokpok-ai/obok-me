"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { InsightsData } from "@/types";
import { computeMarketScore, getMarketSignal, getMarketCategory } from "@/lib/market-score";
import { generateForecast } from "@/lib/forecast";

const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

interface MarketGaugeProps {
  insights: InsightsData;
}

export function MarketGauge({ insights }: MarketGaugeProps) {
  const score = useMemo(
    () =>
      computeMarketScore(
        insights.priceTrends,
        insights.volumeTrends,
        insights.yoyChange
      ),
    [insights.priceTrends, insights.volumeTrends, insights.yoyChange]
  );

  const forecast = useMemo(() => generateForecast(insights.priceTrends, 5), [insights.priceTrends]);

  if (score === null) return null;

  const signal = getMarketSignal(score);
  const category = getMarketCategory(score);

  // Generate forecast description text
  const forecastText = useMemo(() => {
    if (forecast.length === 0 || insights.priceTrends.length < 3) return null;

    const lastHistorical = insights.priceTrends[insights.priceTrends.length - 1];
    const lastForecast = forecast[forecast.length - 1];
    const pctChange = Math.round(
      ((lastForecast.avg_price_per_sqm - lastHistorical.avg_price_per_sqm) / lastHistorical.avg_price_per_sqm) * 100
    );

    const monthNames = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "wrzesnia", "pazdziernika", "listopada", "grudnia"];
    const [, m] = lastForecast.month.split("-").map(Number);
    const targetMonth = monthNames[m - 1] || lastForecast.month;

    if (Math.abs(pctChange) < 1) {
      return `Do ${targetMonth} ceny powinny pozostac stabilne w tym obszarze.`;
    }

    const direction = pctChange > 0 ? "wzrosnac" : "spasc";
    return `Do ${targetMonth} prognozujemy ${direction} cen o ${Math.abs(pctChange)}% w tym obszarze.`;
  }, [forecast, insights.priceTrends]);

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      {/* Header — market type + signal badge */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">{category.label}</h3>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ color: signal.color, backgroundColor: signal.bgColor }}
        >
          {signal.label}
        </span>
      </div>

      {/* Gauge + forecast text side by side */}
      <div className="flex items-center gap-4">
        <div className="w-[180px] shrink-0 -mb-3">
          <GaugeComponent
            type="semicircle"
            value={score}
            minValue={0}
            maxValue={100}
            arc={{
              colorArray: ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"],
              subArcs: [
                { limit: 20 },
                { limit: 40 },
                { limit: 60 },
                { limit: 80 },
                {},
              ],
              padding: 0.02,
              width: 0.2,
            }}
            pointer={{
              type: "needle",
              color: "#374151",
              length: 0.7,
              width: 12,
              animate: true,
              animationDuration: 1500,
            }}
            labels={{
              valueLabel: { hide: true },
              tickLabels: {
                type: "outer",
                ticks: [{ value: 0 }, { value: 50 }, { value: 100 }],
                defaultTickValueConfig: { hide: true },
              },
            }}
            marginInPercent={{ top: 0.08, bottom: 0, left: 0.08, right: 0.08 }}
          />
          {/* Bottom labels */}
          <div className="flex justify-between text-[10px] text-gray-400 px-1 -mt-1">
            <span className="text-green-600">Zakup</span>
            <span className="text-yellow-600">Stabilnie</span>
            <span className="text-red-600">Sprzedaz</span>
          </div>
        </div>

        {/* Forecast text */}
        {forecastText && (
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Prognoza</p>
            <p className="text-sm text-gray-700 leading-relaxed italic">{forecastText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
