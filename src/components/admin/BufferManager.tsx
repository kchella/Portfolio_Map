import React, { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  fetchBufferLayers, uploadBufferLayer, deleteBufferLayer,
  toggleBufferLayerVisibility, updateBufferLayerColor, renameBufferLayer
} from '../../lib/layerService'
import { KMZLayer } from '../../types/par'
import { geodesicPoint } from '../../utils/geoHelpers'
import {
  Btn, Card, CardHeader, DZ, FL, FI, Swatches, Toggle, Dot, Status, T, LAYER_COLORS,
  PrevTable, StatusMsg
} from './AdminUI'
import {
  IconBufferZone, IconTrash, IconEye, IconEyeOff, IconEdit, IconLock, IconRefresh
} from '../icons'

interface Team { id: string; name: string; color: string; layerIds: string[] }

function LayerRow({
  layer, onToggle, onDelete, onAssign,
  editColorOpen, onColorEdit, onColorChange, editRenameOpen, onRenameEdit, onRenameSubmit,
  teamName
}: {
  layer: KMZLayer; onToggle: () => void; onDelete?: () => void; onAssign?: () => void
  editColorOpen: boolean; onColorEdit: () => void; onColorChange: (c: string) => void
  editRenameOpen?: boolean; onRenameEdit?: () => void; onRenameSubmit?: (name: string) => void
  teamName?: string
}) {
  const [renameVal, setRenameVal] = useState(layer.name)
  useEffect(() => { setRenameVal(layer.name) }, [layer.name, editRenameOpen])

  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', transition: 'background 0.1s', cursor: 'default' }}
        onMouseEnter={e => e.currentTarget.style.background = T.low}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
          <button onClick={onColorEdit} title="Change color"
            style={{ width: 12, height: 12, borderRadius: '50%', background: layer.color, border: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: editColorOpen ? `0 0 0 2px white,0 0 0 4px ${layer.color}` : 'none', transition: 'box-shadow 0.12s' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter,system-ui,sans-serif' }}>
            {layer.name}
          </span>
          {teamName && (
            <span style={{ fontSize: 10, color: T.muted, background: T.low, padding: '2px 7px', borderRadius: 4, flexShrink: 0, fontFamily: 'Inter,system-ui,sans-serif', border: `1px solid ${T.border}` }}>
              {teamName}
            </span>
          )}
          {layer.locked && <IconLock size={10} color={T.muted} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {onRenameEdit && !layer.locked && (
            <button onClick={onRenameEdit} title="Rename"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: editRenameOpen ? T.ink : T.muted, display: 'flex', padding: 4, borderRadius: 4, transition: 'color 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.color = T.ink}
              onMouseLeave={e => e.currentTarget.style.color = editRenameOpen ? T.ink : T.muted}>
              <IconEdit size={13} />
            </button>
          )}
          {onAssign && (
            <button onClick={onAssign}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: `1px solid ${T.border}`, background: T.card, color: T.mid, cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif', transition: 'border-color 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#888'}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
              {teamName ? 'Reassign' : 'Assign'}
            </button>
          )}
          <button onClick={onToggle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: layer.visible ? T.ink : T.muted, display: 'flex', padding: 4, borderRadius: 4 }}>
            {layer.visible ? <IconEye size={13} /> : <IconEyeOff size={13} />}
          </button>
          {onDelete && !layer.locked && (
            <button onClick={onDelete}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 4, borderRadius: 4, transition: 'color 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.color = T.error}
              onMouseLeave={e => e.currentTarget.style.color = T.muted}>
              <IconTrash size={13} />
            </button>
          )}
        </div>
      </div>

      {editRenameOpen && onRenameSubmit && (
        <div style={{ padding: '10px 20px 12px 44px', background: T.low, borderTop: `1px solid ${T.border}` }}>
          <form onSubmit={e => { e.preventDefault(); if (renameVal.trim()) onRenameSubmit(renameVal.trim()) }}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
              style={{ flex: 1, height: 34, padding: '0 10px', background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 13, color: T.ink, fontFamily: 'Inter,system-ui,sans-serif', outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={e => e.currentTarget.style.borderColor = '#111'}
              onBlur={e => e.currentTarget.style.borderColor = T.border} />
            <button type="submit" disabled={!renameVal.trim() || renameVal.trim() === layer.name}
              style={{ height: 34, padding: '0 12px', borderRadius: 7, border: 'none', background: '#111', color: '#fff', fontSize: 12, fontWeight: 600, cursor: !renameVal.trim() || renameVal.trim() === layer.name ? 'not-allowed' : 'pointer', opacity: !renameVal.trim() || renameVal.trim() === layer.name ? 0.4 : 1, fontFamily: 'Inter,system-ui,sans-serif' }}>
              Save
            </button>
            <button type="button" onClick={onRenameEdit}
              style={{ height: 34, padding: '0 10px', borderRadius: 7, border: `1.5px solid ${T.border}`, background: T.card, color: T.mid, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif' }}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {editColorOpen && (
        <div style={{ padding: '12px 24px 14px 44px', background: T.low, borderTop: `1px solid ${T.border}` }}>
          <Swatches value={layer.color} onChange={onColorChange} />
        </div>
      )}
    </div>
  )
}

export function BufferManager() {
  const isMobile = useIsMobile()
  const [bufferLayers, setBufferLayers] = useState<KMZLayer[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editBufColorId, setEditBufColorId] = useState<string | null>(null)
  const [editBufRenameId, setEditBufRenameId] = useState<string | null>(null)
  const [assignModal, setAssignModal] = useState<{ layerId: string; layerName: string } | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [radius, setRadius] = useState('100')
  const [unit, setUnit] = useState<'m' | 'km'>('m')
  const [bufColor, setBufColor] = useState(LAYER_COLORS[7])
  const [bufLocked, setBufLocked] = useState(false)
  const [bufStatus, setBufStatus] = useState<Status>({ type: 'idle', msg: '' })
  const [prev, setPrev] = useState<Record<string, string>[]>([])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [fetchedBuffers, teamsResult] = await Promise.all([
      fetchBufferLayers(),
      supabase.from('teams').select('*'),
    ])
    setBufferLayers(fetchedBuffers)
    setTeams(
      (teamsResult.data ?? [] as Array<{ id: string; name: string; color: string; layer_ids?: string[] }>)
        .map(r => ({ id: r.id, name: r.name, color: r.color, layerIds: r.layer_ids ?? [] }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleBufferColorChange(id: string, color: string) {
    setBufferLayers(prev => prev.map(l => l.id === id ? { ...l, color } : l))
    try { await updateBufferLayerColor(id, color) } catch { }
    setEditBufColorId(null)
  }

  async function handleBufferRename(id: string, name: string) {
    setBufferLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l))
    setEditBufRenameId(null)
    try { await renameBufferLayer(id, name) } catch { }
  }

  async function handleToggleBuffer(layer: KMZLayer) {
    await toggleBufferLayerVisibility(layer.id, !layer.visible)
    setBufferLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !layer.visible } : l))
  }

  async function handleDeleteBuffer(id: string, filePath?: string) {
    if (!confirm('Delete this buffer layer?')) return
    await deleteBufferLayer(id, filePath ?? '')
    setBufferLayers(prev => prev.filter(l => l.id !== id))
    const affected = teams.filter(t => t.layerIds.includes(id))
    await Promise.all(affected.map(t =>
      supabase.from('teams').update({ layer_ids: t.layerIds.filter(i => i !== id) }).eq('id', t.id)
    ))
    setTeams(prev => prev.map(t => ({ ...t, layerIds: t.layerIds.filter(i => i !== id) })))
  }

  async function assignToTeam(teamId: string, layerId: string) {
    const updated = teams.map(t => {
      if (t.id === teamId && !t.layerIds.includes(layerId)) return { ...t, layerIds: [...t.layerIds, layerId] }
      if (t.id !== teamId && t.layerIds.includes(layerId)) return { ...t, layerIds: t.layerIds.filter(i => i !== layerId) }
      return t
    })
    const changed = updated.filter((t, i) => t !== teams[i])
    await Promise.all(changed.map(t =>
      supabase.from('teams').update({ layer_ids: t.layerIds }).eq('id', t.id)
    ))
    setTeams(updated)
    setAssignModal(null)
  }

  async function removeFromTeam(layerId: string) {
    const team = teams.find(t => t.layerIds.includes(layerId))
    if (!team) return
    const updatedIds = team.layerIds.filter(i => i !== layerId)
    await supabase.from('teams').update({ layer_ids: updatedIds }).eq('id', team.id)
    setTeams(prev => prev.map(t => t.id === team.id ? { ...t, layerIds: updatedIds } : t))
  }

  function handleGenerateBuffers() {
    if (!csvFile) return
    setBufStatus({ type: 'loading', msg: '' })
    const radM = unit === 'km' ? parseFloat(radius) * 1000 : parseFloat(radius)
    Papa.parse(csvFile, {
      header: true, skipEmptyLines: true, complete: async res => {
        try {
          const features: object[] = []
          for (const row of res.data as Record<string, string>[]) {
            const lat = parseFloat(row.Latitude ?? row.latitude ?? row.Lat ?? row.lat)
            const lon = parseFloat(row.Longitude ?? row.longitude ?? row.Lon ?? row.lon ?? row.Lng ?? row.lng)
            if (isNaN(lat) || isNaN(lon)) continue
            const coords: [number, number][] = []
            for (let i = 0; i < 36; i++) coords.push(geodesicPoint(lat, lon, radM, i * 10))
            coords.push(coords[0])
            features.push({ type: 'Feature', properties: { name: row.Name ?? row.name ?? 'Buffer' }, geometry: { type: 'Polygon', coordinates: [coords] } })
          }
          if (!features.length) throw new Error('No valid coordinates')
          const blob = new Blob([JSON.stringify({ type: 'FeatureCollection', features })], { type: 'application/json' })
          await uploadBufferLayer(
            new File([blob], `buffers_${Date.now()}.geojson`),
            `${csvFile.name.replace(/\.csv$/i, '')} (${radius}${unit})`,
            bufColor, bufLocked
          )
          setBufStatus({ type: 'ok', msg: `${features.length} buffers uploaded` })
          setCsvFile(null); setPrev([]); loadAll()
        } catch (e: unknown) {
          setBufStatus({ type: 'err', msg: e instanceof Error ? e.message : 'Failed' })
        }
      },
      error: () => setBufStatus({ type: 'err', msg: 'CSV parse error' })
    })
  }

  const getTeamForLayer = (layerId: string) => teams.find(t => t.layerIds.includes(layerId))

  const rowProps = (layer: KMZLayer) => ({
    layer,
    onToggle: () => handleToggleBuffer(layer),
    onDelete: () => handleDeleteBuffer(layer.id, layer.file_path),
    onAssign: () => setAssignModal({ layerId: layer.id, layerName: layer.name }),
    editColorOpen: editBufColorId === layer.id,
    onColorEdit: () => { setEditBufColorId(editBufColorId === layer.id ? null : layer.id); setEditBufRenameId(null) },
    onColorChange: (c: string) => handleBufferColorChange(layer.id, c),
    editRenameOpen: editBufRenameId === layer.id,
    onRenameEdit: () => { setEditBufRenameId(editBufRenameId === layer.id ? null : layer.id); setEditBufColorId(null) },
    onRenameSubmit: (name: string) => handleBufferRename(layer.id, name),
    teamName: getTeamForLayer(layer.id)?.name,
  })

  return (
    <div className="fi">
      {/* Assign Modal */}
      {assignModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setAssignModal(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: T.card, borderRadius: 14, width: 340, border: `1.5px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: `1.5px solid ${T.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>Assign to team</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{assignModal.layerName}</div>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {teams.length === 0 ? (
                <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 13, color: T.muted }}>
                  No teams yet - create one in Boundary Layers first
                </div>
              ) : (
                <>
                  {getTeamForLayer(assignModal.layerId) && (
                    <button
                      onClick={() => { removeFromTeam(assignModal.layerId); setAssignModal(null) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', marginBottom: 4, fontFamily: 'Inter,system-ui,sans-serif', color: T.error, fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = T.low}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Remove from team
                    </button>
                  )}
                  {teams.map(team => {
                    const assigned = team.layerIds.includes(assignModal.layerId)
                    return (
                      <button key={team.id}
                        onClick={() => assignToTeam(team.id, assignModal.layerId)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: assigned ? T.low : 'transparent', marginBottom: 2, transition: 'background 0.1s', fontFamily: 'Inter,system-ui,sans-serif' }}
                        onMouseEnter={e => e.currentTarget.style.background = T.low}
                        onMouseLeave={e => e.currentTarget.style.background = assigned ? T.low : 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Dot color={team.color} size={10} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{team.name}</span>
                        </div>
                        {assigned && <span style={{ fontSize: 11, color: T.muted, background: T.container, padding: '2px 8px', borderRadius: 4 }}>assigned</span>}
                      </button>
                    )
                  })}
                </>
              )}
            </div>
            <div style={{ padding: '10px 20px 16px', borderTop: `1.5px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <Btn variant="secondary" size="sm" onClick={() => setAssignModal(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em' }}>Buffer Circles</h1>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 5, lineHeight: 1.6 }}>
          Generate geodesic buffer zones - stored separately from boundary layers
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <Card>
          <CardHeader title="Generate Buffers" />
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <DZ file={csvFile} label="Drop .csv here" hint="Name, Latitude, Longitude" accept=".csv" id="csv-buf"
              onSel={f => {
                setCsvFile(f)
                Papa.parse(f, { header: true, skipEmptyLines: true, complete: r => setPrev((r.data as Record<string, string>[]).slice(0, 10)) })
              }} />
            {prev.length > 0 && <PrevTable data={prev} cols={['Name', 'Latitude', 'Longitude']} />}
            <div>
              <FL>Radius</FL>
              <div style={{ display: 'flex', gap: 10 }}>
                <FI type="number" value={radius} onChange={e => setRadius(e.target.value)} style={{ width: 90 }} />
                <select value={unit} onChange={e => setUnit(e.target.value as 'm' | 'km')}
                  style={{ height: 42, padding: '0 12px', borderRadius: 8, background: T.card, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.ink, cursor: 'pointer' }}>
                  <option value="m">Meters</option>
                  <option value="km">Km</option>
                </select>
              </div>
            </div>
            <div><FL>Buffer colour</FL><Swatches value={bufColor} onChange={setBufColor} /></div>
            <Toggle on={bufLocked} onToggle={() => setBufLocked(v => !v)} label="Lock layer" hint="Field users can't hide locked layers" />
            <Btn onClick={handleGenerateBuffers} disabled={!csvFile || !radius}>
              <IconBufferZone size={14} /> Generate Buffers
            </Btn>
            <StatusMsg s={bufStatus} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={`Buffer Layers (${bufferLayers.length})`}
            sub="Click color dot to recolor | pencil to rename | assign to team"
          />
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px' }}>
              <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${T.container}`, borderTopColor: T.ink, animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12, color: T.muted }}>Loading...</span>
            </div>
          ) : bufferLayers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: T.muted, fontFamily: 'Inter,system-ui,sans-serif' }}>
              No buffer layers yet
            </div>
          ) : bufferLayers.map(layer => (
            <LayerRow key={layer.id} {...rowProps(layer)} />
          ))}
          <div style={{ padding: '8px 20px 12px' }}>
            <button onClick={loadAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.muted, padding: 3, borderRadius: 4, fontFamily: 'Inter,system-ui,sans-serif', transition: 'color 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.color = T.ink}
              onMouseLeave={e => e.currentTarget.style.color = T.muted}>
              <IconRefresh size={11} /> Refresh
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}