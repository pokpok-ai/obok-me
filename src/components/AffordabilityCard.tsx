"use client";

import type { ViewportStats } from "@/types";
import type { NbpRatesResponse } from "@/lib/nbp-api";
import type { GusDemographics } from "@/lib/gus-api";
import { latestValue } from "@/lib/gus-api";
import { computeMonthlyMortgage } from "@/lib/demographics-scoring";
import { usePathLength } from "@/hooks/usePathLength";

interface AffordabilityCardProps {
  viewportStats: ViewportStats | null;
  nbpRates: NbpRatesResponse | null;
  demographics: GusDemographics | null;
}

const WARSAW_AVG_RENT_PER_SQM = 85;
const FLAT_AREA = 50;
const DOWN_PAYMENT_PCT = 0.2;
const BANK_MARGIN = 0.017;
const LOAN_YEARS = 25;

/** Mini semicircular gauge for salary percentage */
function SalaryGauge({ pct }: { pct: number }) {
  const { ref: arcRef, length: arcLength } = usePathLength<SVGPathElement>();
  const r = 40;
  const cx = 50;
  const cy = 45;
  const startAngle = Math.PI;
  const endAngle = 0;
  const clampedPct = Math.min(pct, 100);
  const valueAngle = startAngle - (clampedPct / 100) * Math.PI;

  // Arc path
  const arcPath = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });

  const start = arcPath(startAngle);
  const end = arcPath(endAngle);
  const valuePoint = arcPath(valueAngle);

  // Color based on percentage
  const color = pct > 60 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#22c55e";
  const bgGradientId = "salary-gauge-grad";

  return (
    <svg width="100" height="55" viewBox="0 0 100 55">
      <defs>
        <linearGradient id={bgGradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Background arc */}
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
        fill="none"
        stroke={`url(#${bgGradientId})`}
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        ref={arcRef}
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${valuePoint.x} ${valuePoint.y}`}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        className={arcLength ? "animate-draw-line" : ""}
        style={arcLength ? { strokeDasharray: arcLength, "--path-length": arcLength } as React.CSSProperties : undefined}
      />
      {/* Needle dot */}
      <circle cx={valuePoint.x} cy={valuePoint.y} r="4" fill={color} stroke="white" strokeWidth="2" className="animate-fade-in" style={{ animationDelay: "500ms" }} />
      {/* Value text */}
      <text x={cx} y={cy - 5} textAnchor="middle" className="text-sm font-bold" fill={color}>
        {pct}%
      </text>
      {/* Label */}
      <text x={cx} y={cy + 8} textAnchor="middle" className="text-[8px]" fill="#9ca3af">
        pensji brutto
      </text>
    </svg>
  );
}

export function AffordabilityCard({ viewportStats, nbpRates, demographics }: AffordabilityCardProps) {
  if (!viewportStats?.median_price_per_sqm) return null;

  const medianPricePerSqm = viewportStats.median_price_per_sqm;
  const flatPrice = medianPricePerSqm * FLAT_AREA;

  const refRate = nbpRates?.rates.find((r) =>
    r.name.toLowerCase().includes("referencyjna")
  );
  const annualRate = refRate ? (refRate.value / 100 + BANK_MARGIN) : (0.0575 + BANK_MARGIN);

  const monthlyMortgage = Math.round(
    computeMonthlyMortgage(flatPrice, DOWN_PAYMENT_PCT, annualRate, LOAN_YEARS)
  );

  const monthlyRent = WARSAW_AVG_RENT_PER_SQM * FLAT_AREA;
  const buyIsCheaper = monthlyMortgage < monthlyRent;

  const salaryData = demographics?.data?.salary;
  const salaryLatest = latestValue(salaryData ?? null);
  const salaryPct = salaryLatest
    ? Math.round((monthlyMortgage / salaryLatest.val) * 100)
    : null;

  // For visual bar comparison
  const maxPayment = Math.max(monthlyMortgage, monthlyRent);

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
        Dostepnosc mieszkania (50m²)
      </p>

      {/* Top section: mortgage + salary gauge side by side */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-900">
              {monthlyMortgage.toLocaleString("pl-PL")} zl
            </span>
            <span className="text-xs text-gray-400">/mies.</span>
          </div>
          <p className="text-[11px] text-gray-400">
            Rata kredytu ({(annualRate * 100).toFixed(1)}%, {DOWN_PAYMENT_PCT * 100}% wkladu, {LOAN_YEARS} lat)
          </p>
        </div>
        {salaryPct !== null && (
          <SalaryGauge pct={salaryPct} />
        )}
      </div>

      {/* Buy vs Rent — visual bar comparison */}
      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-[11px] text-gray-500 font-medium mb-3">Kupno vs Najem</p>

        {/* Mortgage bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Rata kredytu</span>
            <span className={`font-semibold ${buyIsCheaper ? "text-green-600" : "text-gray-700"}`}>
              {monthlyMortgage.toLocaleString("pl-PL")} zl
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-bar-grow"
              style={{
                width: `${(monthlyMortgage / maxPayment) * 100}%`,
                backgroundColor: buyIsCheaper ? "#22c55e" : "#6b7280",
              }}
            />
          </div>
        </div>

        {/* Rent bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Najem (sr. Warszawa)</span>
            <span className={`font-semibold ${!buyIsCheaper ? "text-green-600" : "text-gray-700"}`}>
              {monthlyRent.toLocaleString("pl-PL")} zl
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-bar-grow"
              style={{
                width: `${(monthlyRent / maxPayment) * 100}%`,
                backgroundColor: !buyIsCheaper ? "#22c55e" : "#6b7280",
                animationDelay: "100ms",
              }}
            />
          </div>
        </div>

        {/* Result badge */}
        <div className={`mt-2 text-center text-xs font-medium px-3 py-1.5 rounded-lg ${
          buyIsCheaper
            ? "bg-green-50 text-green-700"
            : "bg-amber-50 text-amber-700"
        }`}>
          {buyIsCheaper
            ? `Kupno korzystniejsze o ${(monthlyRent - monthlyMortgage).toLocaleString("pl-PL")} zl/mies.`
            : `Najem tanszy o ${(monthlyMortgage - monthlyRent).toLocaleString("pl-PL")} zl/mies.`
          }
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-3">
        Cena mediany: {flatPrice.toLocaleString("pl-PL")} zl | Najem: NBP sr. Warszawa
      </p>
    </div>
  );
}
