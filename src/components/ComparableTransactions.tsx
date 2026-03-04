"use client";

import { useState, useEffect } from "react";
import type { Transaction, ComparableTransaction } from "@/types";
import { fetchNearbyComps } from "@/lib/api";
import { formatPLN, formatDate } from "@/lib/formatters";

interface ComparableTransactionsProps {
  source: Transaction;
  onClose: () => void;
}

export function ComparableTransactions({ source, onClose }: ComparableTransactionsProps) {
  const [comps, setComps] = useState<ComparableTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNearbyComps(
      source.lat,
      source.lng,
      source.rooms,
      source.area_sqm ? Number(source.area_sqm) : null,
      source.function_type
    ).then((data) => {
      if (!cancelled) {
        // Filter out the source transaction itself
        setComps(data.filter((c) => c.id !== source.id));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [source.id, source.lat, source.lng, source.rooms, source.area_sqm, source.function_type]);

  const fmt = (n: number) => n.toLocaleString("pl-PL");
  const sourcePpsm = source.price_per_sqm || 0;

  return (
    <div className="absolute top-20 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 w-[400px] max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Porownywalne transakcje
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 max-w-[300px] truncate">
            {source.address || `${source.lat.toFixed(4)}, ${source.lng.toFixed(4)}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Source transaction reference */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-blue-500">
            Wybrana transakcja
          </span>
          <span className="text-sm font-bold text-blue-700">
            {fmt(sourcePpsm)} zl/m²
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-blue-600">
          {source.area_sqm && <span>{source.area_sqm}m²</span>}
          {source.rooms && <span>{source.rooms} pok.</span>}
          {source.floor !== null && <span>p. {source.floor}</span>}
          <span>{formatPLN(source.price)}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 justify-center">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Szukanie podobnych...</span>
        </div>
      ) : comps.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          Brak podobnych transakcji w promieniu 1 km
        </p>
      ) : (
        <div className="space-y-2">
          {comps.map((comp) => {
            const diff = sourcePpsm ? Math.round(((comp.price_per_sqm - sourcePpsm) / sourcePpsm) * 100) : 0;
            const isHigher = diff > 0;

            return (
              <div
                key={comp.id}
                className="rounded-lg bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-800">
                    {fmt(comp.price_per_sqm)} zl/m²
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        isHigher ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {isHigher ? "+" : ""}{diff}%
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {Math.round(comp.distance_m)}m
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {comp.area_sqm && <span>{comp.area_sqm}m²</span>}
                  {comp.rooms && <span>{comp.rooms} pok.</span>}
                  {comp.floor !== null && <span>p. {comp.floor}</span>}
                  <span>{formatPLN(comp.price)}</span>
                  <span className="ml-auto text-gray-400">{formatDate(comp.transaction_date)}</span>
                </div>
                {comp.address && (
                  <p className="text-[10px] text-gray-400 mt-1 truncate">{comp.address}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[9px] text-gray-400 mt-3 text-center">
        Podobne: ±1 pokoj, ±30% powierzchni, ostatnie 24 mies., promien 1 km
      </p>
    </div>
  );
}
