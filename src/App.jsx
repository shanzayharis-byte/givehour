import { useState, useEffect, useRef } from 'react'
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
import PostListingForm from './screens/PostListingForm'
import LegalPage from './screens/LegalPage'
import OrgProfile from './screens/OrgProfile'
import ApplicantsInbox from './screens/ApplicantsInbox'
import Saved from './screens/Saved'
import Calendar from './screens/Calendar'
import './App.css'

const NAV_GROUPS = [
  { label: 'Listings', items: [
    { id: 'feed',     icon: '🏠', label: 'Feed' },
    { id: 'explore',  icon: '🔍', label: 'Explore' },
    { id: 'saved',    icon: '🔖', label: 'Saved' },
    { id: 'calendar', icon: '📅', label: 'Calendar' },
  ]},
  { label: 'Logging', items: [
    { id: 'loghours', icon: '⏱', label: 'Log Hours' },
    { id: 'impact',   icon: '⭐', label: 'Impact' },
  ]},
]

const NAV = [...NAV_GROUPS.flatMap(g => g.items), { id: 'profile', icon: '👤', label: 'Profile' }]

const ORG_NAV = [
  { id: 'orgDashboard',   icon: '📋', label: 'Listings' },
  { id: 'orgPost',        icon: '➕', label: 'Post' },
  { id: 'orgApplicants',  icon: '📬', label: 'Applicants' },
  { id: 'explore',        icon: '🔍', label: 'Explore' },
  { id: 'profile',        icon: '👤', label: 'Profile' },
]

const PROTECTED = ['feed', 'saved', 'loghours', 'calendar', 'impact', 'profile', 'admin', 'orgDashboard', 'orgApplicants', 'orgPost']

export default function App() {
  const [authUser, setAuthUser]       = useState(null)
  const [dbUser, setDbUser]           = useState(null)
  const [activeScreen, setActiveScreen] = useState('landing')
  const [selectedOpp, setSelectedOpp] = useState(null)
  const [selectedOrg, setSelectedOrgState] = useState(null) // { id, name }

  const selectedOppRef = useRef(null)
  const selectedOrgRef = useRef(null)
  useEffect(() => { selectedOppRef.current = selectedOpp }, [selectedOpp])
  useEffect(() => { selectedOrgRef.current = selectedOrg }, [selectedOrg])

  // Browser back/forward support
  useEffect(() => {
    window.history.replaceState({ screen: 'landing' }, '')
    const handler = () => {
      if (selectedOppRef.current) { setSelectedOpp(null); return }
      if (selectedOrgRef.current) { setSelectedOrgState(null); sessionStorage.removeItem('gh_org'); return }
      const { screen } = window.history.state || {}
      setActiveScreen(screen || 'landing')
      setDrawerOpen(false)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const setSelectedOrg = (org) => {
    setSelectedOrgState(org)
    if (org) {
      sessionStorage.setItem('gh_org', JSON.stringify(org))
      window.history.pushState({ screen: activeScreen, overlay: 'org' }, '')
    } else {
      sessionStorage.removeItem('gh_org')
    }
  }
  const [isGuest, setIsGuest]         = useState(false)
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
  const [appLoading, setAppLoading]   = useState(true)
  const [accountError, setAccountError] = useState(false)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [editTargetId, setEditTargetId] = useState(null)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('gh_org')
      if (saved) setSelectedOrgState(JSON.parse(saved))
    } catch {}
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
                setAccountError(true)
              }
            }
          }
          if (!accountError) {
            setDbUser(data)
            setActiveScreen(data?.role === 'org' ? 'orgDashboard' : 'feed')
          }
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
    setDrawerOpen(false)
    window.history.pushState({ screen }, '')
  }

  const openOpp = (opp) => {
    if (opp) window.history.pushState({ screen: activeScreen, overlay: 'opp' }, '')
    setSelectedOpp(opp)
  }

  const handleLoggedIn = (user, db) => {
    setAuthUser(user)
    setDbUser(db)
    setIsGuest(false)
    setActiveScreen(db?.role === 'org' ? 'orgDashboard' : 'feed')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
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

  if (accountError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg }}>
        <div style={{ background: T.card, borderRadius: 20, padding: '40px 32px', maxWidth: 360, width: '90%', textAlign: 'center', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 10 }}>Account setup incomplete</div>
          <div style={{ fontSize: 14, color: T.textSub, lineHeight: 1.7, marginBottom: 28 }}>
            We couldn't finish setting up your account. This can happen if the confirmation link was opened in a different browser. Please sign out and try logging in again.
          </div>
          <button onClick={handleSignOut} style={{ width: '100%', padding: '14px', borderRadius: 12, background: T.primary, color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Sign out and try again
          </button>
        </div>
      </div>
    )
  }

  const showNav = authUser && visibleNav.some(n => n.id === activeScreen)

  const mainContent = () => {
    if (selectedOpp) {
      return <OpportunityDetail opp={selectedOpp} user={dbUser} onBack={() => setSelectedOpp(null)} isGuest={isGuest}
        onSelectOrg={(orgId, orgName) => { setSelectedOpp(null); setSelectedOrg({ id: orgId, name: orgName }) }}
        onEdit={(opp) => { setEditTargetId(opp.id); setSelectedOpp(null); setActiveScreen('orgDashboard') }}
        onSignUp={() => { setSelectedOpp(null); setIsGuest(false); setActiveScreen('auth-signup') }}
        onLogin={() => { setSelectedOpp(null); setIsGuest(false); setActiveScreen('auth-login') }} />
    }
    if (selectedOrg) {
      return <OrgProfile orgId={selectedOrg.id} orgName={selectedOrg.name} onBack={() => setSelectedOrg(null)} onSelectOpp={openOpp} isGuest={isGuest} onLogin={() => { setSelectedOrg(null); setIsGuest(false); setActiveScreen('auth-login') }} onSignUp={() => { setSelectedOrg(null); setIsGuest(false); setActiveScreen('auth-signup') }} />
    }
    if (activeScreen === 'privacy' || activeScreen === 'terms' || activeScreen === 'contact') {
      return <LegalPage slug={activeScreen} onBack={() => setActiveScreen(authUser ? (isOrg ? 'orgDashboard' : 'feed') : 'landing')} />
    }
    if (!authUser && !isGuest) {
      return <Auth onLoggedIn={handleLoggedIn} onGuest={handleGuest} isDesktop={isDesktop} initialScreen={activeScreen === 'auth-login' ? 'login' : activeScreen === 'auth-signup' ? 'userType' : 'landing'} />
    }
    switch (activeScreen) {
      case 'feed':          return <Feed user={dbUser} onSelectOpp={openOpp} onNavigate={navigate} />
      case 'saved':         return <Saved user={dbUser} onSelectOpp={openOpp} isDesktop={isDesktop} />
      case 'explore':       return <Explore user={dbUser} onSelectOpp={openOpp} onSelectOrg={(id, name) => setSelectedOrg({ id, name })} isGuest={isGuest} onSignUp={() => { setIsGuest(false); setActiveScreen('auth-signup') }} onLogin={() => { setIsGuest(false); setActiveScreen('auth-login') }} onHome={() => setActiveScreen('landing')} />
      case 'loghours':      return <LogHours user={dbUser} />
      case 'calendar':      return <Calendar user={dbUser} isGuest={isGuest} onSignUp={() => { setIsGuest(false); setActiveScreen('auth-signup') }} onLogin={() => { setIsGuest(false); setActiveScreen('auth-login') }} />
      case 'impact':        return <Impact user={dbUser} onNavigate={navigate} />
      case 'profile':       return <Profile user={dbUser} onSignOut={handleSignOut} onNavigate={setActiveScreen} />
      case 'admin':         return <Admin authUser={authUser} />
      case 'orgDashboard':  return <OrgDashboard user={dbUser} editTargetId={editTargetId} onConsumeEditTarget={() => setEditTargetId(null)} onSelectOpp={openOpp} />
      case 'orgPost':       return <PostListingForm user={dbUser} onBack={() => navigate('orgDashboard')} />
      case 'privacy':
      case 'terms':
      case 'contact':       return <LegalPage slug={activeScreen} onBack={() => setActiveScreen(authUser ? (isOrg ? 'orgDashboard' : 'feed') : 'landing')} />
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
          <button onClick={() => navigate(isOrg ? 'orgDashboard' : 'feed')} style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', flexShrink: 0, padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Give Hour</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{isOrg ? 'Org Portal' : 'Teen Portal'}</div>
            </div>
          </button>
          <nav style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
            {isOrg ? visibleNav.map(({ id, icon, label }) => (
              <button key={id} onClick={() => navigate(id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeScreen === id ? T.primaryLight : 'transparent', color: activeScreen === id ? T.primary : '#60666D', fontWeight: activeScreen === id ? 600 : 400, fontSize: 14, fontFamily: 'inherit', marginBottom: 4 }}>
                {id === 'profile' && dbUser?.avatar_url ? <img src={dbUser.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${activeScreen === id ? T.primary : T.border}` }} /> : <span style={{ fontSize: 16 }}>{icon}</span>}
                {label}
              </button>
            )) : (
              <>
                {NAV_GROUPS.map((group, gi) => (
                  <div key={group.label} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: `${gi === 0 ? 2 : 10}px 12px 4px` }}>{group.label}</div>
                    {group.items.map(({ id, icon, label }) => (
                      <button key={id} onClick={() => navigate(id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeScreen === id ? T.primaryLight : 'transparent', color: activeScreen === id ? T.primary : '#60666D', fontWeight: activeScreen === id ? 600 : 400, fontSize: 14, fontFamily: 'inherit', marginBottom: 2 }}>
                        <span style={{ fontSize: 15 }}>{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                ))}
                <div style={{ height: 1, background: T.border, margin: '8px 12px' }} />
                <button onClick={() => navigate('profile')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeScreen === 'profile' ? T.primaryLight : 'transparent', color: activeScreen === 'profile' ? T.primary : '#60666D', fontWeight: activeScreen === 'profile' ? 600 : 400, fontSize: 14, fontFamily: 'inherit', marginBottom: 2 }}>
                  {dbUser?.avatar_url ? <img src={dbUser.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${activeScreen === 'profile' ? T.primary : T.border}` }} /> : <span style={{ fontSize: 15 }}>👤</span>}
                  Profile
                </button>
                {dbUser?.is_admin && (
                  <button onClick={() => navigate('admin')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeScreen === 'admin' ? T.primaryLight : 'transparent', color: activeScreen === 'admin' ? T.primary : '#60666D', fontWeight: activeScreen === 'admin' ? 600 : 400, fontSize: 14, fontFamily: 'inherit', marginBottom: 2 }}>
                    <span style={{ fontSize: 15 }}>⚙️</span>Admin
                  </button>
                )}
              </>
            )}
          </nav>
          <div style={{ padding: '12px', borderTop: `1px solid ${T.border}` }}>
            <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#E05252', fontWeight: 500, fontSize: 14, fontFamily: 'inherit' }}>
              <span style={{ fontSize: 16 }}>🚪</span>Sign out
            </button>
            <div style={{ display: 'flex', gap: 10, padding: '6px 12px 2px', flexWrap: 'wrap' }}>
              {[['Privacy', 'privacy'], ['Terms', 'terms'], ['Contact', 'contact']].map(([label, slug]) => (
                <button key={slug} onClick={() => setActiveScreen(slug)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: T.textSub, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
              ))}
            </div>
            <div style={{ padding: '2px 12px 8px', fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: isDesktop ? 1100 : 480, margin: '0 auto', flex: 1, background: T.bg, boxShadow: '0 0 40px rgba(0,0,0,0.08)' }}>
        <div style={{ flex: 1 }}>
          {mainContent()}
        </div>
        {/* footer — just sits at the end of the document */}
        <div style={{ background: '#F0F4F1', borderTop: `1px solid ${T.border}`, padding: '14px 20px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4A7C5C', marginBottom: 4 }}>Give Hour</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 4, flexWrap: 'wrap' }}>
            {[['Privacy', 'privacy'], ['Terms', 'terms'], ['Contact', 'contact']].map(([label, slug]) => (
              <button key={slug} onClick={() => setActiveScreen(slug)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: T.textSub, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: T.textMuted }}>© 2026 Shanzay Haris · All rights reserved</div>
        </div>
      </div>

      {/* hamburger FAB + drawer — mobile only */}
      {showNav && (
        <>
          {/* backdrop */}
          {drawerOpen && (
            <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400 }} />
          )}

          {/* slide-in drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 260,
            background: T.card,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.24s ease',
            zIndex: 401,
            display: 'flex', flexDirection: 'column',
            boxShadow: '-6px 0 28px rgba(0,0,0,0.14)',
          }}>
            {/* drawer header */}
            <div style={{ padding: '24px 20px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: '#fff', flexShrink: 0, padding: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Give Hour</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{isOrg ? 'Org Portal' : 'Teen Portal'}</div>
              </div>
            </div>

            {/* nav items */}
            <nav style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
              {isOrg ? visibleNav.map(({ id, icon, label }) => (
                <button key={id} onClick={() => navigate(id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 4, fontFamily: 'inherit', fontSize: 15, fontWeight: activeScreen === id ? 600 : 400, background: activeScreen === id ? T.primaryLight : 'transparent', color: activeScreen === id ? T.primary : '#60666D' }}>
                  {id === 'profile' && dbUser?.avatar_url ? <img src={dbUser.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${activeScreen === id ? T.primary : T.border}` }} /> : <span style={{ fontSize: 20 }}>{icon}</span>}
                  {label}
                </button>
              )) : (
                <>
                  {NAV_GROUPS.map((group, gi) => (
                    <div key={group.label} style={{ marginBottom: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: `${gi === 0 ? 2 : 10}px 14px 4px` }}>{group.label}</div>
                      {group.items.map(({ id, icon, label }) => (
                        <button key={id} onClick={() => navigate(id)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2, fontFamily: 'inherit', fontSize: 15, fontWeight: activeScreen === id ? 600 : 400, background: activeScreen === id ? T.primaryLight : 'transparent', color: activeScreen === id ? T.primary : '#60666D' }}>
                          <span style={{ fontSize: 18 }}>{icon}</span>{label}
                        </button>
                      ))}
                    </div>
                  ))}
                  <div style={{ height: 1, background: T.border, margin: '8px 14px' }} />
                  <button onClick={() => navigate('profile')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2, fontFamily: 'inherit', fontSize: 15, fontWeight: activeScreen === 'profile' ? 600 : 400, background: activeScreen === 'profile' ? T.primaryLight : 'transparent', color: activeScreen === 'profile' ? T.primary : '#60666D' }}>
                    {dbUser?.avatar_url ? <img src={dbUser.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${activeScreen === 'profile' ? T.primary : T.border}` }} /> : <span style={{ fontSize: 18 }}>👤</span>}
                    Profile
                  </button>
                  {dbUser?.is_admin && (
                    <button onClick={() => navigate('admin')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2, fontFamily: 'inherit', fontSize: 15, fontWeight: activeScreen === 'admin' ? 600 : 400, background: activeScreen === 'admin' ? T.primaryLight : 'transparent', color: activeScreen === 'admin' ? T.primary : '#60666D' }}>
                      <span style={{ fontSize: 18 }}>⚙️</span>Admin
                    </button>
                  )}
                </>
              )}
            </nav>

            {/* sign out */}
            <div style={{ padding: '12px 12px', borderTop: `1px solid ${T.border}`, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
              <button onClick={handleSignOut}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: '#E05252', fontWeight: 500, fontSize: 15, fontFamily: 'inherit' }}>
                <span style={{ fontSize: 20 }}>🚪</span> Sign out
              </button>
              <div style={{ display: 'flex', gap: 12, padding: '4px 14px 0', flexWrap: 'wrap' }}>
                {[['Privacy', 'privacy'], ['Terms', 'terms'], ['Contact', 'contact']].map(([label, slug]) => (
                  <button key={slug} onClick={() => { setDrawerOpen(false); setActiveScreen(slug) }} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: T.textSub, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* hamburger icon button — top right */}
          <button onClick={() => setDrawerOpen(o => !o)} aria-label="Menu" style={{
            position: 'fixed', top: 10, right: 12,
            width: 42, height: 42, borderRadius: 12,
            background: drawerOpen ? T.text : T.primary,
            color: '#fff',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer', zIndex: 402,
            boxShadow: '0 3px 10px rgba(24,160,80,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
            fontWeight: 500,
          }}>
            {drawerOpen ? '✕' : '☰'}
          </button>
        </>
      )}
    </div>
  )
}
