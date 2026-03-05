"use client";

import type { Parcel } from "@/types/dzialki";
import { computePolygonArea } from "@/lib/uldk";

interface ParcelInfoPanelProps {
  parcel: Parcel | null;
  onClose: () => void;
}

function formatArea(sqm: number): string {
  if (sqm >= 10000) {
    return `${(sqm / 10000).toFixed(2)} ha`;
  }
  return `${Math.round(sqm).toLocaleString("pl-PL")} m²`;
}

function getCentroid(coords: Array<{ lat: number; lng: number }>): {
  lat: number;
  lng: number;
} {
  const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
  return { lat, lng };
}

export function ParcelInfoPanel({ parcel, onClose }: ParcelInfoPanelProps) {
  if (!parcel) return null;

  const area = computePolygonArea(parcel.coordinates);
  const centroid = getCentroid(parcel.coordinates);

  return (
    <div className="absolute top-4 right-4 z-20 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-fuchsia-700 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider opacity-80">
              Działka
            </div>
            <div className="text-lg font-bold mt-0.5">
              {parcel.parcelNumber || parcel.teryt}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        {/* Area */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-gray-500">Powierzchnia</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatArea(area)}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="TERYT" value={parcel.teryt} />
          <InfoItem label="Nr działki" value={parcel.parcelNumber} />
          <InfoItem label="Województwo" value={parcel.voivodeship} />
          <InfoItem label="Powiat" value={parcel.county} />
          <InfoItem label="Gmina" value={parcel.commune} />
          <InfoItem label="Obręb" value={parcel.region} />
        </div>

        {/* Coordinates */}
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            Centroid: {centroid.lat.toFixed(6)}, {centroid.lng.toFixed(6)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Źródło: {parcel.datasource || "ULDK GUGIK"}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-800 mt-0.5 truncate">
        {value || "—"}
      </div>
    </div>
  );
}
