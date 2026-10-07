// ─── src/components/NavIcons.tsx ──────────────────────────────────────────
// Drop-in icon replacements for index.tsx navbar
// Use these custom SVGs that are not Lucide-generic.

import React from 'react'
import {
  IconUser,
  IconSearch as IconSearchBase, 
  IconClose,
  IconCollapsePanel
} from './icons'

// ── 1. LOGO & BRAND ─────────────────────────────────────────────────────────
export function NavLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG */}
      <img src="/supamoto-logo.svg" alt="SupaMoto" style={{ height: 24, width: 'auto', display: 'block' }} />
    </div>
  )
}

// ── 2. ADMIN BUTTON ICON — Login / Door Enter ──────────────────────────────
export function IconAdmin() {
  return <IconUser size={16} />
}

// ── 3. SEARCH & UI HELPERS ──────────────────────────────────────────────────
export function IconSearch() {
  return <IconSearchBase size={16} />
}

export function IconX({ size = 14 }: { size?: number }) {
  return <IconClose size={size} />
}

export function IconIndent() {
  return <IconCollapsePanel size={12} />
}
