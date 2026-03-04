"use client";

import { useState, useEffect, useCallback } from "react";
import type { ViewportStats, WarsawStats, InsightsData, VolumeTrend } from "@/types";
import type { NbpRatesResponse } from "@/lib/nbp-api";
import type { GusDemographics } from "@/lib/gus-api";
import { formatPricePerSqm, formatPLN } from "@/lib/formatters";
import { useCountUp } from "@/hooks/useCountUp";
import { usePathLength } from "@/hooks/usePathLength";
import { useInView } from "@/hooks/useInView";
import { PriceTrendChart } from "./PriceTrendChart";
import { MarketGauge } from "./MarketGauge";
import { InterestRateCard } from "./InterestRateCard";
import { DemographicsGrid } from "./DemographicsGrid";
import { AffordabilityCard } from "./AffordabilityCard";
import { MarketFactors } from "./MarketFactors";
import { DistrictRankings } from "./DistrictRankings";
import type { Filters } from "@/types";

interface AnalyticsSidebarProps {
  stats: ViewportStats | null;
  warsawStats: WarsawStats | null;
  insights: InsightsData;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  transactionCount: number;
  nbpRates: NbpRatesResponse | null;
  demographics: GusDemographics | null;
  filters: Filters;
  onDistrictClick?: (position: { lat: number; lng: number }) => void;
}

type Section = "floor" | "rooms" | "area" | "volume" | "parties";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

// --- Card wrapper ---
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} data-in-view={inView} className={`rounded-2xl bg-white shadow-sm border border-gray-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

// --- Sub-components ---

function MiniBar({ value, max, color = "#3b82f6", index = 0 }: { value: number; max: number; color?: string; index?: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full animate-bar-grow" style={{ width: `${pct}%`, backgroundColor: color, animationDelay: `${index * 50}ms` }} />
    </div>
  );
}

function KeyStatsCard({ stats, warsawStats, transactionCount, yoy }: { stats: ViewportStats | null; warsawStats: WarsawStats | null; transactionCount: number; yoy: InsightsData["yoyChange"] }) {
  const heroFormatter = useCallback((n: number) => formatCompact(n), []);
  const heroDisplay = useCountUp(stats?.avg_price_per_sqm || 0, 800, heroFormatter);

  if (!stats) return null;

  const yoyUp = yoy?.pct_change != null ? yoy.pct_change > 0 : null;
  const viewportAvg = stats.avg_price_per_sqm;
  const warsawAvg = warsawStats?.avg_price_per_sqm;
  const pctDiff = viewportAvg && warsawAvg ? Math.round(((viewportAvg - warsawAvg) / warsawAvg) * 100) : null;
  const isAbove = pctDiff != null && pctDiff > 0;

  return (
    <Card>
      {/* Main price — hero number */}
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Srednia cena w tym obszarze</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">
          {viewportAvg ? heroDisplay : "—"}
        </span>
        <span className="text-sm text-gray-400">zl/m²</span>
        {yoy?.pct_change != null && (
          <span className={`text-sm font-semibold ${yoyUp ? "text-red-500" : "text-green-500"}`}>
            {yoyUp ? "↑" : "↓"} {Math.abs(yoy.pct_change)}% r/r
          </span>
        )}
      </div>

      {/* Warsaw average comparison */}
      {warsawAvg && viewportAvg && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((viewportAvg / Math.max(viewportAvg, warsawAvg)) * 100, 100)}%` }} />
            {/* Warsaw marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-500"
              style={{ left: `${(warsawAvg / Math.max(viewportAvg, warsawAvg)) * 100}%` }}
            />
          </div>
          <div className="text-right shrink-0">
            {pctDiff != null && (
              <span className={`text-sm font-bold ${isAbove ? "text-red-500" : "text-green-500"}`}>
                {isAbove ? "+" : ""}{pctDiff}%
              </span>
            )}
          </div>
        </div>
      )}
      {warsawAvg && (
        <p className="text-xs text-gray-400 mt-1">
          Srednia Warszawy: <span className="font-medium text-gray-600">{formatPricePerSqm(warsawAvg)}</span>
        </p>
      )}

      {/* Secondary stats row */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Mediana</p>
          <p className="text-lg font-semibold text-gray-800">
            {stats.median_price_per_sqm ? formatCompact(stats.median_price_per_sqm) : "—"}
          </p>
          <p className="text-[11px] text-gray-400">zl/m²</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Transakcje</p>
          <p className="text-lg font-semibold text-blue-600">{formatCompact(stats.total_count)}</p>
          <p className="text-[11px] text-gray-400">{transactionCount} na mapie</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Zakres cen</p>
          <p className="text-lg font-semibold text-gray-800">
            {stats.min_price && stats.max_price
              ? `${formatCompact(stats.min_price)}`
              : "—"}
          </p>
          <p className="text-[11px] text-gray-400">
            {stats.min_price && stats.max_price
              ? `do ${formatCompact(stats.max_price)} zl`
              : ""}
          </p>
        </div>
      </div>
    </Card>
  );
}

function VolumeSparklineCard({ data }: { data: VolumeTrend[] }) {
  const { ref: polyRef, length } = usePathLength<SVGPolylineElement>();

  if (data.length < 2) return null;
  const recent = data.slice(-12);
  const values = recent.map((d) => d.transaction_count);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 140;
  const h = 32;

  const points = recent.map((d, i) => {
    const x = (i / (recent.length - 1)) * w;
    const y = h - ((d.transaction_count - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Wolumen miesiecznie</p>
          <p className="text-2xl font-bold text-emerald-600">{values[values.length - 1]}</p>
          <p className="text-xs text-gray-400">transakcji/mies.</p>
        </div>
        <svg width={w} height={h} className="shrink-0">
          <polyline
            ref={polyRef}
            points={points}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinejoin="round"
            className={length ? "animate-draw-line" : ""}
            style={length ? { strokeDasharray: length, "--path-length": length } as React.CSSProperties : undefined}
          />
        </svg>
      </div>
    </Card>
  );
}

function PriceTrendCard({ data }: { data: InsightsData["priceTrends"] }) {
  if (data.length < 2) return null;

  const recent = data.slice(-6);
  const primaryAvg = recent.filter((d) => d.market_primary_avg).map((d) => d.market_primary_avg!);
  const secondaryAvg = recent.filter((d) => d.market_secondary_avg).map((d) => d.market_secondary_avg!);
  const pAvg = primaryAvg.length > 0 ? primaryAvg.reduce((a, b) => a + b, 0) / primaryAvg.length : 0;
  const sAvg = secondaryAvg.length > 0 ? secondaryAvg.reduce((a, b) => a + b, 0) / secondaryAvg.length : 0;
  const hasMarketBreakdown = pAvg > 0 || sAvg > 0;
  const total = pAvg + sAvg;
  const pPct = total > 0 ? Math.round((pAvg / total) * 100) : 50;

  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Trend cen (miesieczny)</p>
      <PriceTrendChart data={data} height={140} />
      {hasMarketBreakdown && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Rynek pierwotny vs wtorny</p>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
            <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${pPct}%` }} />
            <div className="bg-blue-500 rounded-r-full transition-all" style={{ width: `${100 - pPct}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600">Pierwotny</span>
              <span className="font-semibold">{pAvg > 0 ? formatPricePerSqm(pAvg) : "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">Wtorny</span>
              <span className="font-semibold">{sAvg > 0 ? formatPricePerSqm(sAvg) : "—"}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function FloorSection({ data }: { data: InsightsData["floorAnalysis"] }) {
  if (data.length === 0) return <EmptyHint />;
  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));
  const best = data.reduce((a, b) => (b.avg_price_per_sqm > a.avg_price_per_sqm ? b : a));
  const filtered = data.filter((d) => d.floor >= 0 && d.floor <= 20);

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-gray-400">Cena wg pietra</p>
        <span className="text-xs text-blue-600 font-medium">
          Najdrozsze: {best.floor === 0 ? "parter" : `${best.floor}p.`} — {formatPricePerSqm(best.avg_price_per_sqm)}
        </span>
      </div>
      <div className="space-y-2">
        {filtered.map((d, i) => (
          <div key={d.floor} className="flex items-center gap-3 text-sm">
            <span className="w-12 text-gray-500 shrink-0 font-medium">{d.floor === 0 ? "Parter" : `${d.floor}p.`}</span>
            <MiniBar value={d.avg_price_per_sqm} max={maxAvg} color={d.floor === 0 ? "#9ca3af" : d.floor <= 3 ? "#60a5fa" : "#3b82f6"} index={i} />
            <span className="w-24 text-right shrink-0 font-semibold">{formatPricePerSqm(d.avg_price_per_sqm)}</span>
            <span className="w-10 text-right text-gray-400 shrink-0 text-xs">{d.transaction_count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RoomsSection({ data }: { data: InsightsData["roomsAnalysis"] }) {
  if (data.length === 0) return <EmptyHint />;
  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));
  const labels: Record<number, string> = { 1: "Kawalerka", 2: "2-pokojowe", 3: "3-pokojowe", 4: "4-pokojowe", 5: "5-pokojowe", 6: "6+ pokoi" };

  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Cena wg liczby pokoi</p>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.rooms} className="flex items-center gap-3 text-sm">
            <span className="w-24 text-gray-500 shrink-0 font-medium">{labels[d.rooms] || `${d.rooms} pok.`}</span>
            <MiniBar value={d.avg_price_per_sqm} max={maxAvg} color="#8b5cf6" index={i} />
            <span className="w-24 text-right shrink-0 font-semibold">{formatPricePerSqm(d.avg_price_per_sqm)}</span>
            <span className="w-10 text-right text-gray-400 shrink-0 text-xs">{d.transaction_count}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-6 gap-y-1">
        {data.map((d) => (
          <div key={`d-${d.rooms}`} className="flex justify-between text-xs text-gray-400">
            <span>{labels[d.rooms] || `${d.rooms} pok.`}</span>
            <span>sr. {d.avg_area.toFixed(0)} m² | {formatPLN(d.avg_total_price)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AreaSection({ data }: { data: InsightsData["areaAnalysis"] }) {
  if (data.length === 0) return <EmptyHint />;
  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));

  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Cena/m² wg metrazu</p>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.area_bucket} className="flex items-center gap-3 text-sm">
            <span className="w-20 text-gray-500 shrink-0 font-medium">{d.area_bucket}</span>
            <MiniBar value={d.avg_price_per_sqm} max={maxAvg} color="#f59e0b" index={i} />
            <span className="w-24 text-right shrink-0 font-semibold">{formatPricePerSqm(d.avg_price_per_sqm)}</span>
            <span className="w-10 text-right text-gray-400 shrink-0 text-xs">{d.transaction_count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function VolumeSection({ data }: { data: InsightsData["volumeTrends"] }) {
  if (data.length === 0) return <EmptyHint />;
  const maxCount = Math.max(...data.map((d) => d.transaction_count));
  const shown = data.slice(-12);

  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Wolumen (ostatnie {shown.length} mies.)</p>
      <div className="space-y-1.5">
        {shown.map((d, i) => (
          <div key={d.month} className="flex items-center gap-3 text-sm">
            <span className="w-16 text-gray-500 shrink-0 font-medium">{d.month}</span>
            <MiniBar value={d.transaction_count} max={maxCount} color="#10b981" index={i} />
            <span className="w-10 text-right shrink-0 font-semibold">{d.transaction_count}</span>
            <span className="w-24 text-right text-gray-400 shrink-0 text-xs">sr. {formatPLN(d.avg_price)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PartiesSection({ data }: { data: InsightsData["partyAnalysis"] }) {
  if (data.length === 0) return <EmptyHint />;
  const labels: Record<string, string> = {
    osobaFizyczna: "Osoba fizyczna",
    osobaPrawna: "Osoba prawna",
    jednostkaSamorzaduTerytorialnego: "Samorzad",
    jednostkaSamorz: "Samorzad",
    skarbPanstwa: "Skarb Panstwa",
  };

  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Transakcje wg stron</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left py-2 font-medium text-xs">Kupujacy</th>
            <th className="text-left py-2 font-medium text-xs">Sprzedajacy</th>
            <th className="text-right py-2 font-medium text-xs">Sr. cena</th>
            <th className="text-right py-2 font-medium text-xs">Ile</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((d, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="py-2">{labels[d.buyer_type || ""] || d.buyer_type || "—"}</td>
              <td className="py-2">{labels[d.seller_type || ""] || d.seller_type || "—"}</td>
              <td className="text-right py-2 font-semibold">
                {d.avg_price_per_sqm ? formatPricePerSqm(d.avg_price_per_sqm) : formatPLN(d.avg_total_price)}
              </td>
              <td className="text-right py-2 text-gray-400">{d.transaction_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function EmptyHint() {
  return (
    <Card>
      <p className="text-sm text-gray-400 py-4 text-center">Brak danych. Zmien obszar lub filtry.</p>
    </Card>
  );
}

function SectionTab({ title, active, onClick }: { title: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
        active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {title}
    </button>
  );
}

// --- Main Sidebar ---

export function AnalyticsSidebar({ stats, warsawStats, insights, loading, error, onRefresh, transactionCount, nbpRates, demographics, filters, onDistrictClick }: AnalyticsSidebarProps) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("floor");
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (open) {
      onRefresh();
      setAnimKey((k) => k + 1);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasInsights = insights.priceTrends.length > 0;

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={() => setOpen(!open)}
        className={`absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${
          open ? "right-[440px]" : "right-0"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-l-xl px-2.5 py-6 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors border border-r-0 border-gray-200">
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm text-gray-600 font-semibold [writing-mode:vertical-lr] tracking-wider">Analityka</span>
        </div>
      </button>

      {/* Sidebar panel */}
      <div
        className={`absolute top-0 right-0 z-10 h-full w-[440px] bg-gray-50/95 backdrop-blur-sm shadow-xl border-l border-gray-200 transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Analiza rynku</h2>
            <p className="text-xs text-gray-400 mt-0.5">Dane z widocznego obszaru mapy</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-300 flex items-center gap-1.5"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Odswiez
          </button>
        </div>

        {/* Scrollable content — cards with gaps */}
        <div key={animKey} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && <p className="text-sm text-red-500 px-1">{error}</p>}

          {/* Key stats card with Warsaw comparison */}
          <KeyStatsCard stats={stats} warsawStats={warsawStats} transactionCount={transactionCount} yoy={insights.yoyChange} />

          {/* Market gauge */}
          {hasInsights && <MarketGauge insights={insights} />}

          {/* Volume sparkline */}
          {hasInsights && <VolumeSparklineCard data={insights.volumeTrends} />}

          {/* Price trend chart */}
          {hasInsights && <PriceTrendCard data={insights.priceTrends} />}

          {/* NBP Interest Rates */}
          <InterestRateCard data={nbpRates} />

          {/* GUS Demographics */}
          <DemographicsGrid data={demographics} viewportStats={stats} />

          {/* Affordability: mortgage + buy vs rent */}
          <AffordabilityCard viewportStats={stats} nbpRates={nbpRates} demographics={demographics} />

          {/* Market Factors: growth drivers vs decline factors */}
          <MarketFactors demographics={demographics} nbpRates={nbpRates} viewportStats={stats} insights={insights} />

          {/* District Rankings */}
          <DistrictRankings filters={filters} onDistrictClick={onDistrictClick} warsawAvg={warsawStats?.avg_price_per_sqm ?? null} />

          {/* Section tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            <SectionTab title="Pietro" active={section === "floor"} onClick={() => setSection("floor")} />
            <SectionTab title="Pokoje" active={section === "rooms"} onClick={() => setSection("rooms")} />
            <SectionTab title="Metraz" active={section === "area"} onClick={() => setSection("area")} />
            <SectionTab title="Wolumen" active={section === "volume"} onClick={() => setSection("volume")} />
            <SectionTab title="Strony" active={section === "parties"} onClick={() => setSection("parties")} />
          </div>

          {/* Section content */}
          {loading && !hasInsights ? (
            <Card>
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </Card>
          ) : (
            <>
              {section === "floor" && <FloorSection data={insights.floorAnalysis} />}
              {section === "rooms" && <RoomsSection data={insights.roomsAnalysis} />}
              {section === "area" && <AreaSection data={insights.areaAnalysis} />}
              {section === "volume" && <VolumeSection data={insights.volumeTrends} />}
              {section === "parties" && <PartiesSection data={insights.partyAnalysis} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-gray-100 text-xs text-gray-400 shrink-0">
          obok.me — RCN | GUS BDL | NBP
        </div>
      </div>
    </>
  );
}
