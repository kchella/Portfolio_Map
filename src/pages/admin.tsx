import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/useAuth'
import { useIsMobile } from '../hooks/useIsMobile'
import { AdminLayout, Section, NAV } from '../components/admin/AdminLayout'
import { CustomerManager } from '../components/admin/CustomerManager'
import { LayerManager } from '../components/admin/LayerManager'
import { BufferManager } from '../components/admin/BufferManager'
import { UserManager } from '../components/admin/UserManager'

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, loading: authLoading, authError, signOut } = useAuth()

  useEffect(() => {
    if (!authLoading && !authError && !isAdmin) router.replace('/login?next=/admin')
  }, [authLoading, authError, isAdmin, router])

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid #e8e8e8', borderTopColor: '#111', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  if (authError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <div style={{ maxWidth: 360, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 13, color: '#c0392b', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>{authError}</div>
        <button onClick={() => window.location.reload()} style={{ fontSize: 13, fontWeight: 600, color: '#111', background: '#fff', border: '1.5px solid #e2e2e2', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Retry</button>
      </div>
    </div>
  )

  if (!isAdmin) return null
  return <AdminContent signOut={signOut} />
}

function AdminContent({ signOut }: { signOut: () => void }) {
  const isMobile = useIsMobile()
  const [active, setActive] = useState<Section>('customers')
  const [visible, setVisible] = useState(true)

  function navigate(s: Section) { 
    if (s === active) return
    setVisible(false)
    setTimeout(() => { setActive(s); setVisible(true) }, 120) 
  }

  async function handleLogout() { 
    await signOut()
    window.location.href = '/login' 
  }

  return (
    <>
      <Head>
        <title>Admin - SupaMoto Map</title>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'Inter',system-ui,sans-serif;background:#f7f7f7;color:#111;-webkit-font-smoothing:antialiased;}
          ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}
          ::-webkit-scrollbar-thumb{background:#e8e8e8;border-radius:4px;}
          input::placeholder{color:#999;}select{outline:none;font-family:inherit;}
          @keyframes fadeIn{from{opacity:0;transform:translateY(3px);}to{opacity:1;transform:translateY(0);}}
          .fi{animation:fadeIn 0.14s ease;}
        `}</style>
      </Head>

      <AdminLayout active={active} navigate={navigate} signOut={handleLogout} visible={visible} isMobile={isMobile}>
        {active === 'customers' && <CustomerManager />}
        {active === 'layers' && <LayerManager />}
        {active === 'buffers' && <BufferManager />}
        {active === 'users' && <UserManager />}
      </AdminLayout>

      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: '#ffffff',
          borderTop: '1.5px solid #ebeef0',
          display: 'flex',
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.03)'
        }}>
          {NAV.map(({ id, label, Icon }) => {
            const a = active === id
            return (
              <button key={id} onClick={() => navigate(id)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  color: a ? '#111111' : '#8a9199',
                  padding: '6px 0',
                  transition: 'color 0.12s',
                  outline: 'none'
                }}
              >
                <Icon size={16} />
                <span style={{
                  fontSize: 10,
                  fontFamily: 'Inter,system-ui,sans-serif',
                  fontWeight: a ? 700 : 500,
                  color: a ? '#111111' : '#6b7280'
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </nav>
      )}
    </>
  )
}