"use client";

import { Map } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { applyArtisticTheme } from "./artisticTheme";

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

/**
 * SVG filters for artistic map rendering.
 * - "sketch": hand-drawn wobble + paper grain + slight desaturation
 */
function ArtisticFilters() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0 }}
      aria-hidden="true"
    >
      <defs>
        <filter id="sketch" x="-3%" y="-3%" width="106%" height="106%">
          {/* 1. Hand-drawn edge wobble */}
          <feTurbulence
            type="turbulence"
            baseFrequency="0.015 0.015"
            numOctaves="3"
            seed="5"
            result="wobble"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="wobble"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          {/* 2. Paper grain texture */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
            result="grain"
          />
          <feColorMatrix
            type="saturate"
            values="0"
            in="grain"
            result="grainBW"
          />
          {/* Make grain lighter so it doesn't darken too much */}
          <feComponentTransfer in="grainBW" result="grainLight">
            <feFuncR type="linear" slope="0.15" intercept="0.85" />
            <feFuncG type="linear" slope="0.15" intercept="0.85" />
            <feFuncB type="linear" slope="0.15" intercept="0.85" />
          </feComponentTransfer>
          {/* 3. Blend displaced map with grain */}
          <feBlend
            in="displaced"
            in2="grainLight"
            mode="multiply"
            result="grained"
          />
          {/* 4. Slight warmth + desaturation for aged feel */}
          <feColorMatrix
            in="grained"
            type="matrix"
            values="0.95 0.05 0.02 0 0.02
                    0.02 0.92 0.04 0 0.01
                    0.01 0.03 0.88 0 0.00
                    0    0    0    1 0"
          />
        </filter>
      </defs>
    </svg>
  );
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

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    applyArtisticTheme(map);
    handleMoveEnd();
  }, [handleMoveEnd]);

  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom ?? undefined,
      });
    }
  }, [center, zoom]);

  return (
    <>
      <ArtisticFilters />
      {/* Apply filter only to the canvas, not the marker overlays */}
      <style>{`.maplibregl-canvas { filter: url(#sketch); }`}</style>
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
        onLoad={handleLoad}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Map>
    </>
  );
}
