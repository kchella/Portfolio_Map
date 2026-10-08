// ─── src/styles/theme.ts ─────────────────────────────────────────────────────
// Design tokens for the map UI — see docs/DESIGN.md,
// with the SupaMoto orange as the accent.

export const T = {
  canvas: '#f8f9fa',
  low: '#f1f4f5',
  container: '#ebeef0',
  card: '#ffffff',
  high: '#dee3e6',
  // SupaMoto brand orange (shared with SupaTicket --brand-accent)
  primary: '#f58202',
  primaryHover: '#d97002',
  primaryText: '#a85a00',   // orange dark enough for small text on white/tint
  onPrimary: '#111827',     // white on #f58202 fails AA; near-black passes
  primaryDim: 'rgba(245,130,2,0.10)',
  primaryRing: 'rgba(245,130,2,0.28)',
  primaryMid: '#ff9a2e',
  primaryGradient: 'linear-gradient(135deg, #f58202 0%, #ff9a2e 100%)',
  onSurface: '#2d3335',
  variant: '#41484d',
  muted: '#8a9199',
  ghost: 'rgba(173,179,181,0.18)',
  error: '#a8364b',
  errorDim: 'rgba(168,54,75,0.08)',
  shadow: '0 4px 20px rgba(45,51,53,0.05), 0 12px 40px rgba(45,51,53,0.08)',
  shadowSm: '0 2px 8px rgba(45,51,53,0.06), 0 4px 16px rgba(45,51,53,0.06)',
} as const

// Sign-in screens (login, register, forgot/reset password, callback). Dark,
// to match the SupaTicket sign-in so every SupaMoto app greets staff the same
// way. Values are SupaTicket's html.dark tokens (src/styles/theme.css there).
export const A = {
  canvas: '#101010',
  card: '#1a1a1a',
  field: 'rgba(44,44,44,0.30)',  // SupaTicket dark:bg-input/30
  fieldFilled: '#1c1c1c',        // phone view: filled input on the bare canvas
  border: '#2c2c2c',
  text: '#fafafa',
  secondary: '#d4d4d4',
  muted: '#b5b5b5',              // 71% grey: AA on the card at 11-12 px
  accent: '#fb9f38',             // dark-mode tangerine
  accentHover: '#f58202',
  onAccent: '#111827',
  ring: 'rgba(251,159,56,0.35)',
  danger: '#e46b6b',
  dangerBg: 'rgba(220,80,80,0.10)',
  dangerLine: 'rgba(220,80,80,0.30)',
  ok: '#4ade80',
  okBg: 'rgba(74,222,128,0.08)',
  okLine: 'rgba(74,222,128,0.28)',
  family: "'Poppins', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const

// Type: one family, three weights. Inter matches the login and admin pages.
export const F = {
  family: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  regular: 400,
  medium: 500,
  semibold: 600,
} as const
