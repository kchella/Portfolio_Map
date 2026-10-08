// src/pages/register.tsx
import { useId, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { A } from '../styles/theme'
import { IconChevronDown, IconLock, IconMail, IconUser, IconUsers } from '../components/icons'
import { AuthShell, Field, PasswordField, PwdStrength, Notice, SubmitButton, GoogleButton, Divider } from '../components/auth/AuthShell'

export default function RegisterPage() {
  const roleId = useId()
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [role,     setRole]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)
  // 'confirm-email': Supabase sent a confirmation link. 'approval': the account
  // was confirmed instantly (Confirm email off, audit H2) and only needs approval.
  const [done,     setDone]     = useState<'' | 'confirm-email' | 'approval'>('')
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName || !email || !password || !role) { setError('Please fill in all fields'); return }
    if (password.length < 8)     { setError('Password must be at least 8 characters'); return }
    if (password !== confirm)    { setError('Passwords do not match'); return }

    setError(''); setLoading(true)
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Stored in auth.users.raw_user_meta_data; the handle_new_user
          // trigger copies them to profiles. The account starts 'pending'.
          data: { full_name: fullName, role_request: role },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signUpErr) throw signUpErr
      if (data.session) {
        // Auto-confirmed: don't leave a pending account signed in.
        await supabase.auth.signOut()
        setDone('approval')
      } else {
        setDone('confirm-email')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError('Google sign-in failed. Please try again.')
      setGLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell
        pageTitle="Account created"
        title={done === 'confirm-email' ? 'Check your email' : 'Account created'}
        subtitle={done === 'confirm-email'
          ? <>We sent a confirmation link to <strong style={{ color: A.text, fontWeight: 500 }}>{email}</strong>. After you confirm, an admin approves your account.</>
          : 'An admin needs to approve your account before you can sign in. You can sign in as soon as they do.'}
      >
        <Link href="/login" className="au-primary" style={{ textDecoration: 'none' }}>Back to sign in</Link>
      </AuthShell>
    )
  }

  const mismatch = !!confirm && confirm !== password

  return (
    <AuthShell
      pageTitle="Create account"
      title="Create your account"
      subtitle="An admin approves new accounts before they can see the map."
      footer={<>Already have an account? <Link href="/login" className="au-link au-tap">Sign in</Link></>}
    >
      {error && <Notice tone="error">{error}</Notice>}

      <form onSubmit={handleSubmit} noValidate>
        <Field label="Full name" icon={<IconUser size={16} />} type="text" autoComplete="name" placeholder="Your full name"
          value={fullName} onChange={e => setFullName(e.target.value)} />
        <Field label="Email" icon={<IconMail size={16} />} type="email" autoComplete="email" placeholder="you@supamoto.global"
          value={email} onChange={e => setEmail(e.target.value)} />

        <div className="au-field">
          <label className="au-label" htmlFor={roleId}>Role</label>
          <div className="au-group" style={{ position: 'relative' }}>
            <span className="au-icon" aria-hidden><IconUsers size={16} /></span>
            <select id={roleId} className="au-input" value={role} onChange={e => setRole(e.target.value)} required
              style={{ color: role ? A.text : A.muted, paddingRight: 36 }}>
              <option value="" disabled>Select your role</option>
              <option value="field_agent">Field Agent</option>
              <option value="supervisor">Supervisor</option>
              <option value="analyst">Analyst</option>
              <option value="other">Other</option>
            </select>
            <span aria-hidden style={{ position: 'absolute', right: 12, display: 'flex', pointerEvents: 'none', color: A.muted }}>
              <IconChevronDown size={14} />
            </span>
          </div>
        </div>

        <PasswordField label="Password" icon={<IconLock size={16} />} autoComplete="new-password" placeholder="At least 8 characters"
          value={password} onChange={e => setPassword(e.target.value)}>
          <PwdStrength pwd={password} />
        </PasswordField>
        <PasswordField label="Confirm password" icon={<IconLock size={16} />} autoComplete="new-password" placeholder="Repeat your password"
          value={confirm} onChange={e => setConfirm(e.target.value)} invalid={mismatch} />

        <div style={{ marginTop: 8 }}>
          <SubmitButton busy={loading} busyLabel="Creating account...">Create account</SubmitButton>
        </div>
      </form>

      <Divider label="or" />
      <GoogleButton busy={gLoading} onClick={handleGoogle} />
    </AuthShell>
  )
}
