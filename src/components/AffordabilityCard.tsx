"use client";

import type { ViewportStats } from "@/types";
import type { NbpRatesResponse } from "@/lib/nbp-api";
import type { GusDemographics } from "@/lib/gus-api";
import { latestValue } from "@/lib/gus-api";
import { computeMonthlyMortgage } from "@/lib/demographics-scoring";

interface AffordabilityCardProps {
  viewportStats: ViewportStats | null;
  nbpRates: NbpRatesResponse | null;
  demographics: GusDemographics | null;
}

// Warsaw avg rent ~85 PLN/m²/month (NBP quarterly data, 2024)
const WARSAW_AVG_RENT_PER_SQM = 85;
const FLAT_AREA = 50; // typical Warsaw flat
const DOWN_PAYMENT_PCT = 0.2;
const BANK_MARGIN = 0.017; // 1.7% above reference rate
const LOAN_YEARS = 25;

export function AffordabilityCard({ viewportStats, nbpRates, demographics }: AffordabilityCardProps) {
  if (!viewportStats?.median_price_per_sqm) return null;

  const medianPricePerSqm = viewportStats.median_price_per_sqm;
  const flatPrice = medianPricePerSqm * FLAT_AREA;

  // Get NBP reference rate
  const refRate = nbpRates?.rates.find((r) =>
    r.name.toLowerCase().includes("referencyjna")
  );
  const annualRate = refRate ? (refRate.value / 100 + BANK_MARGIN) : (0.0575 + BANK_MARGIN);

  const monthlyMortgage = Math.round(
    computeMonthlyMortgage(flatPrice, DOWN_PAYMENT_PCT, annualRate, LOAN_YEARS)
  );

  // Monthly rent
  const monthlyRent = WARSAW_AVG_RENT_PER_SQM * FLAT_AREA;

  // Buy vs rent comparison
  const buyIsCheaper = monthlyMortgage < monthlyRent;

  // Salary comparison
  const salaryData = demographics?.data?.salary;
  const salaryLatest = latestValue(salaryData ?? null);
  const salaryPct = salaryLatest
    ? Math.round((monthlyMortgage / salaryLatest.val) * 100)
    : null;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">
        Dostepnosc mieszkania (50m²)
      </p>

      {/* Mortgage payment — hero */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-gray-900">
          {monthlyMortgage.toLocaleString("pl-PL")} zl
        </span>
        <span className="text-sm text-gray-400">/mies.</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Rata kredytu ({(annualRate * 100).toFixed(1)}%, {DOWN_PAYMENT_PCT * 100}% wkladu, {LOAN_YEARS} lat)
      </p>

      {/* Salary percentage bar */}
      {salaryPct !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Rata vs pensja brutto</span>
            <span
              className={`font-semibold ${
                salaryPct > 60 ? "text-red-500" : salaryPct > 40 ? "text-amber-500" : "text-green-500"
              }`}
            >
              {salaryPct}% pensji
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(salaryPct, 100)}%`,
                backgroundColor:
                  salaryPct > 60 ? "#ef4444" : salaryPct > 40 ? "#f59e0b" : "#22c55e",
              }}
            />
          </div>
        </div>
      )}

      {/* Buy vs Rent */}
      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-[11px] text-gray-500 font-medium mb-2">Kupno vs Najem</p>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`rounded-lg p-2.5 text-center ${
              buyIsCheaper
                ? "bg-green-50 ring-1 ring-green-200"
                : "bg-gray-50"
            }`}
          >
            <p className="text-[10px] text-gray-500">Rata kredytu</p>
            <p className={`text-sm font-bold ${buyIsCheaper ? "text-green-600" : "text-gray-700"}`}>
              {monthlyMortgage.toLocaleString("pl-PL")} zl
            </p>
          </div>
          <div
            className={`rounded-lg p-2.5 text-center ${
              !buyIsCheaper
                ? "bg-green-50 ring-1 ring-green-200"
                : "bg-gray-50"
            }`}
          >
            <p className="text-[10px] text-gray-500">Najem (sr. Warszawa)</p>
            <p className={`text-sm font-bold ${!buyIsCheaper ? "text-green-600" : "text-gray-700"}`}>
              {monthlyRent.toLocaleString("pl-PL")} zl
            </p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          {buyIsCheaper
            ? `Kupno korzystniejsze o ${(monthlyRent - monthlyMortgage).toLocaleString("pl-PL")} zl/mies.`
            : `Najem tanszy o ${(monthlyMortgage - monthlyRent).toLocaleString("pl-PL")} zl/mies.`
          }
        </p>
      </div>

      <p className="text-[10px] text-gray-400 mt-3">
        Cena mediany: {(flatPrice).toLocaleString("pl-PL")} zl | Najem: NBP sr. Warszawa
      </p>
    </div>
  );
}
