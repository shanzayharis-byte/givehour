import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSES = ['Education', 'Environment', 'Animals', 'Food Security', 'Health', 'Housing', 'Arts', 'Seniors']
const US_REGIONS = ['Bay Area, CA', 'Los Angeles, CA', 'San Diego, CA', 'New York, NY', 'Chicago, IL', 'Houston, TX', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Remote / Online']

export default function Profile({ user, onSignOut }) {
  const [totalHours, setTotalHours]   = useState(0)
  const [orgCount, setOrgCount]       = useState(0)
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
  const [loading, setLoading]         = useState(true)
  const [interests, setInterests]     = useState(user?.interests || [])
  const [prefCause, setPrefCause]     = useState(user?.preferred_cause || '')
  const [region, setRegion]           = useState(user?.region || '')
  const [showCausePicker, setShowCausePicker] = useState(false)
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('hours_log').select('hours, org').eq('user_id', user?.id)
        if (data) {
          setTotalHours(data.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0))
          setOrgCount(new Set(data.map(r => r.org)).size)
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [user])

  const saveCause = async (cause) => {
    setSaving(true)
    const newInterests = interests.includes(cause) ? interests : [...interests, cause]
    await supabase.from('users').update({ preferred_cause: cause, interests: newInterests }).eq('id', user.id)
    setPrefCause(cause)
    setInterests(newInterests)
    setShowCausePicker(false)
    setSaving(false)
  }

  const removeInterest = async (interest) => {
    const newInterests = interests.filter(i => i !== interest)
    await supabase.from('users').update({ interests: newInterests }).eq('id', user.id)
    setInterests(newInterests)
    if (prefCause === interest) {
      await supabase.from('users').update({ preferred_cause: null }).eq('id', user.id)
      setPrefCause('')
    }
  }

  const saveRegion = async (r) => {
    setSaving(true)
    await supabase.from('users').update({ region: r }).eq('id', user.id)
    setRegion(r)
    setShowRegionPicker(false)
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onSignOut()
  }

  const initial = (user?.name || 'U')[0].toUpperCase()

  const profileCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.primaryLight, color: T.primary, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(24,160,80,0.3)', flexShrink: 0 }}>{initial}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{user?.name || 'Teen'}</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{user?.grade || ''}{user?.grade && user?.zip ? ' · ' : ''}{user?.zip || 'Bay Area, CA'}</div>
          <div style={{ fontSize: 12, color: T.primary, fontWeight: 700, marginTop: 2 }}>{totalHours} hours · {orgCount} orgs helped</div>
        </div>
      </div>

      {/* region */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Region</div>
          <div style={{ fontSize: 13, color: region ? T.text : T.textMuted }}>{region || 'Not set — affects your matches'}</div>
        </div>
        <button onClick={() => setShowRegionPicker(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.primaryLight, color: T.primary, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {region ? 'Change' : 'Set'}
        </button>
      </div>
    </div>
  )

  const interestsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>My interests</div>
        {prefCause && <span style={{ fontSize: 11, color: T.textMuted }}>⭐ {prefCause} is your top match</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {interests.map(interest => {
          const c = CAUSE[interest] || { bg: T.primaryLight, text: T.primary }
          const isTop = interest === prefCause
          return (
            <span key={interest} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: c.bg, color: c.text, fontWeight: 500, border: isTop ? `1.5px solid ${c.text}` : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isTop && '⭐'}{interest}
              <span onClick={() => removeInterest(interest)} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>
            </span>
          )
        })}
        <button onClick={() => setShowCausePicker(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.bg, border: `1.5px dashed rgba(24,160,80,0.6)`, color: T.primary, cursor: 'pointer', fontWeight: 500 }}>+ Add</button>
      </div>
    </div>
  )

  const settingsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {[
        { label: 'Notification settings', color: T.text, arrow: true },
        { label: 'Availability', color: T.text, arrow: true },
        { label: 'School information', color: T.text, arrow: true },
        { label: 'Sign out', color: T.danger, arrow: false, action: handleSignOut },
      ].map(({ label, color, arrow, action }, i, arr) => (
        <button key={label} onClick={action} style={{ width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#fff', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none', textAlign: 'left' }}>
          <span style={{ fontSize: 14, color, fontWeight: label === 'Sign out' ? 500 : 400 }}>{label}</span>
          {arrow && <span style={{ color: T.textMuted, fontSize: 18 }}>›</span>}
        </button>
      ))}
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Profile</div>
      </div>
      <div style={{ padding: isDesktop ? '32px 40px' : '20px' }}>
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>{profileCard}{interestsCard}</div>
            <div>{settingsCard}</div>
          </div>
        ) : (
          <>{profileCard}{interestsCard}{settingsCard}</>
        )}
      </div>

      {/* cause picker modal */}
      {showCausePicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>Pick a cause</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Your top pick boosts those listings in your feed</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {CAUSES.map(cause => {
                const c    = CAUSE[cause] || { bg: T.primaryLight, text: T.primary }
                const isTop = cause === prefCause
                return (
                  <button key={cause} onClick={() => saveCause(cause)} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 20, background: isTop ? c.text : c.bg, color: isTop ? '#fff' : c.text, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {isTop ? '⭐ ' : ''}{cause}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setShowCausePicker(false)} style={{ width: '100%', padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: T.text }}>Cancel</button>
          </div>
        </div>
      )}

      {/* region picker modal */}
      {showRegionPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>Your region</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Used to surface nearby opportunities in your feed</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {US_REGIONS.map(r => (
                <button key={r} onClick={() => saveRegion(r)} style={{ padding: '12px 16px', borderRadius: 10, background: region === r ? T.primaryLight : T.bg, color: region === r ? T.primary : T.text, border: `1px solid ${region === r ? T.primary : T.border}`, cursor: 'pointer', fontSize: 13, fontWeight: region === r ? 600 : 400, textAlign: 'left' }}>
                  {region === r ? '✓ ' : ''}{r}
                </button>
              ))}
            </div>
            <button onClick={() => setShowRegionPicker(false)} style={{ width: '100%', padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: T.text }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
