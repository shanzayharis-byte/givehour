import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function OpportunityDetail({ opp, user, onBack, isGuest, onSignUp }) {
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function check() {
      if (!user?.id || !opp?.id) return
      try {
        const { data } = await supabase.from('registrations').select('id').eq('user_id', user.id).eq('opportunity_id', opp.id).maybeSingle()
        setRegistered(!!data)
      } catch (e) {
        console.error(e)
      }
    }
    check()
  }, [user, opp])

  const handleRegister = async () => {
    setLoading(true)
    try {
      if (registered) {
        await supabase.from('registrations').delete().eq('user_id', user.id).eq('opportunity_id', opp.id)
        setRegistered(false)
      } else {
        await supabase.from('registrations').insert({ user_id: user.id, opportunity_id: opp.id })
        setRegistered(true)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const cause = CAUSE[opp.cause] || { bg: '#F2F2F2', text: '#666' }

  const infoGrid = (
    <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4,1fr)' : 'repeat(2,1fr)', gap: 10, margin: '20px 0' }}>
      {[['📅', 'DATE', opp.date], ['⏱', 'DURATION', opp.hours], ['📍', 'LOCATION', opp.location], ['👥', 'SPOTS LEFT', `${opp.spots_remaining ?? '?'} of ${opp.spots_total ?? '?'}`]].map(([icon, label, val]) => (
        <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{val}</div>
        </div>
      ))}
    </div>
  )

  const aboutCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>About this opportunity</div>
      <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.7 }}>{opp.description}</div>
    </div>
  )

  const skillsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>Skills you'll build</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(opp.skills || []).map(s => (
          <span key={s} style={{ background: T.primaryLight, color: '#0A6830', fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 500 }}>{s}</span>
        ))}
      </div>
    </div>
  )

  const registerButton = isGuest ? (
    <div style={{ background: T.primaryLight, border: `1.5px solid rgba(24,160,80,0.3)`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Sign up to register</div>
      <div style={{ fontSize: 12, color: T.textSub, marginBottom: 12 }}>Create a free account to save your spot.</div>
      <button onClick={onSignUp} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Create free account</button>
    </div>
  ) : (
    <button onClick={handleRegister} disabled={loading} style={{ width: '100%', padding: 16, borderRadius: 12, border: registered ? `2px solid ${T.primary}` : 'none', background: registered ? T.primaryLight : T.primary, color: registered ? T.primary : '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
      {loading ? '...' : registered ? '✓ Registered!' : 'Register Now'}
    </button>
  )

  if (isDesktop) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 40px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '5px 11px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{opp.org}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, padding: '32px 40px' }}>
          <div>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500, display: 'inline-block', marginBottom: 8 }}>{opp.cause}</span>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: '8px 0' }}>{opp.title}</h1>
            {infoGrid}
            {aboutCard}
            {skillsCard}
          </div>
          <div style={{ position: 'sticky', top: 24, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, alignSelf: 'start' }}>
            <span style={{ fontSize: 11, background: T.primaryLight, color: T.primary, borderRadius: 20, padding: '3px 8px', fontWeight: 600 }}>94% match for you</span>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: '10px 0 4px' }}>{opp.title}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>{opp.org} · {opp.date}</div>
            {registerButton}
            {!isGuest && <button style={{ width: '100%', marginTop: 10, padding: '14px', borderRadius: 12, border: `2px solid ${T.primary}`, background: '#fff', color: T.primary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Save for later</button>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '5px 11px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{opp.org}</div>
      </div>
      <div style={{ padding: 20 }}>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500, display: 'inline-block', marginBottom: 8 }}>{opp.cause}</span>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: '8px 0' }}>{opp.title}</h1>
        <span style={{ fontSize: 11, background: T.primaryLight, color: T.primary, borderRadius: 20, padding: '3px 8px', fontWeight: 600 }}>94% match for you</span>
        {infoGrid}
        {aboutCard}
        {skillsCard}
        {registerButton}
      </div>
    </div>
  )
}
