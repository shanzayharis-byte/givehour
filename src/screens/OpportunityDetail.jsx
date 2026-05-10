import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function OpportunityDetail({ opp, user, onBack, isGuest, onSignUp }) {
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [shared, setShared]     = useState(false)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function check() {
      if (!user?.id || !opp?.id) return
      try {
        const { data } = await supabase.from('saved_opportunities').select('id').eq('user_id', user.id).eq('listing_id', String(opp.id)).maybeSingle()
        setSaved(!!data)
      } catch (e) { console.error(e) }
    }
    check()
  }, [user, opp])

  const handleSave = async () => {
    setLoading(true)
    try {
      if (saved) {
        await supabase.from('saved_opportunities').delete().eq('user_id', user.id).eq('listing_id', String(opp.id))
        setSaved(false)
      } else {
        await supabase.from('saved_opportunities').insert({ user_id: user.id, listing_id: String(opp.id) })
        setSaved(true)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleShare = async () => {
    const url  = opp.externalUrl || opp.external_url || window.location.href
    const text = `Check out this volunteer opportunity: ${opp.title} at ${opp.org}`
    if (navigator.share) {
      try { await navigator.share({ title: opp.title, text, url }) } catch (e) {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleApply = () => {
    const url = opp.externalUrl || opp.external_url
    if (url) window.open(url, '_blank', 'noopener')
  }

  const cause       = CAUSE[opp.cause] || { bg: '#F2F2F2', text: '#666' }
  const matchScore  = opp.score ?? null
  const externalUrl = opp.externalUrl || opp.external_url
  const skills      = opp.skills?.length > 0 ? opp.skills : null

  const infoItems = [
    opp.date     && ['📅', 'DATE', opp.date],
    opp.hours    && ['⏱', 'DURATION', opp.hours],
    opp.location && ['📍', 'LOCATION', opp.location],
    opp.remote   && ['💻', 'FORMAT', 'Remote / Online'],
  ].filter(Boolean)

  const infoGrid = infoItems.length > 0 && (
    <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4,1fr)' : 'repeat(2,1fr)', gap: 10, margin: '20px 0' }}>
      {infoItems.map(([icon, label, val]) => (
        <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{val}</div>
        </div>
      ))}
    </div>
  )

  const aboutCard = opp.description && (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>About this opportunity</div>
      <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.7 }}>{opp.description}</div>
    </div>
  )

  const skillsCard = skills && (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>Skills you'll build</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {skills.map(s => (
          <span key={s} style={{ background: T.primaryLight, color: '#0A6830', fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 500 }}>{s}</span>
        ))}
      </div>
    </div>
  )

  const applyButton = isGuest ? (
    <div style={{ background: T.primaryLight, border: `1.5px solid rgba(24,160,80,0.3)`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Sign up to apply</div>
      <div style={{ fontSize: 12, color: T.textSub, marginBottom: 12 }}>Create a free account to track your applications.</div>
      <button onClick={onSignUp} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Create free account</button>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={handleApply} disabled={!externalUrl} style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: externalUrl ? T.primary : '#B8D8C8', color: '#fff', fontSize: 15, fontWeight: 700, cursor: externalUrl ? 'pointer' : 'default' }}>
        Apply on {opp.org ? `${opp.org}'s website` : 'website'} →
      </button>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSave} disabled={loading} style={{ flex: 1, padding: 13, borderRadius: 12, border: `2px solid ${saved ? T.primary : T.border}`, background: saved ? T.primaryLight : '#fff', color: saved ? T.primary : T.textSub, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {saved ? '✓ Saved' : '🔖 Save'}
        </button>
        <button onClick={handleShare} style={{ flex: 1, padding: 13, borderRadius: 12, border: `2px solid ${T.border}`, background: '#fff', color: T.textSub, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {shared ? '✓ Copied!' : '↗ Share'}
        </button>
      </div>
    </div>
  )

  const sidePanel = (
    <div style={{ position: 'sticky', top: 24, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, alignSelf: 'start' }}>
      {matchScore !== null && (
        <span style={{ fontSize: 11, background: matchScore >= 85 ? T.primaryLight : '#F2F2F2', color: matchScore >= 85 ? T.primary : T.textMuted, borderRadius: 20, padding: '3px 8px', fontWeight: 600 }}>
          {matchScore}% match for you
        </span>
      )}
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: '10px 0 4px' }}>{opp.title}</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>{opp.org}{opp.date ? ` · ${opp.date}` : ''}</div>
      {applyButton}
    </div>
  )

  const header = (
    <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: isDesktop ? '14px 40px' : '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '5px 11px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer' }}>←</button>
      <div style={{ fontSize: 17, fontWeight: 600, color: T.text, flex: 1 }}>{opp.org}</div>
      {!isGuest && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={loading} style={{ background: saved ? T.primaryLight : T.bg, border: `1px solid ${saved ? T.primary : T.border}`, color: saved ? T.primary : T.textSub, borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saved ? '✓ Saved' : '🔖 Save'}
          </button>
          <button onClick={handleShare} style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textSub, borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {shared ? '✓ Copied!' : '↗ Share'}
          </button>
        </div>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
        {header}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, padding: '32px 40px' }}>
          <div>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500, display: 'inline-block', marginBottom: 8 }}>{opp.cause}</span>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: '8px 0' }}>{opp.title}</h1>
            {infoGrid}
            {aboutCard}
            {skillsCard}
          </div>
          {sidePanel}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      {header}
      <div style={{ padding: 20 }}>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500, display: 'inline-block', marginBottom: 8 }}>{opp.cause}</span>
        {matchScore !== null && <span style={{ marginLeft: 8, fontSize: 11, background: matchScore >= 85 ? T.primaryLight : '#F2F2F2', color: matchScore >= 85 ? T.primary : T.textMuted, borderRadius: 20, padding: '3px 8px', fontWeight: 600 }}>{matchScore}% match</span>}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: '8px 0' }}>{opp.title}</h1>
        {infoGrid}
        {aboutCard}
        {skillsCard}
        {applyButton}
      </div>
    </div>
  )
}
