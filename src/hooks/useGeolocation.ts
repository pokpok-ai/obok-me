import { useState, useCallback } from "react";

interface GeolocationState {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolokalizacja nie jest wspierana przez przegladarke");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? "Odmowa dostepu do lokalizacji"
            : "Nie udalo sie uzyskac lokalizacji"
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, error, loading, locate };
}
