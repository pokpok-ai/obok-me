"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { ReactNode } from "react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "";

// Default center: Warsaw
const DEFAULT_CENTER = { lat: 52.23, lng: 21.01 };
const DEFAULT_ZOOM = 12;

// Warsaw + surroundings bounds (restrict pan/zoom)
const WARSAW_BOUNDS = {
  north: 52.45,
  south: 52.05,
  east: 21.35,
  west: 20.75,
};
const MIN_ZOOM = 10; // prevent zooming out beyond Warsaw metro area

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
        disableDefaultUI={true}
        zoomControl={false}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        minZoom={MIN_ZOOM}
        restriction={{
          latLngBounds: WARSAW_BOUNDS,
          strictBounds: false,
        }}
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
