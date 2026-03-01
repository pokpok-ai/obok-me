"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { ReactNode } from "react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "";

// Default center: Warsaw
const DEFAULT_CENTER = { lat: 52.23, lng: 21.01 };
const DEFAULT_ZOOM = 12;

interface MapContainerProps {
  onBoundsChanged: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  center?: { lat: number; lng: number } | null;
  children?: ReactNode;
}

export function MapContainer({
  onBoundsChanged,
  center,
  children,
}: MapContainerProps) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        mapId={MAP_ID}
        defaultCenter={center || DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        center={center || undefined}
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={true}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        className="w-full h-full"
        onIdle={(ev) => {
          const b = ev.map.getBounds();
          if (b) {
            const ne = b.getNorthEast();
            const sw = b.getSouthWest();
            onBoundsChanged({
              north: ne.lat(),
              south: sw.lat(),
              east: ne.lng(),
              west: sw.lng(),
            });
          }
        }}
      >
        {children}
      </Map>
    </APIProvider>
  );
}
