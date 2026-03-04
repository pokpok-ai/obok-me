"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface AddressSearchProps {
  onSelect: (position: { lat: number; lng: number }, address?: string) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    borough?: string;
  };
}

export function AddressSearch({ onSelect }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchResults = useCallback(async (input: string) => {
    if (input.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", `${input}, Warszawa`);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "5");
      url.searchParams.set("countrycodes", "pl");
      url.searchParams.set("viewbox", "20.75,52.05,21.35,52.45");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("accept-language", "pl");

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { "User-Agent": "obok.me/1.0" },
      });
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      // Aborted or network error — ignore
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchResults(value), 300);
  };

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address;
    const mainText = addr?.road
      ? `${addr.road}${addr.house_number ? ` ${addr.house_number}` : ""}`
      : result.display_name.split(",")[0];
    const secondaryText = addr?.suburb || addr?.borough || addr?.city || "";
    const fullAddr = secondaryText ? `${mainText}, ${secondaryText}` : mainText;

    onSelect({ lat, lng }, fullAddr);
    setQuery(mainText);
    setOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };

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
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Szukaj adresu..."
          className="w-[200px] pl-7 pr-2 py-1.5 rounded-lg border border-gray-200 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
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

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-[320px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[240px] overflow-y-auto">
          {results.map((r) => {
            const addr = r.address;
            const mainText = addr?.road
              ? `${addr.road}${addr.house_number ? ` ${addr.house_number}` : ""}`
              : r.display_name.split(",")[0];
            const secondaryText = addr?.suburb || addr?.borough || addr?.city || "";
            return (
              <button
                key={r.place_id}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <span className="font-medium text-gray-800">{mainText}</span>
                {secondaryText && (
                  <span className="text-gray-400 text-xs ml-1">{secondaryText}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
