"use client";

import { Map, Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

const DEFAULT_CENTER = { lat: 52.23, lng: 21.01 };
const DEFAULT_ZOOM = 12;
const MIN_ZOOM = 10;
const MAX_ZOOM = 16;
const WARSAW_BOUNDS: [number, number, number, number] = [20.75, 52.05, 21.35, 52.45];

/**
 * Stamen Watercolor raster style — just a background + raster source.
 * No vector tiles, no glyphs, no sprites needed.
 */
const WATERCOLOR_STYLE = {
  version: 8 as const,
  sources: {
    watercolor: {
      type: "raster" as const,
      tiles: [
        "https://watercolormaps.collection.cooperhewitt.org/tile/watercolor/{z}/{x}/{y}.jpg",
      ],
      tileSize: 256,
      maxzoom: 16,
      attribution:
        'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under ODbL.',
    },
  },
  layers: [
    {
      id: "watercolor-tiles",
      type: "raster" as const,
      source: "watercolor",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

interface WatercolorMapContainerProps {
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

export function WatercolorMapContainer({
  onBoundsChanged,
  center,
  zoom,
  children,
}: WatercolorMapContainerProps) {
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
      mapStyle={WATERCOLOR_STYLE}
      initialViewState={{
        longitude: DEFAULT_CENTER.lng,
        latitude: DEFAULT_CENTER.lat,
        zoom: DEFAULT_ZOOM,
      }}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={WARSAW_BOUNDS}
      onMoveEnd={handleMoveEnd}
      onLoad={handleMoveEnd}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </Map>
  );
}
