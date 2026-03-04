"use client";

import { useState, useEffect } from "react";
import type { DistrictRanking, Filters } from "@/types";
import { fetchDistrictRankings } from "@/lib/api";

interface DistrictRankingsProps {
  filters: Filters;
  onDistrictClick?: (position: { lat: number; lng: number }) => void;
  warsawAvg: number | null;
}

export function DistrictRankings({ filters, onDistrictClick, warsawAvg }: DistrictRankingsProps) {
  const [districts, setDistricts] = useState<DistrictRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDistrictRankings(filters).then((data) => {
      if (!cancelled) {
        setDistricts(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo, filters.functionType]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
          Dzielnice Warszawy
        </p>
        <div className="flex items-center gap-2 py-8 justify-center">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Ladowanie...</span>
        </div>
      </div>
    );
  }

  if (districts.length === 0) return null;

  const maxPrice = districts[0]?.avg_price_per_sqm || 1;
  const avgCity = warsawAvg || districts.reduce((s, d) => s + d.avg_price_per_sqm, 0) / districts.length;
  const fmt = (n: number) => n.toLocaleString("pl-PL");

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-wider text-gray-400">
          Dzielnice Warszawy
        </p>
        <span className="text-[10px] text-gray-400">
          {districts.length} dzielnic
        </span>
      </div>

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {districts.map((d, i) => {
          const pct = (d.avg_price_per_sqm / maxPrice) * 100;
          const diffPct = avgCity ? Math.round(((d.avg_price_per_sqm - avgCity) / avgCity) * 100) : 0;
          const isAbove = diffPct > 0;

          // Color: green (cheap) → blue (mid) → red (expensive)
          const colorIntensity = d.avg_price_per_sqm / maxPrice;
          const barColor = colorIntensity > 0.85
            ? "#ef4444"
            : colorIntensity > 0.7
              ? "#f59e0b"
              : colorIntensity > 0.5
                ? "#3b82f6"
                : "#22c55e";

          return (
            <button
              key={d.district}
              onClick={() => onDistrictClick?.({ lat: d.center_lat, lng: d.center_lng })}
              className="w-full text-left group hover:bg-gray-50 rounded-lg p-1.5 transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-4 text-right">
                    {i + 1}.
                  </span>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">
                    {d.district}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-800">
                    {fmt(d.avg_price_per_sqm)} zl/m²
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      isAbove ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {isAbove ? "+" : ""}{diffPct}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
                <span className="text-[9px] text-gray-400 w-16 text-right">
                  {fmt(d.transaction_count)} tr.
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 mt-3">
        Zrodlo: RCN | % vs srednia Warszawy ({fmt(Math.round(avgCity))} zl/m²)
      </p>
    </div>
  );
}
