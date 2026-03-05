"use client";

import { useState } from "react";
import { AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import type { Salon, SalonService } from "@/types";

const CATEGORY_COLORS: Record<number, string> = {
  1: "#7c3aed",  // barber — purple
  2: "#ec4899",  // fryzjer — pink
  4: "#f59e0b",  // salon kosmetyczny — amber
  5: "#ef4444",  // salon paznokci — red
  8: "#10b981",  // depilacja — emerald
  10: "#6366f1", // masaz — indigo
  12: "#64748b", // tatuaz — slate
};

function getCategoryColor(categoryId: number | null): string {
  return (categoryId && CATEGORY_COLORS[categoryId]) || "#8b5cf6";
}

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `${Math.round(price)} zł`;
}

function ServiceRow({ service }: { service: SalonService }) {
  const hasDiscount = service.discount_pct && service.discount_pct > 0;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
      <span style={{ color: "#374151", flex: 1, marginRight: 8 }}>
        {service.name}
        {service.duration != null && (
          <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 4 }}>{service.duration} min</span>
        )}
      </span>
      <span style={{ whiteSpace: "nowrap", fontWeight: 600, textAlign: "right" }}>
        {hasDiscount && service.original_price != null && (
          <span style={{ textDecoration: "line-through", color: "#9ca3af", fontWeight: 400, marginRight: 4, fontSize: 11 }}>
            {formatPrice(service.original_price)}
          </span>
        )}
        <span style={{ color: hasDiscount ? "#dc2626" : "#111827" }}>
          {formatPrice(service.price)}
        </span>
      </span>
    </div>
  );
}

function groupByCategory(services: SalonService[]): Map<string, SalonService[]> {
  const map = new Map<string, SalonService[]>();
  for (const svc of services) {
    const cat = svc.category || "Inne";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(svc);
  }
  return map;
}

interface SalonDataMarkersProps {
  salons: Salon[];
}

export function SalonDataMarkers({ salons }: SalonDataMarkersProps) {
  const [selected, setSelected] = useState<Salon | null>(null);

  return (
    <>
      {salons.map((salon) => {
        const color = getCategoryColor(salon.category_id);
        return (
          <AdvancedMarker
            key={salon.id}
            position={{ lat: salon.lat, lng: salon.lng }}
            onClick={() => setSelected(salon)}
            zIndex={200}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: "2px solid white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="6" r="3" />
                    <path d="M20 4L8.12 15.88" />
                    <path d="M14.47 14.48L20 20" />
                    <path d="M8.12 8.12L12 12" />
                  </svg>
                </div>
                {salon.has_promotion && salon.max_discount_pct > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -10,
                      backgroundColor: "#dc2626",
                      color: "white",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "1px 4px",
                      borderRadius: 6,
                      lineHeight: "14px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    -{salon.max_discount_pct}%
                  </div>
                )}
              </div>
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `7px solid ${color}`,
                  marginTop: -1,
                }}
              />
            </div>
          </AdvancedMarker>
        );
      })}
      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
          headerDisabled
        >
          <div style={{ padding: 4, minWidth: 240, maxWidth: 300, position: "relative", paddingRight: 24 }}>
            <button
              onClick={() => setSelected(null)}
              style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", cursor: "pointer", fontSize: 18, border: "none", background: "none" }}
              aria-label="Close"
            >
              &times;
            </button>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
              {selected.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              {selected.rating != null && (
                <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>
                  {"★"} {Number(selected.rating).toFixed(1)}
                </span>
              )}
              {selected.review_count != null && selected.review_count > 0 && (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  ({selected.review_count})
                </span>
              )}
              {selected.category_name && (
                <span
                  style={{
                    fontSize: 11,
                    color: getCategoryColor(selected.category_id),
                    backgroundColor: getCategoryColor(selected.category_id) + "15",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontWeight: 500,
                  }}
                >
                  {selected.category_name}
                </span>
              )}
            </div>
            {selected.address && (
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                {selected.address}
              </div>
            )}
            {selected.has_promotion && selected.max_discount_pct > 0 && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#dc2626",
                  backgroundColor: "#fef2f2",
                  padding: "4px 8px",
                  borderRadius: 6,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Oszczedz do {selected.max_discount_pct}%
              </div>
            )}
            {selected.services && selected.services.length > 0 && (
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>
                  Cennik ({selected.services.length} usług)
                </div>
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {Array.from(groupByCategory(selected.services)).map(([cat, svcs]) => (
                    <div key={cat} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", padding: "2px 0", letterSpacing: "0.05em" }}>
                        {cat}
                      </div>
                      {svcs.map((svc, i) => (
                        <ServiceRow key={i} service={svc} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}
