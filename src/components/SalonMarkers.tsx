"use client";

import { useState } from "react";
import { AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";

interface GBarSalon {
  name: string;
  address: string;
  phone: string | null;
  lat: number;
  lng: number;
  slug: string;
}

const GBAR_SALONS: GBarSalon[] = [
  {
    name: "G x Bar Match",
    address: "Warszawa, Przyokopowa 26",
    phone: "+48512874308",
    lat: 52.2326,
    lng: 20.9843,
    slug: "g-x-bar-match",
  },
  {
    name: "G x Bar Urban",
    address: "Warszawa, Grzybowska 4",
    phone: "+48512874309",
    lat: 52.2348,
    lng: 20.9920,
    slug: "g-x-bar-urban",
  },
  {
    name: "G x Bar Milk",
    address: "Warszawa, Nowogrodzka 6A",
    phone: "+48575111934",
    lat: 52.2277,
    lng: 21.0095,
    slug: "g-x-bar-milk",
  },
  {
    name: "G x Bar Hip",
    address: "Warszawa, Marszalkowska 32",
    phone: null,
    lat: 52.2282,
    lng: 21.0153,
    slug: "g-x-bar-hip",
  },
  {
    name: "GxBar Well",
    address: "Warszawa, Franciszka Klimczaka 17",
    phone: null,
    lat: 52.1774,
    lng: 21.0284,
    slug: "gxbar-well",
  },
];

export function SalonMarkers() {
  const [selected, setSelected] = useState<GBarSalon | null>(null);

  return (
    <>
      {GBAR_SALONS.map((salon) => (
        <AdvancedMarker
          key={salon.slug}
          position={{ lat: salon.lat, lng: salon.lng }}
          onClick={() => setSelected(salon)}
          zIndex={500}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                border: "3px solid white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              G
            </div>
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: "9px solid #2563eb",
                marginTop: -2,
              }}
            />
          </div>
        </AdvancedMarker>
      ))}
      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
          headerDisabled
        >
          <div style={{ padding: 4, minWidth: 220, maxWidth: 280, position: "relative", paddingRight: 24 }}>
            <button
              onClick={() => setSelected(null)}
              style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", cursor: "pointer", fontSize: 18, border: "none", background: "none" }}
              aria-label="Close"
            >
              &times;
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
              {selected.name}
            </div>
            <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 4 }}>
              📍 {selected.address}
            </div>
            {selected.phone && (
              <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
                📞{" "}
                <a
                  href={`tel:${selected.phone}`}
                  style={{ color: "#2563eb", textDecoration: "underline" }}
                >
                  {selected.phone}
                </a>
              </div>
            )}
            <a
              href={`https://gbar.pl/pl/salon/warsaw/${selected.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "white",
                backgroundColor: "#1d4ed8",
                borderRadius: 8,
                padding: "10px 0",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Wybierz ten salon
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
