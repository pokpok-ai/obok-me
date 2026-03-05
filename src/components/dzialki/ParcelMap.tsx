"use client";

import { useCallback } from "react";
import { Map, MapMouseEvent } from "@vis.gl/react-google-maps";
import { ParcelPolygon } from "./ParcelPolygon";
import type { Parcel } from "@/types/dzialki";

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "";
const DEFAULT_CENTER = { lat: 52.05, lng: 19.95 }; // Center of Poland
const DEFAULT_ZOOM = 7;

const POLAND_BOUNDS = {
  north: 54.9,
  south: 49.0,
  east: 24.2,
  west: 14.1,
};

interface ParcelMapProps {
  parcel: Parcel | null;
  loading: boolean;
  center?: { lat: number; lng: number } | null;
  zoom?: number | null;
  onMapClick: (lat: number, lng: number) => void;
  children?: React.ReactNode;
}

export function ParcelMap({
  parcel,
  loading,
  center,
  zoom,
  onMapClick,
  children,
}: ParcelMapProps) {
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (e.detail.latLng) {
        onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
      }
    },
    [onMapClick]
  );

  return (
    <div className="relative h-full w-full">
      <Map
        mapId={MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        center={center || undefined}
        zoom={zoom || undefined}
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={true}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        minZoom={6}
        restriction={{
          latLngBounds: POLAND_BOUNDS,
          strictBounds: false,
        }}
        className="w-full h-full"
        onClick={handleClick}
      >
        <ParcelPolygon parcel={parcel} />
        {children}
      </Map>

      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-700">Wyszukiwanie działki...</span>
        </div>
      )}
    </div>
  );
}
