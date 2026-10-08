// src/pages/login.tsx
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { safeNext, hasMapAccess } from '../lib/safeNext'
import { IconLock, IconMail } from '../components/icons'
import { AuthShell, Field, PasswordField, Notice, SubmitButton, GoogleButton, Divider } from '../components/auth/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const next = safeNext(router.query.next)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [error,    setError]    = useState('')

  // Messages handed back from /auth/callback and /reset-password
  const qErr = router.query.error as string | undefined
  const shownError = error || (qErr === 'pending'
    ? 'Your account is awaiting approval. An admin will enable access.'
    : qErr ? 'Sign-in failed. Please try again.' : '')
  const resetDone = router.query.reset === 'done'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Read values directly from the form in case autofill didn't fire onChange
    const form = e.target as HTMLFormElement
    const emailVal    = (form.elements.namedItem('email')    as HTMLInputElement)?.value || email
    const passwordVal = (form.elements.namedItem('password') as HTMLInputElement)?.value || password

    if (!emailVal || !passwordVal) { setError('Please fill in all fields'); return }

    setError('')
    setLoading(true)

    // Step 1: Sign in
    const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passwordVal,
    })

    if (signInErr) {
      setError(signInErr.message ?? 'Incorrect email or password')
      setLoading(false)
      return
    }

    // Step 2: Check role — pending accounts get no access; /admin needs admin
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    let denied = ''
    if (profileErr || !profile) denied = 'Could not load your profile. Please try again.'
    else if (!hasMapAccess(profile.role)) denied = 'Your account is awaiting approval. An admin will enable access.'
    else if (next.startsWith('/admin') && profile.role !== 'admin') denied = 'You do not have admin access.'

    if (denied) {
      await supabase.auth.signOut()
      setError(denied)
      setLoading(false)
      return
    }

    window.location.href = next
  }

  async function handleGoogle() {
    setGLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setError('Google sign-in failed. Please try again.')
      setGLoading(false)
    }
    // On success: page is redirecting to Google — don't reset gLoading
  }

  return (
    <AuthShell
      pageTitle="Sign In"
      title="PAR Map"
      subtitle="Sign in to the portfolio map"
      footer={<>New here? <Link href="/register" className="au-link au-tap">Create an account</Link></>}
    >
      {resetDone && !shownError && <Notice tone="ok">Password updated. Sign in with your new password.</Notice>}
      {shownError && <Notice tone="error">{shownError}</Notice>}

      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Email" icon={<IconMail size={16} />}
          name="email" type="email" required autoComplete="email" placeholder="you@supamoto.global"
          value={email} onChange={e => setEmail(e.target.value)} onBlur={e => setEmail(e.target.value)}
        />
        <PasswordField
          label="Password" icon={<IconLock size={16} />}
          name="password" required autoComplete="current-password" placeholder="Your password"
          value={password} onChange={e => setPassword(e.target.value)} onBlur={e => setPassword(e.target.value)}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
            <Link href="/forgot-password" className="au-link au-tap" style={{ fontSize: 12 }}>Forgot password?</Link>
          </div>
        </PasswordField>

        <SubmitButton busy={loading} busyLabel="Signing in...">Sign In</SubmitButton>
      </form>

      <Divider label="or" />
      <GoogleButton busy={gLoading} onClick={handleGoogle} />
    </AuthShell>
  )
}
