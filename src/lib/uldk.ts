import type { Parcel } from "@/types/dzialki";

const CORS_PROXY = "https://api.allorigins.win/raw?url=";

function buildGetParcelByXYUrl(lat: number, lng: number): string {
  return `https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=${lng},${lat},4326&result=geom_wkt,teryt,voivodeship,county,commune,region,parcel,datasource&srid=4326`;
}

function buildGetParcelByIdUrl(id: string): string {
  return `https://uldk.gugik.gov.pl/?request=GetParcelByIdOrNr&id=${encodeURIComponent(id.trim())}&result=geom_wkt,teryt,voivodeship,county,commune,region,parcel,datasource&srid=4326`;
}

async function fetchULDK(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (resp.ok) return await resp.text();
  } catch {
    // Direct request failed, try CORS proxy
  }
  try {
    const resp = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (resp.ok) return await resp.text();
  } catch (err) {
    console.error("ULDK request error:", err);
  }
  return null;
}

/**
 * Parse WKT POLYGON or MULTIPOLYGON into array of {lat, lng} coordinate pairs.
 * ULDK returns coordinates as lng,lat (EPSG:4326).
 */
export function parseWKT(wkt: string): Array<{ lat: number; lng: number }> {
  // Handle SRID prefix: SRID=4326;POLYGON((...))
  const clean = wkt.replace(/^SRID=\d+;/, "").trim();

  // Extract coordinate strings from POLYGON((...)) or MULTIPOLYGON(((...)))
  const match = clean.match(/\(\(([^)]+)\)/);
  if (!match) return [];

  const coordStr = match[1];
  const coords: Array<{ lat: number; lng: number }> = [];

  for (const pair of coordStr.split(",")) {
    const parts = pair.trim().split(/\s+/);
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coords.push({ lat, lng });
      }
    }
  }

  return coords;
}

/**
 * Parse ULDK response text into a Parcel object.
 * Response format: each line is a field, first line is WKT geometry.
 */
function parseULDKResponse(text: string): Parcel | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0 || lines[0] === "-1" || lines[0].startsWith("ERROR")) {
    return null;
  }

  // Response is semicolon-separated: geom_wkt;teryt;voivodeship;county;commune;region;parcel;datasource
  // But sometimes the first line is a status code, skip it
  let dataLine = lines[0];
  if (/^\d+$/.test(dataLine) && lines.length > 1) {
    dataLine = lines[1];
  }

  const parts = dataLine.split(";");
  if (parts.length < 2) return null;

  const wkt = parts[0];
  const coordinates = parseWKT(wkt);
  if (coordinates.length === 0) return null;

  return {
    teryt: parts[1] || "",
    voivodeship: parts[2] || "",
    county: parts[3] || "",
    commune: parts[4] || "",
    region: parts[5] || "",
    parcelNumber: parts[6] || "",
    coordinates,
    datasource: parts[7] || "",
  };
}

/**
 * Compute polygon area in square meters using the Shoelace formula
 * with a spherical approximation.
 */
export function computePolygonArea(
  coords: Array<{ lat: number; lng: number }>
): number {
  if (coords.length < 3) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  // Convert to planar coordinates (meters) relative to centroid
  const cLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const cLng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;

  const points = coords.map((c) => ({
    x: (c.lng - cLng) * Math.cos(toRad(cLat)) * toRad(1) * R,
    y: (c.lat - cLat) * toRad(1) * R,
  }));

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Get parcel data by clicking coordinates on the map.
 */
export async function getParcelByXY(
  lat: number,
  lng: number
): Promise<Parcel | null> {
  const url = buildGetParcelByXYUrl(lat, lng);
  const text = await fetchULDK(url);
  if (!text) return null;
  return parseULDKResponse(text);
}

/**
 * Get parcel data by TERYT/parcel ID or number.
 */
export async function getParcelByIdOrNr(
  id: string
): Promise<Parcel | null> {
  const url = buildGetParcelByIdUrl(id);
  const text = await fetchULDK(url);
  if (!text) return null;
  return parseULDKResponse(text);
}
