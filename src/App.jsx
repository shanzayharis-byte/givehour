import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { T } from './lib/theme'
import Auth from './screens/Auth'
import Feed from './screens/Feed'
import Explore from './screens/Explore'
import OpportunityDetail from './screens/OpportunityDetail'
import LogHours from './screens/LogHours'
import Impact from './screens/Impact'
import Profile from './screens/Profile'
import Admin from './screens/Admin'
import OrgDashboard from './screens/OrgDashboard'
import OrgProfile from './screens/OrgProfile'
import ApplicantsInbox from './screens/ApplicantsInbox'
import './App.css'

const NAV = [
  { id: 'feed',     icon: '🏠', label: 'Feed' },
  { id: 'explore',  icon: '🔍', label: 'Explore' },
  { id: 'loghours', icon: '⏱', label: 'Log Hours' },
  { id: 'impact',   icon: '⭐', label: 'Impact' },
  { id: 'profile',  icon: '👤', label: 'Profile' },
]

const ORG_NAV = [
  { id: 'orgDashboard',   icon: '📋', label: 'Listings' },
  { id: 'orgApplicants',  icon: '📬', label: 'Applicants' },
  { id: 'profile',        icon: '👤', label: 'Profile' },
]

const PROTECTED = ['feed', 'loghours', 'impact', 'profile', 'admin', 'orgDashboard', 'orgApplicants']

export default function App() {
  const [authUser, setAuthUser]       = useState(null)
  const [dbUser, setDbUser]           = useState(null)
  const [activeScreen, setActiveScreen] = useState('landing')
  const [selectedOpp, setSelectedOpp] = useState(null)
  const [selectedOrg, setSelectedOrg]   = useState(null)
  const [isGuest, setIsGuest]         = useState(false)
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
  const [appLoading, setAppLoading]   = useState(true)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setAuthUser(session.user)
        try {
          let { data } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle()
          if (!data?.name) {
            const stored = localStorage.getItem('givehour_pending_profile')
            const profile = stored ? JSON.parse(stored) : (session.user.user_metadata?.name ? session.user.user_metadata : null)
            if (profile?.name) {
              const resp = await fetch('/api/save-profile', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(profile),
              })
              if (resp.ok) {
                localStorage.removeItem('givehour_pending_profile')
                data = { ...(data || {}), id: session.user.id, ...profile }
              } else {
                const errBody = await resp.json().catch(() => ({}))
                console.error('[givehour] save-profile failed (session restore):', resp.status, errBody)
              }
            }
          }
          console.log('[givehour] dbUser after restore:', data)
          setDbUser(data)
          setActiveScreen(data?.role === 'org' ? 'orgDashboard' : 'feed')
        } catch (e) {
          console.error('[givehour] session restore error:', e)
          setActiveScreen('feed')
        }
      }
      setAppLoading(false)
    }).catch(() => setAppLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthUser(session?.user ?? null)
      if (!session?.user) setDbUser(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const navigate = (screen) => {
    if (PROTECTED.includes(screen) && !authUser && !isGuest) {
      setActiveScreen('landing')
      return
    }
    setSelectedOpp(null)
    setSelectedOrg(null)
    setActiveScreen(screen)
  }

  const handleLoggedIn = (user, db) => {
    setAuthUser(user)
    setDbUser(db)
    setIsGuest(false)
    setActiveScreen(db?.role === 'org' ? 'orgDashboard' : 'feed')
  }

  const handleSignOut = () => {
    setAuthUser(null)
    setDbUser(null)
    setIsGuest(false)
    setActiveScreen('landing')
  }

  const handleGuest = () => {
    setIsGuest(true)
    setActiveScreen('explore')
  }

  const isOrg = dbUser?.role === 'org'
  const adminNavItem = { id: 'admin', icon: '⚙️', label: 'Admin' }
  const visibleNav = isOrg ? ORG_NAV : (dbUser?.is_admin ? [...NAV, adminNavItem] : NAV)

  if (appLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16, color: T.textMuted }}>Loading Give Hour...</div>
  }

  const showNav = authUser && !selectedOpp && !selectedOrg && visibleNav.some(n => n.id === activeScreen)

  const mainContent = () => {
    if (selectedOpp) {
      return <OpportunityDetail opp={selectedOpp} user={dbUser} onBack={() => setSelectedOpp(null)} isGuest={isGuest}
        onSelectOrg={(orgId) => { setSelectedOpp(null); setSelectedOrg(orgId) }}
        onSignUp={() => { setSelectedOpp(null); setIsGuest(false); setActiveScreen('landing') }} />
    }
    if (selectedOrg) {
      return <OrgProfile orgId={selectedOrg} onBack={() => setSelectedOrg(null)} onSelectOpp={setSelectedOpp} />
    }
    if (!authUser && !isGuest) {
      return <Auth onLoggedIn={handleLoggedIn} onGuest={handleGuest} isDesktop={isDesktop} initialScreen={activeScreen === 'auth-login' ? 'login' : activeScreen === 'auth-signup' ? 'userType' : 'landing'} />
    }
    switch (activeScreen) {
      case 'feed':          return <Feed user={dbUser} onSelectOpp={setSelectedOpp} />
      case 'explore':       return <Explore user={dbUser} onSelectOpp={setSelectedOpp} isGuest={isGuest} onSignUp={() => { setIsGuest(false); setActiveScreen('auth-signup') }} onLogin={() => { setIsGuest(false); setActiveScreen('auth-login') }} onHome={() => setActiveScreen('landing')} />
      case 'loghours':      return <LogHours user={dbUser} />
      case 'impact':        return <Impact user={dbUser} />
      case 'profile':       return <Profile user={dbUser} onSignOut={handleSignOut} />
      case 'admin':         return <Admin authUser={authUser} />
      case 'orgDashboard':  return <OrgDashboard user={dbUser} />
      case 'orgApplicants': return <ApplicantsInbox user={dbUser} />
      default:              return <Auth onLoggedIn={handleLoggedIn} onGuest={handleGuest} isDesktop={isDesktop} initialScreen={activeScreen === 'auth-login' ? 'login' : activeScreen === 'auth-signup' ? 'userType' : 'landing'} />
    }
  }

  if (isDesktop && showNav) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg, justifyContent: 'center' }}>
        <div style={{ display: 'flex', width: '100%', maxWidth: 1100, height: '100vh', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.08)' }}>
        {/* sidebar */}
        <div style={{ width: 220, background: T.card, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <button onClick={() => navigate(isOrg ? 'orgDashboard' : 'feed')} style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <img src="/logo.png" alt="Give Hour" style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Give Hour</div>
              <div style={{ fontSize: 10, color: T.textMuted }}>{isOrg ? 'Org Portal' : 'Teen Portal'}</div>
            </div>
          </button>
          <nav style={{ padding: '14px 12px', flex: 1 }}>
            {visibleNav.map(({ id, icon, label }) => (
              <button key={id} onClick={() => navigate(id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeScreen === id ? T.primaryLight : 'transparent', color: activeScreen === id ? T.primary : '#60666D', fontWeight: activeScreen === id ? 600 : 400, fontSize: 14, fontFamily: 'inherit', marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '12px', borderTop: `1px solid ${T.border}` }}>
            <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#E05252', fontWeight: 500, fontSize: 14, fontFamily: 'inherit' }}>
              <span style={{ fontSize: 16 }}>🚪</span>Sign out
            </button>
            <div style={{ padding: '8px 12px 0', fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
              Built by <span style={{ fontWeight: 600, color: T.text }}>Shanzay Haris</span>
            </div>
          </div>
        </div>
        {/* main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {mainContent()}
        </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.bg, justifyContent: 'center' }}>
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: isDesktop ? 1100 : 480, height: '100vh', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.08)' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {mainContent()}
      </div>
      {showNav && (
        <nav style={{ background: T.card, borderTop: `1px solid ${T.border}`, paddingBottom: 8, display: 'flex', flexShrink: 0 }}>
          {visibleNav.map(({ id, icon, label }) => {
            const active = activeScreen === id
            return (
              <button key={id} onClick={() => navigate(id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px 0', background: 'none', border: 'none', cursor: 'pointer', gap: 3 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: active ? T.primaryLight : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{icon}</div>
                <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, color: active ? T.primary : T.textMuted }}>{label}</span>
              </button>
            )
          })}
        </nav>
      )}
      <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: '8px 16px', textAlign: 'center', fontSize: 10, color: T.textMuted, flexShrink: 0 }}>
        Built and maintained by <span style={{ fontWeight: 600, color: T.text }}>Shanzay Haris</span>
      </div>
    </div>
    </div>
  )
}
