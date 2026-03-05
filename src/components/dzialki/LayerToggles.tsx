"use client";

import { useState } from "react";

export interface LayerState {
  hydrology: boolean;
  forests: boolean;
  flood: boolean;
  utilities: boolean;
  mpzp: boolean;
}

interface LayerTogglesProps {
  layers: LayerState;
  onToggle: (layer: keyof LayerState) => void;
}

const LAYER_CONFIG: Array<{
  key: keyof LayerState;
  label: string;
  icon: string;
  color: string;
  activeColor: string;
}> = [
  { key: "hydrology", label: "Hydrologia", icon: "💧", color: "blue", activeColor: "bg-blue-500 text-white" },
  { key: "forests", label: "Lasy", icon: "🌲", color: "green", activeColor: "bg-green-500 text-white" },
  { key: "flood", label: "Strefy zalewowe", icon: "⚠️", color: "orange", activeColor: "bg-orange-500 text-white" },
  { key: "utilities", label: "Uzbrojenie terenu", icon: "🔌", color: "amber", activeColor: "bg-amber-500 text-white" },
  { key: "mpzp", label: "MPZP", icon: "🗺️", color: "purple", activeColor: "bg-purple-500 text-white" },
];

export function LayerToggles({ layers, onToggle }: LayerTogglesProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-20 left-4 z-20">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-9.75 5.25m0 0v6.75m0-6.75L2.25 12m9.75 0l9.75-5.25M12 18.75l-9.75-5.25M12 18.75l9.75-5.25" />
        </svg>
        Eksplorator mapy
        <svg
          className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-1.5">
          {LAYER_CONFIG.map(({ key, label, icon, activeColor }) => (
            <button
              key={key}
              onClick={() => onToggle(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm font-medium transition-colors ${
                layers[key]
                  ? `${activeColor} border-transparent shadow-md`
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="text-sm">{icon}</span>
              {label}
              {layers[key] && (
                <span className="ml-auto w-2 h-2 rounded-full bg-white/80" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
