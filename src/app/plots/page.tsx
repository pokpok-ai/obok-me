"use client";

import { useState, useCallback } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { ParcelMap } from "@/components/dzialki/ParcelMap";
import { ParcelInfoPanel } from "@/components/dzialki/ParcelInfoPanel";
import { ParcelSearch } from "@/components/dzialki/ParcelSearch";
import { FloodZoneOverlay } from "@/components/dzialki/FloodZoneOverlay";
import { MpzpOverlay } from "@/components/dzialki/MpzpOverlay";
import { LayerToggles } from "@/components/dzialki/LayerToggles";
import { getParcelByXY } from "@/lib/uldk";
import type { Parcel } from "@/types/dzialki";

export default function PlotsPage() {
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [floodEnabled, setFloodEnabled] = useState(false);
  const [mpzpEnabled, setMpzpEnabled] = useState(false);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const result = await getParcelByXY(lat, lng);
      setParcel(result);
    } catch (err) {
      console.error("Failed to fetch parcel:", err);
      setParcel(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleParcelFound = useCallback((p: Parcel) => {
    setParcel(p);
    // Fly to parcel centroid
    if (p.coordinates.length > 0) {
      const lat = p.coordinates.reduce((s, c) => s + c.lat, 0) / p.coordinates.length;
      const lng = p.coordinates.reduce((s, c) => s + c.lng, 0) / p.coordinates.length;
      setMapCenter({ lat, lng });
      setMapZoom(17);
    }
  }, []);

  const handleAddressSelect = useCallback((position: { lat: number; lng: number }) => {
    setMapCenter(position);
    setMapZoom(17);
    // Also query parcel at that location
    handleMapClick(position.lat, position.lng);
  }, [handleMapClick]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <APIProvider apiKey={apiKey} version="weekly">
      <main className="h-screen w-screen relative overflow-hidden">
        <ParcelMap
          parcel={parcel}
          loading={loading}
          center={mapCenter}
          zoom={mapZoom}
          onMapClick={handleMapClick}
        >
          <FloodZoneOverlay enabled={floodEnabled} />
          <MpzpOverlay enabled={mpzpEnabled} />
        </ParcelMap>

        <ParcelSearch
          onParcelFound={handleParcelFound}
          onAddressSelect={handleAddressSelect}
        />

        <ParcelInfoPanel
          parcel={parcel}
          onClose={() => setParcel(null)}
        />

        <LayerToggles
          floodEnabled={floodEnabled}
          mpzpEnabled={mpzpEnabled}
          onFloodToggle={() => setFloodEnabled((v) => !v)}
          onMpzpToggle={() => setMpzpEnabled((v) => !v)}
        />

        {/* Hint */}
        {!parcel && !loading && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm text-gray-600">
            Kliknij na mapę, aby zobaczyć dane działki
          </div>
        )}

        <footer className="absolute bottom-1 right-4 z-10 text-[10px] text-gray-400 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
          Dane: ULDK GUGIK · Geoportal · ISOK
        </footer>
      </main>
    </APIProvider>
  );
}
