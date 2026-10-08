// src/pages/reset-password.tsx
// Landing page for the password-reset email (sent from /forgot-password).
// The link carries a PKCE ?code= that only the browser that requested the
// reset can exchange, so a link opened elsewhere shows the "link invalid" state.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { IconLock } from '../components/icons'
import { AuthShell, PasswordField, PwdStrength, Notice, SubmitButton } from '../components/auth/AuthShell'

type Stage = 'checking' | 'ready' | 'invalid'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [stage,    setStage]    = useState<Stage>('checking')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const started = useRef(false)

  useEffect(() => {
    // A code can be exchanged once; a second attempt (StrictMode, the URL
    // cleanup below re-running this effect) would fail and show "invalid".
    if (!router.isReady || started.current) return
    started.current = true
    // Expired or already-used links come back with ?error=...&error_code=otp_expired
    if (router.query.error) { setStage('invalid'); return }
    const code = router.query.code as string | undefined

    async function start() {
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        // The client may already have exchanged the code itself (see auth/callback.tsx);
        // in that case the session exists and the error can be ignored.
        if (exErr && !exErr.message?.toLowerCase().includes('code verifier')) {
          setStage('invalid'); return
        }
      }
      const { data: { session } } = await supabase.auth.getSession()
      setStage(session ? 'ready' : 'invalid')
      // Drop ?code= from the address bar so a refresh doesn't retry it.
      if (code) router.replace('/reset-password', undefined, { shallow: true })
    }
    start()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(''); setLoading(true)
    const { error: upErr } = await supabase.auth.updateUser({ password })
    if (upErr) {
      setError(upErr.message || 'Could not update your password. Please try again.')
      setLoading(false)
      return
    }
    // Sign in again with the new password; this also re-runs the approval check.
    await supabase.auth.signOut()
    window.location.href = '/login?reset=done'
  }

  if (stage === 'checking') {
    return (
      <AuthShell pageTitle="Reset password" title="Checking your link" subtitle="One moment...">
        <div style={{ display: 'flex', justifyContent: 'center' }}><span className="au-spin light" aria-label="Loading" /></div>
      </AuthShell>
    )
  }

  if (stage === 'invalid') {
    return (
      <AuthShell
        pageTitle="Link not valid"
        title="This link can't be used"
        subtitle="It has expired, was already used, or was opened in a different browser from the one that requested it."
      >
        <Link href="/forgot-password" className="au-primary" style={{ textDecoration: 'none' }}>Request a new link</Link>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link href="/login" className="au-link au-tap" style={{ fontSize: 13 }}>Back to sign in</Link>
        </div>
      </AuthShell>
    )
  }

  const mismatch = !!confirm && confirm !== password

  return (
    <AuthShell pageTitle="Set a new password" title="Set a new password" subtitle="Choose a password you don't use anywhere else.">
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={handleSubmit} noValidate>
        <PasswordField label="New password" icon={<IconLock size={16} />} autoComplete="new-password" placeholder="At least 8 characters"
          value={password} onChange={e => setPassword(e.target.value)}>
          <PwdStrength pwd={password} />
        </PasswordField>
        <PasswordField label="Confirm new password" icon={<IconLock size={16} />} autoComplete="new-password" placeholder="Repeat your password"
          value={confirm} onChange={e => setConfirm(e.target.value)} invalid={mismatch} />
        <div style={{ marginTop: 8 }}>
          <SubmitButton busy={loading} busyLabel="Saving...">Save new password</SubmitButton>
        </div>
      </form>
    </AuthShell>
  )
}
