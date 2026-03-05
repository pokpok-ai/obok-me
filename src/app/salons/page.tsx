"use client";

import { useState, useCallback } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { MapContainer } from "@/components/MapContainer";
import { SalonDataMarkers } from "@/components/SalonDataMarkers";
import { LocateMe } from "@/components/LocateMe";
import { useSalons } from "@/hooks/useSalons";
import { useDebounce } from "@/hooks/useDebounce";
import type { ViewBounds } from "@/types";

export default function SalonsPage() {
  const [bounds, setBounds] = useState<ViewBounds | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);

  const debouncedBounds = useDebounce(bounds, 400);
  const { salons, loading } = useSalons(debouncedBounds);

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
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <APIProvider apiKey={apiKey} version="weekly">
      <main className="h-screen w-screen relative overflow-hidden">
        <MapContainer onBoundsChanged={handleBoundsChanged} center={mapCenter} zoom={mapZoom}>
          <SalonDataMarkers salons={salons} />
        </MapContainer>
        <LocateMe onLocate={handleLocate} />
        {loading && salons.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600 font-medium">Ladowanie salonow...</span>
            </div>
          </div>
        )}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow text-sm font-medium text-gray-700">
          {salons.length > 0 ? `${salons.length} salonow w widoku` : "Salony urody — Warszawa"}
        </div>
        <footer className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 text-[10px] text-gray-400 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
          Open source — non-commercial use only · <a href="mailto:ceo@xclv.com" className="underline hover:text-gray-600">ceo@xclv.com</a>
        </footer>
      </main>
    </APIProvider>
  );
}
