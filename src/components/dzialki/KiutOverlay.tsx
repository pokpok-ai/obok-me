"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

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
        map.overlayMapTypes.forEach((_, i) => {
          if (map.overlayMapTypes.getAt(i) === overlayRef.current) {
            map.overlayMapTypes.removeAt(i);
          }
        });
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
        const proj = map.getProjection();
        if (!proj) return "";

        const tileSize = 256;
        const scale = 1 << zoom;

        const worldCoordNW = new google.maps.Point(
          (coord.x * tileSize) / scale,
          (coord.y * tileSize) / scale
        );
        const worldCoordSE = new google.maps.Point(
          ((coord.x + 1) * tileSize) / scale,
          ((coord.y + 1) * tileSize) / scale
        );

        const nw = proj.fromPointToLatLng(
          new google.maps.Point(worldCoordNW.x * scale, worldCoordNW.y * scale)
        );
        const se = proj.fromPointToLatLng(
          new google.maps.Point(worldCoordSE.x * scale, worldCoordSE.y * scale)
        );

        if (!nw || !se) return "";

        const bbox = `${nw.lng()},${se.lat()},${se.lng()},${nw.lat()}`;

        return (
          `${WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
          `&LAYERS=przewody,urzadzenia` +
          `&STYLES=` +
          `&CRS=EPSG:4326` +
          `&BBOX=${bbox}` +
          `&WIDTH=${tileSize}` +
          `&HEIGHT=${tileSize}` +
          `&FORMAT=image/png` +
          `&TRANSPARENT=true`
        );
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
        map.overlayMapTypes.forEach((_, i) => {
          if (map.overlayMapTypes.getAt(i) === overlayRef.current) {
            map.overlayMapTypes.removeAt(i);
          }
        });
        overlayRef.current = null;
      }
    };
  }, [map, enabled, onLoadError]);

  return null;
}
