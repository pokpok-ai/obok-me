"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

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
        map.overlayMapTypes.forEach((_, i) => {
          if (map.overlayMapTypes.getAt(i) === overlayRef.current) {
            map.overlayMapTypes.removeAt(i);
          }
        });
        overlayRef.current = null;
      }
      return;
    }

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
          `${WMS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap` +
          `&LAYERS=Zagrozenie_powodziowe` +
          `&STYLES=` +
          `&SRS=EPSG:4326` +
          `&BBOX=${bbox}` +
          `&WIDTH=${tileSize}` +
          `&HEIGHT=${tileSize}` +
          `&FORMAT=image/png` +
          `&TRANSPARENT=true`
        );
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.5,
      name: "Flood Zones",
    });

    map.overlayMapTypes.push(wmsLayer);
    overlayRef.current = wmsLayer;

    return () => {
      if (overlayRef.current) {
        map.overlayMapTypes.forEach((_, i) => {
          if (map.overlayMapTypes.getAt(i) === overlayRef.current) {
            map.overlayMapTypes.removeAt(i);
          }
        });
        overlayRef.current = null;
      }
    };
  }, [map, enabled]);

  return null;
}
