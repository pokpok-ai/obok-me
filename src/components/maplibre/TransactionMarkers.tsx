"use client";

import { Source, Layer, Marker, useMap } from "react-map-gl/maplibre";
import type { LayerSpecification, GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { useState, useMemo, useEffect, useCallback } from "react";
import type { Transaction } from "@/types";
import { TransactionPopup } from "./TransactionPopup";

interface TransactionMarkersProps {
  transactions: Transaction[];
  focusedTransaction?: Transaction | null;
  onFocusConsumed?: () => void;
  avgPricePerSqm?: number | null;
  onCompare?: (transaction: Transaction) => void;
}

const clusterLayer: LayerSpecification = {
  id: "clusters",
  type: "circle",
  source: "transactions",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#d946ef",
      20, "#c026d3",
      100, "#a21caf",
    ],
    "circle-radius": [
      "step",
      ["get", "point_count"],
      16,
      20, 20,
      100, 24,
    ],
    "circle-opacity": 0.85,
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.6)",
  },
};

const clusterCountLayer: LayerSpecification = {
  id: "cluster-count",
  type: "symbol",
  source: "transactions",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 12,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

// Invisible unclustered point layer for click detection
const unclusteredLayer: LayerSpecification = {
  id: "unclustered-point",
  type: "circle",
  source: "transactions",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-radius": 0,
    "circle-opacity": 0,
  },
};

function getPriceColor(pricePerSqm: number | null | undefined, avg: number | null | undefined): string {
  if (!pricePerSqm || !avg || avg === 0) return "#6b7280";
  const ratio = pricePerSqm / avg;
  if (ratio <= 0.7) return "#16a34a";
  if (ratio <= 0.9) return "#65a30d";
  if (ratio <= 1.1) return "#3b82f6";
  if (ratio <= 1.3) return "#f59e0b";
  return "#dc2626";
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

  const bg = (pricePerSqm && avgPricePerSqm)
    ? getPriceColor(pricePerSqm, avgPricePerSqm)
    : typeColors[type] || "#d946ef";

  let label: string;
  if (count != null) {
    label = `${count}`;
  } else if (price != null) {
    label = price >= 1_000_000
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

export function TransactionMarkers({
  transactions,
  focusedTransaction,
  onFocusConsumed,
  avgPricePerSqm,
  onCompare,
}: TransactionMarkersProps) {
  const { current: mapRef } = useMap();
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [zoom, setZoom] = useState(12);

  const geojson = useMemo((): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: transactions.map((t) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [t.lng, t.lat] },
      properties: { id: t.id },
    })),
  }), [transactions]);

  const txMap = useMemo(() => {
    const m = new Map<number, Transaction>();
    for (const t of transactions) m.set(t.id, t);
    return m;
  }, [transactions]);

  const grouped = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = `${t.lat},${t.lng}`;
      const arr = m.get(key);
      if (arr) arr.push(t);
      else m.set(key, [t]);
    }
    return [...m.entries()];
  }, [transactions]);

  useEffect(() => { setExpandedKey(null); }, [transactions]);

  useEffect(() => {
    if (focusedTransaction) {
      setSelected(focusedTransaction);
      onFocusConsumed?.();
    }
  }, [focusedTransaction, onFocusConsumed]);

  // Track zoom for rendering strategy
  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    const onZoom = () => setZoom(Math.floor(map.getZoom()));
    map.on("zoomend", onZoom);
    return () => { map.off("zoomend", onZoom); };
  }, [mapRef]);

  // Cluster click → zoom in
  const onClusterClick = useCallback((e: MapMouseEvent) => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
    if (!features.length) return;

    const clusterId = features[0].properties?.cluster_id;
    if (clusterId == null) return;

    const source = map.getSource("transactions") as GeoJSONSource;
    source.getClusterExpansionZoom(clusterId).then((expansionZoom) => {
      const geo = features[0].geometry;
      if (geo.type !== "Point") return;
      map.flyTo({ center: geo.coordinates as [number, number], zoom: expansionZoom });
    });
  }, [mapRef]);

  // Show DOM markers only at high zoom where count is manageable
  const showDomMarkers = zoom >= 13;

  return (
    <>
      <Source
        id="transactions"
        type="geojson"
        data={geojson}
        cluster={true}
        clusterMaxZoom={15}
        clusterRadius={50}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredLayer} />
      </Source>

      {/* Click handler for cluster circles */}
      {mapRef && (
        <ClusterClickHandler onClusterClick={onClusterClick} />
      )}

      {/* DOM markers for individual transactions at high zoom */}
      {showDomMarkers && grouped.map(([key, group]) => {
        const first = group[0];
        const isExpanded = expandedKey === key;

        const byType = Object.entries(
          group.reduce<Record<string, Transaction[]>>((acc, t) => {
            const ft = t.function_type || t.property_type;
            (acc[ft] ||= []).push(t);
            return acc;
          }, {})
        );

        return (
          <Marker
            key={key}
            longitude={first.lng}
            latitude={first.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              if (group.length === 1) {
                setSelected(group[0]);
              } else {
                setExpandedKey(isExpanded ? null : key);
              }
            }}
          >
            {isExpanded ? (
              <div className="flex items-end gap-1">
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
              <div className="flex flex-col items-center gap-0.5">
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
          </Marker>
        );
      })}

      {selected && (
        <TransactionPopup
          transaction={selected}
          onClose={() => setSelected(null)}
          onCompare={onCompare}
        />
      )}
    </>
  );
}

/** Attaches cluster click handler via map events */
function ClusterClickHandler({ onClusterClick }: { onClusterClick: (e: MapMouseEvent) => void }) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    map.on("click", "clusters", onClusterClick);
    map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
    return () => {
      map.off("click", "clusters", onClusterClick);
      map.off("mouseenter", "clusters", () => {});
      map.off("mouseleave", "clusters", () => {});
    };
  }, [mapRef, onClusterClick]);

  return null;
}
