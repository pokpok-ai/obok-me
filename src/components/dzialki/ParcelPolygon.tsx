"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { Parcel } from "@/types/dzialki";

interface ParcelPolygonProps {
  parcel: Parcel | null;
}

export function ParcelPolygon({ parcel }: ParcelPolygonProps) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    // Clean up previous polygon
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    if (!parcel || parcel.coordinates.length === 0) return;

    const path = parcel.coordinates.map((c) => ({
      lat: c.lat,
      lng: c.lng,
    }));

    const polygon = new google.maps.Polygon({
      paths: path,
      strokeColor: "#e11d9b",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      fillColor: "#e11d9b",
      fillOpacity: 0.12,
      map,
    });

    polygonRef.current = polygon;

    return () => {
      polygon.setMap(null);
    };
  }, [map, parcel]);

  return null;
}
