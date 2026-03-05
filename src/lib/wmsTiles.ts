/**
 * Convert Google Maps tile coordinates to EPSG:3857 (Web Mercator) BBOX.
 * This is the standard Slippy Map tile → Mercator conversion.
 */
const ORIGIN = 20037508.342789244; // half of Earth circumference in meters

export function tileToBBox3857(x: number, y: number, z: number) {
  const resolution = (ORIGIN * 2) / Math.pow(2, z);
  return {
    minX: x * resolution - ORIGIN,
    maxX: (x + 1) * resolution - ORIGIN,
    maxY: ORIGIN - y * resolution,
    minY: ORIGIN - (y + 1) * resolution,
  };
}

/**
 * Build a WMS GetMap URL for a given tile using EPSG:3857.
 */
export function buildWmsTileUrl(
  baseUrl: string,
  layers: string,
  coord: { x: number; y: number },
  zoom: number,
  options?: { tileSize?: number; opacity?: number; version?: string }
): string {
  const { minX, minY, maxX, maxY } = tileToBBox3857(coord.x, coord.y, zoom);
  const size = options?.tileSize ?? 256;
  const version = options?.version ?? "1.1.1";

  // WMS 1.1.1 uses SRS, 1.3.0 uses CRS
  // For EPSG:3857, axis order is always x,y regardless of version
  const crsParam = version === "1.3.0" ? "CRS" : "SRS";

  return (
    `${baseUrl}?SERVICE=WMS&VERSION=${version}&REQUEST=GetMap` +
    `&LAYERS=${layers}` +
    `&STYLES=` +
    `&${crsParam}=EPSG:3857` +
    `&BBOX=${minX},${minY},${maxX},${maxY}` +
    `&WIDTH=${size}` +
    `&HEIGHT=${size}` +
    `&FORMAT=image/png` +
    `&TRANSPARENT=true`
  );
}
