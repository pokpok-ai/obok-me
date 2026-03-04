"use client";

import { Map, Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

const DEFAULT_CENTER = { lat: 52.23, lng: 21.01 };
const DEFAULT_ZOOM = 12;
const MIN_ZOOM = 10;
const MAX_ZOOM = 18;
const WARSAW_BOUNDS: [number, number, number, number] = [20.75, 52.05, 21.35, 52.45];

/**
 * Hybrid style: Stamen Watercolor raster base + OpenFreeMap vector overlay
 * for buildings, road labels, and place names.
 */
const WATERCOLOR_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    watercolor: {
      type: "raster",
      tiles: [
        "https://watercolormaps.collection.cooperhewitt.org/tile/watercolor/{z}/{x}/{y}.jpg",
      ],
      tileSize: 256,
      maxzoom: 16,
      attribution:
        'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under ODbL.',
    },
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  layers: [
    // Base: watercolor raster
    {
      id: "watercolor-tiles",
      type: "raster",
      source: "watercolor",
      minzoom: 0,
      maxzoom: 22,
    },
    // Overlay: building footprints (warm semi-transparent)
    {
      id: "buildings-fill",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-color": "#d5c9bc",
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14, 0.3,
          16, 0.55,
        ],
      },
    },
    // Overlay: building outlines
    {
      id: "buildings-outline",
      type: "line",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "line-color": "#b8a898",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14, 0.3,
          17, 0.8,
        ],
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14, 0.3,
          16, 0.6,
        ],
      },
    },
    // Overlay: road labels (warm brown)
    {
      id: "road-labels",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 14,
      layout: {
        "text-field": ["get", "name"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14, 10,
          18, 13,
        ],
        "text-font": ["Noto Sans Regular"],
        "symbol-placement": "line",
        "text-max-angle": 30,
        "text-padding": 2,
      },
      paint: {
        "text-color": "#5c4a3a",
        "text-halo-color": "rgba(242, 236, 227, 0.8)",
        "text-halo-width": 1.5,
        "text-opacity": 0.8,
      },
    },
    // Overlay: place labels (city, district names)
    {
      id: "place-labels",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      minzoom: 10,
      layout: {
        "text-field": ["get", "name"],
        "text-size": [
          "match",
          ["get", "class"],
          "city", 18,
          "town", 14,
          "suburb", 12,
          "neighbourhood", 11,
          10,
        ],
        "text-font": ["Noto Sans Bold"],
        "text-padding": 10,
        "text-anchor": "center",
      },
      paint: {
        "text-color": "#3d2e1f",
        "text-halo-color": "rgba(242, 236, 227, 0.85)",
        "text-halo-width": 2,
      },
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
