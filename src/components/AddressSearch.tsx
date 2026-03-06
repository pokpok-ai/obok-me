"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

interface AddressSearchProps {
  onSelect: (position: { lat: number; lng: number }, address?: string, placeId?: string) => void;
}

const WARSAW_BOUNDS = {
  north: 52.45,
  south: 52.05,
  east: 21.35,
  west: 20.75,
};

export function AddressSearch({ onSelect }: AddressSearchProps) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize services when Places library loads
  useEffect(() => {
    if (!places) return;
    autocompleteService.current = new places.AutocompleteService();
    // PlacesService needs a DOM element (can be hidden)
    const div = document.createElement("div");
    placesService.current = new places.PlacesService(div);
  }, [places]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!autocompleteService.current || input.length < 2) {
        setPredictions([]);
        setOpen(false);
        return;
      }

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
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            setPredictions(results);
            setOpen(true);
          } else {
            setPredictions([]);
            setOpen(false);
          }
        }
      );
    },
    []
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ["geometry"] },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const addr = prediction.description || prediction.structured_formatting.main_text;
          onSelect({ lat, lng }, addr, prediction.place_id);
          setQuery(prediction.structured_formatting.main_text);
          setOpen(false);
          setPredictions([]);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {/* Search icon */}
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
          onFocus={() => predictions.length > 0 && setOpen(true)}
          placeholder="Szukaj adresu..."
          className="w-[320px] pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setPredictions([]);
              setOpen(false);
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && predictions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-[320px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[240px] overflow-y-auto">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              onClick={() => handleSelect(p)}
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
        </div>
      )}
    </div>
  );
}
