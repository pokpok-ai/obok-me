"use client";

import type { Filters, ViewportStats } from "@/types";
import { formatPricePerSqm, formatPLN } from "@/lib/formatters";

interface TypeStat {
  type: string;
  count: number;
  avgPpsm: number | null;
  avgPrice: number;
}

// Types where avg total price makes more sense than price/m²
const priceOnlyTypes = new Set(["garaz", "gospodarcza"]);

interface FilterBarProps {
  filters: Filters;
  stats: ViewportStats | null;
  typeStats: TypeStat[];
  loading: boolean;
  onFilterChange: (filters: Filters) => void;
  onTypeClick?: (type: string) => void;
}

const typeColors: Record<string, string> = {
  mieszkalna: "#2563eb",
  garaz: "#6b7280",
  uzytkowa: "#9333ea",
  gospodarcza: "#d97706",
};

const typeLabels: Record<string, string> = {
  mieszkalna: "Mieszkalna",
  garaz: "Garaz",
  uzytkowa: "Uzytkowa",
  gospodarcza: "Gospodarcza",
};

export function FilterBar({
  filters,
  stats,
  typeStats,
  loading,
  onFilterChange,
  onTypeClick,
}: FilterBarProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex gap-3 items-center flex-wrap">
      <span className="text-sm font-medium text-gray-700">Ceny transakcyjne</span>

      {/* Date range */}
      <div className="flex items-center gap-2 ml-auto">
        <label className="text-xs text-gray-500">Od:</label>
        <input
          type="date"
          value={filters.dateFrom || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              dateFrom: e.target.value || null,
            })
          }
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
        />
        <label className="text-xs text-gray-500">Do:</label>
        <input
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              dateTo: e.target.value || null,
            })
          }
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
        />
      </div>

      {/* Per-type stats */}
      {typeStats.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {stats && (
            <span className="text-xs text-gray-400">{stats.total_count} transakcji</span>
          )}
          {typeStats.map((ts) => (
            <span
              key={ts.type}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: typeColors[ts.type] || "#6b7280" }}
              onClick={() => onTypeClick?.(ts.type)}
            >
              {typeLabels[ts.type] || ts.type}: {ts.count}
              {priceOnlyTypes.has(ts.type) ? (
                <span className="opacity-80">
                  — sr. {formatPLN(ts.avgPrice)}
                </span>
              ) : ts.avgPpsm != null ? (
                <span className="opacity-80">
                  — {formatPricePerSqm(ts.avgPpsm)}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      )}

      {loading && (
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
