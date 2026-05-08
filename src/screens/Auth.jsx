import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSES = ['Housing', 'Food Security', 'Education', 'Environment', 'Animals', 'Health', 'Arts', 'Seniors']
const GRADES = ['8th', '9th', '10th', '11th', '12th', 'College']

const inputStyle = {
  background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10,
  padding: '11px 14px', fontSize: 14, color: T.text, outline: 'none',
  width: '100%', fontFamily: 'inherit',
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

export default function Auth({ onLoggedIn, onGuest, isDesktop }) {
  const [screen, setScreen] = useState('landing')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // step fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [grade, setGrade] = useState('')
  const [zip, setZip] = useState('')
  const [school, setSchool] = useState('')
  const [interests, setInterests] = useState([])

  const wrapCard = (children) => isDesktop ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', background: T.bg }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: '100%', maxWidth: 440 }}>
        {children}
      </div>
    </div>
  ) : children

  const handleSignUp = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) throw signUpError
      const user = data.user
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id, name, email, grade, zip, school, role: 'teen', interests,
      })
      if (insertError) throw insertError
      const dbUser = { id: user.id, name, email, grade, zip, school, role: 'teen', interests }
      onLoggedIn(user, dbUser)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError
      const { data: dbData } = await supabase.from('users').select('*').eq('id', data.user.id).single()
      onLoggedIn(data.user, dbData)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (screen === 'landing') {
    return wrapCard(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100%', background: T.card }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #18A050, #0E7A3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 700, boxShadow: '0 8px 24px rgba(24,160,80,0.3)', marginBottom: 24 }}>GH</div>
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
      { emoji: '🎒', title: "I'm a teen", sub: 'Find opportunities and track hours' },
      { emoji: '🏢', title: "I'm an organization", sub: 'Post listings and manage volunteers' },
      { emoji: '🏡', title: "I'm a parent", sub: "Support your teen's volunteering" },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Join Give Hour', null, () => setScreen('landing'))}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>Who are you?</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>Choose your account type to get started.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cards.map(({ emoji, title, sub }) => (
              <button key={title} onClick={() => setScreen('step1')} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'row', gap: 14, cursor: 'pointer', textAlign: 'left', alignItems: 'center' }}>
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

  if (screen === 'step1') {
    const ready = name.trim() && email.trim() && password.trim()
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Create account', 'Step 1 of 3 — Basic info', () => setScreen('userType'))}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 20 }}>Tell us about you</div>
          {[['First name', name, setName, 'text'], ['Email', email, setEmail, 'email'], ['Password', password, setPassword, 'password']].map(([lbl, val, set, type]) => (
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

  if (screen === 'step2') {
    const ready = grade && zip.trim()
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Create account', 'Step 2 of 3 — School info', () => setScreen('step1'))}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>School info</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>Help us personalize your experience.</div>
          <label style={labelStyle}>Grade</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {GRADES.map(g => (
              <button key={g} onClick={() => setGrade(g)} style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${grade === g ? T.primary : T.border}`, background: grade === g ? T.primary : '#fff', color: grade === g ? '#fff' : T.textSub, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{g}</button>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Zip code</label>
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

  if (screen === 'step3') {
    const toggle = (c) => setInterests(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
    const ready = interests.length >= 2
    const needed = 2 - interests.length
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? 'auto' : '100%', background: isDesktop ? T.bg : T.card }}>
        {topBar('Create account', 'Step 3 of 3 — Your interests', () => setScreen('step2'))}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>What causes do you care about?</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>Pick at least 2. We'll use this to personalize your feed.</div>
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
          <button onClick={handleSignUp} disabled={!ready || loading} style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: ready && !loading ? 'pointer' : 'default', background: ready ? T.primary : '#B8D8C8', color: '#fff' }}>
            {loading ? 'Creating account...' : ready ? 'Finish setup →' : `Pick ${needed} more`}
          </button>
        </div>
      </div>
    )
  }

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
            <button style={{ background: 'none', border: 'none', fontSize: 13, color: T.primary, cursor: 'pointer' }}>Forgot password?</button>
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
