"use client";

import { useMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { Transaction } from "@/types";
import { TransactionInfoWindow } from "./TransactionInfoWindow";

interface TransactionMarkersProps {
  transactions: Transaction[];
  focusedTransaction?: Transaction | null;
  onFocusConsumed?: () => void;
  avgPricePerSqm?: number | null;
  onCompare?: (transaction: Transaction) => void;
}

export function TransactionMarkers({ transactions, focusedTransaction, onFocusConsumed, avgPricePerSqm, onCompare }: TransactionMarkersProps) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = `${t.lat},${t.lng}`;
      const arr = map.get(key);
      if (arr) arr.push(t);
      else map.set(key, [t]);
    }
    return [...map.values()];
  }, [transactions]);

  // Collapse when transactions change (new viewport)
  useEffect(() => {
    setExpandedKey(null);
  }, [transactions]);

  // Auto-select when a focused transaction is passed from the filter bar
  useEffect(() => {
    if (focusedTransaction) {
      setSelected(focusedTransaction);
      onFocusConsumed?.();
    }
  }, [focusedTransaction, onFocusConsumed]);

  useEffect(() => {
    if (!map) return;
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map,
        algorithmOptions: { maxZoom: 16 },
        renderer: {
          render: ({ count, position }) => {
            const size = count >= 100 ? 48 : count >= 20 ? 40 : 32;
            const half = size / 2;
            const fontSize = size >= 40 ? 13 : 11;
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
              <circle cx="${half}" cy="${half}" r="${half}" fill="#d946ef" opacity="0.85"/>
              <circle cx="${half}" cy="${half}" r="${half - 3}" fill="#c026d3" opacity="0.9"/>
              <text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" fill="white" font-size="${fontSize}" font-weight="bold" font-family="system-ui">${count}</text>
            </svg>`;
            return new google.maps.marker.AdvancedMarkerElement({
              position,
              content: new DOMParser().parseFromString(svg, "image/svg+xml").documentElement,
              zIndex: count,
            });
          },
        },
      });
    }
  }, [map]);

  useEffect(() => {
    if (!clustererRef.current) return;
    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers([...markersRef.current.values()]);
  }, [transactions]);

  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => {
      if (marker) {
        markersRef.current.set(key, marker);
      } else {
        markersRef.current.delete(key);
      }
    },
    []
  );

  return (
    <>
      {grouped.map((group) => {
        const first = group[0];
        const key = `${first.lat},${first.lng}`;
        const isExpanded = expandedKey === key;

        const byType = Object.entries(
          group.reduce<Record<string, Transaction[]>>((acc, t) => {
            const ft = t.function_type || t.property_type;
            (acc[ft] ||= []).push(t);
            return acc;
          }, {})
        );

        return (
          <AdvancedMarker
            key={key}
            position={{ lat: first.lat, lng: first.lng }}
            ref={(marker) => setMarkerRef(marker, key)}
            onClick={() => setSelected(group[0])}
            zIndex={isExpanded ? 1000 : undefined}
          >
            {isExpanded ? (
              <div className="flex items-end gap-1" >
                {byType.map(([type, items]) => (
                  <div key={type} className="flex flex-col items-center gap-0.5">
                    {items.map((t) => (
                      <div key={t.id} onClick={(e) => { e.stopPropagation(); setSelected(t); }}>
                        <PricePin price={t.price} pricePerSqm={t.price_per_sqm} type={type} avgPricePerSqm={avgPricePerSqm} />
                      </div>
                    ))}
                  </div>
                ))}
                <div
                  onClick={(e) => { e.stopPropagation(); setExpandedKey(null); }}
                  className="px-1.5 py-0.5 rounded-full bg-gray-700 text-white text-[10px] font-bold shadow-lg cursor-pointer mb-0.5"
                >
                  ✕
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5" >
                {byType.map(([type, items]) => (
                  <div
                    key={type}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (items.length === 1) {
                        setSelected(items[0]);
                      } else {
                        setExpandedKey(key);
                      }
                    }}
                  >
                    <PricePin count={items.length} type={type} avgPricePerSqm={avgPricePerSqm} />
                  </div>
                ))}
              </div>
            )}
          </AdvancedMarker>
        );
      })}
      {selected && (
        <TransactionInfoWindow
          transaction={selected}
          onClose={() => setSelected(null)}
          onCompare={onCompare}
        />
      )}
    </>
  );
}

function getPriceColor(pricePerSqm: number | null | undefined, avg: number | null | undefined): string {
  if (!pricePerSqm || !avg || avg === 0) return "#6b7280"; // gray fallback
  const ratio = pricePerSqm / avg;
  if (ratio <= 0.7) return "#16a34a";  // green — very cheap
  if (ratio <= 0.9) return "#65a30d";  // lime — below avg
  if (ratio <= 1.1) return "#3b82f6";  // blue — around avg
  if (ratio <= 1.3) return "#f59e0b";  // amber — above avg
  return "#dc2626";                     // red — expensive
}

function PricePin({ price, pricePerSqm, type, count, avgPricePerSqm }: {
  price?: number;
  pricePerSqm?: number | null;
  type: string;
  count?: number;
  avgPricePerSqm?: number | null;
}) {
  const typeColors: Record<string, string> = {
    mieszkalna: "#d946ef",
    garaz: "#6b7280",
    inne: "#d97706",
    handlowoUslugowa: "#9333ea",
  };

  // Use price-relative coloring when we have per-sqm data, otherwise fall back to type
  const bg = (pricePerSqm && avgPricePerSqm)
    ? getPriceColor(pricePerSqm, avgPricePerSqm)
    : typeColors[type] || "#d946ef";

  let label: string;
  if (count != null) {
    label = `${count}`;
  } else if (price != null) {
    label =
      price >= 1_000_000
        ? `${(price / 1_000_000).toFixed(1)}M`
        : `${Math.round(price / 1000)}k`;
  } else {
    label = "?";
  }

  return (
    <div
      className="px-2 py-1 rounded-full text-white text-xs font-bold shadow-lg whitespace-nowrap cursor-pointer"
      style={{ backgroundColor: bg }}
    >
      {label}
    </div>
  );
}
