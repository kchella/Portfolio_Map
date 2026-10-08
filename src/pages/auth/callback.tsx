// ─── src/pages/auth/callback.tsx ─────────────────────────────────────────────
// Supabase redirects here after Google OAuth or email confirmation.
// Must live at /auth/callback to match the Supabase redirect URL.

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { safeNext, hasMapAccess } from '../../lib/safeNext'
import { A } from '../../styles/theme'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // router.query is not populated on first render in Next.js pages router
    if (!router.isReady) return

    const code = router.query.code as string | undefined
    const next = safeNext(router.query.next)

    async function exchange() {
      try {
        if (code) {
          // PKCE flow: exchange the authorization code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            // Fallback: some Supabase SDK versions auto-exchange the code before
            // exchangeCodeForSession is called. Check if a session already exists.
            if (exchangeError.message?.toLowerCase().includes('code verifier')) {
              const { data: { session }, error: sessionError } = await supabase.auth.getSession()
              if (sessionError || !session) throw exchangeError
              // session was auto-exchanged — fall through to the profile check below
            } else {
              throw exchangeError
            }
          }
        } else {
          // Implicit flow / email confirmation: session arrives via URL hash.
          // getSession() will parse the fragment and hydrate the session.
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) throw error
          if (!session) {
            router.replace('/login?error=no_session')
            return
          }
        }

        // Fetch role so we can enforce admin-only redirect protection
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login?error=no_user'); return }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!hasMapAccess(profile?.role)) {
          // New Google/email accounts start as 'pending' until an admin approves
          await supabase.auth.signOut()
          router.replace('/login?error=pending')
        } else if (next.startsWith('/admin') && profile?.role !== 'admin') {
          router.replace('/map')
        } else {
          router.replace(next)
        }
      } catch (e: unknown) {
        console.error('OAuth exchange failed:', e instanceof Error ? e.message : e)
        router.replace('/login?error=oauth_failed')
      }
    }

    exchange()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: A.family,
      background: A.canvas,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: `2.5px solid ${A.border}`, borderTopColor: A.accent,
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } html, html body { margin: 0; background: ${A.canvas}; }`}</style>
        <span style={{ fontSize: 14, color: A.muted }}>Signing you in…</span>
      </div>
    </div>
  )
}
