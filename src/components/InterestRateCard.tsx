"use client";

import type { NbpRatesResponse } from "@/lib/nbp-api";
import { formatRateName } from "@/lib/nbp-api";

interface InterestRateCardProps {
  data: NbpRatesResponse | null;
}

export function InterestRateCard({ data }: InterestRateCardProps) {
  if (!data || data.rates.length === 0) return null;

  // Find the reference rate (stopa referencyjna)
  const refRate = data.rates.find((r) =>
    r.name.toLowerCase().includes("referencyjna")
  );

  // Show key rates: referencyjna, lombardowa, depozytowa
  const keyRates = data.rates.filter((r) =>
    ["referencyjna", "lombardowa", "depozytowa"].some((k) =>
      r.name.toLowerCase().includes(k)
    )
  );

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
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
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">
              {refRate.value.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-400">referencyjna</span>
          </div>
        </div>
      )}

      {/* Other key rates */}
      <div className="space-y-2">
        {keyRates
          .filter((r) => r !== refRate)
          .map((rate) => (
            <div
              key={rate.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-600">{formatRateName(rate.name)}</span>
              <span className="font-semibold text-gray-900">
                {rate.value.toFixed(2)}%
              </span>
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
