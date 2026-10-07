import React from 'react'
import Link from 'next/link'
import {
  IconSignOut, IconBack, IconUsers, IconLayers, IconBufferZone, IconAdminShield
} from '../icons'
import { T } from './AdminUI'
import { T as M, F } from '../../styles/theme'

export type Section = 'customers' | 'layers' | 'buffers' | 'users'

export const NAV: { id: Section; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'customers', label: 'Customer Data', Icon: ({ size }) => <IconUsers size={size} /> },
  { id: 'layers', label: 'Boundary Layers', Icon: ({ size }) => <IconLayers size={size} /> },
  { id: 'buffers', label: 'Buffer Circles', Icon: ({ size }) => <IconBufferZone size={size} /> },
  { id: 'users', label: 'Users & Access', Icon: ({ size }) => <IconAdminShield size={size} /> },
]

interface AdminLayoutProps {
  active: Section
  navigate: (s: Section) => void
  signOut: () => void
  children: React.ReactNode
  visible: boolean
  isMobile?: boolean
}

export function AdminLayout({ active, navigate, signOut, children, visible, isMobile = false }: AdminLayoutProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' }}>
      {isMobile && (
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 52,
          background: T.card,
          borderBottom: `1.5px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 1000
        }}>
          <Link href="/map" style={{ display: 'flex', alignItems: 'center', color: T.muted, textDecoration: 'none' }}>
            <IconBack size={18} />
          </Link>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', fontFamily: 'Inter,system-ui,sans-serif' }}>Admin Panel</span>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 4 }}>
            <IconSignOut size={18} />
          </button>
        </header>
      )}

      <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
        {!isMobile && (
          <aside style={{ width: 268, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: M.card, boxShadow: `inset -1px 0 0 ${M.ghost}`, fontFamily: F.family }}>
            <style>{`
              .anav{width:100%;height:36px;display:flex;align-items:center;gap:10px;padding:0 10px;border:none;border-radius:8px;background:transparent;cursor:pointer;text-align:left;text-decoration:none;font:500 13px/1 ${F.family};color:${M.onSurface};transition:background .15s,color .15s;}
              .anav:hover{background:${M.low};}
              .anav:focus-visible{outline:2px solid ${M.primaryRing};outline-offset:1px;}
              .anav .ic{display:flex;color:${M.muted};transition:color .15s;}
              .anav:hover .ic{color:${M.onSurface};}
              .anav.active{background:${M.low};}
              .anav.active .ic{color:${M.primaryText};}
              .anav.quiet{font-weight:400;color:${M.variant};}
              .anav.danger:hover{background:${T.errorDim};color:${T.error};}
              .anav.danger:hover .ic{color:${T.error};}
            `}</style>
            <div style={{ height: 64, padding: '0 16px 0 18px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG */}
              <img src="/supamoto-logo.svg" alt="SupaMoto" style={{ height: 28, width: 'auto', display: 'block', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: M.onSurface, letterSpacing: '-0.01em', lineHeight: 1.2 }}>PAR Map</div>
                <div style={{ fontSize: 12, color: M.muted, marginTop: 1 }}>Admin</div>
              </div>
            </div>
            <nav style={{ flex: 1, padding: '4px 8px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
              {NAV.map(({ id, label, Icon }) => {
                const a = active === id
                return (
                  <button key={id} className={`anav${a ? ' active' : ''}`} onClick={() => navigate(id)} aria-current={a ? 'page' : undefined}>
                    <span className="ic"><Icon size={16} /></span>
                    {label}
                  </button>
                )
              })}
            </nav>
            <div style={{ height: 1, background: M.ghost, margin: '0 18px' }} />
            <div style={{ padding: '8px 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Link href="/map" className="anav quiet">
                <span className="ic"><IconBack size={16} /></span>Back to map
              </Link>
              <button onClick={signOut} className="anav quiet danger">
                <span className="ic"><IconSignOut size={16} /></span>Sign out
              </button>
            </div>
          </aside>
        )}

        <main style={{ 
          flex: 1, 
          minWidth: 0, 
          overflowY: 'auto', 
          background: T.canvas,
          paddingTop: isMobile ? 52 : 0,
          paddingBottom: isMobile ? 64 : 0
        }}>
          <div style={{ 
            maxWidth: 1140, 
            margin: '0 auto', 
            padding: isMobile ? '16px 12px' : '36px 36px', 
            opacity: visible ? 1 : 0, 
            transition: 'opacity 0.12s' 
          }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
