import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSES     = ['Housing', 'Food Security', 'Education', 'Environment', 'Animals', 'Health', 'Arts', 'Seniors']
const CAUSE_EMOJI = { Housing: '🏠', 'Food Security': '🍎', Education: '📚', Environment: '🌿', Animals: '🐾', Health: '❤️‍🔥', Arts: '🎨', Seniors: '🤝' }
const GRADES     = ['8th', '9th', '10th', '11th', '12th', 'College']
const AGES       = [13, 14, 15, 16, 17, 18, 19]
const US_REGIONS = ['Bay Area, CA', 'Los Angeles, CA', 'San Diego, CA', 'New York, NY', 'Chicago, IL', 'Houston, TX', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Remote / Online']
const ORG_TYPES  = ['Nonprofit', 'School / University', 'Government', 'Faith-based', 'Community group', 'Other']

const inp = {
  background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 12,
  padding: '13px 16px', fontSize: 15, color: T.text, outline: 'none',
  width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
}
const lbl = {
  fontSize: 12, fontWeight: 600, color: T.textSub, letterSpacing: '0.03em',
  marginBottom: 6, display: 'block',
}

const StepHeader = ({ step, total, title, onBack }) => (
  <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 12px' }}>
      {onBack && (
        <button onClick={onBack} style={{ background: T.bg, color: T.textSub, borderRadius: 8, width: 32, height: 32, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
      )}
      <img src="/logo.png" alt="Give Hour" style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>Step {step} of 3</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ width: n === step ? 20 : 8, height: 8, borderRadius: 4, background: n <= step ? T.primary : T.border, transition: 'all 0.3s' }} />
        ))}
      </div>
    </div>
  </div>
)

export default function Auth({ onLoggedIn, onGuest, isDesktop, initialScreen }) {
  const [screen, setScreen] = useState(initialScreen || 'landing')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [role, setRole]         = useState('')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

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
  const [orgCauses, setOrgCauses]       = useState([])
  const [orgContactPhone, setOrgContactPhone] = useState('')
  const [orgIs501c3, setOrgIs501c3]           = useState(null)

  const [childGrade, setChildGrade]     = useState('')
  const [childSchool, setChildSchool]   = useState('')
  const [parentZip, setParentZip]       = useState('')
  const [parentInterests, setParentInterests] = useState([])

  const wrapCard = (children) => isDesktop ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', background: T.bg }}>
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

  const finishTeen   = () => handleSignUp({ name, role: 'teen', grade, age, zip, school_name: school, region, interests, preferred_cause: interests[0] || null })
  const finishOrg    = () => handleSignUp({ name: orgName, contact_name: name.trim() || null, contact_phone: orgContactPhone.trim() || null, role: 'org', org_type: orgType, is_501c3: orgIs501c3, website: orgWebsite || null, school_name: orgName, region: orgCity, interests: orgCauses, preferred_cause: orgCauses[0] || null })
  const finishParent = () => handleSignUp({ name, role: 'parent', grade: childGrade, zip: parentZip, school_name: childSchool, interests: parentInterests, preferred_cause: parentInterests[0] || null })

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

  // ── landing ───────────────────────────────────────────────────────────────

  if (screen === 'landing') {
    return wrapCard(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ background: 'linear-gradient(150deg, #0E7A3C 0%, #18A050 55%, #25C068 100%)', padding: '52px 28px 44px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <img src="/logo.png" alt="Give Hour" style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 28px rgba(0,0,0,0.22)', marginBottom: 20, position: 'relative' }} />
          <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15, margin: '0 0 10px', color: '#fff', position: 'relative', letterSpacing: '-0.02em' }}>Give an Hour.<br />Change a Life.</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 270, lineHeight: 1.7, margin: '0 auto', position: 'relative' }}>Personalized volunteer opportunities for teens. Track hours, build your story.</p>
        </div>

        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
          {[['2,400+', 'teens active'], ['180+', 'orgs listed'], ['12k+', 'hours logged']].map(([val, lbl], i) => (
            <div key={lbl} style={{ flex: 1, textAlign: 'center', padding: '14px 6px', borderRight: i < 2 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.primary }}>{val}</div>
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '28px 24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setScreen('userType')} style={{ background: T.primary, color: '#fff', padding: '16px', borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(24,160,80,0.3)', letterSpacing: '-0.01em' }}>Get started — it's free</button>
          <button onClick={() => setScreen('login')} style={{ background: '#fff', border: `2px solid ${T.border}`, color: T.text, padding: '16px', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>I already have an account</button>
          <button onClick={onGuest} style={{ background: 'none', border: 'none', fontSize: 13, color: T.textMuted, cursor: 'pointer', padding: '4px 0' }}>Browse without signing up →</button>
        </div>
      </div>
    )
  }

  // ── user type ─────────────────────────────────────────────────────────────

  if (screen === 'userType') {
    const cards = [
      { emoji: '🎒', title: "I'm a teen", sub: 'Find opportunities & track hours', r: 'teen', bg: T.primaryLight, accent: T.primary },
      { emoji: '🏢', title: "I'm an organization", sub: 'Post listings & manage volunteers', r: 'org', bg: T.accentLight, accent: T.accent },
      { emoji: '🏡', title: "I'm a parent", sub: "Support your teen's journey", r: 'parent', bg: '#FFF0E6', accent: '#C04E0A' },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setScreen('landing')} style={{ background: T.bg, color: T.textSub, borderRadius: 8, width: 32, height: 32, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Join Give Hour</div>
        </div>
        <div style={{ padding: '28px 20px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>Who are you?</div>
          <div style={{ fontSize: 14, color: T.textSub, marginBottom: 24 }}>Choose your account type to get started.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cards.map(({ emoji, title, sub, r, bg, accent }) => (
              <button key={r} onClick={() => { setRole(r); setScreen('step1') }} style={{ background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
                  <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{sub}</div>
                </div>
                <div style={{ color: T.textMuted, fontSize: 20, fontWeight: 300 }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  if (screen === 'step1') {
    const ready = name.trim() && email.trim() && password.trim()
    const nameLbl = role === 'org' ? 'Your name (contact person)' : 'First name'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
        <StepHeader step={1} title={role === 'org' ? 'Contact details' : 'Create your account'} onBack={() => setScreen('userType')} />
        <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>
            {role === 'org' ? 'Your contact info' : role === 'parent' ? 'Create your account' : 'Tell us about you'}
          </div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>We just need a few basics to get started.</div>

          {[[nameLbl, name, setName, 'text'], ['Email address', email, setEmail, 'email'], ['Password', password, setPassword, 'password']].map(([label, val, set, type]) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <label style={lbl}>{label}</label>
              <input type={type} value={val} onChange={e => set(e.target.value)} style={inp} placeholder={type === 'email' ? 'you@example.com' : type === 'password' ? 'Min. 6 characters' : ''} />
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
        </div>
      </div>
    )
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  if (screen === 'step2') {

    // TEEN
    if (role === 'teen') {
      const ready = grade && age
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
          <StepHeader step={2} title="About you" onBack={() => setScreen('step1')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>A bit about you</div>
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

            <label style={lbl}>Your region <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— matches nearby opportunities</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {US_REGIONS.map(r => (
                <button key={r} onClick={() => setRegion(prev => prev === r ? '' : r)} style={{ padding: '11px 16px', borderRadius: 12, border: `1.5px solid ${region === r ? T.primary : T.border}`, background: region === r ? T.primaryLight : '#fff', color: region === r ? T.primary : T.text, fontSize: 14, fontWeight: region === r ? 600 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                  {region === r ? '✓  ' : ''}{r}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
              <div>
                <label style={lbl}>Zip code <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={zip} onChange={e => setZip(e.target.value)} style={inp} placeholder="94102" />
              </div>
              <div>
                <label style={lbl}>School <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={school} onChange={e => setSchool(e.target.value)} style={inp} placeholder="Lincoln High" />
              </div>
            </div>

            <button onClick={() => setScreen('step3')} disabled={!ready} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, transition: 'background 0.2s' }}>Continue →</button>
          </div>
        </div>
      )
    }

    // ORG
    if (role === 'org') {
      const ready = orgName.trim() && orgType && orgCity.trim()
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
          <StepHeader step={2} title="Your organization" onBack={() => setScreen('step1')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>Your organization</div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
              <div>
                <label style={lbl}>City / Location</label>
                <input value={orgCity} onChange={e => setOrgCity(e.target.value)} style={inp} placeholder="San Francisco, CA" />
              </div>
              <div>
                <label style={lbl}>Website <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} style={inp} placeholder="yourorg.org" />
              </div>
            </div>

            <button onClick={() => setScreen('step3')} disabled={!ready} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, transition: 'background 0.2s' }}>Continue →</button>
          </div>
        </div>
      )
    }

    // PARENT
    if (role === 'parent') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
          <StepHeader step={2} title="Your child's info" onBack={() => setScreen('step1')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>About your teen</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>We'll use this to find age-appropriate opportunities. All optional.</div>

            <label style={lbl}>Child's grade</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setChildGrade(prev => prev === g ? '' : g)} style={{ padding: '9px 18px', borderRadius: 24, border: `2px solid ${childGrade === g ? T.primary : T.border}`, background: childGrade === g ? T.primary : '#fff', color: childGrade === g ? '#fff' : T.textSub, fontSize: 14, fontWeight: childGrade === g ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{g}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
              <div>
                <label style={lbl}>Child's school <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={childSchool} onChange={e => setChildSchool(e.target.value)} style={inp} placeholder="Lincoln High" />
              </div>
              <div>
                <label style={lbl}>Zip code <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={parentZip} onChange={e => setParentZip(e.target.value)} style={inp} placeholder="94102" />
              </div>
            </div>

            <button onClick={() => setScreen('step3')} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', background: T.primary, color: '#fff' }}>Continue →</button>
          </div>
        </div>
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
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
          <StepHeader step={3} title="Your causes" onBack={() => setScreen('step2')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>What do you care about?</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: needed > 0 ? 8 : 0 }}>Pick at least 2 — your first pick becomes your top cause.</div>

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
        </div>
      )
    }

    // ORG
    if (role === 'org') {
      const toggle = (c) => setOrgCauses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
      const ready = orgCauses.length >= 1
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
          <StepHeader step={3} title="Causes you support" onBack={() => setScreen('step2')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>What causes do you support?</div>
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
        </div>
      )
    }

    // PARENT
    if (role === 'parent') {
      const toggle = (c) => setParentInterests(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
          <StepHeader step={3} title="Family interests" onBack={() => setScreen('step2')} />
          <div style={{ padding: '24px 20px', overflowY: 'auto' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>What causes does your family care about?</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>Optional — helps us suggest better opportunities.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
              {CAUSES.map(c => {
                const sel = parentInterests.includes(c)
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
            <button onClick={finishParent} disabled={loading} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', background: T.primary, color: '#fff' }}>
              {loading ? 'Creating account...' : 'Finish setup →'}
            </button>
          </div>
        </div>
      )
    }
  }

  // ── Confirm email ──────────────────────────────────────────────────────────

  if (screen === 'confirmEmail') {
    const isOrgSignup = role === 'org'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card, alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setScreen('login')} style={{ background: T.bg, color: T.textSub, borderRadius: 8, width: 32, height: 32, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Check your email</div>
        </div>
        <div style={{ padding: '48px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8, letterSpacing: '-0.02em' }}>Reset link sent!</div>
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setScreen('landing')} style={{ background: T.bg, color: T.textSub, borderRadius: 8, width: 32, height: 32, fontSize: 16, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Welcome back</div>
        </div>
        <div style={{ padding: '28px 20px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>Log in</div>
          <div style={{ fontSize: 14, color: T.textSub, marginBottom: 28 }}>Good to see you again.</div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={lbl}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inp} placeholder="••••••••" />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', fontSize: 13, color: T.primary, cursor: 'pointer', fontWeight: 600 }}>{loading ? 'Sending...' : 'Forgot password?'}</button>
          </div>

          {error && <div style={{ background: '#FFF0F0', border: '1px solid #F5C0C0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: T.danger, marginBottom: 16 }}>{error}</div>}
          <button onClick={handleLogin} disabled={!ready || loading} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, cursor: ready && !loading ? 'pointer' : 'default', background: ready ? T.primary : T.border, color: ready ? '#fff' : T.textMuted, boxShadow: ready ? '0 4px 14px rgba(24,160,80,0.3)' : 'none', transition: 'all 0.2s' }}>
            {loading ? 'Logging in...' : 'Log in'}
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
