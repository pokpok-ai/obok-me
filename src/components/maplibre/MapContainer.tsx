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
 * SVG filter that creates a subtle hand-drawn / pencil-sketch displacement
 * on the map canvas. Uses feTurbulence for organic noise + feDisplacementMap
 * to warp edges, plus a subtle paper-grain overlay.
 */
function PencilFilter() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Pencil / hand-drawn edge displacement */}
        <filter id="pencil-sketch" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.04"
            numOctaves="4"
            seed="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Paper grain texture overlay */}
        <filter id="paper-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="5"
            stitchTiles="stitch"
            result="grain"
          />
          <feColorMatrix
            type="saturate"
            values="0"
            in="grain"
            result="grainGray"
          />
          <feBlend
            in="SourceGraphic"
            in2="grainGray"
            mode="multiply"
            result="grained"
          />
          <feComponentTransfer in="grained">
            <feFuncA type="linear" slope="1" />
          </feComponentTransfer>
        </filter>

        {/* Combined: pencil displacement + paper grain */}
        <filter id="artistic" x="-2%" y="-2%" width="104%" height="104%">
          {/* Step 1: pencil wobble */}
          <feTurbulence
            type="turbulence"
            baseFrequency="0.03"
            numOctaves="4"
            seed="3"
            result="wobble"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="wobble"
            scale="2"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          {/* Step 2: paper grain */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.5"
            numOctaves="4"
            stitchTiles="stitch"
            result="paper"
          />
          <feColorMatrix
            type="saturate"
            values="0"
            in="paper"
            result="paperGray"
          />
          <feBlend
            in="displaced"
            in2="paperGray"
            mode="multiply"
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
      <PencilFilter />
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Paper texture underlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundColor: "#f2ece3",
            filter: "url(#paper-grain)",
            opacity: 0.15,
            pointerEvents: "none",
          }}
        />
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
          style={{
            width: "100%",
            height: "100%",
            filter: "url(#pencil-sketch)",
          }}
        >
          {children}
        </Map>
      </div>
    </>
  );
}
