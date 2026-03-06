"use client";

import { useEffect, useRef, useState } from "react";
import { useMap, InfoWindow, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
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

function groupByCategory(services: SalonService[]): Map<string, SalonService[]> {
  const map = new Map<string, SalonService[]>();
  for (const svc of services) {
    const cat = svc.category || "Inne";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(svc);
  }
  return map;
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

// Inject pulse keyframes once
let pulseInjected = false;
function injectPulseAnimation() {
  if (pulseInjected) return;
  pulseInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes salon-ping {
      0% { transform: scale(1); opacity: 0.8; }
      75%, 100% { transform: scale(2.5); opacity: 0; }
    }
    @keyframes salon-pulse {
      0%, 100% { transform: scale(1); opacity: 0.4; }
      50% { transform: scale(1.5); opacity: 0.15; }
    }
  `;
  document.head.appendChild(style);
}

function buildMarkerElement(salon: Salon, focused = false): HTMLElement {
  const color = focused ? "#ef4444" : getCategoryColor(salon.category_id);
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;position:relative;";

  if (focused) {
    injectPulseAnimation();
    const ring1 = document.createElement("div");
    ring1.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:rgba(239,68,68,0.3);animation:salon-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;pointer-events:none;z-index:0;`;
    const ring2 = document.createElement("div");
    ring2.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:rgba(239,68,68,0.2);animation:salon-pulse 2s ease-in-out infinite;pointer-events:none;z-index:0;`;
    wrapper.appendChild(ring1);
    wrapper.appendChild(ring2);
  }

  const dot = document.createElement("div");
  dot.style.cssText = `position:relative;width:${focused ? 34 : 28}px;height:${focused ? 34 : 28}px;border-radius:50%;background:${color};border:${focused ? 3 : 2}px solid white;box-shadow:0 ${focused ? 2 : 1}px ${focused ? 8 : 4}px rgba(0,0,0,${focused ? 0.4 : 0.25});display:flex;align-items:center;justify-content:center;z-index:1;`;
  dot.innerHTML = `<svg width="${focused ? 16 : 14}" height="${focused ? 16 : 14}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><path d="M20 4L8.12 15.88"/><path d="M14.47 14.48L20 20"/><path d="M8.12 8.12L12 12"/></svg>`;

  if (salon.has_promotion && salon.max_discount_pct > 0) {
    const badge = document.createElement("div");
    badge.style.cssText = `position:absolute;top:-6px;right:-10px;background:#dc2626;color:white;font-size:9px;font-weight:700;padding:1px 4px;border-radius:6px;line-height:14px;white-space:nowrap;`;
    badge.textContent = `-${salon.max_discount_pct}%`;
    dot.appendChild(badge);
  }

  const pin = document.createElement("div");
  pin.style.cssText = `width:0;height:0;border-left:${focused ? 6 : 5}px solid transparent;border-right:${focused ? 6 : 5}px solid transparent;border-top:${focused ? 8 : 7}px solid ${color};margin-top:-1px;z-index:1;`;

  wrapper.appendChild(dot);
  wrapper.appendChild(pin);
  return wrapper;
}

interface SalonDataMarkersProps {
  salons: Salon[];
  focusedSalonId?: number | null;
}

export function SalonDataMarkers({ salons, focusedSalonId }: SalonDataMarkersProps) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");
  const [selected, setSelected] = useState<Salon | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const salonsById = useRef<Map<number, Salon>>(new Map());

  // Init clusterer once map + marker library are ready
  useEffect(() => {
    if (!map || !markerLib) return;

    clustererRef.current = new MarkerClusterer({
      map,
      renderer: {
        render({ count, position }) {
          const el = document.createElement("div");
          el.style.cssText = `width:40px;height:40px;border-radius:50%;background:#7c3aed;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;cursor:pointer;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);`;
          el.textContent = count > 999 ? "999+" : String(count);
          return new markerLib.AdvancedMarkerElement({
            position,
            content: el,
            zIndex: 100,
          });
        },
      },
    });

    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
    };
  }, [map, markerLib]);

  // Sync markers when salons or markerLib change
  useEffect(() => {
    if (!clustererRef.current || !markerLib) return;

    salonsById.current.clear();
    for (const salon of salons) salonsById.current.set(salon.id, salon);

    const currentIds = new Set(salons.map((s) => s.id));

    // Remove stale markers
    const toRemove: google.maps.marker.AdvancedMarkerElement[] = [];
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        toRemove.push(marker);
        markersRef.current.delete(id);
      }
    }
    if (toRemove.length > 0) clustererRef.current.removeMarkers(toRemove);

    // Add new markers
    const toAdd: google.maps.marker.AdvancedMarkerElement[] = [];
    for (const salon of salons) {
      if (markersRef.current.has(salon.id)) continue;

      const isFocused = salon.id === focusedSalonId;
      const el = buildMarkerElement(salon, isFocused);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(salonsById.current.get(salon.id) || salon);
      });

      const marker = new markerLib.AdvancedMarkerElement({
        position: { lat: salon.lat, lng: salon.lng },
        content: el,
        zIndex: isFocused ? 9999 : 200,
      });

      markersRef.current.set(salon.id, marker);
      toAdd.push(marker);

      // Auto-open InfoWindow for focused salon that just appeared
      if (isFocused) {
        setSelected(salon);
      }
    }
    if (toAdd.length > 0) clustererRef.current.addMarkers(toAdd);
  }, [salons, markerLib, focusedSalonId]);

  // Auto-open InfoWindow + highlight marker when focusedSalonId changes
  const prevFocusedRef = useRef<number | null>(null);
  useEffect(() => {
    // Restore previous focused marker to normal style
    if (prevFocusedRef.current != null && prevFocusedRef.current !== focusedSalonId) {
      const prevSalon = salonsById.current.get(prevFocusedRef.current);
      const prevMarker = markersRef.current.get(prevFocusedRef.current);
      if (prevSalon && prevMarker) {
        const normalEl = buildMarkerElement(prevSalon, false);
        normalEl.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelected(salonsById.current.get(prevFocusedRef.current!) || prevSalon);
        });
        prevMarker.content = normalEl;
      }
    }
    prevFocusedRef.current = focusedSalonId ?? null;

    if (focusedSalonId == null) return;
    const salon = salonsById.current.get(focusedSalonId);
    if (salon) {
      setSelected(salon);
      // Restyle marker to red + animated
      const marker = markersRef.current.get(focusedSalonId);
      if (marker) {
        const focusedEl = buildMarkerElement(salon, true);
        focusedEl.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelected(salonsById.current.get(focusedSalonId) || salon);
        });
        marker.content = focusedEl;
        marker.zIndex = 9999;
      }
    }
  }, [focusedSalonId]);

  if (!selected) return null;

  return (
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
  );
}
