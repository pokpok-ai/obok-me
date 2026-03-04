"use client";

import { Map } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = { lat: 52.23, lng: 21.01 };
const DEFAULT_ZOOM = 12;
const MIN_ZOOM = 10;
const WARSAW_BOUNDS: [number, number, number, number] = [20.75, 52.05, 21.35, 52.45];

interface MapContainerProps {
  onBoundsChanged: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  center?: { lat: number; lng: number } | null;
  zoom?: number | null;
  children?: ReactNode;
}

export function MapContainer({
  onBoundsChanged,
  center,
  zoom,
  children,
}: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    onBoundsChanged({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [onBoundsChanged]);

  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom ?? undefined,
      });
    }
  }, [center, zoom]);

  return (
    <Map
      ref={mapRef}
      mapStyle={MAP_STYLE}
      initialViewState={{
        longitude: DEFAULT_CENTER.lng,
        latitude: DEFAULT_CENTER.lat,
        zoom: DEFAULT_ZOOM,
      }}
      minZoom={MIN_ZOOM}
      maxBounds={WARSAW_BOUNDS}
      onMoveEnd={handleMoveEnd}
      onLoad={handleMoveEnd}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </Map>
  );
}
