/**
 * Resolve a free-text address to OSM embed iframe parameters (bbox + marker).
 * Uses Nominatim — follow usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */

export interface OsmEmbedCoords {
  bbox: string;
  marker: string;
}

const UA =
  typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SITE_URL
    ? `OlbrichtDigital-Webbuilder/1.0 (${String(import.meta.env.PUBLIC_SITE_URL)})`
    : 'OlbrichtDigital-Webbuilder/1.0';

/**
 * Bounding box around a point; span scales with zoom (higher zoom = tighter crop).
 * OSM embed ignores a separate zoom query param — extent comes from bbox only.
 */
export function bboxAroundPoint(lat: number, lon: number, zoom: number): string {
  const z = Math.min(18, Math.max(4, zoom));
  const latRad = (lat * Math.PI) / 180;
  const cosLat = Math.max(0.22, Math.cos(latRad));
  const halfLat = 640 / 2 ** (z + 2);
  const halfLon = halfLat / cosLat;
  const minLon = lon - halfLon;
  const maxLon = lon + halfLon;
  const minLat = lat - halfLat;
  const maxLat = lat + halfLat;
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

export async function geocodeForOsmEmbed(
  address: string,
  zoom: number,
): Promise<OsmEmbedCoords | null> {
  const q = address.trim();
  if (!q) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    if (!Array.isArray(data) || !data[0]) return null;
    const lat = parseFloat(data[0].lat ?? '');
    const lon = parseFloat(data[0].lon ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
      bbox: bboxAroundPoint(lat, lon, zoom),
      marker: `${lat},${lon}`,
    };
  } catch {
    return null;
  }
}
