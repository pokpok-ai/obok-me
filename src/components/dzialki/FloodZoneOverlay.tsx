"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { buildWmsTileUrl } from "@/lib/wmsTiles";

// Public ISOK flood zone WMS — uses Geoportal guest endpoint
// Note: This service may be intermittently unavailable (returns 401/503)
const WMS_URL =
  "https://mapy.geoportal.gov.pl/wss/service/pub/guest/G2_ZarzadzanieKryzysowe_WMS/MapServer/WMSServer";

interface FloodZoneOverlayProps {
  enabled: boolean;
}

export function FloodZoneOverlay({ enabled }: FloodZoneOverlayProps) {
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
        return buildWmsTileUrl(WMS_URL, "0,1,2", coord, zoom);
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.5,
      name: "Flood Zones",
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
