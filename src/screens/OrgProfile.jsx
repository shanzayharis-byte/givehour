import { useState, useEffect } from 'react'
import { T, CAUSE } from '../lib/theme'

const AVATAR_PALETTE = [
  { bg: '#E6F4EA', fg: '#0E7A3C' },
  { bg: '#FEF0E7', fg: '#C45A1F' },
  { bg: '#E8EFFC', fg: '#3458C3' },
  { bg: '#FCE8F1', fg: '#B23170' },
  { bg: '#F1E8FB', fg: '#6E3FB3' },
  { bg: '#FFF4D9', fg: '#9C7400' },
  { bg: '#E0F2F1', fg: '#0B7A75' },
  { bg: '#FBE9E7', fg: '#B23A3A' },
  { bg: '#E9F0E0', fg: '#5C7A2A' },
  { bg: '#EAEAF4', fg: '#4A4A8A' },
  { bg: '#FDEEDE', fg: '#A65A1F' },
  { bg: '#E2F0E8', fg: '#2D6A4F' },
]

function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function normalizeUrl(url) {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function displayUrl(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

export default function OrgProfile({ orgId, orgName, onBack, onSelectOpp, isGuest, onLogin, onSignUp }) {
  const [org, setOrg]           = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function load() {
      try {
        if (orgId) {
          const [orgRes, listRes] = await Promise.all([
            fetch(`/api/orgs?id=${orgId}`).then(r => r.json()),
            fetch(`/api/org-directory?org=__&org_id=${orgId}`).then(r => r.json()),
          ])
          setOrg(orgRes || null)
          setListings(Array.isArray(listRes) ? listRes : [])
        } else {
          const listRes = await fetch(`/api/org-directory?org=${encodeURIComponent(orgName || '')}`).then(r => r.json())
          setListings(Array.isArray(listRes) ? listRes : [])
        }
      } catch (e) {
        console.error(e)
        setError('Failed to load org profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId, orgName])

  const name = org?.name || orgName || 'Organization'
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  const c = avatarColor(name)
  const causeCount = new Set(listings.map(l => l.cause).filter(Boolean)).size

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg }}>
      {/* sticky back bar */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onBack}
          style={{ background: T.primaryLight, color: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>←</button>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.textSub, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Organization
        </div>
        {isGuest && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onLogin} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>Log in</button>
            <button onClick={onSignUp} style={{ background: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Sign up</button>
          </div>
        )}
      </div>

      {/* scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted }}>Loading…</div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ color: T.danger, marginBottom: 12 }}>{error}</div>
            <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>Go back</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* hero */}
            <div style={{ background: `linear-gradient(160deg, ${T.primaryLight} 0%, #FFFFFF 100%)`, padding: '28px 24px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, ${T.primary}1A 1px, transparent 1px)`, backgroundSize: '28px 28px', opacity: 0.35 }} />

              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '50%', background: org?.logo_url ? '#fff' : c.bg, color: c.fg, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14, boxShadow: '0 6px 20px rgba(0,0,0,0.08)', overflow: 'hidden', border: `1px solid ${T.border}` }}>
                {org?.logo_url
                  ? <img src={org.logo_url} alt={name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, boxSizing: 'border-box' }} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.textContent = initials; e.currentTarget.parentElement.style.background = c.bg }} />
                  : initials}
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, margin: '0 0 10px', color: T.text, position: 'relative', letterSpacing: '-0.02em' }}>{name}</h1>

              {orgId && org && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: T.primary, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, position: 'relative', border: `1px solid ${T.primary}33` }}>
                  ✓ Give Hour Partner
                </div>
              )}

              {(org?.region || org?.org_type) && (
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 12, position: 'relative' }}>
                  {org?.region && <span style={{ fontSize: 12, color: T.text, background: '#fff', border: `1px solid ${T.border}`, padding: '4px 10px', borderRadius: 20 }}>📍 {org.region}</span>}
                  {org?.org_type && <span style={{ fontSize: 12, color: T.text, background: '#fff', border: `1px solid ${T.border}`, padding: '4px 10px', borderRadius: 20 }}>{org.org_type}</span>}
                  {org?.is_501c3 === true && <span style={{ fontSize: 12, color: T.text, background: '#fff', border: `1px solid ${T.border}`, padding: '4px 10px', borderRadius: 20 }}>501(c)(3)</span>}
                </div>
              )}
            </div>

            {/* stats */}
            <div style={{ display: 'flex', background: T.card, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '14px 6px', borderRight: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.primary }}>{listings.length}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{listings.length === 1 ? 'opportunity' : 'opportunities'}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '14px 6px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.primary }}>{causeCount}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{causeCount === 1 ? 'cause' : 'causes'}</div>
              </div>
            </div>

            {/* body */}
            <div style={{ padding: 20 }}>
              {org?.description && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>About</div>
                  <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{org.description}</div>
                </div>
              )}

              {org?.interests?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Causes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {org.interests.map(cause => {
                      const s = CAUSE[cause] || { bg: T.primaryLight, text: T.primary }
                      return (
                        <span key={cause} style={{ background: s.bg, color: s.text, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20 }}>{cause}</span>
                      )
                    })}
                  </div>
                </div>
              )}

              {org?.website && (
                <a href={normalizeUrl(org.website)} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20, textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Website</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUrl(org.website)}</div>
                  </div>
                  <span style={{ color: T.primary, fontSize: 18, fontWeight: 600, flexShrink: 0 }}>↗</span>
                </a>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Opportunities ({listings.length})</div>

              {listings.length === 0 && (
                <div style={{ background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14, padding: 32, textAlign: 'center', color: T.textMuted, fontSize: 14 }}>No active listings yet</div>
              )}

              {listings.map(l => {
                const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
                return (
                  <button key={l.id}
                    onClick={() => onSelectOpp({ ...l, org: name, org_id: l.org_id || orgId, externalUrl: l.external_url, source: l.source || 'org', org_logo_icon_url: org?.logo_icon_url || null, org_logo_url: org?.logo_url || null })}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                    style={{ width: '100%', textAlign: 'left', background: T.card, borderRadius: 14, padding: 16, marginBottom: 10, border: `1px solid ${T.border}`, cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s', fontFamily: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, flex: 1, lineHeight: 1.35 }}>{l.title}</div>
                      <span style={{ background: cause.bg, color: cause.text, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>{l.cause}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, fontSize: 12, color: T.textMuted }}>
                      {l.remote ? <span>💻 Remote</span> : l.location && <span>📍 {l.location}</span>}
                      <span>📅 {l.date || 'Flexible'}</span>
                      {l.hours && <span>⏱ {l.hours}h</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
