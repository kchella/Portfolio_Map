/**
 * Calculate a point given a start point, radius and bearing (angle).
 * Used for generating geodesic buffers.
 * 
 * @param lat Latitude of origin
 * @param lon Longitude of origin
 * @param radiusM Radius in meters
 * @param angleDeg Bearing in degrees (0 = North)
 * @returns [longitude, latitude]
 */
export function geodesicPoint(
  lat: number, 
  lon: number, 
  radiusM: number, 
  angleDeg: number
): [number, number] {
  const R = 6371000; // Earth radius in meters
  const b = (angleDeg * Math.PI) / 180;
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const d = radiusM / R;

  const lat2 = Math.asin(
    Math.sin(latR) * Math.cos(d) + 
    Math.cos(latR) * Math.sin(d) * Math.cos(b)
  );
  
  const lon2 = lonR + Math.atan2(
    Math.sin(b) * Math.sin(d) * Math.cos(latR),
    Math.cos(d) - Math.sin(latR) * Math.sin(lat2)
  );

  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/**
 * Normalizes phone numbers for the Zambian market.
 * Removes international prefix and ensures local format (0...).
 */
export function formatPhoneNumber(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';

  let str = String(val).trim();

  // 1. Handle Scientific Notation (Excel's 2.61E+11)
  if (str.toUpperCase().includes('E+')) {
    try {
      str = BigInt(Number(str)).toString();
    } catch (e) {
      console.error("Phone conversion error:", e);
    }
  }

  // 2. Remove all non-numeric characters
  const cleaned = str.replace(/\D/g, '');

  // 3. Transformation: Remove Zambian '26' and replace with '0'
  if (cleaned.startsWith('26') && cleaned.length >= 11) {
    return '0' + cleaned.substring(2);
  }

  // 4. If it already starts with '0', just return it cleaned
  if (cleaned.startsWith('0')) {
    return cleaned;
  }

  return cleaned;
}

/** Great-circle distance between two points, in meters. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** "450 m" under a kilometre, "1.24 km" above. */
export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}
