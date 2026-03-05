"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { buildWmsTileUrl } from "@/lib/wmsTiles";

const WMS_URL =
  "https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego";

interface MpzpOverlayProps {
  enabled: boolean;
}

export function MpzpOverlay({ enabled }: MpzpOverlayProps) {
  const map = useMap();
  const overlayRef = useRef<google.maps.ImageMapType | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!enabled) {
      if (overlayRef.current) {
        removeOverlay(map, overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    const wmsLayer = new google.maps.ImageMapType({
      getTileUrl(coord, zoom) {
        return buildWmsTileUrl(WMS_URL, "plany,raster,wektor-str", coord, zoom);
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.5,
      name: "MPZP",
    });

    map.overlayMapTypes.push(wmsLayer);
    overlayRef.current = wmsLayer;

    return () => {
      if (overlayRef.current) {
        removeOverlay(map, overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map, enabled]);

  return null;
}

function removeOverlay(map: google.maps.Map, overlay: google.maps.ImageMapType) {
  for (let i = map.overlayMapTypes.getLength() - 1; i >= 0; i--) {
    if (map.overlayMapTypes.getAt(i) === overlay) {
      map.overlayMapTypes.removeAt(i);
    }
  }
}
