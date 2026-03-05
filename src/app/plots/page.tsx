"use client";

import { useState, useCallback, useRef } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { ParcelMap } from "@/components/dzialki/ParcelMap";
import { ParcelInfoPanel } from "@/components/dzialki/ParcelInfoPanel";
import { ParcelSearch } from "@/components/dzialki/ParcelSearch";
import { FloodZoneOverlay } from "@/components/dzialki/FloodZoneOverlay";
import { MpzpOverlay } from "@/components/dzialki/MpzpOverlay";
import { KiutOverlay } from "@/components/dzialki/KiutOverlay";
import { HydrologyOverlay } from "@/components/dzialki/HydrologyOverlay";
import { ForestsOverlay } from "@/components/dzialki/ForestsOverlay";
import { LayerToggles, type LayerState } from "@/components/dzialki/LayerToggles";
import { PvCalculator } from "@/components/dzialki/PvCalculator";
import { getParcelByXY } from "@/lib/uldk";
import { queryUtilities, computeUtilityDistances, type UtilityDistance } from "@/lib/overpass";
import { computePolygonArea } from "@/lib/uldk";
import type { Parcel } from "@/types/dzialki";

export default function PlotsPage() {
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [layers, setLayers] = useState<LayerState>({
    hydrology: false,
    forests: false,
    flood: false,
    utilities: false,
    mpzp: false,
  });
  const [utilityDistances, setUtilityDistances] = useState<UtilityDistance[]>([]);
  const [kiutFailed, setKiutFailed] = useState(false);
  const [pvCalcOpen, setPvCalcOpen] = useState(false);
  const utilityAbortRef = useRef<AbortController | null>(null);

  const fetchUtilityDistances = useCallback(async (p: Parcel) => {
    const centroid = {
      lat: p.coordinates.reduce((s, c) => s + c.lat, 0) / p.coordinates.length,
      lng: p.coordinates.reduce((s, c) => s + c.lng, 0) / p.coordinates.length,
    };
    const delta = 0.005; // ~500m
    utilityAbortRef.current?.abort();
    const ctrl = new AbortController();
    utilityAbortRef.current = ctrl;
    try {
      const lines = await queryUtilities(
        centroid.lat - delta, centroid.lng - delta,
        centroid.lat + delta, centroid.lng + delta,
        ctrl.signal
      );
      const distances = computeUtilityDistances(centroid.lat, centroid.lng, lines);
      setUtilityDistances(distances);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Utility query failed:", err);
      }
    }
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const result = await getParcelByXY(lat, lng);
      setParcel(result);
      if (result) fetchUtilityDistances(result);
      else setUtilityDistances([]);
    } catch (err) {
      console.error("Failed to fetch parcel:", err);
      setParcel(null);
      setUtilityDistances([]);
    } finally {
      setLoading(false);
    }
  }, [fetchUtilityDistances]);

  const handleParcelFound = useCallback((p: Parcel) => {
    setParcel(p);
    fetchUtilityDistances(p);
    if (p.coordinates.length > 0) {
      const lat = p.coordinates.reduce((s, c) => s + c.lat, 0) / p.coordinates.length;
      const lng = p.coordinates.reduce((s, c) => s + c.lng, 0) / p.coordinates.length;
      setMapCenter({ lat, lng });
      setMapZoom(17);
    }
  }, [fetchUtilityDistances]);

  const handleAddressSelect = useCallback((position: { lat: number; lng: number }) => {
    setMapCenter(position);
    setMapZoom(17);
    handleMapClick(position.lat, position.lng);
  }, [handleMapClick]);

  const toggleLayer = useCallback((layer: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

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
          <FloodZoneOverlay enabled={layers.flood} />
          <MpzpOverlay enabled={layers.mpzp} />
          <KiutOverlay enabled={layers.utilities && !kiutFailed} onLoadError={() => setKiutFailed(true)} />
          <HydrologyOverlay enabled={layers.hydrology} />
          <ForestsOverlay enabled={layers.forests} />
        </ParcelMap>

        <ParcelSearch
          onParcelFound={handleParcelFound}
          onAddressSelect={handleAddressSelect}
        />

        <ParcelInfoPanel
          parcel={parcel}
          onClose={() => { setParcel(null); setUtilityDistances([]); }}
          utilityDistances={utilityDistances}
          onOpenPvCalc={() => setPvCalcOpen(true)}
        />

        <LayerToggles layers={layers} onToggle={toggleLayer} />

        {/* PV Calculator Modal */}
        {pvCalcOpen && parcel && (
          <PvCalculator
            parcel={parcel}
            area={computePolygonArea(parcel.coordinates)}
            onClose={() => setPvCalcOpen(false)}
          />
        )}

        {/* Hint */}
        {!parcel && !loading && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm text-gray-600">
            Kliknij na mapę, aby zobaczyć dane działki
          </div>
        )}

        <footer className="absolute bottom-1 right-4 z-10 text-[10px] text-gray-400 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
          Dane: ULDK GUGIK · Geoportal · ISOK · PVGIS · OSM
        </footer>
      </main>
    </APIProvider>
  );
}
