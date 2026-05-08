import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function Profile({ user, onSignOut }) {
  const [totalHours, setTotalHours] = useState(0)
  const [orgCount, setOrgCount] = useState(0)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [loading, setLoading] = useState(true)

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
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onSignOut()
  }

  const initial = (user?.name || 'U')[0].toUpperCase()

  const profileCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 14, display: 'flex', flexDirection: 'row', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', alignItems: 'center' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.primaryLight, color: T.primary, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(24,160,80,0.3)', flexShrink: 0 }}>{initial}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{user?.name || 'Teen'}</div>
        <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{user?.grade || ''}{user?.grade && user?.zip ? ' · ' : ''}{user?.zip || 'Bay Area, CA'}</div>
        <div style={{ fontSize: 12, color: T.primary, fontWeight: 700, marginTop: 2 }}>{totalHours} hours · {orgCount} orgs helped</div>
      </div>
    </div>
  )

  const interestsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>My interests</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(user?.interests || []).map(interest => {
          const c = CAUSE[interest] || { bg: T.primaryLight, text: T.primary }
          return <span key={interest} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: c.bg, color: c.text, fontWeight: 500 }}>{interest}</span>
        })}
        <button style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.bg, border: `1.5px dashed rgba(24,160,80,0.6)`, color: T.primary, cursor: 'pointer', fontWeight: 500 }}>+ Add</button>
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
    </div>
  )
}
