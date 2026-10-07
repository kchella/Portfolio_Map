import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'
import { syncCustomers, getCustomers } from '../../lib/customerService'
import { Customer, isPriorityVisit, PAR_BADGE, PAR_COLORS, PAR_LABEL, PAR_ORDER, type PARStatus } from '../../types/par'
import { normalizePARStatus } from '../../utils/parHelpers'
import { formatPhoneNumber } from '../../utils/geoHelpers'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  Btn, Card, CardHeader, DZ, FI, StatusMsg, PrevTable, Dot, Status, T
} from './AdminUI'
import {
  IconDownload, IconUpload, IconTrash, IconAlertCircle, IconSearch
} from '../icons'

// Rendering all ~7k rows at once stalls low-end devices; search narrows the rest.
const ROW_LIMIT = 200

const td: React.CSSProperties = { padding: '10px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

function Tile({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: T.muted, fontWeight: 500 }}>
        {color && <Dot color={color} size={8} />}{label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div>
    </div>
  )
}

export function CustomerManager() {
  const isMobile = useIsMobile()
  const [parCsv, setParCsv] = useState<File | null>(null)
  const [parStatus, setParStatus] = useState<Status>({ type: 'idle', msg: '' })
  const [prev, setPrev] = useState<Record<string, string>[]>([])
  const [liveCustomers, setLiveCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | PARStatus>('ALL')

  useEffect(() => {
    getCustomers().then(setLiveCustomers).catch(() => { }).finally(() => setLoading(false))
  }, [])

  function downloadTemplate() {
    const csv = [
      'Contract Reference,Name,Area,Latitude,Longitude,PAR Status,Phone,Phone 2,Supa Partner Code,Supa Partner Name,Supa Partner Latitude,Supa Partner Longitude',
      'ECS-0001,Customer Name,Area Name,-15.3580,28.3250,ONTIME,+260970000000,,CP001,Partner Name,-15.3600,28.3300'
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'PAR_Map_Template.csv'; a.click()
  }

  function onParCsvSelect(f: File) {
    setParCsv(f); setParStatus({ type: 'idle', msg: '' })
    Papa.parse(f, {
      header: true, skipEmptyLines: true, complete: r => {
        const normalized = (r.data as Record<string, string>[]).slice(0, 10).map(row => {
          const n: Record<string, string> = {}
          Object.keys(row).forEach(k => { n[k.toLowerCase().trim()] = row[k] })
          return n
        })
        setPrev(normalized)
      }
    })
  }

  async function handleGenerateCustomers() {
    if (!parCsv) return
    setParStatus({ type: 'loading', msg: 'Syncing to database...' })
    Papa.parse(parCsv, {
      header: true, skipEmptyLines: true, complete: async (res) => {
        const rows: Record<string, unknown>[] = []; let noGps = 0, badGps = 0
        for (const row of res.data as Record<string, string>[]) {
          const r: Record<string, string> = {}
          Object.keys(row).forEach(k => { r[k.toLowerCase().trim()] = row[k] })
          const lat = parseFloat(r['latitude'])
          const lonStr = r['longitude'] ?? '', lonParsed = parseFloat(lonStr)
          // TEMP: some CSV exports strip the decimal from longitude (e.g. "282932890" → "28.293289") — remove once source data is corrected
          const lon = lonParsed > 180 && /^2[89]/.test(lonStr) ? parseFloat(lonStr.slice(0, 2) + '.' + lonStr.slice(2)) : lonParsed
          const spLat = parseFloat(r['supa partner latitude']), spLon = parseFloat(r['supa partner longitude'])
          const spValid = !isNaN(spLat) && !isNaN(spLon) && spLat !== 0 && spLon !== 0 && Math.abs(spLat) <= 90 && Math.abs(spLon) <= 180
          // Customers without their own GPS can't be placed on the map.
          if (!r['latitude']?.trim() || !r['longitude']?.trim() || lat === 0 || lon === 0) { noGps++; continue }
          if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { badGps++; continue }
          rows.push({ contract_ref: r['contract reference'] || r['code'] || '', name: r['name'] ?? '', phone: formatPhoneNumber(r['phone'] ?? ''), phone2: formatPhoneNumber(r['phone 2'] ?? ''), area: r['area'] ?? '', par_status: normalizePARStatus(r['par status'] ?? ''), supa_partner_code: r['supa partner code'] ?? r['lead generate'] ?? '', supa_partner_name: r['supa partner name'] ?? r['lead generator name'] ?? '', supa_partner_latitude: spValid ? spLat : null, supa_partner_longitude: spValid ? spLon : null, latitude: lat, longitude: lon })
        }
        try {
          const { partnerGpsSaved } = await syncCustomers(rows)
          const skips = [noGps && `${noGps.toLocaleString()} with no customer GPS`, badGps && `${badGps.toLocaleString()} with invalid coordinates`].filter(Boolean)
          setParStatus({ type: 'ok', msg: `${rows.length.toLocaleString()} customers synced.${skips.length ? ` Skipped ${skips.join(', ')}.` : ''}${partnerGpsSaved ? '' : ' Supa Partner GPS not saved — run migration 004.'}` })
          setParCsv(null); setPrev([])
          getCustomers().then(setLiveCustomers).catch(() => { })
        } catch (e: unknown) { setParStatus({ type: 'err', msg: e instanceof Error ? e.message : 'Sync failed' }) }
      }, error: () => setParStatus({ type: 'err', msg: 'Failed to parse CSV' })
    })
  }

  async function clearAll() {
    if (!confirm('Delete all customer data? This cannot be undone.')) return
    setParStatus({ type: 'loading', msg: 'Deleting...' })
    const { error } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) setParStatus({ type: 'err', msg: error.message })
    else { setParStatus({ type: 'ok', msg: 'All customer data deleted.' }); setLiveCustomers([]) }
  }

  const stats = React.useMemo(() => {
    const counts: Record<string, number> = {}
    let withGps = 0
    for (const c of liveCustomers) {
      counts[c.par_status] = (counts[c.par_status] ?? 0) + 1
      if (c.supa_partner_latitude != null && c.supa_partner_longitude != null) withGps++
    }
    return { counts, withGps }
  }, [liveCustomers])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return liveCustomers.filter(c =>
      (statusFilter === 'ALL' || c.par_status === statusFilter) &&
      (!q || [c.contract_ref, c.name, c.area, c.supa_partner_name].some(v => v?.toLowerCase().includes(q))))
  }, [liveCustomers, query, statusFilter])

  const total = liveCustomers.length
  const ontime = stats.counts['ONTIME'] ?? 0
  const par90 = stats.counts['PAR 90+'] ?? 0
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}% of portfolio` : '—')
  const num = (n: number) => (loading ? '…' : n.toLocaleString())

  return (
    <div className="fi">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em' }}>Customer Data</h1>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Upload the weekly PAR export to refresh what field teams see on the map</p>
      </div>

      {/* ── Summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <Tile label="Customers" value={num(total)} sub="in database" />
        <Tile label="On time" value={num(ontime)} sub={pct(ontime)} color={PAR_COLORS['ONTIME']} />
        <Tile label="In arrears" value={num(total - ontime)} sub={pct(total - ontime)} color={PAR_COLORS['PAR 31-60']} />
        <Tile label="Priority · PAR 90+" value={num(par90)} sub={pct(par90)} color={PAR_COLORS['PAR 90+']} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(300px, 360px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        {/* ── Left: upload, GPS coverage, danger zone ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <CardHeader title="Weekly upload" sub="Replaces all customer records" />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <DZ file={parCsv} label="Drop the PAR .csv here" hint="or click to browse" accept=".csv" id="par-csv" onSel={onParCsvSelect} />
              {prev.length > 0 && <PrevTable data={prev} cols={['contract reference', 'area', 'par status']} />}
              <Btn onClick={handleGenerateCustomers} disabled={!parCsv || parStatus.type === 'loading'}>
                <IconUpload size={14} /> {parStatus.type === 'loading' ? 'Syncing…' : 'Sync to database'}
              </Btn>
              <StatusMsg s={parStatus} />
              <button onClick={downloadTemplate}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, color: T.mid, fontFamily: 'inherit', alignSelf: 'flex-start' }}>
                <IconDownload size={13} /> Download CSV template
              </button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Supa Partner GPS" sub="Needed for distance and routes on the map" />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.mid, marginBottom: 8 }}>
                <span>{num(stats.withGps)} of {num(total)} customers</span>
                <span style={{ fontWeight: 600, color: T.ink }}>{total ? `${Math.round((stats.withGps / total) * 100)}%` : '—'}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: T.low, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: total ? `${(stats.withGps / total) * 100}%` : 0, background: '#f58202', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>
          </Card>

          <div style={{ borderRadius: 16, border: '1.5px solid rgba(192,57,43,0.18)', padding: 20, background: T.card }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.error }}>Danger zone</div>
            <p style={{ fontSize: 12, color: T.muted, margin: '4px 0 12px' }}>Removes every customer from the map. Cannot be undone.</p>
            <Btn variant="danger" size="sm" onClick={clearAll}><IconTrash size={13} /> Clear all customer data</Btn>
          </div>
        </div>

        {/* ── Right: customer table ── */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1.5px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted, display: 'flex', pointerEvents: 'none' }}><IconSearch size={15} /></span>
              <FI value={query} onChange={e => setQuery(e.target.value)} placeholder="Search contract, name, area or Supa Partner" style={{ paddingLeft: 36, height: 40, fontSize: 13.5 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['ALL', ...PAR_ORDER] as const).map(st => {
                const on = statusFilter === st
                const n = st === 'ALL' ? total : (stats.counts[st] ?? 0)
                return (
                  <button key={st} onClick={() => setStatusFilter(st)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', borderRadius: 14, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', border: `1.5px solid ${on ? T.ink : T.border}`, background: on ? T.ink : T.card, color: on ? '#fff' : T.mid, transition: 'all 0.12s' }}>
                    {st !== 'ALL' && <Dot color={PAR_COLORS[st]} size={7} />}
                    {st === 'ALL' ? 'All' : PAR_LABEL[st]}
                    <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{n.toLocaleString()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ overflow: 'auto', maxHeight: isMobile ? 520 : 'calc(100vh - 330px)', minHeight: 320 }}>
            {/* fixed layout so long names truncate instead of pushing Status off-screen */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: isMobile ? undefined : 150 }} />
                {!isMobile && <><col /><col style={{ width: '18%' }} /><col style={{ width: '22%' }} /></>}
                <col style={{ width: 120 }} />
              </colgroup>
              <thead>
                <tr>
                  {(isMobile ? ['Contract', 'Status'] : ['Contract', 'Customer', 'Area', 'Supa Partner', 'Status']).map(h => (
                    <th key={h} style={{ position: 'sticky', top: 0, zIndex: 1, background: T.low, padding: '9px 16px', textAlign: h === 'Status' ? 'right' : 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.muted, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, ROW_LIMIT).map((c, i) => {
                  const badge = PAR_BADGE[c.par_status] ?? PAR_BADGE['ONTIME']
                  return (
                    <tr key={c.contract_ref || i} style={{ borderTop: `1px solid ${T.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = T.low} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...td, fontFamily: 'DM Mono, monospace', fontSize: 12.5, color: T.ink }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {c.contract_ref || '—'}
                          {isPriorityVisit(c) && <span title="Priority visit" style={{ display: 'flex' }}><IconAlertCircle size={12} color={T.error} /></span>}
                        </span>
                      </td>
                      {!isMobile && <td style={{ ...td, color: T.ink, maxWidth: 200 }}>{c.name || '—'}</td>}
                      {!isMobile && <td style={{ ...td, color: T.mid }}>{c.area || '—'}</td>}
                      {!isMobile && <td style={{ ...td, color: T.mid, maxWidth: 180 }}>{c.supa_partner_name || '—'}</td>}
                      <td style={{ ...td, textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: badge.bg, color: badge.text, padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
                          <Dot color={PAR_COLORS[c.par_status] ?? PAR_COLORS['ONTIME']} size={6} />
                          {PAR_LABEL[c.par_status] ?? c.par_status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {loading && <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: T.muted }}>Loading customers…</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: T.muted }}>
                {total ? 'No customers match this search' : 'No customer data yet — upload the weekly CSV'}
              </div>
            )}
          </div>
          {filtered.length > 0 && (
            <div style={{ padding: '10px 20px', borderTop: `1.5px solid ${T.border}`, fontSize: 12, color: T.muted }}>
              {filtered.length > ROW_LIMIT
                ? `Showing first ${ROW_LIMIT} of ${filtered.length.toLocaleString()} — search or filter to narrow`
                : `${filtered.length.toLocaleString()} customer${filtered.length === 1 ? '' : 's'}`}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
