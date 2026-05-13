import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSE_EMOJI = { Education: '📚', Environment: '🌿', Animals: '🐾', 'Food Security': '🍎', Health: '❤️', Housing: '🏠', Arts: '🎨', Seniors: '🤝' }

export default function OpportunityDetail({ opp, user, onBack, isGuest, onSignUp, onSelectOrg, onEdit }) {
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
  const causeEmoji  = CAUSE_EMOJI[opp.cause] || '✨'
  const matchScore  = opp.score ?? null
  const externalUrl = opp.externalUrl || opp.external_url
  const skills      = opp.skills?.length > 0 ? opp.skills : null
  const orgLogo     = opp.org_logo_icon_url || opp.org_logo_url || null

  const factChips = [
    opp.date     && ['📅', opp.date],
    opp.hours    && ['⏱', `${opp.hours}${typeof opp.hours === 'number' || /^\d+$/.test(String(opp.hours)) ? ' hours' : ''}`],
    opp.location && !opp.remote && ['📍', opp.location],
    opp.remote   && ['💻', 'Remote / Online'],
  ].filter(Boolean)

  const orgPill = opp.org && (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.85)', border: `1px solid ${T.border}`, borderRadius: 24, padding: '4px 12px 4px 4px', maxWidth: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {orgLogo
          ? <img src={orgLogo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
          : <span style={{ fontSize: 12, fontWeight: 800, color: cause.text }}>{(opp.org || '?').slice(0, 1).toUpperCase()}</span>
        }
      </div>
      {opp.org_id && onSelectOrg ? (
        <button onClick={() => onSelectOrg(opp.org_id, opp.org)}
          style={{ background: 'none', border: 'none', padding: 0, color: T.text, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
          {opp.org}
        </button>
      ) : (
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{opp.org}</span>
      )}
      {opp.source === 'org' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>✓ Give Hour Partner</span>}
    </div>
  )

  const hero = (
    <div style={{ background: `linear-gradient(160deg, ${cause.bg} 0%, #FFFFFF 100%)`, padding: isDesktop ? '32px 40px 36px' : '24px 20px 28px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -30, fontSize: 200, opacity: 0.06, pointerEvents: 'none', userSelect: 'none' }}>{causeEmoji}</div>

      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        {orgPill}
        {matchScore !== null && (
          <span style={{ fontSize: 11, background: matchScore >= 85 ? T.primaryLight : 'rgba(255,255,255,0.85)', color: matchScore >= 85 ? T.primary : T.textSub, border: `1px solid ${matchScore >= 85 ? T.primary : T.border}`, borderRadius: 20, padding: '4px 10px', fontWeight: 700 }}>
            ⭐ {matchScore}% match
          </span>
        )}
      </div>

      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, background: cause.bg, color: cause.text, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, marginBottom: 12, border: `1px solid ${cause.text}22` }}>
        <span>{causeEmoji}</span>
        <span>{opp.cause || 'Volunteer'}</span>
      </div>

      <h1 style={{ position: 'relative', fontSize: isDesktop ? 32 : 26, fontWeight: 800, color: T.text, margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>{opp.title}</h1>

      {factChips.length > 0 && (
        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {factChips.map(([icon, val]) => (
            <span key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.85)', border: `1px solid ${T.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 13, color: T.text, fontWeight: 500 }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              {val}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  const aboutCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>About this opportunity</div>
      <div style={{ fontSize: 15, color: T.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {opp.description || <span style={{ color: T.textMuted, fontStyle: 'italic' }}>The organization hasn't added a description yet. Reach out to learn more.</span>}
      </div>
    </div>
  )

  const skillsCard = skills && (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Skills you'll build</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {skills.map(s => (
          <span key={s} style={{ background: T.primaryLight, color: T.primaryDark, fontSize: 13, padding: '6px 12px', borderRadius: 20, fontWeight: 600 }}>{s}</span>
        ))}
      </div>
    </div>
  )

  const isOrgUser = user?.role === 'org'
  const isOwner   = isOrgUser && opp.org_id && user?.id === opp.org_id

  const applyButton = isOrgUser ? null : isGuest ? (
    <div style={{ background: T.primaryLight, borderRadius: 14, padding: 18, textAlign: 'center', border: `1px solid ${T.primary}33` }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>Sign up to apply</div>
      <button onClick={onSignUp} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%', boxShadow: '0 4px 14px rgba(24,160,80,0.25)' }}>Create account</button>
    </div>
  ) : externalUrl ? (
    <button onClick={handleApply}
      style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: T.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(24,160,80,0.3)' }}>
      Apply on {opp.org ? `${opp.org}'s website` : 'website'} →
    </button>
  ) : opp.org_id ? (
    applyStep === 'done' ? (
      <div style={{ background: T.primaryLight, borderRadius: 14, padding: 20, textAlign: 'center', border: `1px solid ${T.primary}33` }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
        <div style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>Application sent!</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>The org will be in touch. Check "My Applications" in your Profile.</div>
      </div>
    ) : applyStep === 'form' || applyStep === 'sending' ? (
      <div style={{ background: T.card, borderRadius: 14, padding: 18, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>Why do you want to help? <span style={{ fontWeight: 400, color: T.textMuted }}>(optional)</span></div>
        <textarea value={appMessage} onChange={e => setAppMessage(e.target.value)}
          placeholder="Tell them a bit about yourself..."
          rows={4}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: T.bg, resize: 'none', marginBottom: 12, lineHeight: 1.5 }} />
        <button onClick={handleApplyLocal} disabled={applyStep === 'sending'}
          style={{ width: '100%', padding: 14, background: applyStep === 'sending' ? '#B8D8C8' : T.primary, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: applyStep === 'sending' ? 'default' : 'pointer' }}>
          {applyStep === 'sending' ? 'Sending…' : 'Send Application'}
        </button>
      </div>
    ) : (
      <button onClick={() => setApplyStep('form')}
        style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: T.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(24,160,80,0.3)' }}>
        Apply on Give Hour
      </button>
    )
  ) : null

  const topBar = (
    <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: isDesktop ? '12px 40px' : '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '6px 12px', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer' }}>←</button>
        {isGuest && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff', padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', flexShrink: 0 }}>
              <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Give Hour</span>
          </div>
        )}
      </div>
      {!isGuest && (
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner && onEdit && (
            <button onClick={() => onEdit(opp)} style={{ background: T.primary, border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(24,160,80,0.25)' }}>
              ✏️ Edit listing
            </button>
          )}
          {!isOrgUser && (
            <button onClick={handleSave} disabled={loading} style={{ background: saved ? T.primaryLight : T.bg, border: `1px solid ${saved ? T.primary : T.border}`, color: saved ? T.primary : T.textSub, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saved ? '✓ Saved' : '🔖 Save'}
            </button>
          )}
          <button onClick={handleShare} style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textSub, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {shared ? '✓ Copied!' : '↗ Share'}
          </button>
        </div>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
        {topBar}
        {hero}
        <div style={{ display: 'grid', gridTemplateColumns: applyButton ? '1fr 360px' : '1fr', gap: 28, padding: '24px 40px 40px', maxWidth: applyButton ? 'none' : 880, margin: applyButton ? 0 : '0 auto' }}>
          <div>
            {aboutCard}
            {skillsCard}
          </div>
          {applyButton && (
            <div style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
              {applyButton}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      {topBar}
      {hero}
      <div style={{ padding: 20 }}>
        {aboutCard}
        {skillsCard}
        {applyButton}
      </div>
    </div>
  )
}
