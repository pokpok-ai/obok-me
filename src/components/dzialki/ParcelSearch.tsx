"use client";

import { useState, useRef, useCallback } from "react";
import { getParcelByIdOrNr } from "@/lib/uldk";
import type { Parcel } from "@/types/dzialki";

interface ParcelSearchProps {
  onParcelFound: (parcel: Parcel) => void;
  onAddressSelect: (position: { lat: number; lng: number }) => void;
}

export function ParcelSearch({ onParcelFound, onAddressSelect }: ParcelSearchProps) {
  const [mode, setMode] = useState<"address" | "teryt">("address");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ display: string; lat: number; lng: number }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Nominatim geocoding for address search
  const searchAddress = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&countrycodes=pl&limit=5&viewbox=20.75,52.05,21.35,52.45&bounded=1`,
        { headers: { "Accept-Language": "pl" } }
      );
      const data = await resp.json();
      setSuggestions(
        data.map((r: { display_name: string; lat: string; lon: string }) => ({
          display: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }))
      );
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setError(null);
    if (mode === "address") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchAddress(value), 300);
    }
  };

  const handleAddressSelect = (s: { display: string; lat: number; lng: number }) => {
    setQuery(s.display.split(",")[0]);
    setShowSuggestions(false);
    setSuggestions([]);
    onAddressSelect({ lat: s.lat, lng: s.lng });
  };

  const handleTerytSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const parcel = await getParcelByIdOrNr(query.trim());
      if (parcel) {
        onParcelFound(parcel);
      } else {
        setError("Nie znaleziono działki o podanym numerze");
      }
    } catch {
      setError("Błąd wyszukiwania");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && mode === "teryt") {
      handleTerytSearch();
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-4 z-20"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-[320px]">
        {/* Mode Toggle */}
        <div className="flex gap-1 mb-2 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => { setMode("address"); setQuery(""); setError(null); setSuggestions([]); }}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              mode === "address"
                ? "bg-white text-gray-900 shadow-sm font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Adres
          </button>
          <button
            onClick={() => { setMode("teryt"); setQuery(""); setError(null); setSuggestions([]); setShowSuggestions(false); }}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              mode === "teryt"
                ? "bg-white text-gray-900 shadow-sm font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Nr działki / TERYT
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "address"
                ? "Szukaj adresu..."
                : "np. 146508_8.0006.51/2"
            }
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-400 focus:border-pink-400"
          />
          {mode === "teryt" && query && (
            <button
              onClick={handleTerytSearch}
              disabled={loading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-pink-600 text-white text-xs px-2.5 py-1 rounded-md hover:bg-pink-700 disabled:opacity-50"
            >
              {loading ? "..." : "Szukaj"}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-2 text-xs text-red-500">{error}</div>
        )}

        {/* Address Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-[200px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleAddressSelect(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <span className="text-gray-800">{s.display.split(",")[0]}</span>
                <span className="text-gray-400 text-xs ml-1">
                  {s.display.split(",").slice(1, 3).join(",")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
