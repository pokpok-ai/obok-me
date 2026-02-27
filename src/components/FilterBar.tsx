"use client";

import type { Filters, ViewportStats } from "@/types";
import { formatPricePerSqm } from "@/lib/formatters";

interface FilterBarProps {
  filters: Filters;
  stats: ViewportStats | null;
  loading: boolean;
  onFilterChange: (filters: Filters) => void;
}

const propertyTypes = [
  { value: null, label: "Wszystkie" },
  { value: "apartment", label: "Mieszkania" },
  { value: "house", label: "Domy" },
  { value: "plot", label: "Dzialki" },
  { value: "commercial", label: "Lokale" },
];

export function FilterBar({
  filters,
  stats,
  loading,
  onFilterChange,
}: FilterBarProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex gap-3 items-center flex-wrap">
      {/* Property type tabs */}
      <div className="flex gap-1">
        {propertyTypes.map((pt) => (
          <button
            key={pt.value ?? "all"}
            onClick={() =>
              onFilterChange({ ...filters, propertyType: pt.value })
            }
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.propertyType === pt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {pt.label}
          </button>
        ))}
      </div>

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

      {/* Stats */}
      {stats && stats.total_count > 0 && (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="font-medium">{stats.total_count} transakcji</span>
          {stats.avg_price_per_sqm && (
            <span>
              Srednia: {formatPricePerSqm(stats.avg_price_per_sqm)}
            </span>
          )}
        </div>
      )}

      {loading && (
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
