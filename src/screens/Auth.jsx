import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSES     = ['Housing', 'Food Security', 'Education', 'Environment', 'Animals', 'Health', 'Arts', 'Seniors']
const GRADES     = ['8th', '9th', '10th', '11th', '12th', 'College']
const AGES       = [13, 14, 15, 16, 17, 18, 19]
const US_REGIONS = ['Bay Area, CA', 'Los Angeles, CA', 'San Diego, CA', 'New York, NY', 'Chicago, IL', 'Houston, TX', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Remote / Online']
const ORG_TYPES  = ['Nonprofit', 'School / University', 'Government', 'Faith-based', 'Community group', 'Other']

const inputStyle = {
  background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10,
  padding: '11px 14px', fontSize: 14, color: T.text, outline: 'none',
  width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: T.textSub, letterSpacing: '0.04em',
  textTransform: 'uppercase', marginBottom: 5, display: 'block',
}
const topBar = (title, subtitle, onBack) => (
  <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', flexShrink: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {onBack && (
        <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '5px 11px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer' }}>←</button>
      )}
      <div>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  </div>
)

export default function Auth({ onLoggedIn, onGuest, isDesktop, initialScreen }) {
  const [screen, setScreen] = useState(initialScreen || 'landing')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // shared
  const [role, setRole]         = useState('')   // 'teen' | 'org' | 'parent'
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  // teen fields
  const [grade, setGrade]     = useState('')
  const [age, setAge]         = useState(null)
  const [zip, setZip]         = useState('')
  const [school, setSchool]   = useState('')
  const [region, setRegion]   = useState('')
  const [interests, setInterests] = useState([])

  // org fields
  const [orgName, setOrgName]   = useState('')
  const [orgType, setOrgType]   = useState('')
  const [orgCity, setOrgCity]   = useState('')
  const [orgWebsite, setOrgWebsite] = useState('')
  const [orgCauses, setOrgCauses]   = useState([])

  // parent fields
  const [childGrade, setChildGrade] = useState('')
  const [childSchool, setChildSchool] = useState('')
  const [parentZip, setParentZip]   = useState('')
  const [parentInterests, setParentInterests] = useState([])

  const wrapCard = (children) => isDesktop ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', background: T.bg }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: '100%', maxWidth: 440 }}>
        {children}
      </div>
    </div>
  ) : children

  // ── sign-up handlers ──────────────────────────────────────────────────────

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

      if (signUpData.session) {
        // Email confirmation disabled — user is immediately logged in
        const user = signUpData.user
        const { error: updateError } = await supabase.from('users').upsert({ id: user.id, email, ...fields })
        if (updateError) throw updateError
        onLoggedIn(user, { id: user.id, email, ...fields })
      } else {
        // Email confirmation required — direct to check-email screen
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
    const preferred_cause = interests[0] || null
    handleSignUp({ name, role: 'teen', grade, age, zip, school_name: school, region, interests, preferred_cause })
  }

  const finishOrg = () => {
    handleSignUp({ name: orgName, role: 'org', school_name: orgName, region: orgCity, interests: orgCauses, preferred_cause: orgCauses[0] || null })
  }

  const finishParent = () => {
    handleSignUp({ name, role: 'parent', grade: childGrade, zip: parentZip, school_name: childSchool, interests: parentInterests, preferred_cause: parentInterests[0] || null })
  }

  // ── login ─────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError
      const user = data.user
      let { data: dbData } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
      if (!dbData && user.user_metadata && Object.keys(user.user_metadata).length > 0) {
        // First login after email confirmation — create profile from signup metadata
        const meta = user.user_metadata
        await supabase.from('users').upsert({ id: user.id, ...meta })
        dbData = { id: user.id, ...meta }
      }
      onLoggedIn(user, dbData)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ── screens ───────────────────────────────────────────────────────────────

  if (screen === 'landing') {
    return wrapCard(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
          <img src="/logo.png" alt="Give Hour" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 24px rgba(24,160,80,0.3)', marginBottom: 24 }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: '0 0 10px', color: T.text }}>Give an Hour.<br />Change a Life.</h1>
          <p style={{ fontSize: 14, color: T.textSub, maxWidth: 280, lineHeight: 1.7, margin: '0 0 28px' }}>Find personalized volunteer opportunities, track your hours, and build your college application story.</p>
          <div style={{ display: 'flex', gap: 20, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 20px' }}>
            {[['2,400+', 'teens'], ['180+', 'orgs'], ['12,000+', 'hours']].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.primary }}>{val}</div>
                <div style={{ fontSize: 10, color: T.textMuted }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setScreen('userType')} style={{ background: T.primary, color: '#fff', padding: '15px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(24,160,80,0.3)' }}>Get started — it's free</button>
          <button onClick={() => setScreen('login')} style={{ background: '#fff', border: `2px solid ${T.primary}`, color: T.primary, padding: '15px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>I already have an account</button>
          <button onClick={onGuest} style={{ background: 'none', border: 'none', fontSize: 13, color: T.textMuted, cursor: 'pointer', padding: '4px 0' }}>Browse without signing up →</button>
        </div>
      </div>
    )
  }

  if (screen === 'userType') {
    const cards = [
      { emoji: '🎒', title: "I'm a teen",         sub: 'Find opportunities and track hours',       r: 'teen'   },
      { emoji: '🏢', title: "I'm an organization", sub: 'Post listings and manage volunteers',       r: 'org'    },
      { emoji: '🏡', title: "I'm a parent",        sub: "Help your teen discover volunteering",      r: 'parent' },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Join Give Hour', null, () => setScreen('landing'))}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>Who are you?</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>Choose your account type to get started.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cards.map(({ emoji, title, sub, r }) => (
              <button key={r} onClick={() => { setRole(r); setScreen('step1') }} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'row', gap: 14, cursor: 'pointer', textAlign: 'left', alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: T.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
                  <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{sub}</div>
                </div>
                <div style={{ color: T.textMuted, fontSize: 18 }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1 — shared: name / email / password ───────────────────────────────

  if (screen === 'step1') {
    const ready = name.trim() && email.trim() && password.trim()
    const nameLbl = role === 'org' ? 'Your name (contact person)' : 'First name'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Create account', 'Step 1 of 3 — Basic info', () => setScreen('userType'))}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 20 }}>
            {role === 'org' ? 'Your contact details' : role === 'parent' ? 'Create your account' : 'Tell us about you'}
          </div>
          {[[nameLbl, name, setName, 'text'], ['Email', email, setEmail, 'email'], ['Password', password, setPassword, 'password']].map(([lbl, val, set, type]) => (
            <div key={lbl} style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{lbl}</label>
              <input type={type} value={val} onChange={e => set(e.target.value)} style={inputStyle} />
            </div>
          ))}
          <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 20 }}>By continuing you agree to our Terms of Service and Privacy Policy.</p>
          {error && <p style={{ fontSize: 13, color: T.danger, marginBottom: 12 }}>{error}</p>}
          <button onClick={() => { setError(''); setScreen('step2') }} disabled={!ready} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: ready ? 'pointer' : 'default', background: ready ? T.primary : '#B8D8C8', color: '#fff' }}>Continue</button>
        </div>
      </div>
    )
  }

  // ── Step 2 — role-specific details ────────────────────────────────────────

  if (screen === 'step2') {

    // TEEN step 2
    if (role === 'teen') {
      const ready = grade && age
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card, overflowY: 'auto' }}>
          {topBar('Create account', 'Step 2 of 3 — About you', () => setScreen('step1'))}
          <div style={{ padding: '24px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>About you</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>This helps us find age-appropriate opportunities near you.</div>

            <label style={labelStyle}>Grade</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setGrade(g)} style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${grade === g ? T.primary : T.border}`, background: grade === g ? T.primary : '#fff', color: grade === g ? '#fff' : T.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{g}</button>
              ))}
            </div>

            <label style={labelStyle}>Age</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {AGES.map(a => (
                <button key={a} onClick={() => setAge(a)} style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${age === a ? T.primary : T.border}`, background: age === a ? T.primary : '#fff', color: age === a ? '#fff' : T.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{a}</button>
              ))}
            </div>

            <label style={labelStyle}>Your region <span style={{ fontWeight: 400, textTransform: 'none' }}>(helps match nearby opps)</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {US_REGIONS.map(r => (
                <button key={r} onClick={() => setRegion(prev => prev === r ? '' : r)} style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${region === r ? T.primary : T.border}`, background: region === r ? T.primaryLight : '#fff', color: region === r ? T.primary : T.text, fontSize: 13, fontWeight: region === r ? 600 : 400, cursor: 'pointer', textAlign: 'left' }}>{region === r ? '✓ ' : ''}{r}</button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Zip code <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input value={zip} onChange={e => setZip(e.target.value)} style={inputStyle} placeholder="e.g. 94102" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>School name <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input value={school} onChange={e => setSchool(e.target.value)} style={inputStyle} placeholder="e.g. Lincoln High School" />
            </div>
            <button onClick={() => setScreen('step3')} disabled={!ready} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: ready ? 'pointer' : 'default', background: ready ? T.primary : '#B8D8C8', color: '#fff' }}>Continue</button>
          </div>
        </div>
      )
    }

    // ORG step 2
    if (role === 'org') {
      const ready = orgName.trim() && orgType && orgCity.trim()
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card, overflowY: 'auto' }}>
          {topBar('Create account', 'Step 2 of 3 — Your organization', () => setScreen('step1'))}
          <div style={{ padding: '24px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Your organization</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>Tell teens who you are and where you operate.</div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Organization name</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} placeholder="e.g. Bay Area Food Bank" />
            </div>

            <label style={labelStyle}>Organization type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ORG_TYPES.map(t => (
                <button key={t} onClick={() => setOrgType(t)} style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${orgType === t ? T.primary : T.border}`, background: orgType === t ? T.primary : '#fff', color: orgType === t ? '#fff' : T.textSub, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>City / Location</label>
              <input value={orgCity} onChange={e => setOrgCity(e.target.value)} style={inputStyle} placeholder="e.g. San Francisco, CA" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Website <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} style={inputStyle} placeholder="e.g. https://yourorg.org" />
            </div>
            <button onClick={() => setScreen('step3')} disabled={!ready} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: ready ? 'pointer' : 'default', background: ready ? T.primary : '#B8D8C8', color: '#fff' }}>Continue</button>
          </div>
        </div>
      )
    }

    // PARENT step 2
    if (role === 'parent') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card, overflowY: 'auto' }}>
          {topBar('Create account', "Step 2 of 3 — Your child's info", () => setScreen('step1'))}
          <div style={{ padding: '24px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>About your teen</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>We'll use this to find age-appropriate opportunities. All optional.</div>

            <label style={labelStyle}>Child's grade</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setChildGrade(prev => prev === g ? '' : g)} style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${childGrade === g ? T.primary : T.border}`, background: childGrade === g ? T.primary : '#fff', color: childGrade === g ? '#fff' : T.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{g}</button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Child's school <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input value={childSchool} onChange={e => setChildSchool(e.target.value)} style={inputStyle} placeholder="e.g. Lincoln High School" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Zip code <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input value={parentZip} onChange={e => setParentZip(e.target.value)} style={inputStyle} placeholder="e.g. 94102" />
            </div>
            <button onClick={() => setScreen('step3')} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', background: T.primary, color: '#fff' }}>Continue</button>
          </div>
        </div>
      )
    }
  }

  // ── Step 3 — causes / interests ────────────────────────────────────────────

  if (screen === 'step3') {

    // TEEN step 3
    if (role === 'teen') {
      const toggle = (c) => setInterests(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
      const ready = interests.length >= 2
      const needed = 2 - interests.length
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
          {topBar('Create account', 'Step 3 of 3 — Your interests', () => setScreen('step2'))}
          <div style={{ padding: '24px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>What causes do you care about?</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 4 }}>Pick at least 2. We'll use this to personalize your feed.</div>
            {interests.length > 0 && <div style={{ fontSize: 12, color: T.primary, fontWeight: 600, marginBottom: 16 }}>⭐ {interests[0]} is your top cause</div>}
            {interests.length === 0 && <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Your first pick becomes your top cause.</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
              {CAUSES.map(c => {
                const sel = interests.includes(c)
                return (
                  <button key={c} onClick={() => toggle(c)} style={{ padding: '10px 16px', borderRadius: 24, border: sel ? `2px solid ${CAUSE[c].text}` : `1.5px solid ${T.border}`, background: sel ? CAUSE[c].bg : '#fff', color: sel ? CAUSE[c].text : T.textSub, fontSize: 13, cursor: 'pointer', fontWeight: sel ? 600 : 400 }}>
                    {sel ? '✓ ' : ''}{c}
                  </button>
                )
              })}
            </div>
            {error && <p style={{ fontSize: 13, color: T.danger, marginBottom: 12 }}>{error}</p>}
            <button onClick={finishTeen} disabled={!ready || loading} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: ready && !loading ? 'pointer' : 'default', background: ready ? T.primary : '#B8D8C8', color: '#fff' }}>
              {loading ? 'Creating account...' : ready ? 'Finish setup →' : `Pick ${needed} more`}
            </button>
          </div>
        </div>
      )
    }

    // ORG step 3
    if (role === 'org') {
      const toggle = (c) => setOrgCauses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
      const ready = orgCauses.length >= 1
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
          {topBar('Create account', 'Step 3 of 3 — Causes you support', () => setScreen('step2'))}
          <div style={{ padding: '24px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>What causes does your org support?</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>Pick at least 1. This helps teens find you.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
              {CAUSES.map(c => {
                const sel = orgCauses.includes(c)
                return (
                  <button key={c} onClick={() => toggle(c)} style={{ padding: '10px 16px', borderRadius: 24, border: sel ? `2px solid ${CAUSE[c].text}` : `1.5px solid ${T.border}`, background: sel ? CAUSE[c].bg : '#fff', color: sel ? CAUSE[c].text : T.textSub, fontSize: 13, cursor: 'pointer', fontWeight: sel ? 600 : 400 }}>
                    {sel ? '✓ ' : ''}{c}
                  </button>
                )
              })}
            </div>
            {error && <p style={{ fontSize: 13, color: T.danger, marginBottom: 12 }}>{error}</p>}
            <button onClick={finishOrg} disabled={!ready || loading} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: ready && !loading ? 'pointer' : 'default', background: ready ? T.primary : '#B8D8C8', color: '#fff' }}>
              {loading ? 'Creating account...' : 'Finish setup →'}
            </button>
          </div>
        </div>
      )
    }

    // PARENT step 3
    if (role === 'parent') {
      const toggle = (c) => setParentInterests(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
          {topBar('Create account', 'Step 3 of 3 — Interests', () => setScreen('step2'))}
          <div style={{ padding: '24px 20px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>What causes does your family care about?</div>
            <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>Optional — helps us suggest better opportunities for your teen.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
              {CAUSES.map(c => {
                const sel = parentInterests.includes(c)
                return (
                  <button key={c} onClick={() => toggle(c)} style={{ padding: '10px 16px', borderRadius: 24, border: sel ? `2px solid ${CAUSE[c].text}` : `1.5px solid ${T.border}`, background: sel ? CAUSE[c].bg : '#fff', color: sel ? CAUSE[c].text : T.textSub, fontSize: 13, cursor: 'pointer', fontWeight: sel ? 600 : 400 }}>
                    {sel ? '✓ ' : ''}{c}
                  </button>
                )
              })}
            </div>
            {error && <p style={{ fontSize: 13, color: T.danger, marginBottom: 12 }}>{error}</p>}
            <button onClick={finishParent} disabled={loading} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer', background: T.primary, color: '#fff' }}>
              {loading ? 'Creating account...' : 'Finish setup →'}
            </button>
          </div>
        </div>
      )
    }
  }

  // ── Confirm email ─────────────────────────────────────────────────────────

  if (screen === 'confirmEmail') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Check your email', null, null)}
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 10 }}>Almost there!</div>
          <div style={{ fontSize: 14, color: T.textSub, lineHeight: 1.7, maxWidth: 300, margin: '0 auto 28px' }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back here to log in.
          </div>
          <button onClick={() => setScreen('login')} style={{ background: T.primary, color: '#fff', padding: '12px 28px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Go to log in
          </button>
        </div>
      </div>
    )
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email address above first.'); return }
    setLoading(true); setError('')
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://givehour.vercel.app',
      })
      if (e) throw e
      setScreen('forgotSent')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (screen === 'forgotSent') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Check your email', null, () => setScreen('login'))}
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>Reset link sent!</div>
          <div style={{ fontSize: 14, color: T.textSub, lineHeight: 1.6, maxWidth: 280, margin: '0 auto 28px' }}>
            We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link to set a new password.
          </div>
          <button onClick={() => setScreen('login')} style={{ background: T.primary, color: '#fff', padding: '12px 28px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Back to log in
          </button>
        </div>
      </div>
    )
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  if (screen === 'login') {
    const ready = email.trim() && password.trim()
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Welcome back', null, () => setScreen('landing'))}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Log in</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>Good to see you again.</div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', fontSize: 13, color: T.primary, cursor: 'pointer' }}>{loading ? 'Sending...' : 'Forgot password?'}</button>
          </div>
          {error && <p style={{ fontSize: 13, color: T.danger, marginBottom: 12 }}>{error}</p>}
          <button onClick={handleLogin} disabled={!ready || loading} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: ready && !loading ? 'pointer' : 'default', background: ready ? T.primary : '#B8D8C8', color: '#fff' }}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
