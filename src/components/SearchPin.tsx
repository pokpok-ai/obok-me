"use client";

import { useEffect, useRef } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

interface SearchPinProps {
  lat: number;
  lng: number;
  placeId?: string;
}

function pointInPolygon(
  pt: { lat: number; lng: number },
  poly: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i].lat, xi = poly[i].lng;
    const yj = poly[j].lat, xj = poly[j].lng;
    if ((yi > pt.lat) !== (yj > pt.lat) && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function extractCoords(el: { type: string; geometry?: { lat: number; lon: number }[]; members?: { role: string; geometry?: { lat: number; lon: number }[] }[] }): { lat: number; lng: number }[] | null {
  if (el.type === "way" && el.geometry) {
    return el.geometry.map((g) => ({ lat: g.lat, lng: g.lon }));
  }
  if (el.type === "relation" && el.members) {
    const outer = el.members.find((m) => m.role === "outer" && m.geometry);
    if (outer?.geometry) {
      return outer.geometry.map((g) => ({ lat: g.lat, lng: g.lon }));
    }
  }
  return null;
}

async function fetchBuildingPolygon(
  lat: number,
  lng: number
): Promise<{ lat: number; lng: number }[] | null> {
  const query = `[out:json][timeout:5];(way["building"](around:50,${lat},${lng});relation["building"](around:50,${lat},${lng}););out geom;`;
  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.elements || data.elements.length === 0) return null;

    const pt = { lat, lng };

    // First: find the building that contains the point
    for (const el of data.elements) {
      const coords = extractCoords(el);
      if (coords && pointInPolygon(pt, coords)) return coords;
    }

    // Fallback: closest building by distance to centroid
    let bestCoords: { lat: number; lng: number }[] | null = null;
    let bestDist = Infinity;
    for (const el of data.elements) {
      const coords = extractCoords(el);
      if (!coords) continue;
      const cx = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
      const cy = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
      const d = (cx - lat) ** 2 + (cy - lng) ** 2;
      if (d < bestDist) { bestDist = d; bestCoords = coords; }
    }
    return bestCoords;
  } catch {
    return null;
  }
}

export function SearchPin({ lat, lng }: SearchPinProps) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  // Fetch OSM building polygon and render it
  useEffect(() => {
    if (!map) return;
    let cancelled = false;

    // Show circle immediately as fallback
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    circleRef.current = new google.maps.Circle({
      center: { lat, lng },
      radius: 30,
      strokeColor: "#dc2626",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#ef4444",
      fillOpacity: 0.2,
      map,
    });

    fetchBuildingPolygon(lat, lng).then((coords) => {
      if (cancelled) return;
      if (!coords) return; // Keep circle as fallback

      // Remove circle — polygon replaces it
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }

      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }

      polygonRef.current = new google.maps.Polygon({
        paths: coords,
        strokeColor: "#dc2626",
        strokeOpacity: 1,
        strokeWeight: 3,
        fillColor: "#ef4444",
        fillOpacity: 0.4,
        map,
        zIndex: 500,
      });
    });

    return () => {
      cancelled = true;
      circleRef.current?.setMap(null);
      circleRef.current = null;
      polygonRef.current?.setMap(null);
      polygonRef.current = null;
    };
  }, [map, lat, lng]);

  return (
    <AdvancedMarker position={{ lat, lng }} zIndex={9999}>
      <div className="relative flex items-center justify-center" style={{ pointerEvents: "none" }}>
        {/* Pulsing ring */}
        <div
          className="absolute w-16 h-16 rounded-full animate-ping"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.25)", animationDuration: "1.5s" }}
        />
        <div
          className="absolute w-12 h-12 rounded-full animate-pulse"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
        />
        {/* Pin */}
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#ef4444" />
          <circle cx="16" cy="16" r="7" fill="white" />
        </svg>
      </div>
    </AdvancedMarker>
  );
}
