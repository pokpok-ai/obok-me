"use client";

import { useState } from "react";
import type { InsightsData } from "@/types";
import { formatPricePerSqm, formatPLN } from "@/lib/formatters";

interface InsightsPanelProps {
  insights: InsightsData;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type Tab = "trends" | "floor" | "rooms" | "area" | "volume" | "parties";

const tabs: { key: Tab; label: string }[] = [
  { key: "trends", label: "Trendy cen" },
  { key: "floor", label: "Pietro" },
  { key: "rooms", label: "Pokoje" },
  { key: "area", label: "Metraż" },
  { key: "volume", label: "Wolumen" },
  { key: "parties", label: "Strony" },
];

function MiniBar({ value, max, color = "#2563eb" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function PriceTrendsView({ data }: { data: InsightsData["priceTrends"] }) {
  if (data.length === 0) return <EmptyState />;

  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));
  // Show last 12 months if more data available
  const shown = data.slice(-12);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">
        Srednia cena/m² wg miesiecy (ostatnie {shown.length} mies.)
      </p>
      {shown.map((d) => (
        <div key={d.month} className="flex items-center gap-2 text-xs">
          <span className="w-14 text-gray-500 shrink-0">{d.month}</span>
          <MiniBar value={d.avg_price_per_sqm} max={maxAvg} />
          <span className="w-20 text-right shrink-0 font-medium">
            {formatPricePerSqm(d.avg_price_per_sqm)}
          </span>
          <span className="w-8 text-right text-gray-400 shrink-0">{d.transaction_count}</span>
        </div>
      ))}
      {data.some((d) => d.market_primary_avg && d.market_secondary_avg) && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Rynek pierwotny vs wtorny</p>
          {shown
            .filter((d) => d.market_primary_avg && d.market_secondary_avg)
            .slice(-6)
            .map((d) => (
              <div key={`spread-${d.month}`} className="flex items-center gap-2 text-xs mb-1">
                <span className="w-14 text-gray-500 shrink-0">{d.month}</span>
                <span className="text-green-600 w-20 text-right">
                  {formatPricePerSqm(d.market_primary_avg!)}
                </span>
                <span className="text-gray-400">vs</span>
                <span className="text-blue-600 w-20 text-right">
                  {formatPricePerSqm(d.market_secondary_avg!)}
                </span>
              </div>
            ))}
          <div className="flex gap-3 text-xs mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Pierwotny
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Wtorny
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FloorView({ data }: { data: InsightsData["floorAnalysis"] }) {
  if (data.length === 0) return <EmptyState />;

  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));
  const filtered = data.filter((d) => d.floor >= 0 && d.floor <= 20);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">Srednia cena/m² wg pietra</p>
      {filtered.map((d) => (
        <div key={d.floor} className="flex items-center gap-2 text-xs">
          <span className="w-10 text-gray-500 shrink-0">
            {d.floor === 0 ? "Parter" : `${d.floor}p.`}
          </span>
          <MiniBar
            value={d.avg_price_per_sqm}
            max={maxAvg}
            color={d.floor === 0 ? "#9ca3af" : d.floor <= 3 ? "#3b82f6" : "#2563eb"}
          />
          <span className="w-20 text-right shrink-0 font-medium">
            {formatPricePerSqm(d.avg_price_per_sqm)}
          </span>
          <span className="w-8 text-right text-gray-400 shrink-0">{d.transaction_count}</span>
        </div>
      ))}
    </div>
  );
}

function RoomsView({ data }: { data: InsightsData["roomsAnalysis"] }) {
  if (data.length === 0) return <EmptyState />;

  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));
  const roomLabels: Record<number, string> = {
    1: "Kawalerka",
    2: "2-pokojowe",
    3: "3-pokojowe",
    4: "4-pokojowe",
    5: "5-pokojowe",
    6: "6+ pokoi",
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">Cena wg liczby pokoi</p>
      {data.map((d) => (
        <div key={d.rooms} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-gray-500 shrink-0">{roomLabels[d.rooms] || `${d.rooms} pok.`}</span>
          <MiniBar value={d.avg_price_per_sqm} max={maxAvg} color="#8b5cf6" />
          <div className="w-28 text-right shrink-0">
            <span className="font-medium">{formatPricePerSqm(d.avg_price_per_sqm)}</span>
          </div>
          <span className="w-8 text-right text-gray-400 shrink-0">{d.transaction_count}</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
        {data.map((d) => (
          <div key={`detail-${d.rooms}`} className="flex justify-between text-xs text-gray-500">
            <span>{roomLabels[d.rooms] || `${d.rooms} pok.`}</span>
            <span>sr. {d.avg_area.toFixed(0)} m² | sr. {formatPLN(d.avg_total_price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaView({ data }: { data: InsightsData["areaAnalysis"] }) {
  if (data.length === 0) return <EmptyState />;

  const maxAvg = Math.max(...data.map((d) => d.avg_price_per_sqm));

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">Cena/m² wg metrazu</p>
      {data.map((d) => (
        <div key={d.area_bucket} className="flex items-center gap-2 text-xs">
          <span className="w-16 text-gray-500 shrink-0">{d.area_bucket}</span>
          <MiniBar value={d.avg_price_per_sqm} max={maxAvg} color="#f59e0b" />
          <span className="w-20 text-right shrink-0 font-medium">
            {formatPricePerSqm(d.avg_price_per_sqm)}
          </span>
          <span className="w-8 text-right text-gray-400 shrink-0">{d.transaction_count}</span>
        </div>
      ))}
    </div>
  );
}

function VolumeView({ data }: { data: InsightsData["volumeTrends"] }) {
  if (data.length === 0) return <EmptyState />;

  const maxCount = Math.max(...data.map((d) => d.transaction_count));
  const shown = data.slice(-12);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">
        Liczba transakcji wg miesiecy (ostatnie {shown.length} mies.)
      </p>
      {shown.map((d) => (
        <div key={d.month} className="flex items-center gap-2 text-xs">
          <span className="w-14 text-gray-500 shrink-0">{d.month}</span>
          <MiniBar value={d.transaction_count} max={maxCount} color="#10b981" />
          <span className="w-10 text-right shrink-0 font-medium">{d.transaction_count}</span>
          <span className="w-20 text-right text-gray-400 shrink-0">
            sr. {formatPLN(d.avg_price)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PartiesView({ data }: { data: InsightsData["partyAnalysis"] }) {
  if (data.length === 0) return <EmptyState />;

  const partyLabels: Record<string, string> = {
    osobaFizyczna: "Osoba fizyczna",
    osobaPrawna: "Osoba prawna",
    jednostkaSamorz: "Samorzad",
    skarbPanstwa: "Skarb Panstwa",
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">Transakcje wg typow stron</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100">
              <th className="text-left py-1 font-medium">Kupujacy</th>
              <th className="text-left py-1 font-medium">Sprzedajacy</th>
              <th className="text-right py-1 font-medium">Sr. cena</th>
              <th className="text-right py-1 font-medium">Ile</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((d, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-1">{partyLabels[d.buyer_type || ""] || d.buyer_type || "-"}</td>
                <td className="py-1">{partyLabels[d.seller_type || ""] || d.seller_type || "-"}</td>
                <td className="text-right py-1 font-medium">
                  {d.avg_price_per_sqm ? formatPricePerSqm(d.avg_price_per_sqm) : formatPLN(d.avg_total_price)}
                </td>
                <td className="text-right py-1 text-gray-400">{d.transaction_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="text-xs text-gray-400 py-4 text-center">
      Brak danych do wyswietlenia w tym widoku. Zmien obszar mapy lub filtry.
    </p>
  );
}

export function InsightsPanel({ insights, loading, error, onRefresh }: InsightsPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("trends");

  const hasData =
    insights.priceTrends.length > 0 ||
    insights.floorAnalysis.length > 0 ||
    insights.roomsAnalysis.length > 0;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && !hasData) onRefresh();
        }}
        className="absolute bottom-6 right-4 z-10 bg-white/95 backdrop-blur-sm shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {open ? "Zamknij" : "Korelacje"}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-16 right-4 z-10 w-[32rem] max-h-[70vh] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Analiza i korelacje</h3>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {loading ? "Ladowanie..." : "Odswiez"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 p-1.5 border-b border-gray-100 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3 overflow-y-auto flex-1">
            {error && (
              <p className="text-xs text-red-500 mb-2">{error}</p>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === "trends" && <PriceTrendsView data={insights.priceTrends} />}
                {activeTab === "floor" && <FloorView data={insights.floorAnalysis} />}
                {activeTab === "rooms" && <RoomsView data={insights.roomsAnalysis} />}
                {activeTab === "area" && <AreaView data={insights.areaAnalysis} />}
                {activeTab === "volume" && <VolumeView data={insights.volumeTrends} />}
                {activeTab === "parties" && <PartiesView data={insights.partyAnalysis} />}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400">
            Dane z RCN (Rejestr Cen Nieruchomosci) — rzeczywiste ceny transakcyjne
          </div>
        </div>
      )}
    </>
  );
}
