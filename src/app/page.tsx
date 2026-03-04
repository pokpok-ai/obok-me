"use client";

import { useState, useCallback, useMemo } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { MapContainer } from "@/components/MapContainer";
import { TransactionMarkers } from "@/components/TransactionMarkers";
import { HeatmapLayer } from "@/components/HeatmapLayer";
import { FilterBar } from "@/components/FilterBar";
import { LocateMe } from "@/components/LocateMe";
import { AnalyticsSidebar } from "@/components/AnalyticsSidebar";
import { PriceEstimateCard } from "@/components/PriceEstimateCard";
import { ComparableTransactions } from "@/components/ComparableTransactions";
import { useTransactions } from "@/hooks/useTransactions";
import { useInsights } from "@/hooks/useInsights";
import { useHeatmap } from "@/hooks/useHeatmap";
import { useExternalData } from "@/hooks/useExternalData";
import { useDebounce } from "@/hooks/useDebounce";
import type { ViewBounds, Filters, Transaction } from "@/types";

export default function HomePage() {
  const [bounds, setBounds] = useState<ViewBounds | null>(null);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: null,
    dateTo: null,
    functionType: "mieszkalna",
  });
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [focusedTransaction, setFocusedTransaction] = useState<Transaction | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [comparisonSource, setComparisonSource] = useState<Transaction | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);

  const stableFilters = useMemo(
    () => ({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      functionType: filters.functionType,
    }),
    [filters.dateFrom, filters.dateTo, filters.functionType]
  );

  const debouncedBounds = useDebounce(bounds, 400);

  const { transactions, stats, loading } = useTransactions(
    debouncedBounds,
    stableFilters
  );

  const {
    insights,
    warsawStats,
    loading: insightsLoading,
    error: insightsError,
    refresh: refreshInsights,
  } = useInsights(debouncedBounds, stableFilters);

  const { points: heatmapPoints } = useHeatmap(
    debouncedBounds,
    stableFilters,
    heatmapEnabled
  );

  const { nbpRates, demographics } = useExternalData();

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
      setMapCenter(null);
      setMapZoom(null);
    },
    []
  );

  const handleLocate = useCallback(
    (position: { lat: number; lng: number }) => {
      setMapCenter(position);
    },
    []
  );

  const handlePlaceSelect = useCallback(
    (position: { lat: number; lng: number }, address?: string) => {
      setMapCenter(position);
      setMapZoom(16);
      setPriceEstimate({ ...position, address: address || `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}` });
    },
    []
  );

  const handleDistrictClick = useCallback(
    (position: { lat: number; lng: number }) => {
      setMapCenter(position);
      setMapZoom(14);
    },
    []
  );

  const handleCompare = useCallback(
    (transaction: Transaction) => {
      setComparisonSource(transaction);
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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <APIProvider apiKey={apiKey}>
    <main className="h-screen w-screen relative overflow-hidden">
      <FilterBar
        filters={filters}
        stats={stats}
        typeStats={typeStats}
        loading={loading}
        onFilterChange={setFilters}
        onTypeClick={handleTypeClick}
        onPlaceSelect={handlePlaceSelect}
      />
      <MapContainer onBoundsChanged={handleBoundsChanged} center={mapCenter} zoom={mapZoom}>
        {!heatmapEnabled && (
          <TransactionMarkers transactions={transactions} focusedTransaction={focusedTransaction} onFocusConsumed={() => setFocusedTransaction(null)} avgPricePerSqm={stats?.avg_price_per_sqm} onCompare={handleCompare} />
        )}
        {heatmapEnabled && <HeatmapLayer points={heatmapPoints} />}
      </MapContainer>
      <LocateMe onLocate={handleLocate} />
      <button
        onClick={() => setHeatmapEnabled(!heatmapEnabled)}
        className={`absolute bottom-8 left-16 z-10 rounded-full p-3 shadow-lg transition-colors group ${
          heatmapEnabled
            ? "bg-orange-500 hover:bg-orange-600"
            : "bg-white hover:bg-gray-50"
        }`}
        title={heatmapEnabled ? "Wylacz mape ciepla" : "Mapa ciepla cen"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-5 h-5 transition-colors ${
            heatmapEnabled
              ? "text-white"
              : "text-gray-600 group-hover:text-orange-600"
          }`}
        >
          <path d="M12 2c-4 4-8 7.33-8 12a8 8 0 1016 0c0-4.67-4-8-8-12z" />
          <path d="M12 12c-1.33 1.33-2 2.67-2 4a2 2 0 104 0c0-1.33-.67-2.67-2-4z" />
        </svg>
      </button>
      {loading && transactions.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600 font-medium">Ladowanie danych...</span>
          </div>
        </div>
      )}
      {/* Price estimate overlay (after address search) */}
      {priceEstimate && (
        <PriceEstimateCard
          lat={priceEstimate.lat}
          lng={priceEstimate.lng}
          funcType={filters.functionType}
          address={priceEstimate.address}
          onClose={() => setPriceEstimate(null)}
        />
      )}
      {/* Comparable transactions overlay */}
      {comparisonSource && (
        <ComparableTransactions
          source={comparisonSource}
          onClose={() => setComparisonSource(null)}
        />
      )}
      <AnalyticsSidebar
        stats={stats}
        warsawStats={warsawStats}
        insights={insights}
        loading={insightsLoading}
        error={insightsError}
        onRefresh={refreshInsights}
        transactionCount={transactions.length}
        nbpRates={nbpRates}
        demographics={demographics}
        filters={stableFilters}
        onDistrictClick={handleDistrictClick}
      />
      <footer className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 text-[10px] text-gray-400 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
        Open source — non-commercial use only · <a href="mailto:ceo@xclv.com" className="underline hover:text-gray-600">ceo@xclv.com</a>
      </footer>
    </main>
    </APIProvider>
  );
}
