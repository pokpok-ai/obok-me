"use client";

import { useState, useEffect } from "react";
import type { ViewportStats, InsightsData } from "@/types";
import { formatPricePerSqm, formatPLN } from "@/lib/formatters";
import { PriceTrendChart } from "./PriceTrendChart";

interface AnalyticsSidebarProps {
  stats: ViewportStats | null;
  insights: InsightsData;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  transactionCount: number;
}

type Section = "trends" | "floor" | "rooms" | "area" | "volume" | "parties";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

// --- Sub-components ---

function MiniBar({ value, max, color = "#3b82f6" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-semibold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ViewportSummary({ stats, transactionCount }: { stats: ViewportStats | null; transactionCount: number }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        label="Transakcje"
        value={formatCompact(stats.total_count)}
        sub={`${transactionCount} na mapie`}
        color="#1e40af"
      />
      <StatCard
        label="Sr. cena/m²"
        value={stats.avg_price_per_sqm ? `${formatCompact(stats.avg_price_per_sqm)}` : "—"}
        sub="zl/m²"
        color="#059669"
      />
      <StatCard
        label="Mediana/m²"
        value={stats.median_price_per_sqm ? `${formatCompact(stats.median_price_per_sqm)}` : "—"}
        sub="zl/m²"
        color="#7c3aed"
      />
    </div>
  );
}

function FloorSection({ data }: { data: InsightsData["floorAnalysis"] }) {
  if (data.length === 0) return <EmptyHint />;
  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));
  const best = data.reduce((a, b) => (b.avg_price_per_sqm > a.avg_price_per_sqm ? b : a));
  const filtered = data.filter((d) => d.floor >= 0 && d.floor <= 20);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs text-gray-500">Cena/m² wg pietra</p>
        <span className="text-[10px] text-blue-600">Najdrozsze: {best.floor === 0 ? "parter" : `${best.floor}p.`} — {formatPricePerSqm(best.avg_price_per_sqm)}</span>
      </div>
      <div className="space-y-1">
        {filtered.map((d) => (
          <div key={d.floor} className="flex items-center gap-2 text-xs">
            <span className="w-10 text-gray-500 shrink-0">{d.floor === 0 ? "Parter" : `${d.floor}p.`}</span>
            <MiniBar value={d.avg_price_per_sqm} max={maxAvg} color={d.floor === 0 ? "#9ca3af" : d.floor <= 3 ? "#60a5fa" : "#3b82f6"} />
            <span className="w-20 text-right shrink-0 font-medium">{formatPricePerSqm(d.avg_price_per_sqm)}</span>
            <span className="w-10 text-right text-gray-400 shrink-0">{d.transaction_count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomsSection({ data }: { data: InsightsData["roomsAnalysis"] }) {
  if (data.length === 0) return <EmptyHint />;
  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));
  const labels: Record<number, string> = { 1: "Kawalerka", 2: "2-pokojowe", 3: "3-pokojowe", 4: "4-pokojowe", 5: "5-pokojowe", 6: "6+ pokoi" };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Cena wg liczby pokoi</p>
      <div className="space-y-1">
        {data.map((d) => (
          <div key={d.rooms} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-gray-500 shrink-0">{labels[d.rooms] || `${d.rooms} pok.`}</span>
            <MiniBar value={d.avg_price_per_sqm} max={maxAvg} color="#8b5cf6" />
            <span className="w-20 text-right shrink-0 font-medium">{formatPricePerSqm(d.avg_price_per_sqm)}</span>
            <span className="w-10 text-right text-gray-400 shrink-0">{d.transaction_count}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-50 grid grid-cols-2 gap-x-4 gap-y-0.5">
        {data.map((d) => (
          <div key={`d-${d.rooms}`} className="flex justify-between text-[10px] text-gray-400">
            <span>{labels[d.rooms] || `${d.rooms} pok.`}</span>
            <span>sr. {d.avg_area.toFixed(0)} m² | {formatPLN(d.avg_total_price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaSection({ data }: { data: InsightsData["areaAnalysis"] }) {
  if (data.length === 0) return <EmptyHint />;
  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Cena/m² wg metrazu</p>
      <div className="space-y-1">
        {data.map((d) => (
          <div key={d.area_bucket} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-gray-500 shrink-0">{d.area_bucket}</span>
            <MiniBar value={d.avg_price_per_sqm} max={maxAvg} color="#f59e0b" />
            <span className="w-20 text-right shrink-0 font-medium">{formatPricePerSqm(d.avg_price_per_sqm)}</span>
            <span className="w-10 text-right text-gray-400 shrink-0">{d.transaction_count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VolumeSection({ data }: { data: InsightsData["volumeTrends"] }) {
  if (data.length === 0) return <EmptyHint />;
  const maxCount = Math.max(...data.map((d) => d.transaction_count));
  const shown = data.slice(-12);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Wolumen transakcji (ostatnie {shown.length} mies.)</p>
      <div className="space-y-1">
        {shown.map((d) => (
          <div key={d.month} className="flex items-center gap-2 text-xs">
            <span className="w-14 text-gray-500 shrink-0">{d.month}</span>
            <MiniBar value={d.transaction_count} max={maxCount} color="#10b981" />
            <span className="w-10 text-right shrink-0 font-medium">{d.transaction_count}</span>
            <span className="w-20 text-right text-gray-400 shrink-0">sr. {formatPLN(d.avg_price)}</span>
          </div>
        ))}
      </div>
    </div>
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
    <div>
      <p className="text-xs text-gray-500 mb-2">Transakcje wg typow stron</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left py-1 font-medium text-[10px] uppercase tracking-wider">Kupujacy</th>
            <th className="text-left py-1 font-medium text-[10px] uppercase tracking-wider">Sprzedajacy</th>
            <th className="text-right py-1 font-medium text-[10px] uppercase tracking-wider">Sr. cena</th>
            <th className="text-right py-1 font-medium text-[10px] uppercase tracking-wider">Ile</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((d, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="py-1.5">{labels[d.buyer_type || ""] || d.buyer_type || "—"}</td>
              <td className="py-1.5">{labels[d.seller_type || ""] || d.seller_type || "—"}</td>
              <td className="text-right py-1.5 font-medium">
                {d.avg_price_per_sqm ? formatPricePerSqm(d.avg_price_per_sqm) : formatPLN(d.avg_total_price)}
              </td>
              <td className="text-right py-1.5 text-gray-400">{d.transaction_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketBreakdown({ data }: { data: InsightsData["priceTrends"] }) {
  const recent = data.slice(-6);
  const primaryAvg = recent.filter((d) => d.market_primary_avg).map((d) => d.market_primary_avg!);
  const secondaryAvg = recent.filter((d) => d.market_secondary_avg).map((d) => d.market_secondary_avg!);

  if (primaryAvg.length === 0 && secondaryAvg.length === 0) return null;

  const pAvg = primaryAvg.length > 0 ? primaryAvg.reduce((a, b) => a + b, 0) / primaryAvg.length : 0;
  const sAvg = secondaryAvg.length > 0 ? secondaryAvg.reduce((a, b) => a + b, 0) / secondaryAvg.length : 0;
  const total = pAvg + sAvg;
  const pPct = total > 0 ? Math.round((pAvg / total) * 100) : 50;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Rynek pierwotny vs wtorny (ost. 6 mies.)</p>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
        <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${pPct}%` }} />
        <div className="bg-blue-500 rounded-r-full transition-all" style={{ width: `${100 - pPct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-600">Pierwotny</span>
          <span className="font-medium">{pAvg > 0 ? formatPricePerSqm(pAvg) : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-gray-600">Wtorny</span>
          <span className="font-medium">{sAvg > 0 ? formatPricePerSqm(sAvg) : "—"}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyHint() {
  return <p className="text-xs text-gray-400 py-3 text-center">Brak danych. Zmien obszar lub filtry.</p>;
}

function SectionHeader({ title, active, onClick }: { title: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
    >
      {title}
    </button>
  );
}

// --- Main Sidebar ---

export function AnalyticsSidebar({ stats, insights, loading, error, onRefresh, transactionCount }: AnalyticsSidebarProps) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("trends");

  // Auto-fetch when sidebar opens
  useEffect(() => {
    if (open) onRefresh();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasInsights = insights.priceTrends.length > 0;

  return (
    <>
      {/* Toggle tab on right edge */}
      <button
        onClick={() => setOpen(!open)}
        className={`absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${
          open ? "right-[420px]" : "right-0"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-l-lg px-1.5 py-4 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors border border-r-0 border-gray-200">
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[10px] text-gray-500 font-medium [writing-mode:vertical-lr]">Analityka</span>
        </div>
      </button>

      {/* Sidebar panel */}
      <div
        className={`absolute top-0 right-0 z-10 h-full w-[420px] bg-white/95 backdrop-blur-sm shadow-xl border-l border-gray-200 transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Analiza rynku</h2>
            <p className="text-[10px] text-gray-400">Dane z widocznego obszaru mapy</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 flex items-center gap-1"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Odswiez
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {error && <p className="text-xs text-red-500 px-4 pt-2">{error}</p>}

          {/* Viewport Summary */}
          <div className="px-4 py-3">
            <ViewportSummary stats={stats} transactionCount={transactionCount} />
          </div>

          {/* Price Trend Chart */}
          {hasInsights && (
            <div className="px-4 pb-3">
              <p className="text-xs text-gray-500 mb-1">Trend cen/m² (miesieczny)</p>
              <PriceTrendChart data={insights.priceTrends} />
              <MarketBreakdown data={insights.priceTrends} />
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Section tabs */}
          <div className="px-4 py-2 flex gap-0.5 overflow-x-auto shrink-0">
            <SectionHeader title="Pietro" active={section === "floor"} onClick={() => setSection("floor")} />
            <SectionHeader title="Pokoje" active={section === "rooms"} onClick={() => setSection("rooms")} />
            <SectionHeader title="Metraz" active={section === "area"} onClick={() => setSection("area")} />
            <SectionHeader title="Wolumen" active={section === "volume"} onClick={() => setSection("volume")} />
            <SectionHeader title="Strony" active={section === "parties"} onClick={() => setSection("parties")} />
          </div>

          {/* Section content */}
          <div className="px-4 pb-4">
            {loading && !hasInsights ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
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
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 shrink-0">
          obok.me — Dane z RCN (Rejestr Cen Nieruchomosci)
        </div>
      </div>
    </>
  );
}
