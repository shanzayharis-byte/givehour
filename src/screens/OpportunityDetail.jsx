import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function OpportunityDetail({ opp, user, onBack, isGuest, onSignUp, onSelectOrg }) {
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [shared, setShared]     = useState(false)
  const [applyStep, setApplyStep]   = useState('idle') // 'idle' | 'form' | 'sending' | 'done'
  const [appMessage, setAppMessage] = useState('')

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

  const handleApplyLocal = async () => {
    if (!user?.id) return
    setApplyStep('sending')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          org_listing_id: opp.id,
          org_id:         opp.org_id,
          message:        appMessage,
          teen_name:      user.name,
        }),
      })
      if (!res.ok) throw new Error('failed')
      setApplyStep('done')
    } catch (_) {
      setApplyStep('form')
    }
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
    <div style={{ background: T.primaryLight, borderRadius: 14, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Sign up to apply</div>
      <button onClick={onSignUp} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Create account</button>
    </div>
  ) : externalUrl ? (
    <button onClick={handleApply}
      style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
      Apply on {opp.org ? `${opp.org}'s website` : 'website'} →
    </button>
  ) : opp.org_id ? (
    applyStep === 'done' ? (
      <div style={{ background: T.primaryLight, borderRadius: 14, padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 6 }}>✅</div>
        <div style={{ fontWeight: 700, color: T.text }}>Application sent!</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>The org will be in touch. Check "My Applications" in your Profile.</div>
      </div>
    ) : applyStep === 'form' || applyStep === 'sending' ? (
      <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>Why do you want to help? (optional)</div>
        <textarea value={appMessage} onChange={e => setAppMessage(e.target.value)}
          placeholder="Tell them a bit about yourself..."
          rows={3}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: T.bg, resize: 'none', marginBottom: 12 }} />
        <button onClick={handleApplyLocal} disabled={applyStep === 'sending'}
          style={{ width: '100%', padding: 14, background: applyStep === 'sending' ? '#B8D8C8' : T.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: applyStep === 'sending' ? 'default' : 'pointer' }}>
          {applyStep === 'sending' ? 'Sending...' : 'Send Application'}
        </button>
      </div>
    ) : (
      <button onClick={() => setApplyStep('form')}
        style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
        Apply on Give Hour
      </button>
    )
  ) : null

  const sidePanel = (
    <div style={{ position: 'sticky', top: 24, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, alignSelf: 'start' }}>
      {matchScore !== null && (
        <span style={{ fontSize: 11, background: matchScore >= 85 ? T.primaryLight : '#F2F2F2', color: matchScore >= 85 ? T.primary : T.textMuted, borderRadius: 20, padding: '3px 8px', fontWeight: 600 }}>
          {matchScore}% match for you
        </span>
      )}
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: '10px 0 4px' }}>{opp.title}</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>
        {opp.org && (
          opp.org_id && onSelectOrg
            ? <button onClick={() => onSelectOrg(opp.org_id, opp.org)}
                style={{ background: 'none', border: 'none', padding: 0, color: T.primary, fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}>
                {opp.org}
              </button>
            : <span>{opp.org}</span>
        )}
        {opp.source === 'org' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 6 }}>✓ Give Hour Partner</span>}
        {opp.date ? ` · ${opp.date}` : ''}
      </div>
      {applyButton}
    </div>
  )

  const header = (
    <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: isDesktop ? '14px 40px' : '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '5px 11px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer' }}>←</button>
      <div style={{ fontSize: 17, fontWeight: 600, color: T.text, flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
        {opp.org && (
          opp.org_id && onSelectOrg
            ? <button onClick={() => onSelectOrg(opp.org_id, opp.org)}
                style={{ background: 'none', border: 'none', padding: 0, color: T.primary, fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}>
                {opp.org}
              </button>
            : <span>{opp.org}</span>
        )}
        {opp.source === 'org' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 700, whiteSpace: 'nowrap' }}>✓ Give Hour Partner</span>}
      </div>
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
