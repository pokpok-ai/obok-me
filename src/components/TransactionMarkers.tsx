"use client";

import { useMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useEffect, useRef, useCallback, useState } from "react";
import type { Transaction } from "@/types";
import { TransactionInfoWindow } from "./TransactionInfoWindow";

interface TransactionMarkersProps {
  transactions: Transaction[];
}

export function TransactionMarkers({ transactions }: TransactionMarkersProps) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [selected, setSelected] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map,
        algorithmOptions: { maxZoom: 16 },
      });
    }
  }, [map]);

  useEffect(() => {
    if (!clustererRef.current) return;
    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers([...markersRef.current.values()]);
  }, [transactions]);

  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, id: number) => {
      if (marker) {
        markersRef.current.set(id, marker);
      } else {
        markersRef.current.delete(id);
      }
    },
    []
  );

  return (
    <>
      {transactions.map((t) => (
        <AdvancedMarker
          key={t.id}
          position={{ lat: t.lat, lng: t.lng }}
          ref={(marker) => setMarkerRef(marker, t.id)}
          onClick={() => setSelected(t)}
        >
          <PricePin price={t.price} type={t.property_type} />
        </AdvancedMarker>
      ))}
      {selected && (
        <TransactionInfoWindow
          transaction={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function PricePin({ price, type }: { price: number; type: string }) {
  const colors: Record<string, string> = {
    apartment: "#2563eb",
    house: "#16a34a",
    plot: "#d97706",
    commercial: "#9333ea",
  };
  const bg = colors[type] || "#2563eb";

  const shortPrice =
    price >= 1_000_000
      ? `${(price / 1_000_000).toFixed(1)}M`
      : `${Math.round(price / 1000)}k`;

  return (
    <div
      className="px-2 py-1 rounded-full text-white text-xs font-bold shadow-lg whitespace-nowrap cursor-pointer"
      style={{ backgroundColor: bg }}
    >
      {shortPrice}
    </div>
  );
}
