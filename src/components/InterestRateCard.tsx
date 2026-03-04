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

  // Corridor-focused scale: spread deposit→lombard across full width
  const depVal = deposit?.value || 0;
  const lomVal = lombard?.value || 7;
  const scaleMin = Math.max(0, depVal - 1);
  const scaleMax = lomVal + 1;
  const scaleRange = scaleMax - scaleMin || 1;
  const pos = (v: number) => ((v - scaleMin) / scaleRange) * 100;

  const rates = [deposit, refRate, lombard].filter(Boolean) as typeof data.rates;
  const rateColors: Record<string, string> = {
    deposit: "#22c55e",
    ref: "#3b82f6",
    lombard: "#f59e0b",
  };
  const rateType = (r: typeof rates[0]) =>
    r === deposit ? "deposit" : r === refRate ? "ref" : "lombard";

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

      {/* Hero rate */}
      {refRate && (
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-blue-600">
            {refRate.value.toFixed(2)}%
          </span>
          <span className="text-sm text-gray-400">referencyjna</span>
        </div>
      )}

      {/* Corridor visualization */}
      <div className="relative h-10 bg-gray-50 rounded-lg animate-fade-in mb-4">
        {/* Full-width gradient corridor band */}
        <div
          className="absolute inset-1.5 rounded-md animate-fade-in"
          style={{
            background: "linear-gradient(90deg, #dcfce7 0%, #dbeafe 50%, #fef3c7 100%)",
          }}
        />
        {/* Rate tick marks */}
        {rates.map((rate, i) => {
          const color = rateColors[rateType(rate)];
          const p = pos(rate.value);
          const isRef = rate === refRate;
          return (
            <div key={rate.name} className="animate-fade-in" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
              <div
                className="absolute top-0 bottom-0 w-0.5"
                style={{ left: `${p}%`, backgroundColor: color }}
              />
              <div
                className="absolute w-3 h-3 rounded-full border-2 border-white shadow"
                style={{
                  left: `${p}%`,
                  top: isRef ? "2px" : "50%",
                  transform: `translateX(-50%)${isRef ? "" : " translateY(-50%)"}`,
                  backgroundColor: color,
                  width: isRef ? "14px" : "10px",
                  height: isRef ? "14px" : "10px",
                }}
              />
              <span
                className="absolute text-[9px] font-semibold"
                style={{
                  left: `${p}%`,
                  bottom: "1px",
                  transform: "translateX(-50%)",
                  color,
                }}
              >
                {rate.value.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Rate legend */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
        {rates.map((rate) => (
          <div key={rate.name} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: rateColors[rateType(rate)] }}
            />
            <span>{formatRateName(rate.name)}</span>
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
