// ─── src/components/auth/AuthShell.tsx ───────────────────────────────────────
// Shared layout and fields for the sign-in screens, matching the SupaTicket
// sign-in card (docs/specs/auth-screens.md). Colours come from `A` in theme.ts.

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import Head from 'next/head'
import { A } from '../../styles/theme'
import { IconEye, IconEyeOff } from '../icons'

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  /* html body, not body: globals.css also sets body { background: #fff }, and in
     production its stylesheet can load after this tag, so equal weight loses (PM-006). */
  html, html body { background: ${A.canvas}; }
  html body { font-family: ${A.family}; color: ${A.text}; -webkit-font-smoothing: antialiased; color-scheme: dark; }
  input, select, button { font-family: inherit; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .au-card { width: 100%; max-width: 448px; background: ${A.card}; border: 1px solid ${A.border}; border-radius: 12px; padding: 32px; }
  @media (max-width: 420px) { .au-card { padding: 24px 20px; } }
  .au-label { display: block; font-size: 12px; color: ${A.secondary}; margin-bottom: 8px; }
  .au-group { display: flex; align-items: center; height: 44px; border: 1px solid ${A.border}; border-radius: 8px; background: ${A.field}; transition: border-color .15s, box-shadow .15s; }
  .au-group:focus-within { border-color: ${A.accent}; box-shadow: 0 0 0 3px ${A.ring}; }
  .au-group[data-invalid="true"] { border-color: ${A.danger}; }
  .au-icon { display: flex; padding: 0 4px 0 12px; color: ${A.muted}; }
  .au-input { flex: 1; min-width: 0; height: 100%; background: transparent; border: 0; outline: none; color: ${A.text}; font-size: 14px; padding: 0 12px 0 8px; }
  .au-input::placeholder { color: ${A.muted}; opacity: 1; }
  select.au-input { appearance: none; cursor: pointer; }
  select.au-input option { background: ${A.card}; color: ${A.text}; }
  .au-eye { display: flex; align-items: center; justify-content: center; width: 44px; height: 100%; background: none; border: 0; color: ${A.muted}; cursor: pointer; }
  .au-eye:hover { color: ${A.text}; }
  .au-primary { width: 100%; height: 44px; border: 0; border-radius: 8px; background: ${A.accent}; color: ${A.onAccent}; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .15s; }
  .au-primary:hover:not(:disabled) { background: ${A.accentHover}; }
  .au-primary:disabled { opacity: .55; cursor: not-allowed; }
  .au-secondary { width: 100%; height: 44px; border: 1px solid ${A.border}; border-radius: 8px; background: transparent; color: ${A.text}; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background .15s; text-decoration: none; }
  .au-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.04); }
  .au-secondary:disabled { opacity: .55; cursor: not-allowed; }
  .au-link { color: ${A.accent}; font-weight: 500; text-decoration: none; }
  .au-link:hover { text-decoration: underline; }
  .au-tap { display: inline-flex; align-items: center; min-height: 40px; }
  .au-divider { display: flex; align-items: center; gap: 12px; font-size: 12px; color: ${A.muted}; }
  .au-divider::before, .au-divider::after { content: ''; flex: 1; height: 1px; background: ${A.border}; }
  .au-spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(17,24,39,0.25); border-top-color: ${A.onAccent}; animation: spin .7s linear infinite; }
  .au-spin.light { border-color: rgba(255,255,255,0.2); border-top-color: ${A.text}; }
`

export function AuthShell({ pageTitle, title, subtitle, children, footer }: {
  pageTitle: string
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <>
      <Head>
        <title>{`${pageTitle} - SupaMoto Map`}</title>
        <meta name="theme-color" content={A.canvas} />
        {/* Poppins (SupaMoto's sign-in face) only on these screens, so the map doesn't download it on weak data. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{css}</style>
      </Head>
      <main style={{ minHeight: '100vh', background: A.canvas, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="au-card">
          <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG */}
            <img src="/supamoto-logo.svg" alt="SupaMoto" style={{ height: 56, width: 'auto', marginBottom: 16 }} />
            <h1 style={{ fontSize: 24, fontWeight: 600, color: A.text, lineHeight: 1.3 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 14, color: A.muted, marginTop: 6, lineHeight: 1.5 }}>{subtitle}</p>}
          </header>
          {children}
          {footer && (
            <p style={{ marginTop: 24, fontSize: 12, color: A.muted, textAlign: 'center', lineHeight: 1.6 }}>{footer}</p>
          )}
        </div>
      </main>
    </>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Field({ label, icon, invalid, ...input }: InputProps & { label: string; icon: ReactNode; invalid?: boolean }) {
  const id = useId()
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="au-label" htmlFor={id}>{label}</label>
      <div className="au-group" data-invalid={invalid || undefined}>
        <span className="au-icon" aria-hidden>{icon}</span>
        <input id={id} className="au-input" aria-invalid={invalid || undefined} {...input} />
      </div>
    </div>
  )
}

export function PasswordField({ label, icon, invalid, children, ...input }: InputProps & {
  label: string; icon: ReactNode; invalid?: boolean; children?: ReactNode
}) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="au-label" htmlFor={id}>{label}</label>
      <div className="au-group" data-invalid={invalid || undefined}>
        <span className="au-icon" aria-hidden>{icon}</span>
        <input id={id} className="au-input" type={show ? 'text' : 'password'} aria-invalid={invalid || undefined}
          style={{ paddingRight: 0 }} {...input} />
        <button type="button" className="au-eye" onClick={() => setShow(v => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </button>
      </div>
      {children}
    </div>
  )
}

export function Notice({ tone, children }: { tone: 'error' | 'ok'; children: ReactNode }) {
  const c = tone === 'error'
    ? { fg: A.danger, bg: A.dangerBg, line: A.dangerLine }
    : { fg: A.ok, bg: A.okBg, line: A.okLine }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'}
      style={{ padding: '10px 12px', borderRadius: 8, background: c.bg, border: `1px solid ${c.line}`, color: c.fg, fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
      {children}
    </div>
  )
}

export function SubmitButton({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) {
  return (
    <button type="submit" className="au-primary" disabled={busy}>
      {busy && <span className="au-spin" aria-hidden />}
      {busy ? busyLabel : children}
    </button>
  )
}

export function GoogleButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" className="au-secondary" disabled={busy} onClick={onClick}>
      {busy ? <span className="au-spin light" aria-hidden /> : (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" fill="#34A853" />
          <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z" fill="#FBBC05" />
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58Z" fill="#EA4335" />
        </svg>
      )}
      Continue with Google
    </button>
  )
}

export function Divider({ label }: { label: string }) {
  return <div className="au-divider" style={{ margin: '20px 0' }}>{label}</div>
}

export function PwdStrength({ pwd }: { pwd: string }) {
  const checks = [
    { label: '8+ characters', pass: pwd.length >= 8 },
    { label: 'Number',        pass: /\d/.test(pwd) },
    { label: 'Uppercase',     pass: /[A-Z]/.test(pwd) },
  ]
  const score = checks.filter(c => c.pass).length
  if (!pwd) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? (score === 3 ? A.ok : A.accent) : A.border, transition: 'background 0.2s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {checks.map(c => (
          <span key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: c.pass ? A.ok : A.muted }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12" /></svg>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
