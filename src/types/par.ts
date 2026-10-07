import type { GeoJSONFeatureCollection } from '../utils/kmzParser'

export type PARStatus = 'ONTIME' | 'PAR 1-30' | 'PAR 31-60' | 'PAR 61-90' | 'PAR 90+'
export type PARMovement = 'Improving' | 'Worsening' | 'Static' | 'Curing' | 'Declining'

export interface Customer {
  contract_ref: string
  name: string
  phone: string
  phone2: string
  area: string
  par_status: PARStatus
  supa_partner_code: string
  supa_partner_name: string
  supa_partner_latitude: number | null
  supa_partner_longitude: number | null
  latitude: number
  longitude: number
}

export interface KMZLayer {
  id: string
  name: string
  color: string
  visible: boolean
  locked?: boolean
  file_path?: string
  geojson: GeoJSONFeatureCollection
  isBuffer?: boolean  // true for buffer_layers rows, false/undefined for kmz_layers
}

// Single source of truth for PAR colours — pins, dots, bars and badges.
export const PAR_COLORS: Record<string, string> = {
  'ONTIME':    '#22c55e',
  'PAR 1-30':  '#facc15',
  'PAR 31-60': '#f97316',
  'PAR 61-90': '#ef4444',
  'PAR 90+':   '#7f1d1d',
}

// Darker text shade + tinted background of each PAR colour, for legible labels.
export const PAR_BADGE: Record<string, { bg: string; text: string }> = {
  'ONTIME':    { bg: 'rgba(34,197,94,0.12)',  text: '#15803d' },
  'PAR 1-30':  { bg: 'rgba(250,204,21,0.16)', text: '#a16207' },
  'PAR 31-60': { bg: 'rgba(249,115,22,0.12)', text: '#c2410c' },
  'PAR 61-90': { bg: 'rgba(239,68,68,0.12)',  text: '#b91c1c' },
  'PAR 90+':   { bg: 'rgba(127,29,29,0.10)',  text: '#7f1d1d' },
}

export const PAR_ORDER = ['ONTIME', 'PAR 1-30', 'PAR 31-60', 'PAR 61-90', 'PAR 90+'] as const

// Display labels — stored values stay as-is, the UI reads these.
export const PAR_LABEL: Record<string, string> = {
  'ONTIME':    'On time',
  'PAR 1-30':  'PAR 1–30',
  'PAR 31-60': 'PAR 31–60',
  'PAR 61-90': 'PAR 61–90',
  'PAR 90+':   'PAR 90+',
}

export const PAR_RING_COLOR = 'transparent'

export function isPriorityVisit(customer: Customer): boolean {
  return customer.par_status === 'PAR 90+'
}

export interface PARStats {
  ontime: number
  par30: number
  par60: number
  par90: number
  par90p: number
  priority: number
  total: number
}

export function computeStats(customers: Customer[]): PARStats {
  const stats: PARStats = { ontime: 0, par30: 0, par60: 0, par90: 0, par90p: 0, priority: 0, total: customers.length }
  for (const c of customers) {
    if (isPriorityVisit(c)) stats.priority++
    switch (c.par_status) {
      case 'ONTIME':    stats.ontime++; break
      case 'PAR 1-30':  stats.par30++;  break
      case 'PAR 31-60': stats.par60++;  break
      case 'PAR 61-90': stats.par90++;  break
      case 'PAR 90+':   stats.par90p++; break
    }
  }
  return stats
}