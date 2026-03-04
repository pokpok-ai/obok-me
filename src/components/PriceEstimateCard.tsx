"use client";

import { useState, useEffect } from "react";
import type { PriceEstimate } from "@/types";
import { fetchPriceEstimate } from "@/lib/api";

interface PriceEstimateCardProps {
  lat: number;
  lng: number;
  funcType: string | null;
  address: string;
  onClose: () => void;
}

export function PriceEstimateCard({ lat, lng, funcType, address, onClose }: PriceEstimateCardProps) {
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPriceEstimate(lat, lng, funcType).then((data) => {
      if (!cancelled) {
        setEstimate(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [lat, lng, funcType]);

  if (loading) {
    return (
      <div className="absolute top-20 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 w-[380px]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Szacowanie ceny...</span>
        </div>
      </div>
    );
  }

  if (!estimate) return null;

  const { p20_price_per_sqm, median_price_per_sqm, p80_price_per_sqm, comp_count, avg_area, radius_used } = estimate;
  const fmt = (n: number) => n.toLocaleString("pl-PL");

  // Confidence based on comp count
  const confidence = comp_count >= 50 ? "wysoka" : comp_count >= 20 ? "srednia" : "niska";
  const confidenceColor = comp_count >= 50 ? "#22c55e" : comp_count >= 20 ? "#f59e0b" : "#ef4444";

  // Range bar proportions
  const rangeMin = p20_price_per_sqm;
  const rangeMax = p80_price_per_sqm;
  const totalRange = rangeMax - rangeMin || 1;
  const medianPct = ((median_price_per_sqm - rangeMin) / totalRange) * 100;

  // Total price for avg area
  const totalP20 = Math.round(p20_price_per_sqm * avg_area);
  const totalMedian = Math.round(median_price_per_sqm * avg_area);
  const totalP80 = Math.round(p80_price_per_sqm * avg_area);

  return (
    <div className="absolute top-20 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 w-[380px]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Szacunkowa cena
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 max-w-[240px] truncate">
            {address}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: confidenceColor }}
            />
            <span className="text-[10px] text-gray-400">
              {confidence} ({comp_count} tr.)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Hero median price */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-gray-900">
          {fmt(median_price_per_sqm)} zl/m²
        </span>
        <span className="text-xs text-gray-400">mediana</span>
      </div>

      {/* Range bar */}
      <div className="mb-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <div className="relative h-6 bg-gradient-to-r from-green-100 via-blue-100 to-orange-100 rounded-lg overflow-hidden">
          {/* Median marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-600 animate-fade-in"
            style={{ left: `${Math.max(5, Math.min(95, medianPct))}%`, animationDelay: "400ms" }}
          />
          <div
            className="absolute -top-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow animate-fade-in"
            style={{ left: `${Math.max(3, Math.min(93, medianPct))}%`, animationDelay: "400ms" }}
          />
          {/* Labels on bar */}
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-medium text-green-700">
            {fmt(p20_price_per_sqm)}
          </span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-medium text-orange-700">
            {fmt(p80_price_per_sqm)}
          </span>
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-0.5">
          <span>konserwatywna (P20)</span>
          <span>optymistyczna (P80)</span>
        </div>
      </div>

      {/* Total price row */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-2.5">
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <p className="text-[10px] text-gray-400">Niska</p>
          <p className="text-xs font-semibold text-green-600">
            {fmt(totalP20)} zl
          </p>
        </div>
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "380ms" }}>
          <p className="text-[10px] text-gray-400">Rynkowa</p>
          <p className="text-sm font-bold text-blue-600">
            {fmt(totalMedian)} zl
          </p>
        </div>
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "460ms" }}>
          <p className="text-[10px] text-gray-400">Wysoka</p>
          <p className="text-xs font-semibold text-orange-600">
            {fmt(totalP80)} zl
          </p>
        </div>
      </div>
      <p className="text-[9px] text-gray-400 mt-2 text-center">
        Cena calkowita dla {avg_area}m² (sr. powierzchnia w okolicy)
      </p>
    </div>
  );
}
