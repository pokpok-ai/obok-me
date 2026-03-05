export type UtilityType = 'power' | 'gas' | 'water' | 'sewage' | 'internet';

export interface UtilityLine {
  type: UtilityType;
  coords: Array<[number, number]>; // [lat, lng]
}

export interface UtilityDistance {
  type: UtilityType;
  distance_m: number;
  label: string;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const UTILITY_COLORS: Record<UtilityType, string> = {
  power: '#fbbf24',
  gas: '#f97316',
  water: '#3b82f6',
  sewage: '#6b7280',
  internet: '#a855f7',
};

export function getUtilityColor(type: UtilityType): string {
  return UTILITY_COLORS[type];
}

function detectUtilityType(tags: Record<string, string>): UtilityType | null {
  if (tags.power === 'line' || tags.power === 'cable' || tags.power === 'minor_line') return 'power';
  if (tags['pipeline:type'] === 'gas' || (tags.man_made === 'pipeline' && tags.substance === 'gas')) return 'gas';
  if (tags['pipeline:type'] === 'water' || (tags.man_made === 'pipeline' && tags.substance === 'water') || tags.waterway === 'pipeline') return 'water';
  if (tags['pipeline:type'] === 'sewage' || (tags.man_made === 'pipeline' && tags.substance === 'sewage')) return 'sewage';
  if (tags.man_made === 'pipeline' && !tags.substance) return 'gas'; // default pipeline = gas
  if (tags.telecom || tags['communication:medium']) return 'internet';
  return null;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minDistanceToLine(centerLat: number, centerLng: number, coords: Array<[number, number]>): number {
  let min = Infinity;
  for (const [lat, lng] of coords) {
    const d = haversineDistance(centerLat, centerLng, lat, lng);
    if (d < min) min = d;
  }
  return min;
}

export async function queryUtilities(
  south: number, west: number, north: number, east: number,
  signal?: AbortSignal
): Promise<UtilityLine[]> {
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:10];(
    way["power"="line"](${bbox});
    way["power"="cable"](${bbox});
    way["pipeline:type"="gas"](${bbox});
    way["man_made"="pipeline"](${bbox});
    way["waterway"="pipeline"](${bbox});
  );out geom;`;

  const resp = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, { signal });
  if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
  const data = await resp.json();

  const lines: UtilityLine[] = [];
  for (const el of data.elements || []) {
    if (el.type !== 'way' || !el.geometry) continue;
    const type = detectUtilityType(el.tags || {});
    if (!type) continue;
    lines.push({
      type,
      coords: el.geometry.map((g: { lat: number; lon: number }) => [g.lat, g.lon] as [number, number]),
    });
  }
  return lines;
}

export function computeUtilityDistances(
  centerLat: number, centerLng: number, lines: UtilityLine[]
): UtilityDistance[] {
  const byType = new Map<UtilityType, number>();

  for (const line of lines) {
    const d = minDistanceToLine(centerLat, centerLng, line.coords);
    const existing = byType.get(line.type);
    if (existing === undefined || d < existing) {
      byType.set(line.type, d);
    }
  }

  const LABELS: Record<UtilityType, string> = {
    power: 'Energia elektryczna',
    gas: 'Gaz ziemny',
    water: 'Wodociąg',
    sewage: 'Kanalizacja',
    internet: 'Internet/światłowód',
  };

  const ALL_TYPES: UtilityType[] = ['power', 'water', 'gas', 'sewage', 'internet'];
  return ALL_TYPES.map((type) => ({
    type,
    distance_m: byType.get(type) ?? -1,
    label: LABELS[type],
  }));
}

export interface WaterwayLine {
  id: number;
  coords: Array<[number, number]>;
  isArea: boolean;
}

export async function queryWaterways(
  south: number, west: number, north: number, east: number,
  signal?: AbortSignal
): Promise<WaterwayLine[]> {
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:10];(
    way["waterway"](${bbox});
    way["natural"="water"](${bbox});
    relation["natural"="water"](${bbox});
  );out geom;`;

  const resp = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, { signal });
  if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
  const data = await resp.json();

  const results: WaterwayLine[] = [];
  for (const el of data.elements || []) {
    if (el.type === 'way' && el.geometry) {
      const isArea = el.tags?.natural === 'water' || !!el.tags?.water;
      results.push({
        id: el.id,
        coords: el.geometry.map((g: { lat: number; lon: number }) => [g.lat, g.lon] as [number, number]),
        isArea,
      });
    }
  }
  return results;
}

export interface ForestPolygon {
  id: number;
  coords: Array<[number, number]>;
}

export async function queryForests(
  south: number, west: number, north: number, east: number,
  signal?: AbortSignal
): Promise<ForestPolygon[]> {
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:10];(
    way["natural"="wood"](${bbox});
    way["landuse"="forest"](${bbox});
  );out geom;`;

  const resp = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, { signal });
  if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
  const data = await resp.json();

  const results: ForestPolygon[] = [];
  for (const el of data.elements || []) {
    if (el.type === 'way' && el.geometry) {
      results.push({
        id: el.id,
        coords: el.geometry.map((g: { lat: number; lon: number }) => [g.lat, g.lon] as [number, number]),
      });
    }
  }
  return results;
}
