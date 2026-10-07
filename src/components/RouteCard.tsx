import React from 'react'
import { T, F } from '../styles/theme'
import { formatDistance } from '../utils/geoHelpers'
import { formatArrival, formatDuration, googleMapsUrl, type RoadRoute, type TravelMode } from '../utils/routing'

// Brand orange; darker text shade where it sits on white (AA)
export const ROUTE_COLOR = T.primary

export type ModeResult = { status: 'loading' | 'ok' | 'failed'; routes: RoadRoute[] }

const MODES: { id: TravelMode; label: string }[] = [
  { id: 'walk', label: 'Walk' },
  { id: 'bike', label: 'Bike' },
  { id: 'drive', label: 'Drive' },
]

function ModeIcon({ mode, size = 19 }: { mode: TravelMode; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (mode === 'walk') return (
    <svg {...p}><circle cx="13" cy="4" r="1.8" /><path d="M9 21l2.5-6.5L14 17v4" /><path d="M7 11.5l3-3.5 3.5 1 2.5 3.5" /><path d="M11.5 14.5l1-5" /></svg>
  )
  if (mode === 'bike') return (
    <svg {...p}><circle cx="5.5" cy="16.5" r="3.5" /><circle cx="18.5" cy="16.5" r="3.5" /><path d="M5.5 16.5L9 9h6l3.5 7.5" /><path d="M9 9l3 7.5h-6.5" /><path d="M14 6h2.5" /></svg>
  )
  return (
    <svg {...p}><path d="M5 17h14v-4.5l-2-5H7l-2 5V17z" /><path d="M3 12.5h18" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></svg>
  )
}

interface RouteCardProps {
  customerName: string
  partnerName: string
  from: [number, number]
  to: [number, number]
  straightM: number
  mode: TravelMode
  onMode: (m: TravelMode) => void
  results: Record<TravelMode, ModeResult>
  active: number
  onPickRoute: (i: number) => void
  onClose: () => void
  top: number
}

export function RouteCard({ customerName, partnerName, from, to, straightM, mode, onMode, results, active, onPickRoute, onClose, top }: RouteCardProps) {
  const res = results[mode]
  const current = res.routes[active]

  return (
    <div role="dialog" aria-label="Route to Supa Partner"
      style={{ position: 'absolute', top, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 'min(380px, calc(100% - 24px))', background: T.card, borderRadius: 18, boxShadow: '0 8px 30px rgba(17,24,39,0.10), 0 1px 3px rgba(17,24,39,0.05)', fontFamily: F.family, overflow: 'hidden' }}>

      {/* ── From → To ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px 12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2.5px solid ${ROUTE_COLOR}`, background: '#fff' }} />
          <span style={{ width: 2, height: 14, margin: '3px 0', backgroundImage: `linear-gradient(${T.high} 50%, transparent 50%)`, backgroundSize: '2px 4px' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: ROUTE_COLOR, boxShadow: `0 0 0 2.5px ${T.primaryRing}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Place label="Customer" name={customerName} />
          <Place label="Supa Partner" name={partnerName} />
        </div>
        <button onClick={onClose} aria-label="Close route" title="Close route"
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: T.low, color: T.variant, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      {/* ── Mode tabs, each with its own time ── */}
      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, margin: '0 12px', padding: 4, background: T.low, borderRadius: 12 }}>
        {MODES.map(m => {
          const on = m.id === mode
          const r = results[m.id]
          const t = r.status === 'ok' && r.routes[0] ? formatDuration(r.routes[0].durationS) : r.status === 'failed' ? '—' : null
          return (
            <button key={m.id} role="tab" aria-selected={on} onClick={() => onMode(m.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: F.family, background: on ? T.card : 'transparent', color: on ? T.primaryText : T.variant, boxShadow: on ? '0 1px 3px rgba(17,24,39,0.12)' : 'none', transition: 'all 0.15s' }}>
              <ModeIcon mode={m.id} />
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: on ? T.primaryText : T.variant }}>{m.label}</span>
                {t ? <span style={{ fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{t}</span>
                   : <span className="route-shimmer" style={{ width: 34, height: 10, borderRadius: 4, marginTop: 2 }} />}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Selected route summary ── */}
      <div style={{ padding: '14px 16px 4px' }}>
        {res.status === 'ok' && current ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 600, color: T.onSurface, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(current.durationS)}
              </div>
              <div style={{ fontSize: 11.5, color: T.onSurface, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>
                {formatDistance(current.distanceM)} <span style={{ color: T.variant }}>· arrive ~{formatArrival(current.durationS)}</span>
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: T.variant, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {formatDistance(straightM)}<br />straight line
            </div>
          </div>
        ) : res.status === 'loading' ? (
          <div>
            <div className="route-shimmer" style={{ width: 90, height: 24, borderRadius: 6 }} />
            <div className="route-shimmer" style={{ width: 150, height: 12, borderRadius: 4, marginTop: 8 }} />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.variant }}>
            No {mode === 'drive' ? 'driving' : mode === 'bike' ? 'cycling' : 'walking'} route found · {formatDistance(straightM)} straight line
          </div>
        )}

        {res.status === 'ok' && res.routes.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {res.routes.map((r, i) => (
              <button key={i} onClick={() => onPickRoute(i)}
                style={{ height: 32, padding: '0 11px', borderRadius: 16, cursor: 'pointer', fontFamily: F.family, fontSize: 11, fontWeight: 500, border: `1.5px solid ${i === active ? ROUTE_COLOR : T.high}`, background: i === active ? T.primaryDim : T.card, color: i === active ? T.primaryText : T.variant, fontVariantNumeric: 'tabular-nums' }}>
                {i === 0 ? 'Fastest' : `Option ${i + 1}`} · {formatDuration(r.durationS)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Hand off to turn-by-turn ── */}
      <div style={{ padding: '12px 12px 12px' }}>
        <a href={googleMapsUrl(from, to, mode)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 10, background: T.primary, color: T.onPrimary, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
          Start navigation
        </a>
      </div>
    </div>
  )
}

function Place({ label, name }: { label: string; name: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 400, color: T.variant }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{name}</div>
    </div>
  )
}
