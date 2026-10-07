// Road routes from the FOSSGIS OSRM servers (routing.openstreetmap.de), which
// run separate car, bike and foot profiles. Same approach as mapcn's route
// example. Public fair-use servers — fine for one click at a time; move to a
// self-hosted OSRM if usage grows.
export type TravelMode = 'walk' | 'bike' | 'drive'

const PROFILE: Record<TravelMode, string> = { walk: 'routed-foot', bike: 'routed-bike', drive: 'routed-car' }

export interface RoadRoute {
  coords: [number, number][]  // [lat, lng] for Leaflet
  distanceM: number
  durationS: number
}

interface OsrmResponse {
  code: string
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[]
}

// Same customer opened twice shouldn't cost another request on a slow connection.
const cache = new Map<string, RoadRoute[]>()

export async function fetchRoadRoutes(
  from: [number, number], to: [number, number], mode: TravelMode, signal?: AbortSignal,
): Promise<RoadRoute[]> {
  const key = `${mode}:${from.join(',')};${to.join(',')}`
  const hit = cache.get(key)
  if (hit) return hit

  // simplified overview keeps the payload small for mobile data
  const url = `https://routing.openstreetmap.de/${PROFILE[mode]}/route/v1/driving/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}?overview=simplified&geometries=geojson&alternatives=true`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Routing failed (${res.status})`)
  const data = (await res.json()) as OsrmResponse
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found')

  const routes = data.routes.map(r => ({
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    distanceM: r.distance,
    durationS: r.duration,
  }))
  cache.set(key, routes)
  return routes
}

export function formatDuration(s: number): string {
  const min = Math.max(1, Math.round(s / 60))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}

export function formatArrival(s: number): string {
  return new Date(Date.now() + s * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const GMAPS_MODE: Record<TravelMode, string> = { walk: 'walking', bike: 'bicycling', drive: 'driving' }

export function googleMapsUrl(from: [number, number], to: [number, number], mode: TravelMode): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}&travelmode=${GMAPS_MODE[mode]}`
}
