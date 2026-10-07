import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { Btn, Card, CardHeader, StatusMsg, Status, T } from './AdminUI'

type Role = 'admin' | 'user' | 'pending'
interface Row { id: string; full_name: string | null; email: string | null; role: Role; role_request: string | null; created_at: string | null }

const ROLE_LABEL: Record<Role, string> = { pending: 'Pending', user: 'Viewer', admin: 'Admin' }
const ROLE_STYLE: Record<Role, React.CSSProperties> = {
  pending: { background: '#fff7ed', color: '#c2410c' },
  user: { background: '#f0fdf4', color: '#15803d' },
  admin: { background: T.container, color: T.ink },
}

export function UserManager() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState<Status>({ type: 'idle', msg: '' })
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus({ type: 'loading', msg: 'Loading accounts…' })
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, role_request, created_at')
      .order('created_at', { ascending: false })
    if (error) { setStatus({ type: 'err', msg: `Could not load accounts: ${error.message}` }); return }
    setRows((data ?? []) as Row[])
    setStatus({ type: 'idle', msg: '' })
  }, [])

  useEffect(() => { load() }, [load])

  async function setRole(id: string, role: Role) {
    setBusy(id)
    // .select() returns the updated row — an empty result means RLS refused it
    const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select('id')
    setBusy(null)
    if (error || !data?.length) { setStatus({ type: 'err', msg: error?.message ?? 'Update was not permitted' }); return }
    setRows(prev => prev.map(r => r.id === id ? { ...r, role } : r))
    setStatus({ type: 'ok', msg: `Access updated` })
  }

  const pending = rows.filter(r => r.role === 'pending').length

  return (
    <Card>
      <CardHeader
        title="Users & Access"
        sub={pending ? `${pending} account${pending === 1 ? '' : 's'} waiting for approval` : 'New sign-ups appear here as Pending until you approve them'}
        right={<Btn size="sm" variant="secondary" onClick={load}>Refresh</Btn>}
      />
      <div style={{ padding: '8px 24px 20px' }}>
        <StatusMsg s={status} />
        {rows.map(r => {
          const self = r.id === user?.id
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: 'Inter,system-ui,sans-serif' }}>
                  {r.full_name || '—'}{self && <span style={{ color: T.muted, fontWeight: 400 }}> (you)</span>}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: 'Inter,system-ui,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.email || 'no email'}{r.role_request ? ` · requested: ${r.role_request}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...ROLE_STYLE[r.role], fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 5, fontFamily: 'Inter,system-ui,sans-serif' }}>{ROLE_LABEL[r.role]}</span>
                {!self && r.role === 'pending' && <Btn size="sm" disabled={busy === r.id} onClick={() => setRole(r.id, 'user')}>Approve</Btn>}
                {!self && r.role === 'user' && <Btn size="sm" variant="secondary" disabled={busy === r.id} onClick={() => setRole(r.id, 'admin')}>Make admin</Btn>}
                {!self && r.role !== 'pending' && <Btn size="sm" variant="danger" disabled={busy === r.id} onClick={() => setRole(r.id, 'pending')}>Revoke</Btn>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
