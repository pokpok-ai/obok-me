"use client";

import { useState, useEffect, useRef } from "react";
import type { Parcel } from "@/types/dzialki";
import { computePolygonArea } from "@/lib/uldk";
import type { UtilityDistance } from "@/lib/overpass";
import { getUtilityCost } from "@/lib/utilityCosts";

interface ParcelInfoPanelProps {
  parcel: Parcel | null;
  onClose: () => void;
  utilityDistances?: UtilityDistance[];
  onOpenPvCalc?: () => void;
}

function formatArea(sqm: number): string {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`;
  return `${Math.round(sqm).toLocaleString("pl-PL")} m²`;
}

function computePerimeter(coords: Array<{ lat: number; lng: number }>): number {
  if (coords.length < 2) return 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  let total = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const dLat = toRad(coords[j].lat - coords[i].lat);
    const dLng = toRad(coords[j].lng - coords[i].lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(coords[i].lat)) * Math.cos(toRad(coords[j].lat)) * Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return total;
}

function getCentroid(coords: Array<{ lat: number; lng: number }>) {
  const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
  return { lat, lng };
}

const STATUS_COLORS = {
  green: "text-green-600 bg-green-50",
  yellow: "text-yellow-600 bg-yellow-50",
  red: "text-red-600 bg-red-50",
};

const UTILITY_ICONS: Record<string, string> = {
  power: "⚡",
  gas: "🔥",
  water: "💧",
  sewage: "🚽",
  internet: "🌐",
};

export function ParcelInfoPanel({ parcel, onClose, utilityDistances, onOpenPvCalc }: ParcelInfoPanelProps) {
  const [solarKwh, setSolarKwh] = useState<number | null>(null);
  const [solarLoading, setSolarLoading] = useState(false);
  const solarCacheRef = useRef<Map<string, number>>(new Map());

  // Fetch PVGIS solar data
  useEffect(() => {
    if (!parcel) { setSolarKwh(null); return; }
    const centroid = getCentroid(parcel.coordinates);
    const cacheKey = parcel.teryt;

    const cached = solarCacheRef.current.get(cacheKey);
    if (cached !== undefined) { setSolarKwh(cached); return; }

    setSolarLoading(true);
    fetch(`/api/pvgis?lat=${centroid.lat.toFixed(6)}&lng=${centroid.lng.toFixed(6)}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.yearlyEnergy === "number") {
          solarCacheRef.current.set(cacheKey, d.yearlyEnergy);
          setSolarKwh(d.yearlyEnergy);
        }
      })
      .catch(() => {})
      .finally(() => setSolarLoading(false));
  }, [parcel]);

  if (!parcel) return null;

  const area = computePolygonArea(parcel.coordinates);
  const perimeter = computePerimeter(parcel.coordinates);
  const centroid = getCentroid(parcel.coordinates);
  const locationStr = [parcel.commune, parcel.county, parcel.voivodeship].filter(Boolean).join(" · ");

  return (
    <div className="absolute top-0 right-0 z-20 w-[420px] h-full bg-white border-l border-gray-200 overflow-y-auto shadow-xl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Działka</h2>
              <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">ULDK</span>
            </div>
            <div className="text-sm text-gray-500 font-mono mt-0.5">{parcel.teryt}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* 1. POWIERZCHNIA I LOKALIZACJA */}
        <Section title="POWIERZCHNIA I LOKALIZACJA" icon="📐">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{formatArea(area)}</span>
            <span className="text-sm text-gray-400">({Math.round(perimeter)} m obwodu)</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">{locationStr}</div>
        </Section>

        {/* 2. NASŁONECZNIENIE */}
        <Section title="NASŁONECZNIENIE" icon="☀️">
          {solarLoading ? (
            <div className="text-sm text-gray-400 animate-pulse">Pobieranie danych PVGIS...</div>
          ) : solarKwh !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-yellow-600">{Math.round(solarKwh).toLocaleString("pl-PL")}</span>
              <span className="text-sm text-gray-500">kWh/kWp/rok</span>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Brak danych</div>
          )}
        </Section>

        {/* 3. RYZYKO POWODZI */}
        <Section title="RYZYKO POWODZI" icon="🌊">
          <div className="text-sm text-gray-400">
            Włącz warstwę &quot;Strefy zalewowe&quot; na mapie, aby zobaczyć dane ISOK
          </div>
        </Section>

        {/* 4. UZBROJENIE TERENU */}
        <Section title="UZBROJENIE TERENU" icon="🔌">
          {utilityDistances && utilityDistances.length > 0 ? (
            <div className="space-y-2">
              {utilityDistances.map((u) => {
                const cost = u.distance_m >= 0 ? getUtilityCost(u.type, u.distance_m) : null;
                return (
                  <div key={u.type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{UTILITY_ICONS[u.type] || "?"}</span>
                      <span className="text-gray-700">{u.label}</span>
                    </div>
                    {cost ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">{Math.round(u.distance_m)} m</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[cost.status]}`}>
                          {cost.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">❓ Brak danych</span>
                    )}
                  </div>
                );
              })}
              <p className="text-[10px] text-gray-400 mt-2">
                ⚠️ Dane poglądowe z KIUT/OSM. Uzyskaj oficjalne warunki techniczne u gestorów sieci.
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Włącz warstwę &quot;Uzbrojenie terenu&quot; aby zobaczyć odległości i koszty przyłączy
            </div>
          )}
        </Section>

        {/* 5. ESTYMACJA WARTOŚCI (AI) — placeholder */}
        <Section title="ESTYMACJA WARTOŚCI (AI)" icon="✨">
          <div className="text-sm text-gray-400">Wkrótce — analiza AI wartości działki</div>
        </Section>

        {/* 6. REKOMENDACJA AI — placeholder */}
        <Section title="REKOMENDACJA AI" icon="🤖">
          <div className="text-sm text-gray-400">Wkrótce — rekomendacja inwestycyjna AI</div>
        </Section>

        {/* 7. DANE KATASTRALNE (ULDK) */}
        <Section title="DANE KATASTRALNE (ULDK)" icon="📋">
          <div className="space-y-2">
            <CadastralRow icon="🏛️" label="Województwo" value={parcel.voivodeship} />
            <CadastralRow icon="🏢" label="Powiat" value={parcel.county} />
            <CadastralRow icon="🏘️" label="Gmina" value={parcel.commune} />
            <CadastralRow icon="📍" label="Obręb" value={parcel.region} />
            <CadastralRow icon="🔢" label="Nr działki" value={parcel.parcelNumber} />
            <CadastralRow icon="📂" label="Źródło danych" value={parcel.datasource || "ULDK GUGIK"} />
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-400 font-mono">TERYT</div>
              <div className="text-sm font-medium text-gray-800 font-mono">{parcel.teryt}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Współrzędne (środek)</div>
              <div className="text-sm font-medium text-gray-800 font-mono">
                {centroid.lat.toFixed(6)}, {centroid.lng.toFixed(6)}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex gap-2">
        <button
          onClick={onOpenPvCalc}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors"
        >
          🌞 Farma PV
        </button>
        <button
          disabled
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-400 border border-gray-200 rounded-lg text-sm font-medium cursor-not-allowed"
        >
          📊 Porównaj
        </button>
        <button
          disabled
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-400 border border-gray-200 rounded-lg text-sm font-medium cursor-not-allowed"
        >
          🔖 Zapisz
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function CadastralRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm">{icon}</span>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm font-medium text-gray-800">{value || "—"}</div>
      </div>
    </div>
  );
}
