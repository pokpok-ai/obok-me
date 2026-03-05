"use client";

import { AddressSearch } from "./AddressSearch";

export interface SalonFilters {
  categoryName: string | null;
  promoOnly: boolean;
}

interface SalonFilterBarProps {
  filters: SalonFilters;
  salonCount: number;
  loading: boolean;
  onFilterChange: (filters: SalonFilters) => void;
  onPlaceSelect: (position: { lat: number; lng: number }, address?: string) => void;
}

const CATEGORIES = [
  { value: null, label: "Wszystkie", color: "#7c3aed" },
  { value: "fryzjer", label: "Fryzjer", color: "#ec4899" },
  { value: "barber", label: "Barber", color: "#7c3aed" },
  { value: "paznokcie", label: "Paznokcie", color: "#ef4444" },
  { value: "brwi-i-rzesy", label: "Brwi i rzesy", color: "#f59e0b" },
  { value: "inne", label: "Inne", color: "#64748b" },
] as const;

export function SalonFilterBar({
  filters,
  salonCount,
  loading,
  onFilterChange,
  onPlaceSelect,
}: SalonFilterBarProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex gap-3 items-center flex-wrap">
      <span className="text-sm font-semibold text-gray-700">Salony</span>

      {/* Category filter */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() =>
              onFilterChange({ ...filters, categoryName: cat.value })
            }
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filters.categoryName === cat.value
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Promotions toggle */}
      <button
        onClick={() =>
          onFilterChange({ ...filters, promoOnly: !filters.promoOnly })
        }
        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${
          filters.promoOnly
            ? "bg-red-50 text-red-600 border-red-200"
            : "bg-white text-gray-500 border-gray-200 hover:text-gray-700"
        }`}
      >
        Promocje
      </button>

      {/* Address search */}
      <AddressSearch onSelect={onPlaceSelect} />

      {/* Count + loading */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-gray-400">
          {salonCount > 0 ? `${salonCount} salonow` : ""}
        </span>
        {loading && (
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
