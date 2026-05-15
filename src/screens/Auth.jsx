import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSES     = ['Housing', 'Food Security', 'Education', 'Environment', 'Animals', 'Health', 'Arts', 'Seniors']
const CAUSE_EMOJI = { Housing: '🏠', 'Food Security': '🍎', Education: '📚', Environment: '🌿', Animals: '🐾', Health: '❤️‍🔥', Arts: '🎨', Seniors: '🤝' }
const GRADES     = ['8th', '9th', '10th', '11th', '12th', 'College']
const AGES       = [13, 14, 15, 16, 17, 18, 19]
const ORG_TYPES  = ['Nonprofit', 'School / University', 'Government', 'Faith-based', 'Community group', 'Other']

const inp = {
  background: '#F4F6F8', border: `1.5px solid #DCE0E5`, borderRadius: 12,
  padding: '14px 16px', fontSize: 16, color: T.text, outline: 'none',
  width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.15s, background 0.15s',
}
const lbl = {
  fontSize: 12, fontWeight: 700, color: T.textSub, letterSpacing: '0.04em',
  marginBottom: 7, display: 'block', textTransform: 'uppercase',
}

const StepHeader = ({ step, total, title, onBack }) => (
  <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
      {onBack
        ? <button onClick={onBack} style={{ background: T.bg, color: T.textSub, borderRadius: 8, width: 32, height: 32, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        : <div style={{ width: 32 }} />
      }
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ width: n === step ? 20 : 8, height: 8, borderRadius: 4, background: n <= step ? T.primary : T.border, transition: 'all 0.3s' }} />
        ))}
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 20px 16px', gap: 8 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Step {step} of 3</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>{title}</div>
      </div>
    </div>
  </div>
)

const SAMPLE_PIQ = `Volunteering has always been part of my life, but it wasn't until I started logging my hours that I truly understood the impact of what I was doing. Over three years, I dedicated 33 hours across five organizations in the Bay Area — and each one taught me something I couldn't have learned in a classroom.

My most consistent work was at the Bay Area Rescue Mission, where I helped prepare and distribute care packages for unhoused individuals. At first, I thought showing up was enough. But week after week, I started learning names and hearing stories. I realized homelessness isn't a single experience — it's a thousand different ones. I began writing personal notes to put inside the packages. Something small, but something I hoped made a difference.

Through Piedmont Garden Music, I helped fundraise to bring live music programming to underserved schools. I organized the silent auction, managed donor check-in, and stayed late to break everything down. That night, watching elementary students light up at their first concert, I understood what "community" really means — not a place, but a feeling of belonging you can help create.

What I didn't expect was how much these experiences would change how I think. I came in wanting to help others. I left realizing how much I was learning from them. The woman at the rescue mission who taught me her arroz con leche recipe. The third-grader at the concert who told me she wanted to be a violinist.

I've logged every hour — not for a number on a college application, but because tracking it forced me to be intentional. Each entry is a reminder of a moment I chose to show up. That habit, more than any single project, is what I want to carry forward: the practice of showing up consistently, not just when it's convenient.

My community made me. Volunteering is my way of giving some of that back.`

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function Auth({ onLoggedIn, onGuest, isDesktop, initialScreen, isGoogleFlow = false, googleAuthUser = null }) {
  const [screen, setScreen] = useState(initialScreen || 'landing')
  const [stats, setStats] = useState({ orgs: null, hours: null })
  const [showSample, setShowSample]     = useState(false)
  const [showTracking, setShowTracking] = useState(false)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(({ orgCount, hoursTotal }) => {
        const fmtOrgs  = orgCount   >= 1000 ? `${(orgCount/1000).toFixed(1)}k+`   : orgCount   > 0 ? `${orgCount}+`            : '—'
        const fmtHours = hoursTotal >= 1000 ? `${Math.floor(hoursTotal/1000)}k+`  : hoursTotal > 0 ? `${Math.round(hoursTotal)}+` : '—'
        setStats({ orgs: fmtOrgs, hours: fmtHours })
      })
      .catch(() => {})
  }, [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [role, setRole]         = useState('')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [grade, setGrade]       = useState('')
  const [age, setAge]           = useState(null)
  const [zip, setZip]           = useState('')
  const [school, setSchool]     = useState('')
  const [region, setRegion]     = useState('')
  const [interests, setInterests] = useState([])

  const [orgName, setOrgName]           = useState('')
  const [orgType, setOrgType]           = useState('')
  const [orgCity, setOrgCity]           = useState('')
  const [orgWebsite, setOrgWebsite]     = useState('')
  const [orgLogoUrl, setOrgLogoUrl]     = useState('')
  const [orgLogoIconUrl, setOrgLogoIconUrl] = useState('')
  const [orgDescription, setOrgDescription] = useState('')
  const [orgCauses, setOrgCauses]       = useState([])
  const [orgContactPhone, setOrgContactPhone] = useState('')
  const [orgIs501c3, setOrgIs501c3]           = useState(null)

  const [parentName, setParentName]     = useState('')
  const [parentEmail, setParentEmail]   = useState('')
  const [parentPhone, setParentPhone]   = useState('')
  const [parentConsent, setParentConsent] = useState(false)

  useEffect(() => {
    if (isGoogleFlow && googleAuthUser?.user_metadata?.full_name) {
      setName(googleAuthUser.user_metadata.full_name.split(' ')[0])
    }
  }, [isGoogleFlow, googleAuthUser])

  const wrapCard = (children) => isDesktop ? (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: T.bg, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 16px' }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: 440 }}>
        {children}
      </div>
    </div>
  ) : children

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleSignUp = async (fields) => {
    setLoading(true)
    setError('')
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { ...fields, email } },
      })
      if (signUpError) throw signUpError

      localStorage.setItem('givehour_pending_profile', JSON.stringify({ ...fields, email }))

      if (signUpData.session) {
        const user = signUpData.user
        await fetch('/api/save-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${signUpData.session.access_token}` },
          body: JSON.stringify({ ...fields, email }),
        })
        localStorage.removeItem('givehour_pending_profile')
        onLoggedIn(user, { id: user.id, email, ...fields })
      } else {
        setScreen('confirmEmail')
      }
    } catch (e) {
      const msg = (e.message || '').toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setScreen('step1')
        setError('An account with this email already exists. Try logging in instead.')
      } else {
        setError(e.message)
      }
    }
    setLoading(false)
  }

  const finishTeen = () => {
    const fields = { name, role: 'teen', grade, age, zip, school_name: school, region, interests, preferred_cause: interests[0] || null, parent_name: parentName.trim() || null, parent_email: parentEmail.trim() || null, parent_phone: parentPhone.trim() || null, parent_consent: parentConsent || null }
    if (isGoogleFlow) handleGoogleProfileSave(fields)
    else handleSignUp(fields)
  }
  const finishOrg  = () => {
    const fields = { name: orgName, contact_name: name.trim() || null, contact_phone: orgContactPhone.trim() || null, role: 'org', org_type: orgType, is_501c3: orgIs501c3, website: orgWebsite || null, logo_url: orgLogoUrl.trim() || null, logo_icon_url: orgLogoIconUrl.trim() || null, description: orgDescription.trim() || null, school_name: orgName, region: orgCity, interests: orgCauses, preferred_cause: orgCauses[0] || null }
    if (isGoogleFlow) handleGoogleProfileSave(fields)
    else handleSignUp(fields)
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError
      const user = data.user
      let { data: dbData } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
      if (!dbData?.name) {
        const stored = localStorage.getItem('givehour_pending_profile')
        const profile = stored ? JSON.parse(stored) : (user.user_metadata?.name ? user.user_metadata : null)
        if (profile?.name) {
          const resp = await fetch('/api/save-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
            body: JSON.stringify(profile),
          })
          if (resp.ok) {
            localStorage.removeItem('givehour_pending_profile')
            dbData = { ...(dbData || {}), id: user.id, ...profile }
          } else {
            const errBody = await resp.json().catch(() => ({}))
            console.error('[givehour] save-profile failed (login):', resp.status, errBody)
          }
        }
      }
      console.log('[givehour] dbUser after login:', dbData)
      onLoggedIn(user, dbData)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email address above first.'); return }
    setLoading(true); setError('')
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'https://givehour.vercel.app' })
      if (e) throw e
      setScreen('forgotSent')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const handleGoogleProfileSave = async (fields) => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch('/api/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...fields, email: googleAuthUser.email }),
      })
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || 'Failed to save profile') }
      onLoggedIn(googleAuthUser, { id: googleAuthUser.id, email: googleAuthUser.email, ...fields })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ── landing ───────────────────────────────────────────────────────────────

  if (screen === 'landing') {
    return (
      <>
      {wrapCard(
      <div style={{ display: 'flex', flexDirection: 'column', flex: isDesktop ? 'none' : 1, minHeight: 0, overflowY: isDesktop ? 'visible' : 'auto', background: T.card, height: isDesktop ? 'auto' : '100%' }}>
        <div style={{ background: 'linear-gradient(150deg, #0E7A3C 0%, #18A050 55%, #25C068 100%)', padding: '20px 24px 22px', textAlign: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

          {/* logo */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#fff', marginBottom: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.22)', padding: 8 }}>
            <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, margin: '0 0 6px', color: '#fff', position: 'relative', letterSpacing: '-0.02em' }}>Give Hour</h1>

          {/* by-a-teen badge */}
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 20, marginBottom: 10, position: 'relative', letterSpacing: '0.02em' }}>
            ✨ Built by a teen · for teens
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', maxWidth: 320, lineHeight: 1.5, margin: '0 auto', position: 'relative' }}>Find teen-friendly opportunities, log every hour you volunteer (even from school or elsewhere), and turn it all into a service letter when you need one.</p>
        </div>

        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
          {[['TBD', 'teens active'], [stats.orgs ?? '…', 'orgs listed'], [stats.hours ?? '…', 'hours logged']].map(([val, lbl], i) => (
            <div key={lbl} style={{ flex: 1, textAlign: 'center', padding: '12px 6px', borderRight: i < 2 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.primary }}>{val}</div>
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* primary CTAs — kept above the fold */}
        <div style={{ padding: '16px 24px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setScreen('userType')} style={{ background: T.primary, color: '#fff', padding: '14px', borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(24,160,80,0.3)', letterSpacing: '-0.01em' }}>Get started, it's free</button>
          <button onClick={handleGoogleSignIn} disabled={loading} style={{ background: '#fff', border: `1.5px solid ${T.border}`, color: T.text, padding: '13px', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <GoogleIcon />
            {loading ? 'Redirecting...' : 'Continue with Google'}
          </button>
          <button onClick={() => setScreen('login')} style={{ background: 'none', border: 'none', fontSize: 13, color: T.textSub, cursor: 'pointer', padding: '2px 0' }}>I already have an account →</button>
          <button onClick={onGuest} style={{ background: 'none', border: 'none', fontSize: 12, color: T.textMuted, cursor: 'pointer', padding: '2px 0' }}>Browse without signing up →</button>
        </div>

        {/* How it works */}
        <div style={{ padding: '16px 24px 28px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 14 }}>How it works</div>
          {[
            { icon: '🔍', title: 'Find teen-friendly opportunities', sub: 'Most volunteer sites are built for adults. Give Hour filters for orgs that actually accept teens.' },
            { icon: '⏱', title: 'Track every hour in one place', sub: 'School events, religious org, family thing, opportunities you found here. Log it all so nothing gets lost when college apps come around.', track: true },
            { icon: '🎓', title: 'Draft my Community PIQ', sub: 'Turn your logged hours into a ~350-word UC PIQ #7 draft — "What have you done to make your community a better place?"', cta: true },
          ].map(s => (
            <div key={s.icon} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.primaryLight, color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>{s.sub}</div>
                {s.cta && (
                  <button onClick={() => setShowSample(true)} style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 700, color: T.primary, cursor: 'pointer' }}>
                    See a sample draft →
                  </button>
                )}
                {s.track && (
                  <button onClick={() => setShowTracking(true)} style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 700, color: T.primary, cursor: 'pointer' }}>
                    See how it looks →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
      )}

        {/* sample tracking modal */}
        {showTracking && (
          <>
            <div onClick={() => setShowTracking(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
            <div style={{
              position: 'fixed',
              ...(isDesktop
                ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 420, maxHeight: '88vh', borderRadius: 18 }
                : { bottom: 0, left: 0, right: 0, maxHeight: '65vh', borderRadius: '18px 18px 0 0' }),
              background: '#fff', zIndex: 901, display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>⏱ Your Impact Dashboard</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Everything tracked, visualized for college apps</div>
                </div>
                <button onClick={() => setShowTracking(false)} style={{ background: '#F0F0F0', border: 'none', borderRadius: 10, width: 38, height: 38, fontSize: 20, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>

                {/* stat chips */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[['33', 'total hours', T.primary, T.primaryLight], ['5', 'organizations', '#3458C3', '#E8EFFC'], ['20', 'sessions', '#C45A1F', '#FEF0E7']].map(([val, lbl, color, bg]) => (
                    <div key={lbl} style={{ flex: 1, background: bg, borderRadius: 14, padding: '14px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 10, color, opacity: 0.8, marginTop: 4 }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* hours goal */}
                <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>🎯 Hours Goal</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>7%</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textSub, marginBottom: 6 }}>32h 55m of 500h goal</div>
                  <div style={{ height: 8, background: '#E8EAED', borderRadius: 20, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: '7%', background: 'linear-gradient(90deg, #18A050, #34C97A)', borderRadius: 20 }} />
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Next badge: 💯 Century Club at 50h</div>
                </div>

                {/* badges */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>🏅 Badges</div>
                  <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
                    {[
                      { icon: '🌱', label: 'First Step',      earned: true  },
                      { icon: '👟', label: 'Getting Started', earned: true  },
                      { icon: '🔥', label: 'On Fire',         earned: true  },
                      { icon: '⭐', label: 'Committed',       earned: true  },
                      { icon: '💯', label: 'Century Club',    earned: false },
                      { icon: '🚀', label: 'Superstar',       earned: false },
                      { icon: '🏆', label: 'Legend',          earned: false },
                    ].map(b => (
                      <div key={b.label} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: b.earned ? T.primaryLight : '#F4F6F8', border: `1.5px solid ${b.earned ? T.primary : '#DCE0E5'}`, borderRadius: 10, padding: '8px 10px', minWidth: 58, opacity: b.earned ? 1 : 0.45 }}>
                        <span style={{ fontSize: 20, filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: b.earned ? T.primary : T.textMuted, textAlign: 'center', lineHeight: 1.2 }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* hours by year mini chart */}
                <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>📅 Hours by Year</div>
                  <div style={{ display: 'flex', gap: 8, height: 80, alignItems: 'flex-end' }}>
                    {[['2023', 28, 100], ['2024', 1, 4], ['2025', 0, 0], ['2026', 4, 14]].map(([yr, hrs, pct]) => (
                      <div key={yr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.primary }}>{hrs > 0 ? `${hrs}h` : ''}</div>
                        <div style={{ width: '70%', height: Math.max(pct * 0.56, hrs > 0 ? 4 : 0), background: 'linear-gradient(180deg,#34C97A,#18A050)', borderRadius: '3px 3px 0 0' }} />
                        <div style={{ fontSize: 9, color: T.textMuted }}>{yr}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* hours by category */}
                <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>Hours by Category</div>
                  {[['Community', 12.75, 33], ['Sr. Community', 11.17, 29], ['Fund Raising', 5, 13], ['Uncategorized', 4, 11]].map(([cat, hrs, pct]) => (
                    <div key={cat} style={{ marginBottom: 9 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: T.text }}>{cat}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.primary }}>{hrs % 1 === 0 ? `${hrs}h` : `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m`}</span>
                      </div>
                      <div style={{ height: 6, background: '#E8EAED', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: T.primary, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '14px 16px 20px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
                <button onClick={() => { setShowTracking(false); setScreen('userType') }} style={{ width: '100%', padding: 13, background: T.primary, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(24,160,80,0.25)' }}>
                  Start tracking yours →
                </button>
              </div>
            </div>
          </>
        )}

        {/* sample PIQ modal */}
        {showSample && (
          <>
            <div onClick={() => setShowSample(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
            <div style={{
              position: 'fixed',
              ...(isDesktop
                ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, maxHeight: '88vh', borderRadius: 18 }
                : { bottom: 0, left: 0, right: 0, maxHeight: '65vh', borderRadius: '18px 18px 0 0' }),
              background: '#fff', zIndex: 901, display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 40px rgba(0,0,0,0.2)', overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>🎓 Sample Community PIQ Draft</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>AI-generated from a student's real volunteer data</div>
                </div>
                <button onClick={() => setShowSample(false)} style={{ background: '#F0F0F0', border: 'none', borderRadius: 10, width: 38, height: 38, fontSize: 20, cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 4px' }}>
                <div style={{ background: T.primaryLight, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: T.primary, fontWeight: 600 }}>
                  UC PIQ #7 · "What have you done to make your community a better place?" · ~320 words
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.85, color: T.text, whiteSpace: 'pre-wrap' }}>{SAMPLE_PIQ}</div>
              </div>
              <div style={{ padding: '14px 20px 20px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
                <button onClick={() => { setShowSample(false); setScreen('userType') }} style={{ width: '100%', padding: 13, background: T.primary, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(24,160,80,0.25)' }}>
                  Sign up to draft yours →
                </button>
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  // ── user type ─────────────────────────────────────────────────────────────

  if (screen === 'userType') {
    const cards = [
      { emoji: '🎒', title: "I'm a teen", sub: 'Find opportunities & track hours', r: 'teen', bg: T.primaryLight, accent: T.primary },
      { emoji: '🏢', title: "I'm an organization", sub: 'Post listings & manage volunteers', r: 'org', bg: T.accentLight, accent: T.accent },
    ]
    return wrapCard(
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setScreen('landing')} style={{ background: T.bg, color: T.textSub, borderRadius: 8, width: 32, height: 32, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px 16px', gap: 8 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Join Give Hour</div>
          </div>
        </div>
        <div style={{ padding: '20px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cards.map(({ emoji, title, sub, r, bg, accent }) => (
              <button key={r} onClick={() => { setRole(r); setScreen(isGoogleFlow ? 'step2' : 'step1') }} style={{ background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
                  <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{sub}</div>
                </div>
                <div style={{ color: T.textMuted, fontSize: 20, fontWeight: 300 }}>›</div>
              </button>
            ))}
          </div>

          {/* already have an account */}
          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 18, borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.textSub }}>
            Already have an account?{' '}
            <button onClick={() => { setError(''); setScreen('login') }} style={{ background: 'none', border: 'none', color: T.primary, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}>Log in</button>
          </div>
        </div>
      </div>
    )
  }

  // helper to wrap step screens with the desktop card
  const wrapStep = (children) => wrapCard(
    <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
      {children}
    </div>
  )

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  if (screen === 'step1') {
    const ready = name.trim() && email.trim() && password.trim()
    const nameLbl = role === 'org' ? 'Your name (contact person)' : 'First name'
    return wrapStep(
      <>
        <StepHeader step={1} title={role === 'org' ? 'Contact details' : 'Create your account'} onBack={() => setScreen('userType')} />
        <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>We just need a few basics to get started.</div>

          {[[nameLbl, name, setName, 'text'], ['Email address', email, setEmail, 'email'], ['Password', password, setPassword, 'password']].map(([label, val, set, type]) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <label style={lbl}>{label}</label>
              {type === 'password' ? (
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)} style={{ ...inp, paddingRight: 46 }} placeholder="Min. 6 characters" />
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: T.textMuted, padding: 4, lineHeight: 1 }}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
              ) : (
                <input type={type} value={val} onChange={e => set(e.target.value)} style={inp} placeholder={type === 'email' ? 'you@example.com' : ''} />
              )}
            </div>
          ))}

          {role === 'org' && (
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Contact phone number <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input type="tel" value={orgContactPhone} onChange={e => setOrgContactPhone(e.target.value)} style={inp} placeholder="(415) 555-0100" />
            </div>
          )}

          <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 20, lineHeight: 1.6 }}>By continuing you agree to our Terms of Service and Privacy Policy.</p>
          {error && <div style={{ background: '#FFF0F0', border: '1px solid #F5C0C0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: T.danger, marginBottom: 16 }}>{error}</div>}
          <button onClick={() => { setError(''); setScreen('step2') }} disabled={!ready} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, transition: 'background 0.2s' }}>Continue →</button>

          {/* already have an account */}
          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 18, borderTop: `1px solid ${T.border}`, fontSize: 13, color: T.textSub }}>
            Already have an account?{' '}
            <button onClick={() => { setError(''); setScreen('login') }} style={{ background: 'none', border: 'none', color: T.primary, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}>Log in</button>
          </div>
        </div>
      </>
    )
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  if (screen === 'step2') {

    // TEEN
    if (role === 'teen') {
      const ready = grade && age
      return wrapStep(
        <>
          <StepHeader step={2} title="About you" onBack={() => setScreen('step1')} />
          <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>Helps us find age-appropriate opportunities near you.</div>

            <label style={lbl}>What grade are you in?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setGrade(g)} style={{ padding: '9px 18px', borderRadius: 24, border: `2px solid ${grade === g ? T.primary : T.border}`, background: grade === g ? T.primary : '#fff', color: grade === g ? '#fff' : T.textSub, fontSize: 14, fontWeight: grade === g ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{g}</button>
              ))}
            </div>

            <label style={lbl}>How old are you?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {AGES.map(a => (
                <button key={a} onClick={() => setAge(a)} style={{ padding: '9px 18px', borderRadius: 24, border: `2px solid ${age === a ? T.primary : T.border}`, background: age === a ? T.primary : '#fff', color: age === a ? '#fff' : T.textSub, fontSize: 14, fontWeight: age === a ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{a}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={lbl}>Zip code <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={zip} onChange={e => setZip(e.target.value)} style={inp} placeholder="94102" />
              </div>
              <div>
                <label style={lbl}>School <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={school} onChange={e => setSchool(e.target.value)} style={inp} placeholder="Lincoln High" />
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 20, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>Parent / Guardian info</div>
              <div style={{ fontSize: 12, color: T.textSub, marginBottom: 16 }}>Optional. Many orgs require a parent contact for teens under 18.</div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Parent / Guardian name</label>
                <input value={parentName} onChange={e => setParentName(e.target.value)} style={inp} placeholder="Jane Smith" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Parent email</label>
                  <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} style={inp} placeholder="parent@email.com" />
                </div>
                <div>
                  <label style={lbl}>Parent phone</label>
                  <input type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)} style={inp} placeholder="(415) 555-0100" />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 24 }}>
                <input type="checkbox" checked={parentConsent} onChange={e => setParentConsent(e.target.checked)} style={{ marginTop: 2, accentColor: T.primary, width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: T.textSub, lineHeight: 1.5 }}>My parent or guardian consents to me volunteering through Give Hour.</span>
              </label>
            </div>

            <button onClick={() => setScreen('step3')} disabled={!ready} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, transition: 'background 0.2s' }}>Continue →</button>
          </div>
        </>
      )
    }

    // ORG
    if (role === 'org') {
      const ready = orgName.trim() && orgType && orgCity.trim()
      return wrapStep(
        <>
          <StepHeader step={2} title="Your organization" onBack={() => setScreen('step1')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>Tell teens who you are and where you operate.</div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Organization name</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inp} placeholder="Bay Area Food Bank" />
            </div>

            <label style={lbl}>Organization type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ORG_TYPES.map(t => (
                <button key={t} onClick={() => setOrgType(t)} style={{ padding: '9px 16px', borderRadius: 24, border: `2px solid ${orgType === t ? T.accent : T.border}`, background: orgType === t ? T.accentLight : '#fff', color: orgType === t ? T.accent : T.textSub, fontSize: 13, fontWeight: orgType === t ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{t}</button>
              ))}
            </div>

            <label style={lbl}>Are you a 501(c)(3) nonprofit? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(({ label, val }) => (
                <button key={label} onClick={() => setOrgIs501c3(prev => prev === val ? null : val)} style={{ flex: 1, padding: '10px 0', borderRadius: 24, border: `2px solid ${orgIs501c3 === val ? T.accent : T.border}`, background: orgIs501c3 === val ? T.accentLight : '#fff', color: orgIs501c3 === val ? T.accent : T.textSub, fontSize: 14, fontWeight: orgIs501c3 === val ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{label}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>City / Location</label>
                <input value={orgCity} onChange={e => setOrgCity(e.target.value)} style={inp} placeholder="San Francisco, CA" />
              </div>
              <div>
                <label style={lbl}>Website <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} style={inp} placeholder="yourorg.org" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Main logo URL <span style={{ fontWeight: 400, textTransform: 'none' }}>(shown on your profile, optional)</span></label>
              <input value={orgLogoUrl} onChange={e => setOrgLogoUrl(e.target.value)} style={inp} placeholder="https://yourorg.org/logo.png" />
              {orgLogoUrl && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={orgLogoUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4, boxSizing: 'border-box' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                  </div>
                  <span style={{ fontSize: 11, color: T.textMuted }}>Profile preview</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Icon URL <span style={{ fontWeight: 400, textTransform: 'none' }}>(small square logo for listing cards, optional)</span></label>
              <input value={orgLogoIconUrl} onChange={e => setOrgLogoIconUrl(e.target.value)} style={inp} placeholder="https://yourorg.org/apple-touch-icon.png" />
              {orgLogoIconUrl && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: '#fff', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={orgLogoIconUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                  </div>
                  <span style={{ fontSize: 11, color: T.textMuted }}>Listing card preview</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={lbl}>About your organization <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <textarea value={orgDescription} onChange={e => setOrgDescription(e.target.value)} placeholder="Tell teens about your mission, what you do, and how they can get involved." rows={5} style={{ ...inp, resize: 'vertical', minHeight: 100, lineHeight: 1.5 }} />
            </div>

            <button onClick={() => setScreen('step3')} disabled={!ready} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, transition: 'background 0.2s' }}>Continue →</button>
          </div>
        </>
      )
    }

  }

  // ── Step 3 — causes ────────────────────────────────────────────────────────

  if (screen === 'step3') {

    // TEEN
    if (role === 'teen') {
      const toggle = (c) => setInterests(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
      const ready = interests.length >= 2
      const needed = 2 - interests.length
      return wrapStep(
        <>
          <StepHeader step={3} title="Your causes" onBack={() => setScreen('step2')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: needed > 0 ? 8 : 16 }}>Pick at least 2. Your first pick becomes your top cause.</div>

            {interests.length > 0 && (
              <div style={{ background: T.primaryLight, borderRadius: 10, padding: '8px 14px', marginBottom: 16, fontSize: 13, color: T.primary, fontWeight: 600 }}>
                ⭐ {interests[0]} is your top cause
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
              {CAUSES.map(c => {
                const sel = interests.includes(c)
                return (
                  <button key={c} onClick={() => toggle(c)} style={{ padding: '14px 10px', borderRadius: 14, border: `2px solid ${sel ? CAUSE[c].text : T.border}`, background: sel ? CAUSE[c].bg : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
                    {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: CAUSE[c].text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span></div>}
                    <span style={{ fontSize: 24 }}>{CAUSE_EMOJI[c]}</span>
                    <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? CAUSE[c].text : T.textSub, textAlign: 'center', lineHeight: 1.3 }}>{c}</span>
                  </button>
                )
              })}
            </div>

            {error && <div style={{ background: '#FFF0F0', border: '1px solid #F5C0C0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: T.danger, marginBottom: 16 }}>{error}</div>}
            <button onClick={finishTeen} disabled={!ready || loading} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready && !loading ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, boxShadow: ready ? '0 4px 14px rgba(24,160,80,0.3)' : 'none', transition: 'all 0.2s' }}>
              {loading ? 'Creating account...' : ready ? 'Finish setup →' : `Pick ${needed} more to continue`}
            </button>
          </div>
        </>
      )
    }

    // ORG
    if (role === 'org') {
      const toggle = (c) => setOrgCauses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
      const ready = orgCauses.length >= 1
      return wrapStep(
        <>
          <StepHeader step={3} title="Causes you support" onBack={() => setScreen('step2')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>Pick at least 1. This helps teens find you.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
              {CAUSES.map(c => {
                const sel = orgCauses.includes(c)
                return (
                  <button key={c} onClick={() => toggle(c)} style={{ padding: '14px 10px', borderRadius: 14, border: `2px solid ${sel ? CAUSE[c].text : T.border}`, background: sel ? CAUSE[c].bg : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
                    {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: CAUSE[c].text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span></div>}
                    <span style={{ fontSize: 24 }}>{CAUSE_EMOJI[c]}</span>
                    <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? CAUSE[c].text : T.textSub, textAlign: 'center', lineHeight: 1.3 }}>{c}</span>
                  </button>
                )
              })}
            </div>
            {error && <div style={{ background: '#FFF0F0', border: '1px solid #F5C0C0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: T.danger, marginBottom: 16 }}>{error}</div>}
            <button onClick={finishOrg} disabled={!ready || loading} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready && !loading ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, transition: 'all 0.2s' }}>
              {loading ? 'Creating account...' : 'Finish setup →'}
            </button>
          </div>
        </>
      )
    }

  }

  // ── Confirm email ──────────────────────────────────────────────────────────

  if (screen === 'confirmEmail') {
    const isOrgSignup = role === 'org'
    return wrapCard(
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card, alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: isOrgSignup ? T.accentLight : T.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, marginBottom: 20 }}>📬</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 10, letterSpacing: '-0.02em' }}>
          {isOrgSignup ? 'One last step!' : 'Check your inbox!'}
        </div>
        <div style={{ fontSize: 14, color: T.textSub, lineHeight: 1.7, maxWidth: 300, marginBottom: 32 }}>
          {isOrgSignup ? (
            <>We sent a confirmation link to <strong style={{ color: T.text }}>{email}</strong>. Click it to activate your organization account on Give Hour, then log in to start posting listings.</>
          ) : (
            <>We sent a confirmation link to <strong style={{ color: T.text }}>{email}</strong>. Click it to activate your account, then log in to find opportunities near you.</>
          )}
        </div>
        <button onClick={() => setScreen('login')} style={{ background: isOrgSignup ? T.accent : T.primary, color: '#fff', padding: '14px 32px', borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: isOrgSignup ? '0 4px 14px rgba(0,0,0,0.15)' : '0 4px 14px rgba(24,160,80,0.3)' }}>
          Go to log in →
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: T.textMuted }}>Don't see it? Check your spam folder.</div>
      </div>
    )
  }

  // ── Forgot password ────────────────────────────────────────────────────────

  if (screen === 'forgotSent') {
    return wrapCard(
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setScreen('login')} style={{ background: T.bg, color: T.textSub, borderRadius: 8, width: 32, height: 32, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px 16px', gap: 8 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Check your email</div>
          </div>
        </div>
        <div style={{ padding: '48px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
          <div style={{ fontSize: 14, color: T.textSub, lineHeight: 1.7, maxWidth: 280, margin: '0 auto 32px' }}>
            We sent a reset link to <strong style={{ color: T.text }}>{email}</strong>. Follow the link to set a new password.
          </div>
          <button onClick={() => setScreen('login')} style={{ background: T.primary, color: '#fff', padding: '14px 32px', borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Back to log in
          </button>
        </div>
      </div>
    )
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  if (screen === 'login') {
    const ready = email.trim() && password.trim()
    return wrapCard(
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setScreen('landing')} style={{ background: T.bg, color: T.textSub, borderRadius: 8, width: 32, height: 32, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px 16px', gap: 8 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Welcome back</div>
          </div>
        </div>
        <div style={{ padding: '28px 20px' }}>
          <div style={{ fontSize: 14, color: T.textSub, marginBottom: 28 }}>Good to see you again.</div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={lbl}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, paddingRight: 46 }} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: T.textMuted, padding: 4, lineHeight: 1 }}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', fontSize: 13, color: T.primary, cursor: 'pointer', fontWeight: 600 }}>{loading ? 'Sending...' : 'Forgot password?'}</button>
          </div>

          {error && <div style={{ background: '#FFF0F0', border: '1px solid #F5C0C0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: T.danger, marginBottom: 16 }}>{error}</div>}
          <button onClick={handleLogin} disabled={!ready || loading} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready && !loading ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, boxShadow: ready ? '0 4px 14px rgba(24,160,80,0.3)' : 'none', transition: 'all 0.2s' }}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 4px' }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 12, color: T.textMuted }}>or</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>
          <button onClick={handleGoogleSignIn} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 14, border: `1.5px solid ${T.border}`, background: '#fff', color: T.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <GoogleIcon />
            {loading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: 13, color: T.textMuted }}>Don't have an account? </span>
            <button onClick={() => { setError(''); setScreen('userType') }} style={{ background: 'none', border: 'none', fontSize: 13, color: T.primary, cursor: 'pointer', fontWeight: 600 }}>Sign up</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
