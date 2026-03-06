"use client";

import { useEffect, useRef } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

interface SearchPinProps {
  lat: number;
  lng: number;
  placeId?: string;
}

export function SearchPin({ lat, lng }: SearchPinProps) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    circleRef.current = new google.maps.Circle({
      center: { lat, lng },
      radius: 50,
      strokeColor: "#dc2626",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      fillColor: "#ef4444",
      fillOpacity: 0.3,
      map,
    });

    return () => {
      circleRef.current?.setMap(null);
      circleRef.current = null;
    };
  }, [map, lat, lng]);


  return (
    <AdvancedMarker position={{ lat, lng }} zIndex={9999}>
      <div className="relative flex items-center justify-center">
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
