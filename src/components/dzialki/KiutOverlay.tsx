"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { buildWmsTileUrl } from "@/lib/wmsTiles";

const WMS_URL =
  "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu";

interface KiutOverlayProps {
  enabled: boolean;
  onLoadError?: () => void;
}

export function KiutOverlay({ enabled, onLoadError }: KiutOverlayProps) {
  const map = useMap();
  const overlayRef = useRef<google.maps.ImageMapType | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!enabled) {
      if (overlayRef.current) {
        removeOverlay(map, overlayRef.current);
        overlayRef.current = null;
      }
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
      return;
    }

    // 8s timeout — if tiles don't load, trigger fallback
    errorTimerRef.current = setTimeout(() => {
      onLoadError?.();
    }, 8000);

    const wmsLayer = new google.maps.ImageMapType({
      getTileUrl(coord, zoom) {
        return buildWmsTileUrl(WMS_URL, "przewod_urzadzenia", coord, zoom, {
          version: "1.3.0",
        });
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.85,
      name: "KIUT Uzbrojenie",
    });

    map.overlayMapTypes.push(wmsLayer);
    overlayRef.current = wmsLayer;

    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
      if (overlayRef.current) {
        removeOverlay(map, overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map, enabled, onLoadError]);

  return null;
}

function removeOverlay(map: google.maps.Map, overlay: google.maps.ImageMapType) {
  for (let i = map.overlayMapTypes.getLength() - 1; i >= 0; i--) {
    if (map.overlayMapTypes.getAt(i) === overlay) {
      map.overlayMapTypes.removeAt(i);
    }
  }
}
