// ─── src/pages/map.tsx ───────────────────────────────────────────────────────
// Main map view: customer pins by PAR status, boundary layers, side panel.

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import Head from 'next/head'

import { Customer, KMZLayer, PARStats, computeStats, PAR_COLORS, PAR_ORDER, PAR_LABEL } from '../types/par'
import { T, F } from '../styles/theme'
import { parseKmz } from '../utils/kmzParser'
import { fetchLayers, fetchBufferLayers, toggleLayerVisibility } from '../lib/layerService'
import { getCustomers } from '../lib/customerService'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { IconAdmin, IconSearch, IconX } from '../components/NavIcons'
import {
  IconZoomOut, IconZoomIn, IconBarChart, IconSliders,
  IconLayers, IconLock, IconMap, IconSidebar,
  IconChevronUp, IconChevronDown, IconUsers, IconSignOut, IconMapDot
} from '../components/icons'

const MapComponent = dynamic(() => import('../components/Map'), { ssr: false })

const DRAWER_HEIGHT = 'min(72vh, 520px)'
const DRAWER_COLLAPSED = '52px'
const NAV_H = 56
const PANEL_W = 280

const MAP_STYLES = [
  { id: 'light', label: 'Light', style: 'mapbox/light-v11', swatch: ['#f4f4f2', '#ffffff', '#e2e2de', '#d5dde5'] },
  { id: 'streets', label: 'Streets', style: 'mapbox/streets-v12', swatch: ['#f2efe9', '#ffffff', '#f6cf65', '#a9d3e0'] },
  { id: 'outdoors', label: 'Outdoors', style: 'mapbox/outdoors-v12', swatch: ['#dfe8cc', '#fbfaf5', '#e8b86a', '#9fc7e0'] },
  { id: 'dark', label: 'Dark', style: 'mapbox/dark-v11', swatch: ['#343332', '#51504d', '#454442', '#1d2124'] },
  { id: 'night', label: 'Night', style: 'mapbox/navigation-night-v1', swatch: ['#1f2b3b', '#3b4f69', '#5d82ad', '#101b28'] },
  { id: 'satellite', label: 'Satellite', style: 'mapbox/satellite-streets-v12', swatch: ['#56613f', '#d9cba1', '#b8ad86', '#2e4142'] },
]

// Mini map preview: land, a minor and a main road, and a water corner
const swatchBg = ([land, road, main, water]: string[]) =>
  `linear-gradient(118deg, transparent 44%, ${main} 44% 52%, transparent 52%), ` +
  `linear-gradient(24deg, transparent 60%, ${road} 60% 65%, transparent 65%), ` +
  `radial-gradient(circle at 100% 100%, ${water} 0 34%, transparent 35%), ${land}`

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}
function base64ToFile(b64: string, name: string): File {
  try { return new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], name, { type: 'application/vnd.google-earth.kmz' }) }
  catch { return new File([], name) }
}
type StoredLayer = { id: string; name: string; color: string; visible: boolean; b64: string }

export default function MapPage() {
  const { user, isAdmin, hasAccess, loading: authLoading, signOut } = useAuth()
  const isMobile = useIsMobile()

  const [kmzLayers, setKmzLayers] = useState<KMZLayer[]>([])
  const [layersLoading, setLayersLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Safe SSR defaults — hydrated in useEffect below
  const [parFilter, setParFilter] = useState<string>('')
  const [mapStyle, setMapStyle] = useState<string>('mapbox/streets-v12')
  const [section, setSection] = useState<Section | null>('portfolio')
  const [showBoundaries, setShowBoundaries] = useState<boolean>(true)
  const [showBufferPins, setShowBufferPins] = useState<boolean>(true)

  const [pinned, setPinned] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [teams, setTeams] = useState<{ id: string; name: string; color: string; layerIds: string[] }[]>([])
  const hoverRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // "/" focuses search, like most map and admin tools
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault(); searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const [customers, setCustomers] = useState<Customer[]>([])

  // Client-side gate. Middleware already requires a session; this also turns
  // away signed-in accounts that are still 'pending'. RLS is the real lock.
  useEffect(() => {
    if (authLoading) return
    if (!user) { window.location.href = '/login?next=/map'; return }
    if (!hasAccess) { signOut().finally(() => { window.location.href = '/login?error=pending' }) }
  }, [authLoading, user, hasAccess, signOut])

  useEffect(() => {
    getCustomers().then(data => {
      setCustomers(data)
    }).catch(console.error)
  }, [])

  // Hydrate localStorage state client-side (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const savedParFilter = localStorage.getItem('par-map:parFilter')
      const savedMapStyle = localStorage.getItem('par-map:mapStyle')
      const savedSection = localStorage.getItem('par-map:section')
      const savedBoundaries = localStorage.getItem('par-map:showBoundaries')
      const savedBufPins = localStorage.getItem('par-map:bufferPins')
      if (savedParFilter !== null) setParFilter(savedParFilter)
      if (savedMapStyle !== null) setMapStyle(savedMapStyle)
      if (savedSection !== null) setSection((savedSection as Section) || 'portfolio')
      if (savedBoundaries !== null) setShowBoundaries(savedBoundaries === 'true')
      if (savedBufPins !== null) setShowBufferPins(savedBufPins === 'true')
    } catch { }
  }, [])

  // Search + valid coordinates, before the status filter. The status filter
  // list counts from this, so picking one status doesn't zero out the others.
  const searchedCustomers = useMemo<Customer[]>(() => {
    const q = search.toLowerCase()
    let r = customers
    if (q) r = r.filter(c =>
      (c.contract_ref ?? '').toLowerCase().includes(q) ||
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q) ||
      (c.phone2 ?? '').toLowerCase().includes(q))
    return r.filter(c => c.latitude >= -90 && c.latitude <= 90 && c.longitude >= -180 && c.longitude <= 180 && !(c.latitude === 0 && c.longitude === 0))
  }, [customers, search])

  const filteredCustomers = useMemo<Customer[]>(
    () => parFilter ? searchedCustomers.filter(c => c.par_status === parFilter) : searchedCustomers,
    [searchedCustomers, parFilter])

  const baseStats = useMemo(() => computeStats(searchedCustomers), [searchedCustomers])
  const focused = search.trim() && filteredCustomers.length === 1 ? filteredCustomers[0] : null
  const panelVisible = pinned || hovered

  useEffect(() => {
    ; (async () => {
      setLayersLoading(true)
      try {
        const [sb, buffers] = await Promise.all([fetchLayers(), fetchBufferLayers()])
        const stored = localStorage.getItem('par-map:kmz-layers')
        let local: KMZLayer[] = []
        if (stored) {
          const parsed = JSON.parse(stored) as StoredLayer[]
          local = await Promise.all(parsed.filter(l => l.b64).map(async l => ({
            id: l.id, name: l.name, color: l.color, visible: l.visible,
            geojson: await parseKmz(base64ToFile(l.b64, l.name + '.kmz')),
          })))
        }
        setKmzLayers([...sb, ...buffers, ...local])
        const { data: teamsData } = await supabase.from('teams').select('*')
        setTeams((teamsData ?? [] as Array<{ id: string; name: string; color: string; layer_ids?: string[] }>).map(t => ({ id: t.id, name: t.name, color: t.color, layerIds: t.layer_ids ?? [] })))
      } catch (e) { console.error(e) } finally { setLayersLoading(false) }
    })()
  }, [])

  // Persist UI state
  useEffect(() => { try { localStorage.setItem('par-map:mapStyle', mapStyle) } catch { } }, [mapStyle])
  useEffect(() => { try { localStorage.setItem('par-map:section', section ?? '') } catch { } }, [section])
  useEffect(() => { try { localStorage.setItem('par-map:parFilter', parFilter) } catch { } }, [parFilter])
  useEffect(() => { try { localStorage.setItem('par-map:showBoundaries', String(showBoundaries)) } catch { } }, [showBoundaries])
  useEffect(() => { try { localStorage.setItem('par-map:bufferPins', String(showBufferPins)) } catch { } }, [showBufferPins])

  const saveLocal = useCallback((layers: KMZLayer[], b64Map: Record<string, string>) => {
    try {
      const ex: StoredLayer[] = JSON.parse(localStorage.getItem('par-map:kmz-layers') ?? '[]')
      const exB64 = Object.fromEntries(ex.map(l => [l.id, l.b64]))
      localStorage.setItem('par-map:kmz-layers', JSON.stringify(
        layers.filter(l => b64Map[l.id] || exB64[l.id]).map(l => ({ id: l.id, name: l.name, color: l.color, visible: l.visible, b64: b64Map[l.id] || exB64[l.id] || '' }))
      ))
    } catch { }
  }, [])

  const handleKMZDrop = useCallback(async (file: File) => {
    try {
      const [geojson, b64] = await Promise.all([parseKmz(file), fileToBase64(file)])
      const layer: KMZLayer = { id: crypto.randomUUID(), name: file.name.replace(/\.kmz$/i, ''), color: T.primary, visible: true, geojson }
      setKmzLayers(prev => { const next = [...prev, layer]; saveLocal(next, { [layer.id]: b64 }); return next })
    } catch (e) { console.error(e) }
  }, [saveLocal])

  const handleToggle = useCallback(async (layer: KMZLayer) => {
    const next = !layer.visible
    setKmzLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: next } : l))
    if (layer.locked !== undefined) {
      try { await toggleLayerVisibility(layer.id, next) }
      catch { setKmzLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: layer.visible } : l)) }
    } else { saveLocal(kmzLayers.map(l => l.id === layer.id ? { ...l, visible: next } : l), {}) }
  }, [kmzLayers, saveLocal])

  const onPanelEnter = () => { if (!isMobile) { if (hoverRef.current) clearTimeout(hoverRef.current); setHovered(true) } }
  const onPanelLeave = () => { if (!isMobile && !pinned) hoverRef.current = setTimeout(() => setHovered(false), 200) }
  const onStripEnter = () => { if (!isMobile && !pinned) { if (hoverRef.current) clearTimeout(hoverRef.current); setHovered(true) } }

  const countsOf = (s: PARStats): Record<string, number> => ({
    'ONTIME': s.ontime, 'PAR 1-30': s.par30, 'PAR 31-60': s.par60, 'PAR 61-90': s.par90, 'PAR 90+': s.par90p,
  })
  const filterCounts = countsOf(baseStats) // search-scoped, ignores the status filter
  const shown = filteredCustomers.length
  const narrowed = !!(parFilter || search)
  const toggleSection = (s: Section) => setSection(cur => cur === s ? null : s)

  return (
    <>
      <Head>
        <title>SupaMoto Map</title>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0;}
          body{overflow:hidden;background:${T.canvas};font-family:${F.family};font-size:13px;line-height:1.4;color:${T.onSurface};-webkit-font-smoothing:antialiased;}
          button{font-family:inherit;color:inherit;}
          .num{font-variant-numeric:tabular-nums;}
          ::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:transparent;}
          ::-webkit-scrollbar-thumb{background:${T.container};border-radius:6px;}
          ::-webkit-scrollbar-thumb:hover{background:${T.high};}

          /* Shared controls */
          .ib{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:8px;background:transparent;color:${T.muted};cursor:pointer;transition:background .15s,color .15s;flex-shrink:0;}
          .ib:hover{background:${T.low};color:${T.onSurface};}
          .ib.on{color:${T.primary};}
          .ib:focus-visible,.row:focus-visible,.sec:focus-visible{outline:2px solid ${T.primaryRing};outline-offset:1px;}

          .title{border:none;background:none;padding:4px 6px;margin-left:-6px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;letter-spacing:-0.01em;color:${T.onSurface};transition:color .15s,background .15s;}
          .title:hover{color:${T.primaryText};}
          .title:focus-visible{outline:2px solid ${T.primaryRing};outline-offset:1px;}

          /* Search */
          .search{display:flex;align-items:center;gap:10px;width:100%;max-width:480px;height:38px;padding:0 8px 0 12px;border-radius:10px;background:${T.low};color:${T.muted};cursor:text;transition:background .15s,box-shadow .15s;}
          .search:hover{background:${T.container};}
          .search:focus-within{background:${T.card};box-shadow:0 0 0 1px ${T.high},0 0 0 4px ${T.primaryDim};}
          .search input{flex:1;min-width:0;height:100%;background:transparent;border:none;outline:none;font:400 13px/1 ${F.family};color:${T.onSurface};}
          .search input::placeholder{color:${T.muted};}
          .kbd{font:500 11px/1 ${F.family};color:${T.muted};padding:4px 7px;border-radius:5px;background:${T.card};box-shadow:inset 0 0 0 1px ${T.high};}

          /* Side panel sections */
          .sec{width:100%;height:36px;display:flex;align-items:center;gap:10px;padding:0 8px 0 10px;margin-top:2px;border:none;border-radius:8px;background:transparent;cursor:pointer;color:${T.muted};transition:background .15s,color .15s;}
          .sec:hover{background:${T.low};color:${T.onSurface};}
          .sec.open{color:${T.onSurface};}
          .sec .ic{display:flex;transition:color .15s;}
          .sec.open .ic{color:${T.primaryText};}
          .sec .lbl{flex:1;min-width:0;text-align:left;font-size:13px;font-weight:500;color:${T.onSurface};}
          .sec .val{display:flex;align-items:center;gap:6px;font-size:12px;color:${T.muted};font-variant-numeric:tabular-nums;white-space:nowrap;}
          .sec .val.hot{color:${T.onSurface};font-weight:500;}
          .sec.open .val{display:none;}
          .sec .chev{transition:transform .2s cubic-bezier(.4,0,.2,1);display:flex;color:${T.muted};transform:rotate(-90deg);}
          .sec.open .chev{transform:none;}
          /* Portfolio */
          .pf{margin:4px 2px 10px;padding:12px;border-radius:10px;box-shadow:inset 0 0 0 1px ${T.ghost};background:${T.card};}
          .pf-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;}
          .t-lbl{font-size:12px;color:${T.muted};margin-bottom:2px;}
          .t-val{font-size:20px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;color:${T.onSurface};}
          .stack{display:flex;gap:2px;height:8px;margin:12px 0 10px;border-radius:4px;overflow:hidden;background:${T.low};}
          .stack span{height:100%;min-width:3px;transition:flex-grow .5s cubic-bezier(.4,0,.2,1),opacity .15s;}
          .ladder{display:flex;flex-direction:column;margin:0 -6px;}
          .rung{display:grid;grid-template-columns:8px 1fr auto 34px;align-items:center;gap:8px;height:30px;padding:0 6px;border:none;border-radius:6px;background:transparent;cursor:pointer;text-align:left;transition:background .12s,opacity .15s;}
          .rung:hover{background:${T.low};}
          .rung.active{background:${T.low};}
          .rung.dim{opacity:.45;}
          .rung.dim:hover{opacity:1;}
          .rung:focus-visible{outline:2px solid ${T.primaryRing};outline-offset:1px;}
          .r-lbl{font-size:12.5px;color:${T.variant};white-space:nowrap;}
          .rung.active .r-lbl{color:${T.onSurface};font-weight:500;}
          .r-num{font-size:12.5px;font-weight:500;color:${T.onSurface};text-align:right;}
          .r-pct{font-size:12px;color:${T.muted};text-align:right;}
          .sep{height:1px;background:${T.ghost};margin:8px 10px;}
          /* Status filter */
          .opts{padding:4px;}
          .opt{width:100%;height:32px;display:flex;align-items:center;gap:10px;padding:0 10px 0 8px;border:none;border-radius:6px;background:transparent;text-align:left;cursor:pointer;transition:background .12s;}
          .opt:hover{background:${T.low};}
          .opt:focus-visible{outline:2px solid ${T.primaryRing};outline-offset:1px;}
          .opt .name{flex:1;min-width:0;font-size:13px;color:${T.variant};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .opt .meta{min-width:36px;text-align:right;font-size:12.5px;color:${T.muted};}
          .opt.active .name{color:${T.onSurface};font-weight:500;}
          .opt.active .meta{color:${T.onSurface};font-weight:500;}
          .radio{width:14px;height:14px;border-radius:50%;flex-shrink:0;box-shadow:inset 0 0 0 1.5px ${T.high};transition:box-shadow .15s;}
          .opt:hover .radio{box-shadow:inset 0 0 0 1.5px ${T.muted};}
          .opt.active .radio{box-shadow:inset 0 0 0 1.5px ${T.primary},inset 0 0 0 4px ${T.card},inset 0 0 0 7px ${T.primary};}
          .opt-sep{height:1px;background:${T.ghost};margin:4px 4px;}
          /* Boundary layers */
          .lgroup + .lgroup{margin-top:4px;padding-top:4px;box-shadow:0 -1px 0 ${T.ghost};}
          .lg-head{display:flex;align-items:center;justify-content:space-between;gap:8px;height:28px;padding:0 10px 0 8px;font-size:12px;color:${T.muted};}
          .lg-name{font-weight:500;color:${T.variant};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .lyr{width:100%;height:32px;display:flex;align-items:center;gap:10px;padding:0 10px 0 8px;border:none;border-radius:6px;background:transparent;text-align:left;cursor:pointer;transition:background .12s;}
          .lyr:hover{background:${T.low};}
          .lyr.locked{cursor:default;}
          .lyr.locked:hover{background:transparent;}
          .lyr:focus-visible{outline:2px solid ${T.primaryRing};outline-offset:1px;}
          .lyr .swatch{width:12px;height:12px;border-radius:4px;flex-shrink:0;}
          .lyr .name{flex:1;min-width:0;font-size:13px;color:${T.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .12s;}
          .lyr.on .name{color:${T.onSurface};}
          /* Teams */
          .team{height:32px;display:flex;align-items:center;gap:10px;padding:0 10px 0 8px;border-radius:6px;}
          .team + .team{box-shadow:0 -1px 0 ${T.ghost};border-radius:0;}
          .team .swatch{width:12px;height:12px;border-radius:4px;flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(17,24,39,.12);}
          .team .name{flex:1;min-width:0;font-size:13px;color:${T.onSurface};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .team .meta{font-size:12px;color:${T.muted};white-space:nowrap;}
          /* Section content is indented to line up with the header label */
          .body{padding:0 0 10px 26px;animation:sIn .18s ease both;}
          @keyframes sIn{from{opacity:0;transform:translateY(-2px);}to{opacity:1;transform:none;}}

          .row{width:100%;height:32px;display:flex;align-items:center;gap:10px;padding:0 10px 0 12px;border:none;border-radius:7px;background:transparent;text-align:left;cursor:pointer;transition:background .12s;}
          .row:hover{background:${T.low};}
          .row.active{background:${T.low};}
          .row.active .meta{color:${T.onSurface};font-weight:500;}
          .row.static{cursor:default;}
          .row.static:hover{background:transparent;}
          .row .name{flex:1;min-width:0;font-size:13px;font-weight:400;color:${T.variant};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .row.active .name{color:${T.onSurface};font-weight:500;}
          .row .meta{font-size:12.5px;color:${T.muted};}
          .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
          .empty{padding:8px 12px 10px;font-size:12px;line-height:1.55;color:${T.muted};}
          .group{padding:10px 12px 4px;font-size:12px;font-weight:500;color:${T.muted};display:flex;align-items:center;gap:8px;}

          .switch{width:28px;height:16px;border-radius:8px;background:${T.high};position:relative;transition:background .15s;flex-shrink:0;}
          .switch::after{content:'';position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(45,51,53,.2);transition:transform .15s;}
          .switch.on{background:${T.primary};}
          .switch.on::after{transform:translateX(12px);}

          .themes{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:6px;}
          .theme{display:flex;flex-direction:column;align-items:stretch;gap:6px;padding:4px 4px 6px;border:none;border-radius:8px;background:transparent;cursor:pointer;transition:background .12s;}
          .theme:hover{background:${T.low};}
          .theme:focus-visible{outline:2px solid ${T.primaryRing};outline-offset:1px;}
          .sw{display:block;height:40px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(17,24,39,.08);transition:box-shadow .15s;}
          .theme.active .sw{box-shadow:0 0 0 2px ${T.card},0 0 0 4px ${T.primary};}
          .th-lbl{font-size:12px;color:${T.variant};text-align:center;}
          .theme.active .th-lbl{color:${T.onSurface};font-weight:500;}

          
          /* Zoom */
          .zoom{display:flex;flex-direction:column;background:${T.card};border-radius:10px;box-shadow:${T.shadowSm};overflow:hidden;}
          .zoom button{width:36px;height:36px;border:none;background:transparent;display:flex;align-items:center;justify-content:center;color:${T.variant};cursor:pointer;transition:background .12s;}
          .zoom button:hover{background:${T.low};}
          .zoom hr{border:none;height:1px;background:${T.ghost};margin:0 8px;}

          /* Leaflet */
          .leaflet-control-zoom{display:none!important;}
          .leaflet-interactive{outline:none!important;}
          path.leaflet-interactive{outline:none!important;cursor:default!important;}
          .leaflet-control-attribution{background:rgba(255,255,255,.72)!important;backdrop-filter:blur(8px);font:400 10px/1.6 ${F.family}!important;color:${T.muted}!important;padding:0 8px!important;border-radius:6px 0 0 0;}
          .leaflet-control-attribution a{color:${T.variant}!important;}
          .leaflet-popup-pane{z-index:12000!important;}
          .leaflet-popup{margin-bottom:22px!important;z-index:12000!important;}
          .par-popup .leaflet-popup-content-wrapper{background:${T.card}!important;border-radius:16px!important;box-shadow:0 8px 30px rgba(17,24,39,0.10),0 1px 3px rgba(17,24,39,0.05)!important;padding:0!important;overflow:visible!important;width:min(360px,calc(100vw - 32px))!important;border:none!important;}
          .par-popup .leaflet-popup-content{margin:0!important;width:min(360px,calc(100vw - 32px))!important;line-height:inherit!important;display:block!important;}
          .par-popup .leaflet-popup-close-button{color:${T.variant}!important;font:400 18px/32px system-ui!important;width:32px!important;height:32px!important;padding:0!important;text-align:center;top:10px!important;right:8px!important;border-radius:50%;background:transparent!important;z-index:12001!important;transition:background .12s,color .12s!important;}
          .par-popup .leaflet-popup-close-button:hover{color:${T.onSurface}!important;background:${T.low}!important;}
          .par-popup .leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-left:-20px;overflow:hidden;pointer-events:none;background:none;}
          .par-tooltip{pointer-events:none!important;font:500 12px/1.3 ${F.family};color:${T.onSurface};border:none!important;border-radius:7px!important;box-shadow:${T.shadowSm}!important;padding:5px 9px!important;}
          .par-tooltip::before{display:none;}
          @keyframes spin{to{transform:rotate(360deg);}}
        `}</style>
      </Head>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <MapComponent customers={filteredCustomers} kmzLayers={kmzLayers} onKMZDrop={handleKMZDrop} mapStyle={mapStyle} focusedCustomer={focused} showBoundaries={showBoundaries} showBufferPins={showBufferPins} topInset={NAV_H} />
      </div>

      {/* ZOOM */}
      <div className="zoom" style={{
        position: 'fixed', right: 16, zIndex: 800,
        bottom: isMobile ? (panelVisible ? `calc(${DRAWER_HEIGHT} + 12px)` : `calc(${DRAWER_COLLAPSED} + 12px)`) : 28,
        transition: 'bottom 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <button aria-label="Zoom in" title="Zoom in" onClick={() => (document.querySelector('.leaflet-control-zoom-in') as HTMLElement)?.click()}><IconZoomIn size={16} /></button>
        <hr />
        <button aria-label="Zoom out" title="Zoom out" onClick={() => (document.querySelector('.leaflet-control-zoom-out') as HTMLElement)?.click()}><IconZoomOut size={16} /></button>
      </div>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: NAV_H, zIndex: 1000, background: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(180%) blur(16px)', WebkitBackdropFilter: 'saturate(180%) blur(16px)', boxShadow: `inset 0 -1px 0 ${T.ghost}`, display: 'flex', alignItems: 'center', padding: isMobile ? '0 12px' : '0 16px 0 20px', gap: isMobile ? 10 : 20 }}>
        <div style={{ width: isMobile ? 'auto' : PANEL_W - 20, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG */}
          <img src="/supamoto-logo.svg" alt="SupaMoto" style={{ height: isMobile ? 26 : 32, width: 'auto', display: 'block' }} />
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <label className="search">
            <IconSearch />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.currentTarget.blur() } }}
              placeholder={isMobile ? 'Search customers' : 'Search by contract, name or phone'}
              aria-label="Search customers" />
            {search
              ? <button className="ib" style={{ width: 24, height: 24 }} onClick={() => setSearch('')} aria-label="Clear search"><IconX size={12} /></button>
              : !isMobile && <span className="kbd" aria-hidden>/</span>}
          </label>
        </div>

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          {!isMobile && (
            <div className="num" title={`Showing ${shown.toLocaleString()} of ${customers.length.toLocaleString()} customers`}
              style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap', userSelect: 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: narrowed ? T.primaryText : T.onSurface }}>{shown.toLocaleString()}</span>
              <span style={{ fontSize: 13, color: T.muted }}>
                {narrowed ? `of ${customers.length.toLocaleString()}` : shown === 1 ? 'customer' : 'customers'}
              </span>
            </div>
          )}
          <button className="ib"
            onClick={() => { if (isAdmin) window.location.href = '/admin'; else signOut().finally(() => { window.location.href = '/login' }) }}
            title={isAdmin ? 'Admin' : 'Sign out'} aria-label={isAdmin ? 'Admin' : 'Sign out'}>
            {isAdmin ? <IconAdmin /> : <IconSignOut size={16} />}
          </button>
        </div>
      </nav>

      {!pinned && !hovered && !isMobile && <div onMouseEnter={onStripEnter} style={{ position: 'fixed', left: 0, top: NAV_H, bottom: 0, width: 14, zIndex: 900 }} />}

      {/* SIDE PANEL / BOTTOM DRAWER */}
      <aside
        onMouseEnter={onPanelEnter}
        onMouseLeave={onPanelLeave}
        style={{
          position: 'fixed', left: 0, right: isMobile ? 0 : 'auto',
          top: isMobile ? 'auto' : NAV_H, bottom: 0,
          width: isMobile ? '100%' : PANEL_W,
          height: isMobile ? (panelVisible ? DRAWER_HEIGHT : DRAWER_COLLAPSED) : 'auto',
          zIndex: 900,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column',
          transform: isMobile ? 'none' : (panelVisible ? 'translateX(0)' : 'translateX(-100%)'),
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), height 0.22s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: isMobile ? `0 -8px 30px rgba(45,51,53,0.10)` : pinned ? `inset -1px 0 0 ${T.ghost}` : T.shadow,
          borderRadius: isMobile ? '16px 16px 0 0' : 0,
        }}
      >
        <div onClick={() => { if (isMobile) setPinned(v => !v) }}
          style={{ height: 52, padding: '0 10px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, cursor: isMobile ? 'pointer' : 'default' }}>
          <button className="title"
            onClick={(e) => { e.stopPropagation(); setParFilter(''); setSearch('') }}
            title={narrowed ? 'Reset filters' : undefined} aria-label="SupaMoto Map — reset filters">
            SupaMoto Map
          </button>
          <button className="ib"
            onClick={(e) => { e.stopPropagation(); setPinned(v => !v); if (pinned) setHovered(false) }}
            title={isMobile ? (panelVisible ? 'Collapse' : 'Expand') : (pinned ? 'Unpin panel' : 'Pin panel')}
            aria-label={isMobile ? (panelVisible ? 'Collapse panel' : 'Expand panel') : (pinned ? 'Unpin side panel' : 'Pin side panel')}>
            {isMobile
              ? (panelVisible ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />)
              : <IconSidebar size={16} open={pinned} />}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
          {/* PORTFOLIO */}
          <SB icon={<IconBarChart size={16} />} label="Portfolio" open={section === 'portfolio'} onToggle={() => toggleSection('portfolio')}
            value={searchedCustomers.length.toLocaleString()} />
          {section === 'portfolio' && (() => {
            // Search-scoped totals; each row doubles as the status filter.
            const total = searchedCustomers.length
            const pctOf = (n: number) => { const v = total ? (n / total) * 100 : 0; return v > 0 && v < 1 ? '<1%' : `${Math.round(v)}%` }
            return (
              <div className="pf num" style={{ animation: 'sIn .18s ease both' }}>
                <div className="pf-head">
                  <div>
                    <div className="t-lbl">Customers</div>
                    <div className="t-val">{total.toLocaleString()}</div>
                  </div>
                </div>

                <div className="stack" role="img" aria-label={PAR_ORDER.map(k => `${PAR_LABEL[k]} ${filterCounts[k]}`).join(', ')}>
                  {PAR_ORDER.filter(k => filterCounts[k] > 0).map(k => (
                    <span key={k} style={{ flexGrow: filterCounts[k], background: PAR_COLORS[k], opacity: parFilter && parFilter !== k ? 0.3 : 1 }} />
                  ))}
                </div>

                <div className="ladder">
                  {PAR_ORDER.map(k => {
                    const n = filterCounts[k]
                    const active = parFilter === k
                    const dim = !!parFilter && !active
                    return (
                      <button key={k} className={`rung${active ? ' active' : ''}${dim ? ' dim' : ''}`}
                        onClick={() => setParFilter(active ? '' : k)} aria-pressed={active}
                        title={`${PAR_LABEL[k]} · ${n.toLocaleString()} customers · ${pctOf(n)} — click to ${active ? 'show all' : 'show only these'}`}>
                        <span className="dot" style={{ background: PAR_COLORS[k] }} />
                        <span className="r-lbl">{PAR_LABEL[k]}</span>
                        <span className="r-num">{n.toLocaleString()}</span>
                        <span className="r-pct">{pctOf(n)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* FILTER */}
          <SB icon={<IconSliders size={16} />} label="Status" open={section === 'filters'} onToggle={() => toggleSection('filters')}
            hot={!!parFilter}
            value={parFilter ? <><span className="dot" style={{ background: PAR_COLORS[parFilter], width: 7, height: 7 }} />{PAR_LABEL[parFilter]}</> : 'All'} />
          {section === 'filters' && (
            <div className="pf opts num" role="radiogroup" aria-label="Filter by status" style={{ animation: 'sIn .18s ease both' }}>
              {[{ key: '', label: 'All customers', count: searchedCustomers.length }, ...PAR_ORDER.map(k => ({ key: k, label: PAR_LABEL[k], count: filterCounts[k] }))].map(item => {
                const active = parFilter === item.key
                return (
                  <React.Fragment key={item.key || 'all'}>
                    <button className={`opt${active ? ' active' : ''}`} onClick={() => setParFilter(item.key)} role="radio" aria-checked={active}>
                      <span className="radio" />
                      <span className="name">{item.label}</span>
                      {item.key && <span className="dot" style={{ background: PAR_COLORS[item.key] }} />}
                      <span className="meta">{item.count.toLocaleString()}</span>
                    </button>
                    {!item.key && <div className="opt-sep" />}
                  </React.Fragment>
                )
              })}
            </div>
          )}

          <div className="sep" />

          {/* LAYERS */}
          <SB icon={<IconLayers size={16} />} label="Boundary layers" open={section === 'layers'} onToggle={() => toggleSection('layers')}
            value={layersLoading ? '…' : kmzLayers.length ? `${kmzLayers.filter(l => l.visible).length} of ${kmzLayers.length}` : 'None'} />
          {section === 'layers' && (
            <div className="pf opts" style={{ animation: 'sIn .18s ease both' }}>
              {layersLoading ? (
                <div className="empty" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', border: `1.5px solid ${T.high}`, borderTopColor: T.primary, animation: 'spin 0.8s linear infinite' }} />
                  Loading layers…
                </div>
              ) : kmzLayers.length === 0 ? (
                <div className="empty">No layers yet. Drop a .kmz file onto the map, or add one in Admin.</div>
              ) : (() => {
                const LRow = (layer: KMZLayer) => {
                  const label = layer.name.replace(/_/g, ' ')
                  const inner = (
                    <>
                      <span className="swatch" style={layer.visible ? { background: layer.color } : { boxShadow: `inset 0 0 0 1.5px ${layer.color}` }} />
                      <span className="name">{label}</span>
                    </>
                  )
                  return layer.locked ? (
                    <div key={layer.id} className="lyr on locked" title={`${label} · locked`}>
                      {inner}
                      <span style={{ display: 'flex', color: T.muted }}><IconLock size={12} /></span>
                    </div>
                  ) : (
                    <button key={layer.id} className={`lyr${layer.visible ? ' on' : ''}`} onClick={() => handleToggle(layer)}
                      role="switch" aria-checked={layer.visible} aria-label={`Show ${label}`} title={label}>
                      {inner}
                      <span className={`switch${layer.visible ? ' on' : ''}`} />
                    </button>
                  )
                }
                const Group = ({ id, name, layers }: { id: string; name: string; layers: KMZLayer[] }) => (
                  <div key={id} className="lgroup">
                    <div className="lg-head num">
                      <span className="lg-name">{name}</span>
                      <span>{layers.filter(l => l.visible).length} of {layers.length}</span>
                    </div>
                    {layers.map(LRow)}
                  </div>
                )
                const kmzIds = new Set(kmzLayers.map(l => l.id))
                const teamsWithLayers = teams.filter(t => t.layerIds.some(id => kmzIds.has(id)))
                const allTeamIds = new Set(teamsWithLayers.flatMap(t => t.layerIds))
                const ungrouped = kmzLayers.filter(l => !allTeamIds.has(l.id))
                if (teamsWithLayers.length === 0) return <>{kmzLayers.map(LRow)}</>
                return (
                  <>
                    {teamsWithLayers.map(team => Group({ id: team.id, name: team.name, layers: kmzLayers.filter(l => team.layerIds.includes(l.id)) }))}
                    {ungrouped.length > 0 && Group({ id: 'other', name: 'Other', layers: ungrouped })}
                  </>
                )
              })()}
              {kmzLayers.some(l => l.isBuffer) && (
                <>
                  <div className="opt-sep" />
                  <button className={`lyr${showBufferPins ? ' on' : ''}`} onClick={() => setShowBufferPins(v => !v)} role="switch" aria-checked={showBufferPins}>
                    <span style={{ display: 'flex', color: T.muted }}><IconMapDot size={14} /></span>
                    <span className="name">Buffer centre pins</span>
                    <span className={`switch${showBufferPins ? ' on' : ''}`} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* TEAMS */}
          <SB icon={<IconUsers size={16} />} label="Area circle teams" open={section === 'teams'} onToggle={() => toggleSection('teams')}
            value={teams.length || 'None'} />
          {section === 'teams' && (
            <div className="pf opts num" style={{ animation: 'sIn .18s ease both' }}>
              {teams.length === 0 ? (
                <div className="empty">No teams yet. Create them in Admin → Boundary layers.</div>
              ) : teams.map(team => {
                const count = team.layerIds.filter(id => kmzLayers.find(l => l.id === id)).length
                return (
                  <div key={team.id} className="team" title={team.name}>
                    <span className="swatch" style={{ background: team.color }} />
                    <span className="name">{team.name}</span>
                    <span className="meta">{count} {count === 1 ? 'layer' : 'layers'}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* THEME */}
          <SB icon={<IconMap size={16} />} label="Map style" open={section === 'theme'} onToggle={() => toggleSection('theme')}
            value={MAP_STYLES.find(m => m.style === mapStyle)?.label} />
          {section === 'theme' && (
            <div className="pf themes" role="radiogroup" aria-label="Map style" style={{ animation: 'sIn .18s ease both' }}>
              {MAP_STYLES.map(s => {
                const on = mapStyle === s.style
                return (
                  <button key={s.id} className={`theme${on ? ' active' : ''}`} onClick={() => setMapStyle(s.style)} role="radio" aria-checked={on}>
                    <span className="sw" style={{ background: swatchBg(s.swatch) }} />
                    <span className="th-lbl">{s.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

      </aside>
    </>
  )
}

type Section = 'portfolio' | 'filters' | 'layers' | 'teams' | 'theme'

function SB({ icon, label, open, onToggle, value, hot = false }: {
  icon: React.ReactNode; label: string; open: boolean; onToggle: () => void
  value?: React.ReactNode; hot?: boolean
}) {
  return (
    <button className={`sec${open ? ' open' : ''}`} onClick={onToggle} aria-expanded={open}>
      <span className="ic">{icon}</span>
      <span className="lbl">{label}</span>
      {value != null && <span className={`val${hot ? ' hot' : ''}`}>{value}</span>}
      <span className="chev"><IconChevronDown size={14} /></span>
    </button>
  )
}
