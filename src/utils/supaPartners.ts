import type { Customer } from '../types/par'
import { haversineM } from './geoHelpers'

// Supa Partner GPS comes from the customer CSV (Supa Partner Latitude/Longitude).
export interface PartnerLink {
  name: string
  lat: number
  lng: number
  distanceM: number
}

/** null when the partner has no GPS on file. */
export function linkCustomerToPartner(customer: Customer): PartnerLink | null {
  const lat = customer.supa_partner_latitude
  const lng = customer.supa_partner_longitude
  if (lat == null || lng == null) return null
  return {
    name: customer.supa_partner_name || customer.supa_partner_code || 'Supa Partner',
    lat,
    lng,
    distanceM: haversineM(customer.latitude, customer.longitude, lat, lng),
  }
}
