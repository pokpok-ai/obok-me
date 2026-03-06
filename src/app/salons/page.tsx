"use client";

import { useState, useCallback } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { MapContainer } from "@/components/MapContainer";
import { SalonDataMarkers } from "@/components/SalonDataMarkers";
import { SalonFilterBar } from "@/components/SalonFilterBar";
import type { SalonFilters } from "@/components/SalonFilterBar";
import { LocateMe } from "@/components/LocateMe";
import { useSalons } from "@/hooks/useSalons";
import { useDebounce } from "@/hooks/useDebounce";
import { PageSwitch } from "@/components/PageSwitch";
import { SearchPin } from "@/components/SearchPin";
import type { ViewBounds } from "@/types";

export default function SalonsPage() {
  const [bounds, setBounds] = useState<ViewBounds | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number; placeId?: string } | null>(null);
  const [focusedSalonId, setFocusedSalonId] = useState<number | null>(null);
  const [filters, setFilters] = useState<SalonFilters>({
    categoryName: null,
    promoOnly: false,
  });

  const debouncedBounds = useDebounce(bounds, 400);
  const { salons, loading } = useSalons(
    debouncedBounds,
    true,
    filters.categoryName,
    filters.promoOnly
  );

  const handleBoundsChanged = useCallback(
    (b: { north: number; south: number; east: number; west: number }) => {
      setBounds(b);
      setMapCenter(null);
      setMapZoom(null);
    },
    []
  );

  const handleLocate = useCallback((position: { lat: number; lng: number }) => {
    setMapCenter(position);
    setMapZoom(15);
  }, []);

  const handlePlaceSelect = useCallback(
    (position: { lat: number; lng: number }, _address?: string, placeId?: string) => {
      setMapCenter(position);
      setMapZoom(16);
      setSearchedLocation({ ...position, placeId });
      setFocusedSalonId(null);
    },
    []
  );

  const handleSalonSelect = useCallback(
    (salonId: number, position: { lat: number; lng: number }) => {
      setMapCenter(position);
      setMapZoom(17);
      setSearchedLocation(null); // No SearchPin for salon — marker highlights itself
      setFocusedSalonId(salonId);
    },
    []
  );

  const handleSearchClear = useCallback(() => {
    setSearchedLocation(null);
    setFocusedSalonId(null);
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <APIProvider apiKey={apiKey} version="weekly">
      <main className="h-screen w-screen relative overflow-hidden">
        <PageSwitch active="salons" />
        <MapContainer onBoundsChanged={handleBoundsChanged} center={mapCenter} zoom={mapZoom}>
          <SalonDataMarkers salons={salons} focusedSalonId={focusedSalonId} />
          {searchedLocation && <SearchPin lat={searchedLocation.lat} lng={searchedLocation.lng} placeId={searchedLocation.placeId} />}
        </MapContainer>
        <SalonFilterBar
          filters={filters}
          salonCount={salons.length}
          loading={loading}
          onFilterChange={setFilters}
          onPlaceSelect={handlePlaceSelect}
          onSalonSelect={handleSalonSelect}
          onSearchClear={handleSearchClear}
        />
        <LocateMe onLocate={handleLocate} />
        {loading && salons.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600 font-medium">Ladowanie salonow...</span>
            </div>
          </div>
        )}
        <footer className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 text-[10px] text-gray-400 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
          Open source — non-commercial use only · <a href="mailto:ceo@xclv.com" className="underline hover:text-gray-600">ceo@xclv.com</a>
        </footer>
      </main>
    </APIProvider>
  );
}
