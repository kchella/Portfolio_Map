import React from 'react'
import { 
  IconCheckCircle, IconXCircle, IconUpload 
} from '../icons'

export const T = {
  canvas: '#f7f7f7', card: '#ffffff', low: '#f0f0f0', container: '#e8e8e8',
  border: '#e2e2e2', ink: '#111111', mid: '#555555', muted: '#999999',
  error: '#c0392b', errorDim: 'rgba(192,57,43,0.06)', success: '#1a7a4a',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
  shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
} as const

export const LAYER_COLORS = [
  '#111111', '#374151', '#64748b', '#1e40af', '#2563eb', '#3d3fcc', '#0e7490',
  '#166534', '#1a7a4a', '#059669', '#7f1d1d', '#c0392b', '#dc2626', '#be185d',
  '#9a3412', '#d97706', '#ca8a04', '#6b21a8', '#7c3aed', '#a21caf', '#0f766e', '#0891b2',
]

export type Status = { type: 'idle' | 'loading' | 'ok' | 'err'; msg: string }

export function Btn({ children, onClick, disabled, variant = 'primary', size = 'md', type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'
  type?: 'button' | 'submit'
}) {
  const s: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: 'Inter,system-ui,sans-serif', fontWeight: 600, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
    transition: 'all 0.12s', borderRadius: size === 'sm' ? 9 : 10, letterSpacing: '-0.01em',
    height: size === 'sm' ? 36 : 46, padding: size === 'sm' ? '0 14px' : '0 20px',
    fontSize: size === 'sm' ? 12.5 : 13.5,
  }
  const v: Record<string, React.CSSProperties> = {
    primary: { background: '#111', color: '#fff' },
    secondary: { background: T.card, color: T.ink, border: `1.5px solid ${T.border}` },
    ghost: { background: 'transparent', color: T.mid },
    danger: { background: T.errorDim, color: T.error, border: `1.5px solid rgba(192,57,43,0.15)` },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...s, ...v[variant] }}
      onMouseEnter={e => {
        if (disabled) return; const el = e.currentTarget as HTMLElement
        if (variant === 'primary') el.style.background = '#333'
        if (variant === 'secondary') el.style.borderColor = '#888'
        if (variant === 'ghost') el.style.background = T.low
        if (variant === 'danger') el.style.background = 'rgba(192,57,43,0.12)'
      }}
      onMouseLeave={e => {
        if (disabled) return; const el = e.currentTarget as HTMLElement
        if (variant === 'primary') el.style.background = '#111'
        if (variant === 'secondary') el.style.borderColor = T.border
        if (variant === 'ghost') el.style.background = 'transparent'
        if (variant === 'danger') el.style.background = T.errorDim
      }}
    >{children}</button>
  )
}

export function StatusMsg({ s }: { s: Status }) {
  if (s.type === 'idle' || !s.msg) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: s.type === 'ok' ? T.success : s.type === 'loading' ? T.muted : T.error, fontFamily: 'Inter,system-ui,sans-serif' }}>
      {s.type === 'ok' ? <IconCheckCircle size={14} /> : s.type === 'err' ? <IconXCircle size={14} /> : null}{s.msg}
    </div>
  )
}

export function FL({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted, marginBottom: 6, fontFamily: 'Inter,system-ui,sans-serif' }}>{children}</label>
}

export function FI(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ width: '100%', height: 42, padding: '0 14px', background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.ink, fontFamily: 'Inter,system-ui,sans-serif', outline: 'none', transition: 'border-color 0.15s', ...props.style }}
    onFocus={e => { e.currentTarget.style.borderColor = '#111'; props.onFocus?.(e) }}
    onBlur={e => { e.currentTarget.style.borderColor = T.border; props.onBlur?.(e) }} />
}

export function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.card, borderRadius: 16, border: `1.5px solid ${T.border}`, overflow: 'hidden', ...style }}>{children}</div>
}

export function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1.5px solid ${T.border}` }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em', fontFamily: 'Inter,system-ui,sans-serif' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 2, fontFamily: 'Inter,system-ui,sans-serif' }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

export function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [hex, setHex] = React.useState(value)
  React.useEffect(() => setHex(value), [value])
  const isValidHex = (h: string) => /^#[0-9a-fA-F]{6}$/.test(h)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {LAYER_COLORS.map(c => (
          <button key={c} onClick={() => { onChange(c); setHex(c) }}
            style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', boxShadow: value === c ? `0 0 0 2px white,0 0 0 4px ${c}` : 'none', transform: value === c ? 'scale(1.12)' : 'scale(1)', transition: 'all 0.12s', flexShrink: 0 }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: isValidHex(hex) ? hex : value, flexShrink: 0, border: `1.5px solid ${T.border}` }} />
        <input type="text" value={hex} onChange={e => { setHex(e.target.value); if (isValidHex(e.target.value)) onChange(e.target.value) }} placeholder="#000000"
          style={{ width: 88, height: 30, padding: '0 8px', background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 6, fontSize: 12, color: T.ink, fontFamily: 'DM Mono,monospace', outline: 'none', transition: 'border-color 0.15s' }}
          onFocus={e => e.currentTarget.style.borderColor = '#111'} onBlur={e => e.currentTarget.style.borderColor = T.border} />
        <span style={{ fontSize: 11, color: T.muted, fontFamily: 'Inter,system-ui,sans-serif' }}>custom hex</span>
      </div>
    </div>
  )
}

export function Toggle({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={onToggle}>
      <div style={{ width: 38, height: 22, borderRadius: 11, background: on ? '#111' : T.container, position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: 'white', position: 'absolute', top: 2, left: on ? 18 : 2, transition: 'left 0.15s', boxShadow: T.shadowSm }} />
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: T.ink, fontFamily: 'Inter,system-ui,sans-serif' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: T.muted, marginTop: 1, fontFamily: 'Inter,system-ui,sans-serif' }}>{hint}</div>
      </div>
    </div>
  )
}

export function DZ({ file, label, hint, accept, id, onSel }: { file: File | null; label: string; hint: string; accept: string; id: string; onSel: (f: File) => void }) {
  const [drag, setDrag] = React.useState(false)
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onSel(f) }}
      onClick={() => document.getElementById(id)?.click()}
      style={{ width: '100%', height: 100, borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: drag ? 'rgba(0,0,0,0.03)' : T.low, border: `1.5px dashed ${file || drag ? '#111' : '#ccc'}`, transition: 'all 0.12s' }}>
      {file ? (<><span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'Inter,system-ui,sans-serif' }}>{file.name}</span><span style={{ fontSize: 11, color: T.muted }}>{(file.size / 1024).toFixed(0)} KB</span></>) : (<><IconUpload size={16} color={T.muted} /><span style={{ fontSize: 13, fontWeight: 500, color: T.mid, fontFamily: 'Inter,system-ui,sans-serif' }}>{label}</span><span style={{ fontSize: 11, color: T.muted }}>{hint}</span></>)}
      <input type="file" id={id} accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onSel(f) }} />
    </div>
  )
}

export function PrevTable({ data, cols }: { data: Record<string, string>[]; cols: string[] }) {
  if (!data.length) return null
  return (
    <div style={{ marginTop: 10, borderRadius: 8, border: `1.5px solid ${T.border}`, overflow: 'hidden' }}>
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: T.low }}>{cols.map(h => <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted, fontFamily: 'Inter,system-ui,sans-serif', position: 'sticky', top: 0, background: T.low }}>{h}</th>)}</tr></thead>
          <tbody>{data.slice(0, 10).map((r, i) => (<tr key={i} style={{ background: i % 2 === 0 ? T.card : 'transparent' }}>{cols.map(k => <td key={k} style={{ padding: '7px 12px', fontSize: 12, color: T.mid, fontFamily: 'Inter,system-ui,sans-serif', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r[k] ?? '-'}</td>)}</tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}
