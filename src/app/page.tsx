"use client";

import { useState, useCallback, useMemo } from "react";
import { MapContainer } from "@/components/MapContainer";
import { TransactionMarkers } from "@/components/TransactionMarkers";
import { FilterBar } from "@/components/FilterBar";
import { LocateMe } from "@/components/LocateMe";
import { InsightsPanel } from "@/components/InsightsPanel";
import { useTransactions } from "@/hooks/useTransactions";
import { useInsights } from "@/hooks/useInsights";
import { useDebounce } from "@/hooks/useDebounce";
import type { ViewBounds, Filters, Transaction } from "@/types";

export default function HomePage() {
  const [bounds, setBounds] = useState<ViewBounds | null>(null);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: null,
    dateTo: null,
    propertyType: null,
  });
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [focusedTransaction, setFocusedTransaction] = useState<Transaction | null>(null);

  const stableFilters = useMemo(
    () => ({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      propertyType: filters.propertyType,
    }),
    [filters.dateFrom, filters.dateTo, filters.propertyType]
  );

  const debouncedBounds = useDebounce(bounds, 400);

  const { transactions, stats, loading } = useTransactions(
    debouncedBounds,
    stableFilters
  );

  const {
    insights,
    loading: insightsLoading,
    error: insightsError,
    refresh: refreshInsights,
  } = useInsights(debouncedBounds, stableFilters);

  const typeStats = useMemo(() => {
    const m = new Map<string, { count: number; sumPpsm: number; countPpsm: number; sumPrice: number }>();
    for (const t of transactions) {
      const type = t.function_type;
      if (!type) continue;
      const entry = m.get(type) || { count: 0, sumPpsm: 0, countPpsm: 0, sumPrice: 0 };
      entry.count++;
      entry.sumPrice += t.price;
      if (t.price_per_sqm) {
        entry.sumPpsm += t.price_per_sqm;
        entry.countPpsm++;
      }
      m.set(type, entry);
    }
    const result: { type: string; count: number; avgPpsm: number | null; avgPrice: number }[] = [];
    for (const [type, v] of m) {
      result.push({
        type,
        count: v.count,
        avgPpsm: v.countPpsm > 0 ? v.sumPpsm / v.countPpsm : null,
        avgPrice: v.sumPrice / v.count,
      });
    }
    result.sort((a, b) => b.count - a.count);
    return result;
  }, [transactions]);

  const handleBoundsChanged = useCallback(
    (b: { north: number; south: number; east: number; west: number }) => {
      setBounds(b);
      setMapCenter(null); // release controlled center so map stays draggable
    },
    []
  );

  const handleLocate = useCallback(
    (position: { lat: number; lng: number }) => {
      setMapCenter(position);
    },
    []
  );

  const handleTypeClick = useCallback(
    (type: string) => {
      const match = transactions.find(
        (t) => (t.function_type || t.property_type) === type
      );
      if (match) {
        setMapCenter({ lat: match.lat, lng: match.lng });
        setFocusedTransaction(match);
      }
    },
    [transactions]
  );

  return (
    <main className="h-screen w-screen relative overflow-hidden">
      <FilterBar
        filters={filters}
        stats={stats}
        typeStats={typeStats}
        loading={loading}
        onFilterChange={setFilters}
        onTypeClick={handleTypeClick}
      />
      <MapContainer onBoundsChanged={handleBoundsChanged} center={mapCenter}>
        <TransactionMarkers transactions={transactions} focusedTransaction={focusedTransaction} onFocusConsumed={() => setFocusedTransaction(null)} />
      </MapContainer>
      <LocateMe onLocate={handleLocate} />
      {loading && transactions.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600 font-medium">Ladowanie danych...</span>
          </div>
        </div>
      )}
      <InsightsPanel
        insights={insights}
        loading={insightsLoading}
        error={insightsError}
        onRefresh={refreshInsights}
      />
    </main>
  );
}
