// src/pages/forgot-password.tsx
// Sends a Supabase password-reset email whose link lands on /reset-password
// (audit M5: this page used to show success without sending anything).

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { A } from '../styles/theme'
import { IconMail } from '../components/icons'
import { AuthShell, Field, Notice, SubmitButton } from '../components/auth/AuthShell'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Please enter your email'); return }
    setError(''); setLoading(true)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    // Supabase answers the same whether or not the address has an account,
    // so this screen can't be used to find out who is registered.
    if (resetErr) {
      setError(resetErr.status === 429
        ? 'Too many reset requests. Wait a few minutes, then try again.'
        : 'Could not send the reset email. Please try again.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell
        pageTitle="Check your email"
        title="Check your email"
        subtitle={<>If <strong style={{ color: A.text, fontWeight: 500 }}>{email}</strong> has an account, a reset link is on its way.</>}
        footer="Open the link on this device, in this browser. If it has expired, request a new one."
      >
        <Link href="/login" className="au-primary" style={{ textDecoration: 'none' }}>Back to sign in</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      pageTitle="Reset password"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to set a new one."
      footer={<>Remembered it? <Link href="/login" className="au-link au-tap">Back to sign in</Link></>}
    >
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Email" icon={<IconMail size={16} />} type="email" autoComplete="email" placeholder="you@supamoto.global"
          value={email} onChange={e => setEmail(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <SubmitButton busy={loading} busyLabel="Sending...">Send reset link</SubmitButton>
        </div>
      </form>
    </AuthShell>
  )
}
