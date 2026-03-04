"use client";

import type { NbpRatesResponse } from "@/lib/nbp-api";
import { formatRateName } from "@/lib/nbp-api";
import { useInView } from "@/hooks/useInView";

interface InterestRateCardProps {
  data: NbpRatesResponse | null;
}

export function InterestRateCard({ data }: InterestRateCardProps) {
  const { ref, inView } = useInView();
  if (!data || data.rates.length === 0) return null;

  const refRate = data.rates.find((r) =>
    r.name.toLowerCase().includes("referencyjna")
  );
  const lombard = data.rates.find((r) =>
    r.name.toLowerCase().includes("lombardowa")
  );
  const deposit = data.rates.find((r) =>
    r.name.toLowerCase().includes("depozytowa")
  );

  const maxRate = lombard?.value || 7;

  return (
    <div ref={ref} data-in-view={inView} className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-gray-400">Stopy procentowe NBP</p>
        {refRate && (
          <span className="text-xs text-gray-400">
            od {formatDate(refRate.effectiveDate)}
          </span>
        )}
      </div>

      {/* Hero rate with visual gauge */}
      {refRate && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-blue-600">
              {refRate.value.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-400">referencyjna</span>
          </div>

          {/* Rate corridor visualization — full-width gradient */}
          <div className="relative h-8 rounded-lg overflow-hidden animate-fade-in">
            {/* Full-width gradient background */}
            <div
              className="absolute inset-0 rounded-lg"
              style={{
                background: "linear-gradient(90deg, #dbeafe 0%, #3b82f6 50%, #fecaca 100%)",
                opacity: 0.3,
              }}
            />
            {/* Reference rate marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-600 animate-fade-in"
              style={{ left: `${(refRate.value / maxRate) * 100}%`, animationDelay: "300ms" }}
            />
            <div
              className="absolute -top-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow animate-fade-in"
              style={{ left: `calc(${(refRate.value / maxRate) * 100}% - 6px)`, animationDelay: "300ms" }}
            />
            {/* Scale labels */}
            <span className="absolute bottom-0.5 left-1 text-[9px] text-gray-400">0%</span>
            <span className="absolute bottom-0.5 right-1 text-[9px] text-gray-400">{maxRate}%</span>
          </div>
        </div>
      )}

      {/* Rate bars */}
      <div className="space-y-2.5">
        {[deposit, refRate, lombard].filter(Boolean).map((rate, i) => (
          <div key={rate!.name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">{formatRateName(rate!.name)}</span>
              <span className="font-semibold text-gray-800">{rate!.value.toFixed(2)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-bar-grow"
                style={{
                  width: `${(rate!.value / maxRate) * 100}%`,
                  backgroundColor: rate === refRate ? "#3b82f6" : rate === deposit ? "#22c55e" : "#f59e0b",
                  animationDelay: `${i * 100}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 mt-3">
        Zrodlo: Narodowy Bank Polski
      </p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}
