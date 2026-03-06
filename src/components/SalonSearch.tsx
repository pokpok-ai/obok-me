"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { searchSalonsByName, type SalonSearchResult } from "@/lib/salon-search";

interface SalonSearchProps {
  onSelect: (position: { lat: number; lng: number }, address?: string, placeId?: string) => void;
  onSalonSelect?: (salonId: number, position: { lat: number; lng: number }) => void;
  onClear?: () => void;
}

const WARSAW_BOUNDS = {
  north: 52.45,
  south: 52.05,
  east: 21.35,
  west: 20.75,
};

const CATEGORY_COLORS: Record<string, string> = {
  barber: "#7c3aed",
  fryzjer: "#ec4899",
  paznokcie: "#ef4444",
  "brwi-i-rzesy": "#f59e0b",
  inne: "#64748b",
};

export function SalonSearch({ onSelect, onSalonSelect, onClear }: SalonSearchProps) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [salonResults, setSalonResults] = useState<SalonSearchResult[]>([]);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!places) return;
    autocompleteService.current = new places.AutocompleteService();
    const div = document.createElement("div");
    placesService.current = new places.PlacesService(div);
  }, [places]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchResults = useCallback(
    (input: string) => {
      if (input.length < 2) {
        setSalonResults([]);
        setPredictions([]);
        setOpen(false);
        return;
      }

      // Fetch salon names and Google Places in parallel
      searchSalonsByName(input).then((salons) => {
        setSalonResults(salons);
        if (salons.length > 0) setOpen(true);
      });

      if (autocompleteService.current) {
        autocompleteService.current.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: "pl" },
            locationBias: new google.maps.LatLngBounds(
              { lat: WARSAW_BOUNDS.south, lng: WARSAW_BOUNDS.west },
              { lat: WARSAW_BOUNDS.north, lng: WARSAW_BOUNDS.east }
            ),
            types: ["address"],
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setPredictions(results);
              setOpen(true);
            } else {
              setPredictions([]);
            }
          }
        );
      }
    },
    []
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchResults(value), 300);
  };

  const handleSalonSelect = (salon: SalonSearchResult) => {
    onSelect({ lat: salon.lat, lng: salon.lng }, salon.name);
    onSalonSelect?.(salon.id, { lat: salon.lat, lng: salon.lng });
    setQuery(salon.name);
    setOpen(false);
    setSalonResults([]);
    setPredictions([]);
  };

  const handleAddressSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ["geometry"] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const addr = prediction.description || prediction.structured_formatting.main_text;
          onSelect({ lat, lng }, addr, prediction.place_id);
          setQuery(prediction.structured_formatting.main_text);
          setOpen(false);
          setSalonResults([]);
          setPredictions([]);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };

  const hasResults = salonResults.length > 0 || predictions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
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
          onFocus={() => hasResults && setOpen(true)}
          placeholder="Szukaj salonu lub adresu..."
          className="w-[320px] pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSalonResults([]);
              setPredictions([]);
              setOpen(false);
              onClear?.();
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {open && hasResults && (
        <div className="absolute top-full left-0 mt-1 w-[360px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[320px] overflow-y-auto">
          {salonResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                Salony
              </div>
              {salonResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSalonSelect(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{s.name}</span>
                    {s.category_name && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: CATEGORY_COLORS[s.category_name] || "#64748b" }}
                      >
                        {s.category_name}
                      </span>
                    )}
                    {s.rating && (
                      <span className="text-[10px] text-amber-600 ml-auto">{Number(s.rating).toFixed(1)}</span>
                    )}
                  </div>
                  {s.address && (
                    <div className="text-gray-400 text-xs mt-0.5 truncate">{s.address}</div>
                  )}
                </button>
              ))}
            </>
          )}
          {predictions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                Adresy
              </div>
              {predictions.map((p) => (
                <button
                  key={p.place_id}
                  onClick={() => handleAddressSelect(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <span className="font-medium text-gray-800">
                    {p.structured_formatting.main_text}
                  </span>
                  <span className="text-gray-400 text-xs ml-1">
                    {p.structured_formatting.secondary_text}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
