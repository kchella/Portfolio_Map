import 'leaflet/dist/leaflet.css'
import React, { useCallback, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, Popup, GeoJSON, ZoomControl, useMap, Pane } from 'react-leaflet'

import { Customer, KMZLayer } from '../types/par'
import { PopupCard } from './PopupCard'
import { T, F } from '../styles/theme'
import { getMarkerColor, getMarkerRadius } from '../utils/parHelpers'
import { linkCustomerToPartner, type PartnerLink } from '../utils/supaPartners'
import { fetchRoadRoutes, type RoadRoute, type TravelMode } from '../utils/routing'
import { RouteCard, ROUTE_COLOR, type ModeResult } from './RouteCard'
import L from 'leaflet'
import type { CircleMarker as LeafletCircleMarker } from 'leaflet'

interface MapProps {
  customers: Customer[]
  kmzLayers: KMZLayer[]
  onKMZDrop: (file: File) => void
  mapStyle: string
  focusedCustomer?: Customer | null
  onZoomChange?: (zoom: number) => void
  showBoundaries?: boolean
  showBufferPins?: boolean
  topInset?: number  // height of the page nav drawn over the map
}

function polygonCentroid(coords: [number, number][]): [number, number] {
  const n = coords.length
  const sumLng = coords.reduce((s, c) => s + c[0], 0)
  const sumLat = coords.reduce((s, c) => s + c[1], 0)
  return [sumLat / n, sumLng / n]
}

function ZoomTracker({ onZoomChange }: { onZoomChange?: (zoom: number) => void }) {
  const map = useMap()
  useEffect(() => {
    if (!onZoomChange) return
    onZoomChange(map.getZoom())
    const handler = () => onZoomChange(map.getZoom())
    map.on('zoomend', handler)
    return () => { map.off('zoomend', handler) }
  }, [map, onZoomChange])
  return null
}

// Fixed leaflet default marker icon styling using css
function CursorController() {
  const map = useMap()
  useEffect(() => {
    const onOpen  = () => { map.getContainer().style.cursor = 'default' }
    const onClose = () => { map.getContainer().style.cursor = '' }
    map.on('popupopen', onOpen)
    map.on('popupclose', onClose)
    return () => { map.off('popupopen', onOpen); map.off('popupclose', onClose) }
  }, [map])
  return null
}

interface FlyToProps {
  customer: Customer | null | undefined
  renderer: L.Renderer
  onShowRoute: (c: Customer) => void
}

function FlyToController({ customer, renderer, onShowRoute }: FlyToProps) {
  const map = useMap()
  const markerRef = useRef<LeafletCircleMarker | null>(null)

  useEffect(() => {
    if (!customer) return
    map.flyTo([customer.latitude, customer.longitude], 17, { duration: 0.8 })
    const timer = setTimeout(() => { markerRef.current?.openPopup() }, 850)
    return () => clearTimeout(timer)
  }, [customer, map])

  if (!customer) return null

  const color = getMarkerColor(customer.par_status)
  return (
    <CircleMarker
      ref={markerRef}
      center={[customer.latitude, customer.longitude]}
      radius={getMarkerRadius(customer) + 5}
      pathOptions={{ color: T.card, fillColor: color, fillOpacity: 1, weight: 3 }}
      renderer={renderer}
      pane="customerPane"
    >
      <Popup className="par-popup" maxWidth={360}><PopupCard customer={customer} partnerLink={linkCustomerToPartner(customer)} onShowRoute={() => onShowRoute(customer)} /></Popup>
    </CircleMarker>
  )
}

const MODES: TravelMode[] = ['walk', 'bike', 'drive']
const EMPTY_RESULTS: Record<TravelMode, ModeResult> = {
  walk: { status: 'loading', routes: [] }, bike: { status: 'loading', routes: [] }, drive: { status: 'loading', routes: [] },
}
const MODE_KEY = 'parmap.routeMode'

function loadMode(): TravelMode {
  try {
    const m = localStorage.getItem(MODE_KEY)
    if (m === 'walk' || m === 'bike' || m === 'drive') return m
  } catch { /* storage blocked — use default */ }
  return 'walk'
}

// Draws the requested route above the customer dots. Grey alternatives can be
// tapped to switch. A dashed straight line shows while loading or if routing fails.
function RouteLayer({ customer, link, routes, active, onPick, mode }: {
  customer: Customer; link: PartnerLink; routes: RoadRoute[]; active: number; onPick: (i: number) => void; mode: TravelMode
}) {
  const current = routes[active]
  const from: [number, number] = [customer.latitude, customer.longitude]
  const to: [number, number] = [link.lat, link.lng]
  // walking reads as dots, riding/driving as a solid line (like most nav apps)
  const line = mode === 'walk'
    ? { color: ROUTE_COLOR, weight: 6, dashArray: '0.1 11', lineCap: 'round' as const }
    : { color: ROUTE_COLOR, weight: 5, lineCap: 'round' as const, lineJoin: 'round' as const }
  const connector = { color: '#64748b', weight: 2, dashArray: '2 6', lineCap: 'round' as const }
  return (
    <>
      {current ? (
        <>
          {routes.map((r, i) => i !== active && (
            <Polyline key={i} positions={r.coords} pathOptions={{ color: '#6b7280', weight: 6, opacity: 0.55 }}
              eventHandlers={{ click: () => onPick(i) }} pane="partnerLinkPane" />
          ))}
          {/* white casing keeps the route readable over dense dots */}
          {mode !== 'walk' && <Polyline key={`casing-${mode}-${active}`} positions={current.coords} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} interactive={false} pane="partnerLinkPane" />}
          <Polyline key={`route-${mode}-${active}`} positions={current.coords} pathOptions={line} interactive={false} pane="partnerLinkPane" />
          {/* roads snap to the nearest street — show the last few metres to each door */}
          <Polyline positions={[from, current.coords[0]]} pathOptions={connector} interactive={false} pane="partnerLinkPane" />
          <Polyline positions={[current.coords[current.coords.length - 1], to]} pathOptions={connector} interactive={false} pane="partnerLinkPane" />
        </>
      ) : (
        <Polyline positions={[from, to]}
          pathOptions={{ color: ROUTE_COLOR, weight: 3, dashArray: '6 6', opacity: 0.7 }} interactive={false} pane="partnerLinkPane" />
      )}
      <CircleMarker center={from} radius={8}
        pathOptions={{ color: ROUTE_COLOR, fillColor: '#ffffff', fillOpacity: 1, weight: 3 }} interactive={false} pane="partnerLinkPane" />
      <CircleMarker center={to} radius={8}
        pathOptions={{ color: '#ffffff', fillColor: ROUTE_COLOR, fillOpacity: 1, weight: 3 }} interactive={false} pane="partnerLinkPane">
        <Tooltip permanent direction="top" offset={[0, -10]} className="par-tooltip">{link.name}</Tooltip>
      </CircleMarker>
    </>
  )
}

// Closes the popup and frames customer + partner (and the road, once it arrives).
function RouteFit({ customer, link, route, topInset }: { customer: Customer; link: PartnerLink; route?: RoadRoute; topInset: number }) {
  const map = useMap()
  useEffect(() => {
    map.closePopup()
    const pts: [number, number][] = [[customer.latitude, customer.longitude], [link.lat, link.lng], ...(route?.coords ?? [])]
    // top padding clears the route card
    map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, topInset + 330], paddingBottomRight: [40, 40], maxZoom: 17 })
  }, [map, customer, link.lat, link.lng, route, topInset])
  return null
}

const LUSAKA_CENTER: [number, number] = [-15.4166, 28.2833]
const DEFAULT_ZOOM = 13

export default function Map({
  customers, kmzLayers, onKMZDrop, mapStyle,
  focusedCustomer, onZoomChange,
  showBoundaries = true, showBufferPins = true, topInset = 0,
}: MapProps) {
  const renderer = React.useMemo(() => L.canvas({ padding: 0.5, pane: 'customerPane' }), [])
  const [routeFor, setRouteFor] = React.useState<Customer | null>(null)
  const [results, setResults] = React.useState<Record<TravelMode, ModeResult>>(EMPTY_RESULTS)
  const [mode, setModeState] = React.useState<TravelMode>('walk')
  const [activeRoute, setActiveRoute] = React.useState(0)
  const routeLink = React.useMemo(() => (routeFor ? linkCustomerToPartner(routeFor) : null), [routeFor])

  useEffect(() => { setModeState(loadMode()) }, [])
  const setMode = useCallback((m: TravelMode) => {
    setModeState(m); setActiveRoute(0)
    try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ }
  }, [])

  // All three modes in parallel (~1 KB each) so every tab can show its time.
  useEffect(() => {
    if (!routeFor || !routeLink) return
    const ctrl = new AbortController()
    setResults(EMPTY_RESULTS); setActiveRoute(0)
    const from: [number, number] = [routeFor.latitude, routeFor.longitude]
    const to: [number, number] = [routeLink.lat, routeLink.lng]
    for (const m of MODES) {
      fetchRoadRoutes(from, to, m, ctrl.signal)
        .then(routes => setResults(r => ({ ...r, [m]: { status: 'ok', routes } })))
        .catch(e => { if (!ctrl.signal.aborted) { console.warn(e); setResults(r => ({ ...r, [m]: { status: 'failed', routes: [] } })) } })
    }
    return () => ctrl.abort()
  }, [routeFor, routeLink])
  const routes = results[mode].routes
  const current: RoadRoute | undefined = routes[activeRoute]

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onKMZDrop(file)
  }, [onKMZDrop])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const customerMarkers = React.useMemo(() => {
    return customers.map((customer, i) => {
      const color = getMarkerColor(customer.par_status)
      const radius = getMarkerRadius(customer)
      return (
        <CircleMarker
          key={`${i}-${customer.contract_ref}`}
          center={[customer.latitude, customer.longitude]}
          radius={radius + 2}
          pathOptions={{ color: T.card, fillColor: color, fillOpacity: 1, weight: 1.25 }}
          bubblingMouseEvents={false}
          renderer={renderer}
          pane="customerPane"
        >
          <Popup className="par-popup" maxWidth={360}><PopupCard customer={customer} partnerLink={linkCustomerToPartner(customer)} onShowRoute={() => setRouteFor(customer)} /></Popup>
        </CircleMarker>
      )
    })
  }, [customers, renderer])

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }} onDrop={handleDrop} onDragOver={handleDragOver}>
      {routeFor && routeLink && (
        <RouteCard
          customerName={routeFor.name || routeFor.contract_ref}
          partnerName={routeLink.name}
          from={[routeFor.latitude, routeFor.longitude]}
          to={[routeLink.lat, routeLink.lng]}
          straightM={routeLink.distanceM}
          mode={mode}
          onMode={setMode}
          results={results}
          active={activeRoute}
          onPickRoute={setActiveRoute}
          onClose={() => setRouteFor(null)}
          top={topInset + 12}
        />
      )}
      <MapContainer
        center={LUSAKA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          url={`https://api.mapbox.com/styles/v1/${mapStyle}/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
          tileSize={512}
          zoomOffset={-1}
          attribution="© Mapbox © OpenStreetMap"
        />

        <Pane name="customerPane" style={{ zIndex: 450 }}>
          {showBoundaries && kmzLayers
            .filter(layer => layer.visible)
            .map(layer => (
              <GeoJSON
                key={layer.id}
              data={layer.geojson as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              interactive={true}
              {...({ renderer } as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
              style={() => ({
                color: layer.color,
                weight: 2,
                fillColor: layer.color,
                fillOpacity: 0.08,
              })}
              onEachFeature={(feature, leafletLayer) => {
                const label = layer.isBuffer
                  ? (feature.properties?.name ?? '')
                  : layer.name
                if (label) {
                  // Leaflet inserts string tooltips as HTML — pass a text node
                  // so names from uploaded KMZ/CSV files can't inject script.
                  leafletLayer.bindTooltip(document.createTextNode(String(label)) as unknown as HTMLElement, {
                    sticky: true,
                    direction: 'top',
                    offset: [0, -6],
                    className: 'par-tooltip',
                  })
                }
              }}
            />
          ))}

        {customerMarkers}
      </Pane>

      <Pane name="bufferPinPane" style={{ zIndex: 430 }}>
        {showBufferPins && kmzLayers
          .filter(layer => layer.visible && layer.isBuffer && layer.geojson)
          .flatMap(layer =>
            (layer.geojson.features ?? []).map((feature: any, i: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                const coords = feature.geometry?.coordinates?.[0] as [number, number][]
                if (!coords?.length) return null
                const center = polygonCentroid(coords)
                const name = (feature.properties?.name as string | undefined) ?? ''
                return (
                  <CircleMarker
                    key={`pin-${layer.id}-${i}`}
                    center={center}
                    radius={6}
                    pathOptions={{ color: T.card, fillColor: T.onSurface, fillOpacity: 1, weight: 1.5 }}
                    pane="bufferPinPane"
                  >
                    {name && (
                      <Popup className="par-popup">
                        <div style={{ padding: '12px 16px', fontFamily: F.family, fontSize: 13, fontWeight: 500, color: T.onSurface }}>{name}</div>
                      </Popup>
                    )}
                  </CircleMarker>
                )
              }).filter(Boolean)
            )}
        </Pane>

        {/* above customer dots (450), below tooltips and popups */}
        <Pane name="partnerLinkPane" style={{ zIndex: 460 }}>
          {routeFor && routeLink && (
            <>
              <RouteLayer customer={routeFor} link={routeLink} routes={routes} active={activeRoute} onPick={setActiveRoute} mode={mode} />
              <RouteFit customer={routeFor} link={routeLink} route={current} topInset={topInset} />
            </>
          )}
        </Pane>

        <ZoomTracker onZoomChange={onZoomChange} />
        <CursorController />
        <FlyToController customer={focusedCustomer} renderer={renderer} onShowRoute={setRouteFor} />
      </MapContainer>
    </div>
  )
}
