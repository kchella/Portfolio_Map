import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  fetchLayers, uploadLayer, deleteLayer, toggleLayerVisibility,
  updateLayerColor, renameLayer
} from '../../lib/layerService'
import { KMZLayer } from '../../types/par'
import {
  Btn, Card, CardHeader, DZ, FL, FI, Swatches, Toggle, Dot, Status, T, LAYER_COLORS,
  StatusMsg
} from './AdminUI'
import {
  IconUpload, IconChevronUp, IconChevronDown, IconTrash,
  IconEye, IconEyeOff, IconEdit, IconLock, IconRefresh, IconSearch
} from '../icons'

interface Team { id: string; name: string; color: string; layerIds: string[] }

function IconBtn({ title, onClick, children, danger, active }: {
  title: string; onClick: () => void; children: React.ReactNode; danger?: boolean; active?: boolean
}) {
  const base = active ? T.ink : T.muted
  return (
    <button title={title} aria-label={title} onClick={onClick}
      style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: 7, cursor: 'pointer', color: base, transition: 'all 0.1s', flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? T.errorDim : T.container; e.currentTarget.style.color = danger ? T.error : T.ink }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = base }}>
      {children}
    </button>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function LayerRow({
  layer, teams, teamId, onTeamChange, onToggle, onDelete,
  editColorOpen, onColorEdit, onColorChange, editRenameOpen, onRenameEdit, onRenameSubmit, isMobile,
}: {
  layer: KMZLayer; teams: Team[]; teamId: string | null; onTeamChange: (teamId: string | null) => void
  onToggle: () => void; onDelete: () => void
  editColorOpen: boolean; onColorEdit: () => void; onColorChange: (c: string) => void
  editRenameOpen: boolean; onRenameEdit: () => void; onRenameSubmit: (name: string) => void
  isMobile: boolean
}) {
  const [renameVal, setRenameVal] = useState(layer.name)
  useEffect(() => { setRenameVal(layer.name) }, [layer.name, editRenameOpen])
  const unchanged = !renameVal.trim() || renameVal.trim() === layer.name

  return (
    <div style={{ borderTop: `1px solid ${T.border}` }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 20px', transition: 'background 0.1s', opacity: layer.visible ? 1 : 0.55 }}
        onMouseEnter={e => e.currentTarget.style.background = T.low}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <button onClick={onColorEdit} title="Change colour" aria-label="Change colour"
          style={{ width: 14, height: 14, borderRadius: 4, background: layer.color, border: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: editColorOpen ? `0 0 0 2px white,0 0 0 4px ${layer.color}` : 'none', transition: 'box-shadow 0.12s' }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {layer.name}
        </span>
        {layer.locked && <span title="Locked — field users can't hide it" style={{ display: 'flex', color: T.muted }}><IconLock size={12} /></span>}

        <select value={teamId ?? ''} onChange={e => onTeamChange(e.target.value || null)} title="Team"
          style={{ height: 30, maxWidth: isMobile ? 110 : 170, padding: '0 8px', borderRadius: 7, border: `1.5px solid ${T.border}`, background: T.card, fontSize: 12, color: teamId ? T.ink : T.muted, cursor: 'pointer', flexShrink: 0 }}>
          <option value="">No team</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <IconBtn title={layer.visible ? 'Hide on map' : 'Show on map'} onClick={onToggle} active={layer.visible}>
            {layer.visible ? <IconEye size={15} /> : <IconEyeOff size={15} />}
          </IconBtn>
          {!layer.locked && <IconBtn title="Rename" onClick={onRenameEdit} active={editRenameOpen}><IconEdit size={14} /></IconBtn>}
          {!layer.locked && <IconBtn title="Delete layer" onClick={onDelete} danger><IconTrash size={14} /></IconBtn>}
        </div>
      </div>

      {editRenameOpen && (
        <form onSubmit={e => { e.preventDefault(); if (!unchanged) onRenameSubmit(renameVal.trim()) }}
          style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 20px 12px 44px', background: T.low }}>
          <FI autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)} style={{ height: 34, fontSize: 13 }} />
          <Btn size="sm" type="submit" disabled={unchanged}>Save</Btn>
          <Btn size="sm" variant="secondary" onClick={onRenameEdit}>Cancel</Btn>
        </form>
      )}

      {editColorOpen && (
        <div style={{ padding: '12px 20px 14px 44px', background: T.low }}>
          <Swatches value={layer.color} onChange={onColorChange} />
        </div>
      )}
    </div>
  )
}

export function LayerManager() {
  const isMobile = useIsMobile()
  const [layers, setLayers] = useState<KMZLayer[]>([])
  const [layersLoading, setLayersLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [editColorId, setEditColorId] = useState<string | null>(null)
  const [editRenameId, setEditRenameId] = useState<string | null>(null)
  const [kmzFile, setKmzFile] = useState<File | null>(null)
  const [layerName, setLayerName] = useState('')
  const [layerColor, setLayerColor] = useState(LAYER_COLORS[1])
  const [layerLocked, setLayerLocked] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<Status>({ type: 'idle', msg: '' })
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamColor, setNewTeamColor] = useState(LAYER_COLORS[0])
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [teamOpen, setTeamOpen] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')

  const loadLayers = useCallback(async () => {
    setLayersLoading(true)
    const [fetchedLayers, teamsResult] = await Promise.all([
      fetchLayers(),
      supabase.from('teams').select('*'),
    ])
    setLayers(fetchedLayers)
    setTeams(
      (teamsResult.data ?? [] as Array<{ id: string; name: string; color: string; layer_ids?: string[] }>)
        .map(r => ({ id: r.id, name: r.name, color: r.color, layerIds: r.layer_ids ?? [] }))
    )
    setLayersLoading(false)
  }, [])

  useEffect(() => { loadLayers() }, [loadLayers])

  async function createTeam() {
    if (!newTeamName.trim()) return
    const t: Team = { id: crypto.randomUUID(), name: newTeamName.trim(), color: newTeamColor, layerIds: [] }
    const { error } = await supabase.from('teams').insert({ id: t.id, name: t.name, color: t.color, layer_ids: t.layerIds })
    if (!error) { setTeams(prev => [...prev, t]); setNewTeamName(''); setShowNewTeam(false) }
  }

  async function deleteTeam(id: string) {
    if (!confirm('Delete this team? Its layers become unassigned.')) return
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (!error) setTeams(prev => prev.filter(t => t.id !== id))
  }

  // Moves a layer to one team (or none); every team row that changes is saved.
  async function setLayerTeam(layerId: string, teamId: string | null) {
    const updated = teams.map(t => {
      if (t.id === teamId && !t.layerIds.includes(layerId)) return { ...t, layerIds: [...t.layerIds, layerId] }
      if (t.id !== teamId && t.layerIds.includes(layerId)) return { ...t, layerIds: t.layerIds.filter(i => i !== layerId) }
      return t
    })
    const changed = updated.filter((t, i) => t !== teams[i])
    setTeams(updated)
    await Promise.all(changed.map(t => supabase.from('teams').update({ layer_ids: t.layerIds }).eq('id', t.id)))
  }

  async function handleLayerColorChange(id: string, color: string) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, color } : l))
    try { await updateLayerColor(id, color) } catch { }
    setEditColorId(null)
  }

  async function handleLayerRename(id: string, name: string) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l))
    try { await renameLayer(id, name) } catch { loadLayers() }
    setEditRenameId(null)
  }

  async function handleUpload() {
    if (!kmzFile || !layerName.trim()) return
    setUploadStatus({ type: 'loading', msg: 'Uploading…' })
    try {
      await uploadLayer(kmzFile, layerName, layerColor, layerLocked)
      setUploadStatus({ type: 'ok', msg: 'Layer uploaded' })
      setKmzFile(null); setLayerName(''); loadLayers()
    } catch {
      setUploadStatus({ type: 'err', msg: 'Upload failed' })
    }
  }

  async function handleDelete(id: string, filePath?: string) {
    if (!filePath || !confirm('Delete this layer?')) return
    await deleteLayer(id, filePath)
    setLayers(prev => prev.filter(l => l.id !== id))
    const affected = teams.filter(t => t.layerIds.includes(id))
    await Promise.all(affected.map(t =>
      supabase.from('teams').update({ layer_ids: t.layerIds.filter(i => i !== id) }).eq('id', t.id)
    ))
    setTeams(prev => prev.map(t => ({ ...t, layerIds: t.layerIds.filter(i => i !== id) })))
  }

  // Optimistic — refetching re-downloads and re-parses every KMZ.
  async function handleToggle(layer: KMZLayer) {
    setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !layer.visible } : l))
    try { await toggleLayerVisibility(layer.id, !layer.visible) }
    catch { setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: layer.visible } : l)) }
  }

  const q = query.trim().toLowerCase()
  const matches = (l: KMZLayer) => !q || l.name.toLowerCase().includes(q)
  const teamOf = new Map<string, string>()
  teams.forEach(t => t.layerIds.forEach(id => teamOf.set(id, t.id)))
  const ungrouped = layers.filter(l => !teamOf.has(l.id))
  const visibleCount = layers.filter(l => l.visible).length

  const row = (layer: KMZLayer) => (
    <LayerRow
      key={layer.id}
      layer={layer}
      teams={teams}
      teamId={teamOf.get(layer.id) ?? null}
      onTeamChange={t => setLayerTeam(layer.id, t)}
      onToggle={() => handleToggle(layer)}
      onDelete={() => handleDelete(layer.id, layer.file_path)}
      editColorOpen={editColorId === layer.id}
      onColorEdit={() => { setEditColorId(editColorId === layer.id ? null : layer.id); setEditRenameId(null) }}
      onColorChange={c => handleLayerColorChange(layer.id, c)}
      editRenameOpen={editRenameId === layer.id}
      onRenameEdit={() => { setEditRenameId(editRenameId === layer.id ? null : layer.id); setEditColorId(null) }}
      onRenameSubmit={name => handleLayerRename(layer.id, name)}
      isMobile={isMobile}
    />
  )

  // Teams start collapsed, Unassigned starts open; a search opens every group.
  const isGroupOpen = (key: string) => (q ? true : teamOpen[key] ?? key === '__none')

  const groupHeader = (key: string, color: string | null, name: string, count: number, extra?: React.ReactNode) => {
    const isOpen = isGroupOpen(key)
    return (
      <div
        onClick={() => setTeamOpen(o => ({ ...o, [key]: !isOpen }))}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 0 20px', height: 44, cursor: 'pointer', background: T.low, borderTop: `1.5px solid ${T.border}`, userSelect: 'none' }}>
        <span style={{ display: 'flex', color: T.muted }}>{isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}</span>
        {color ? <Dot color={color} size={9} /> : null}
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: color ? T.ink : T.mid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: 11.5, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{count} layer{count === 1 ? '' : 's'}</span>
        {extra}
      </div>
    )
  }

  return (
    <div className="fi">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em' }}>Boundary Layers</h1>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Upload KMZ boundaries, group them by team, and choose what shows on the map</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <Tile label="Layers" value={layersLoading ? '…' : String(layers.length)} sub="boundaries uploaded" />
        <Tile label="Teams" value={layersLoading ? '…' : String(teams.length)} sub="field teams" />
        <Tile label="On the map" value={layersLoading ? '…' : String(visibleCount)} sub={`${layers.length - visibleCount} hidden`} />
        <Tile label="Unassigned" value={layersLoading ? '…' : String(ungrouped.length)} sub="not in a team" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(300px, 360px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        {/* ── Left: upload + new team ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <CardHeader title="Upload layer" sub="KMZ, KML or GeoJSON" />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <DZ file={kmzFile} label="Drop the boundary file here" hint="or click to browse" accept=".kmz,.kml,.geojson" id="kmz-input"
                onSel={f => { setKmzFile(f); if (!layerName) setLayerName(f.name.replace(/\.[^/.]+$/, '')) }} />
              <div><FL>Layer name</FL><FI value={layerName} onChange={e => setLayerName(e.target.value)} placeholder="e.g. Ngombe Boundary" /></div>
              <div><FL>Colour</FL><Swatches value={layerColor} onChange={setLayerColor} /></div>
              <Toggle on={layerLocked} onToggle={() => setLayerLocked(v => !v)} label="Lock layer" hint="Field users can't hide locked layers" />
              <Btn onClick={handleUpload} disabled={!kmzFile || !layerName.trim() || uploadStatus.type === 'loading'}>
                <IconUpload size={14} /> {uploadStatus.type === 'loading' ? 'Uploading…' : 'Upload layer'}
              </Btn>
              <StatusMsg s={uploadStatus} />
            </div>
          </Card>

          <Card>
            <CardHeader title="New team" sub="Group boundaries by field team"
              right={!showNewTeam && <Btn variant="secondary" size="sm" onClick={() => setShowNewTeam(true)}>+ Add</Btn>} />
            {showNewTeam && (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FL>Team name</FL>
                  <FI autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Supa Unity Circle"
                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') createTeam() }} />
                </div>
                <div><FL>Team colour</FL><Swatches value={newTeamColor} onChange={setNewTeamColor} /></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn size="sm" onClick={createTeam} disabled={!newTeamName.trim()}>Create team</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => { setShowNewTeam(false); setNewTeamName('') }}>Cancel</Btn>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: all layers grouped by team ── */}
        <Card>
          <div style={{ padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted, display: 'flex', pointerEvents: 'none' }}><IconSearch size={15} /></span>
              <FI value={query} onChange={e => setQuery(e.target.value)} placeholder="Search layers" style={{ paddingLeft: 36, height: 40, fontSize: 13.5 }} />
            </div>
            <IconBtn title="Refresh" onClick={loadLayers}><IconRefresh size={15} /></IconBtn>
          </div>

          {layersLoading ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: T.muted, borderTop: `1.5px solid ${T.border}` }}>Loading layers…</div>
          ) : layers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: T.muted, borderTop: `1.5px solid ${T.border}` }}>No layers yet — upload a KMZ to get started</div>
          ) : (
            <>
              {teams.map(team => {
                const tls = layers.filter(l => teamOf.get(l.id) === team.id && matches(l))
                if (q && tls.length === 0) return null
                const isOpen = isGroupOpen(team.id)
                return (
                  <div key={team.id}>
                    {groupHeader(team.id, team.color, team.name, tls.length,
                      <span onClick={e => e.stopPropagation()} style={{ display: 'flex' }}>
                        <IconBtn title="Delete team" onClick={() => deleteTeam(team.id)} danger><IconTrash size={13} /></IconBtn>
                      </span>)}
                    {isOpen && (tls.length
                      ? tls.map(row)
                      : <div style={{ padding: '12px 20px', fontSize: 12.5, color: T.muted, borderTop: `1px solid ${T.border}` }}>No layers yet — pick this team from a layer&apos;s dropdown</div>)}
                  </div>
                )
              })}
              {(() => {
                const uls = ungrouped.filter(matches)
                if (!uls.length) return null
                const isOpen = isGroupOpen('__none')
                return (
                  <div>
                    {groupHeader('__none', null, 'Unassigned', uls.length)}
                    {isOpen && uls.map(row)}
                  </div>
                )
              })()}
              {q && !layers.some(matches) && (
                <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: T.muted, borderTop: `1.5px solid ${T.border}` }}>No layers match “{query}”</div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
