import React from 'react'
import { Customer, PAR_BADGE, PAR_COLORS, PAR_LABEL } from '../types/par'
import { T, F } from '../styles/theme'
import { formatDistance } from '../utils/geoHelpers'
import type { PartnerLink } from '../utils/supaPartners'

interface PopupCardProps {
  customer: Customer
  partnerLink?: PartnerLink | null
  onShowRoute?: () => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// Local Zambian numbers (09x…/07x…) → 2609x… for wa.me links.
function whatsappNumber(phone: string): string | null {
  const d = phone.replace(/\D/g, '').replace(/^0+/, '')
  if (d.startsWith('260') && d.length === 12) return d
  if (d.length === 9) return `260${d}`
  return null
}

const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

const Svg = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const IcoPhone = ({ size }: { size?: number }) => <Svg size={size}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" /></Svg>
const IcoChat = ({ size }: { size?: number }) => <Svg size={size}><path d="M21 12a8.5 8.5 0 01-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1121 12z" /></Svg>
const IcoCopy = () => <Svg size={12}><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6a2 2 0 012-2h8" /></Svg>
const IcoCheck = () => <Svg size={12}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
const IcoUser = () => <Svg><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0114 0" /></Svg>
const IcoClock = () => <Svg><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
const IcoRoute = () => <Svg><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3.5 3.5 0 000-7H9a3.5 3.5 0 010-7h6.5" /></Svg>

// Round icon button — compact, still a comfortable tap target.
function RoundBtn({ label, href, target, children }: { label: string; href: string; target?: string; children: React.ReactNode }) {
  return (
    <a href={href} target={target} rel={target ? 'noopener noreferrer' : undefined} aria-label={label} title={label}
      style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.low, color: T.onSurface, textDecoration: 'none', flexShrink: 0, transition: 'background 0.12s' }}
      onMouseEnter={e => { e.currentTarget.style.background = T.container }}
      onMouseLeave={e => { e.currentTarget.style.background = T.low }}>
      {children}
    </a>
  )
}

// One contact-sheet row: leading icon, label over value, trailing content.
function Row({ icon, label, value, trailing }: { icon: React.ReactNode; label?: string; value: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 50, padding: '5px 0' }}>
      <span style={{ display: 'flex', color: T.muted, flexShrink: 0, width: 20, justifyContent: 'center' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && <div style={{ fontSize: 11, color: T.variant, lineHeight: 1.3 }}>{label}</div>}
        <div style={{ fontSize: 12.5, fontWeight: 500, color: T.onSurface, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
      {trailing && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{trailing}</div>}
    </div>
  )
}

const divider = <div style={{ height: 1, background: T.ghost, marginLeft: 32 }} />

export const PopupCard: React.FC<PopupCardProps> = ({ customer, partnerLink, onShowRoute }) => {
  const [copied, setCopied] = React.useState<string | null>(null)
  const status = customer.par_status
  const badge = PAR_BADGE[status] ?? PAR_BADGE['ONTIME']
  const dot = PAR_COLORS[status] ?? PAR_COLORS['ONTIME']
  const phones = [customer.phone, customer.phone2].filter(Boolean)
  const partnerName = customer.supa_partner_name || customer.supa_partner_code

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(text); setTimeout(() => setCopied(c => c === text ? null : c), 1500)
    }).catch(() => { })
  }

  // Tap-to-copy value with a trailing copy/check glyph (contract ref, phone).
  const Copyable = ({ text, title, size }: { text: string; title: string; size: number }) => (
    <button type="button" onClick={() => copy(text)} title={title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 0', background: 'none', border: 'none', cursor: 'pointer', color: copied === text ? PAR_BADGE['ONTIME'].text : 'inherit', fontFamily: F.family, fontSize: size, fontWeight: 'inherit', fontVariantNumeric: 'tabular-nums', flexShrink: 0, maxWidth: '100%' }}>
      {text}
      {copied === text ? <IcoCheck /> : <span style={{ display: 'flex', opacity: 0.6 }}><IcoCopy /></span>}
    </button>
  )

  return (
    <div style={{ width: 'min(360px, calc(100vw - 32px))', fontFamily: F.family, background: T.card, borderRadius: 16, overflow: 'hidden', color: T.onSurface }}>
      {/* ── Header: who ── */}
      <div style={{ padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 30 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.primaryDim, color: T.primaryText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
            {initials(customer.name || '')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customer.name || 'Unnamed customer'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 11.5, color: T.variant, minWidth: 0 }}>
              {customer.contract_ref ? <Copyable text={customer.contract_ref} title="Copy contract ref" size={11.5} /> : <span>No ref</span>}
              {customer.area && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {customer.area}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact sheet ── */}
      <div style={{ padding: '0 16px', borderTop: `1px solid ${T.ghost}` }}>
        <Row icon={<IcoClock />} value="PAR Status"
          trailing={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 9px', borderRadius: 999, background: badge.bg, color: badge.text, fontSize: 11.5, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
              {PAR_LABEL[status] ?? status}
            </span>
          } />
        {divider}
        {phones.length ? phones.map((p, i) => {
          const wa = whatsappNumber(p)
          return (
            <React.Fragment key={p}>
              {i > 0 && divider}
              <Row icon={<IcoPhone />} label={i === 0 ? 'Phone' : 'Phone 2'} value={<Copyable text={p} title="Copy phone number" size={12.5} />}
                trailing={<>
                  {wa && <RoundBtn label={`WhatsApp ${p}`} href={`https://wa.me/${wa}`} target="_blank"><IcoChat size={14} /></RoundBtn>}
                  <RoundBtn label={`Call ${p}`} href={telHref(p)}><IcoPhone size={14} /></RoundBtn>
                </>} />
            </React.Fragment>
          )
        }) : <Row icon={<IcoPhone />} label="Phone" value={<span style={{ color: T.muted, fontWeight: 400 }}>No number on file</span>} />}

        {partnerName && (
          <>
            {divider}
            <Row icon={<IcoUser />} label="Supa Partner" value={partnerName}
              trailing={partnerLink
                ? <span style={{ fontSize: 12.5, fontWeight: 600, color: T.onSurface, fontVariantNumeric: 'tabular-nums' }}>{formatDistance(partnerLink.distanceM)}</span>
                : <span style={{ fontSize: 11, color: T.muted }}>No GPS</span>} />
          </>
        )}
      </div>

      {/* ── Primary action ── */}
      {partnerLink && onShowRoute ? (
        <div style={{ padding: '6px 14px 14px' }}>
          <button type="button" onClick={onShowRoute}
            style={{ width: '100%', height: 42, borderRadius: 10, border: 'none', background: T.primary, color: T.onPrimary, fontFamily: F.family, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.primaryHover }}
            onMouseLeave={e => { e.currentTarget.style.background = T.primary }}>
            <IcoRoute /> Route to Supa Partner
          </button>
        </div>
      ) : <div style={{ height: 8 }} />}
    </div>
  )
}
