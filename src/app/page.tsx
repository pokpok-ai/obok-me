"use client";

import { useState, useCallback, useMemo } from "react";
import { MapContainer } from "@/components/MapContainer";
import { TransactionMarkers } from "@/components/TransactionMarkers";
import { FilterBar } from "@/components/FilterBar";
import { LocateMe } from "@/components/LocateMe";
import { useTransactions } from "@/hooks/useTransactions";
import { useDebounce } from "@/hooks/useDebounce";
import type { ViewBounds, Filters } from "@/types";

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

  const debouncedBounds = useDebounce(bounds, 400);

  const stableFilters = useMemo(
    () => ({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      propertyType: filters.propertyType,
    }),
    [filters.dateFrom, filters.dateTo, filters.propertyType]
  );

  const { transactions, stats, loading } = useTransactions(
    debouncedBounds,
    stableFilters
  );

  const handleBoundsChanged = useCallback(
    (b: { north: number; south: number; east: number; west: number }) => {
      setBounds(b);
    },
    []
  );

  const handleLocate = useCallback(
    (position: { lat: number; lng: number }) => {
      setMapCenter(position);
    },
    []
  );

  return (
    <main className="h-screen w-screen relative overflow-hidden">
      <FilterBar
        filters={filters}
        stats={stats}
        loading={loading}
        onFilterChange={setFilters}
      />
      <MapContainer onBoundsChanged={handleBoundsChanged} center={mapCenter}>
        <TransactionMarkers transactions={transactions} />
      </MapContainer>
      <LocateMe onLocate={handleLocate} />
    </main>
  );
}
