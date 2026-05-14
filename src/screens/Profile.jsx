import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSES       = ['Education', 'Environment', 'Animals', 'Food Security', 'Health', 'Housing', 'Arts', 'Seniors']
const US_REGIONS   = ['Bay Area, CA', 'Los Angeles, CA', 'San Diego, CA', 'New York, NY', 'Chicago, IL', 'Houston, TX', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Remote / Online']
const DAYS         = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS_OPTS   = ['1–3 hrs/week', '3–5 hrs/week', '5–10 hrs/week', '10+ hrs/week']
const GRADES       = ['8th', '9th', '10th', '11th', '12th']
const AGES         = [13, 14, 15, 16, 17, 18, 19]

const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
const lbl = { fontSize: 12, color: T.textMuted, marginBottom: 6, display: 'block' }

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>{subtitle}</div>}
        {children}
        <button onClick={onClose} style={{ width: '100%', padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: T.text, marginTop: 12 }}>Close</button>
      </div>
    </div>
  )
}

// ── Org Profile ───────────────────────────────────────────────────────────────

function OrgProfile({ user, onSignOut, onNavigate }) {
  const [loading, setLoading]         = useState(true)
  const [listingCount, setListingCount] = useState(0)
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)

  const [nameVal, setNameVal]             = useState(user?.name || '')
  const [city, setCity]                   = useState(user?.region || '')
  const [orgType, setOrgType]             = useState(user?.org_type || '')
  const [website, setWebsite]             = useState(user?.website || '')
  const [causes, setCauses]               = useState(user?.interests || [])
  const [contactName, setContactName]     = useState(user?.contact_name || '')
  const [contactPhone, setContactPhone]   = useState(user?.contact_phone || '')
  const [contactEmail, setContactEmail]   = useState('')
  const [is501c3, setIs501c3]             = useState(user?.is_501c3 ?? null)
  const [description, setDescription]     = useState(user?.description || '')
  const [logoUrl, setLogoUrl]             = useState(user?.logo_url || '')
  const [logoIconUrl, setLogoIconUrl]     = useState(user?.logo_icon_url || '')

  const [showEditOrg, setShowEditOrg] = useState(false)
  const [showCauses, setShowCauses]   = useState(false)
  const [editName, setEditName]       = useState(nameVal)
  const [editCity, setEditCity]       = useState(city)
  const [editOrgType, setEditOrgType] = useState(orgType)
  const [editWebsite, setEditWebsite] = useState(website)
  const [editContactName, setEditContactName]   = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editIs501c3, setEditIs501c3]           = useState(null)
  const [editDescription, setEditDescription]   = useState('')
  const [editLogoUrl, setEditLogoUrl]           = useState('')
  const [editLogoIconUrl, setEditLogoIconUrl]   = useState('')

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user?.id).maybeSingle()
        if (profile) {
          setNameVal(profile.name || '')
          setEditName(profile.name || '')
          setCity(profile.region || '')
          setEditCity(profile.region || '')
          setOrgType(profile.org_type || '')
          setEditOrgType(profile.org_type || '')
          setWebsite(profile.website || '')
          setEditWebsite(profile.website || '')
          setCauses(profile.interests || [])
          setContactName(profile.contact_name || '')
          setEditContactName(profile.contact_name || '')
          setContactPhone(profile.contact_phone || '')
          setEditContactPhone(profile.contact_phone || '')
          setIs501c3(profile.is_501c3 ?? null)
          setEditIs501c3(profile.is_501c3 ?? null)
          setDescription(profile.description || '')
          setEditDescription(profile.description || '')
          setLogoUrl(profile.logo_url || '')
          setEditLogoUrl(profile.logo_url || '')
          setLogoIconUrl(profile.logo_icon_url || '')
          setEditLogoIconUrl(profile.logo_icon_url || '')
        }
        const { data: { session } } = await supabase.auth.getSession()
        setContactEmail(session?.user?.email || '')
        const { count } = await supabase.from('org_listings').select('id', { count: 'exact', head: true }).eq('org_id', user?.id)
        setListingCount(count || 0)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [user])

  const save = (fields) => supabase.from('users').update(fields).eq('id', user.id)

  const saveOrgInfo = async () => {
    await save({ name: editName.trim(), region: editCity.trim(), org_type: editOrgType || null, website: editWebsite.trim() || null, contact_name: editContactName.trim() || null, contact_phone: editContactPhone.trim() || null, is_501c3: editIs501c3, description: editDescription.trim() || null, logo_url: editLogoUrl.trim() || null, logo_icon_url: editLogoIconUrl.trim() || null })
    setNameVal(editName.trim())
    setCity(editCity.trim())
    setOrgType(editOrgType)
    setWebsite(editWebsite.trim())
    setContactName(editContactName.trim())
    setContactPhone(editContactPhone.trim())
    setIs501c3(editIs501c3)
    setDescription(editDescription.trim())
    setLogoUrl(editLogoUrl.trim())
    setLogoIconUrl(editLogoIconUrl.trim())
    setShowEditOrg(false)
  }

  const toggleCause = async (c) => {
    const next = causes.includes(c) ? causes.filter(x => x !== c) : [...causes, c]
    await save({ interests: next, preferred_cause: next[0] || null })
    setCauses(next)
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); onSignOut() }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  const ORG_TYPES = ['Nonprofit', 'School / University', 'Government', 'Faith-based', 'Community group', 'Other']

  const profileCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: logoUrl ? '#fff' : T.accentLight, border: logoUrl ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, overflow: 'hidden' }}>
          {logoUrl
            ? <img src={logoUrl} alt={nameVal || 'Logo'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6, boxSizing: 'border-box' }} onError={e => { e.currentTarget.style.display = 'none' }} />
            : '🏢'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{nameVal || 'Your Organization'}</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>
            {orgType || ''}{orgType && city ? ' · ' : ''}{city || (!orgType ? 'Location not set' : '')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: T.accent, fontWeight: 700 }}>{listingCount} listing{listingCount !== 1 ? 's' : ''} posted</span>
            {is501c3 === true && <span style={{ fontSize: 10, fontWeight: 700, background: '#E8F5E9', color: '#2E7D32', borderRadius: 20, padding: '2px 8px', letterSpacing: '0.03em' }}>501(c)(3)</span>}
          </div>
        </div>
        <button onClick={() => { setEditName(nameVal); setEditCity(city); setEditOrgType(orgType); setEditWebsite(website); setEditContactName(contactName); setEditContactPhone(contactPhone); setEditIs501c3(is501c3); setEditDescription(description); setEditLogoUrl(logoUrl); setEditLogoIconUrl(logoIconUrl); setShowEditOrg(true) }} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.bg, border: `1px solid ${T.border}`, color: T.textSub, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}>Edit</button>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {contactName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text }}>
            <span style={{ fontSize: 15 }}>👤</span>
            <span style={{ fontWeight: 500 }}>{contactName}</span>
            <span style={{ color: T.textMuted, fontSize: 11 }}>contact person</span>
          </div>
        )}
        {contactEmail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text }}>
            <span style={{ fontSize: 15 }}>✉️</span>
            <span>{contactEmail}</span>
          </div>
        )}
        {contactPhone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text }}>
            <span style={{ fontSize: 15 }}>📞</span>
            <span>{contactPhone}</span>
          </div>
        )}
        {website && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ fontSize: 15 }}>🔗</span>
            <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" style={{ color: T.primary, textDecoration: 'none', fontWeight: 500 }}>{website.replace(/^https?:\/\//, '')}</a>
          </div>
        )}
        {!contactName && !contactPhone && !website && (
          <div style={{ fontSize: 12, color: T.textMuted }}>No contact info added. Tap Edit to fill this in.</div>
        )}
      </div>
    </div>
  )

  const aboutCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>About your organization</div>
        <button onClick={() => { setEditName(nameVal); setEditCity(city); setEditOrgType(orgType); setEditWebsite(website); setEditContactName(contactName); setEditContactPhone(contactPhone); setEditIs501c3(is501c3); setEditDescription(description); setEditLogoUrl(logoUrl); setEditLogoIconUrl(logoIconUrl); setShowEditOrg(true) }} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.accentLight, color: T.accent, border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
      </div>
      {description ? (
        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{description}</div>
      ) : (
        <div style={{ fontSize: 13, color: T.textMuted }}>No description yet. Tell teens about your mission so they know what you're about.</div>
      )}
      {(logoUrl || logoIconUrl) && (
        <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
          {logoUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={logoUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4, boxSizing: 'border-box' }} onError={e => { e.currentTarget.style.display = 'none' }} />
              </div>
              <span style={{ fontSize: 11, color: T.textMuted }}>Main logo</span>
            </div>
          )}
          {logoIconUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: '#fff', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={logoIconUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
              </div>
              <span style={{ fontSize: 11, color: T.textMuted }}>Listing icon</span>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const listingsCard = onNavigate && (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Your listings</div>
        <span style={{ fontSize: 11, color: T.textMuted }}>{listingCount} posted</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onNavigate('orgDashboard')} style={{ flex: 1, minWidth: 130, background: T.primaryLight, color: T.primary, border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Manage listings →</button>
        <button onClick={() => onNavigate('orgPost')} style={{ flex: 1, minWidth: 130, background: T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(24,160,80,0.2)' }}>+ Post new</button>
      </div>
    </div>
  )

  const causesCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Causes you support</div>
        <button onClick={() => setShowCauses(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.accentLight, color: T.accent, border: 'none', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
      </div>
      {causes.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>No causes added yet. Helps teens find you.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {causes.map(c => {
            const style = CAUSE[c] || { bg: T.primaryLight, text: T.primary }
            return <span key={c} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: style.bg, color: style.text, fontWeight: 500 }}>{c}</span>
          })}
        </div>
      )}
    </div>
  )

  const settingsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={handleSignOut} style={{ width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#fff', border: 'none', textAlign: 'left' }}>
        <span style={{ fontSize: 14, color: T.danger, fontWeight: 500 }}>Sign out</span>
      </button>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', flexShrink: 0, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Organization Profile</div>
      </div>
      <div style={{ padding: isDesktop ? '32px 40px' : '20px' }}>
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>{profileCard}{aboutCard}{causesCard}</div>
            <div>{listingsCard}{settingsCard}</div>
          </div>
        ) : (
          <>{profileCard}{listingsCard}{aboutCard}{causesCard}{settingsCard}</>
        )}
      </div>

      {showEditOrg && (
        <Modal title="Edit organization info" onClose={() => setShowEditOrg(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Organization name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Bay Area Food Bank" style={inp} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Organization type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ORG_TYPES.map(t => (
                <button key={t} onClick={() => setEditOrgType(prev => prev === t ? '' : t)} style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${editOrgType === t ? T.accent : T.border}`, background: editOrgType === t ? T.accentLight : '#fff', color: editOrgType === t ? T.accent : T.textSub, fontSize: 12, fontWeight: editOrgType === t ? 700 : 400, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>501(c)(3) nonprofit status <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(({ label, val }) => (
                <button key={label} onClick={() => setEditIs501c3(prev => prev === val ? null : val)} style={{ flex: 1, padding: '8px 0', borderRadius: 20, border: `1.5px solid ${editIs501c3 === val ? T.accent : T.border}`, background: editIs501c3 === val ? T.accentLight : '#fff', color: editIs501c3 === val ? T.accent : T.textSub, fontSize: 13, fontWeight: editIs501c3 === val ? 700 : 400, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>City / Location</label>
            <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="San Francisco, CA" style={inp} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Website <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="yourorg.org" style={inp} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Main logo URL <span style={{ fontWeight: 400 }}>(shown on your profile, optional)</span></label>
            <input value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} placeholder="https://yourorg.org/logo.png" style={inp} />
            {editLogoUrl && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={editLogoUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4, boxSizing: 'border-box' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
                <span style={{ fontSize: 11, color: T.textMuted }}>Profile preview</span>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Icon URL <span style={{ fontWeight: 400 }}>(small square logo for listing cards, optional)</span></label>
            <input value={editLogoIconUrl} onChange={e => setEditLogoIconUrl(e.target.value)} placeholder="https://yourorg.org/apple-touch-icon.png" style={inp} />
            {editLogoIconUrl && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: '#fff', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={editLogoIconUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                </div>
                <span style={{ fontSize: 11, color: T.textMuted }}>Listing card preview</span>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>About your organization <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Tell teens about your mission, what you do, and how they can get involved." rows={5} style={{ ...inp, resize: 'vertical', minHeight: 100, lineHeight: 1.5 }} />
          </div>
          <div style={{ height: 1, background: T.border, margin: '4px 0 14px' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Contact info</div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Contact person name</label>
            <input value={editContactName} onChange={e => setEditContactName(e.target.value)} placeholder="Jane Smith" style={inp} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Contact email <span style={{ fontWeight: 400 }}>(your login email, not editable here)</span></label>
            <input value={contactEmail} disabled style={{ ...inp, background: T.bg, color: T.textMuted, cursor: 'default' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Contact phone <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input type="tel" value={editContactPhone} onChange={e => setEditContactPhone(e.target.value)} placeholder="(415) 555-0100" style={inp} />
          </div>
          <button onClick={saveOrgInfo} disabled={!editName.trim()} style={{ width: '100%', padding: 12, background: editName.trim() ? T.primary : T.border, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: editName.trim() ? '#fff' : T.textMuted, cursor: editName.trim() ? 'pointer' : 'default' }}>Save</button>
        </Modal>
      )}

      {showCauses && (
        <Modal title="Causes you support" subtitle="Pick all that apply. Helps teens find you." onClose={() => setShowCauses(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            {CAUSES.map(c => {
              const sel = causes.includes(c)
              const style = CAUSE[c] || { bg: T.primaryLight, text: T.primary }
              return (
                <button key={c} onClick={() => toggleCause(c)} style={{ padding: '12px 10px', borderRadius: 12, border: `2px solid ${sel ? style.text : T.border}`, background: sel ? style.bg : '#fff', color: sel ? style.text : T.textSub, fontSize: 13, fontWeight: sel ? 700 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {sel && '✓ '}{c}
                </button>
              )
            })}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Teen Profile ──────────────────────────────────────────────────────────────

export default function Profile({ user, onSignOut, onNavigate }) {
  if (user?.role === 'org') return <OrgProfile user={user} onSignOut={onSignOut} onNavigate={onNavigate} />

  const [totalHours, setTotalHours]   = useState(0)
  const [orgCount, setOrgCount]       = useState(0)
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
  const [loading, setLoading]         = useState(true)
  const [interests, setInterests]     = useState(user?.interests || [])
  const [prefCause, setPrefCause]     = useState(user?.preferred_cause || '')
  const [region, setRegion]           = useState(user?.region || '')

  const [schoolName, setSchoolName]   = useState(user?.school_name || '')
  const [grade, setGrade]             = useState(user?.grade || '')
  const [age, setAge]                 = useState(user?.age || '')

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal]         = useState(user?.name || '')

  const [avatarUrl, setAvatarUrl]     = useState(user?.avatar_url || '')
  const [avatarLoading, setAvatarLoading] = useState(false)

  const [availDays, setAvailDays]     = useState(user?.availability_days || [])
  const [hoursPerWeek, setHoursPerWeek] = useState(user?.hours_per_week || '')

  const [notifMatches, setNotifMatches]     = useState(user?.notif_new_matches ?? true)
  const [notifReminders, setNotifReminders] = useState(user?.notif_reminders ?? true)

  const [parentName, setParentName]     = useState(user?.parent_name || '')
  const [parentEmail, setParentEmail]   = useState(user?.parent_email || '')
  const [parentPhone, setParentPhone]   = useState(user?.parent_phone || '')
  const [parentConsent, setParentConsent] = useState(user?.parent_consent || false)
  const [editParentName, setEditParentName]   = useState('')
  const [editParentEmail, setEditParentEmail] = useState('')
  const [editParentPhone, setEditParentPhone] = useState('')
  const [editParentConsent, setEditParentConsent] = useState(false)

  const [showCause, setShowCause]           = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showRegion, setShowRegion]         = useState(false)
  const [showSchool, setShowSchool]         = useState(false)
  const [showAvail, setShowAvail]           = useState(false)
  const [showNotif, setShowNotif]           = useState(false)
  const [showParent, setShowParent]         = useState(false)

  const [applications, setApplications] = useState([])
  const [savedListings, setSavedListings] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user?.id).maybeSingle()
        if (profile) {
          setNameVal(profile.name || '')
          setInterests(profile.interests || [])
          setPrefCause(profile.preferred_cause || '')
          setRegion(profile.region || '')
          setSchoolName(profile.school_name || '')
          setGrade(profile.grade || '')
          setAge(profile.age || '')
          setAvailDays(profile.availability_days || [])
          setHoursPerWeek(profile.hours_per_week || '')
          setNotifMatches(profile.notif_new_matches ?? true)
          setNotifReminders(profile.notif_reminders ?? true)
          setAvatarUrl(profile.avatar_url || '')
          setParentName(profile.parent_name || '')
          setParentEmail(profile.parent_email || '')
          setParentPhone(profile.parent_phone || '')
          setParentConsent(profile.parent_consent || false)
        }

        const { data: hours } = await supabase.from('hours_log').select('hours, org').eq('user_id', user?.id)
        if (hours) {
          setTotalHours(Math.round(hours.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0)))
          setOrgCount(new Set(hours.map(r => r.org)).size)
        }

        const { data: apps } = await supabase
          .from('applications')
          .select('*, org_listings(title)')
          .eq('teen_id', user?.id)
          .order('submitted_at', { ascending: false })
        setApplications(apps || [])

        setSavedLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const res = await fetch('/api/saved-listings', { headers: { Authorization: `Bearer ${session.access_token}` } })
          if (res.ok) setSavedListings(await res.json())
        }
        setSavedLoading(false)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [user])

  const save = async (fields) => {
    await supabase.from('users').update(fields).eq('id', user.id)
  }

  const saveCause = async (cause) => {
    const newInterests = interests.includes(cause) ? interests : [...interests, cause]
    await save({ preferred_cause: cause, interests: newInterests })
    setPrefCause(cause)
    setInterests(newInterests)
    setShowCause(false)
  }

  const removeInterest = async (interest) => {
    const newInterests = interests.filter(i => i !== interest)
    await save({ interests: newInterests, ...(prefCause === interest ? { preferred_cause: null } : {}) })
    setInterests(newInterests)
    if (prefCause === interest) setPrefCause('')
  }

  const saveRegion = async (r) => {
    await save({ region: r })
    setRegion(r)
    setShowRegion(false)
  }

  const saveSchool = async () => {
    await save({ school_name: schoolName, grade, age: age ? parseInt(age) : null })
    setShowSchool(false)
  }

  const saveName = async () => {
    await save({ name: nameVal })
    setShowEditProfile(false)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      console.error('Avatar upload error:', error)
      alert(`Upload failed: ${error.message}`)
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await save({ avatar_url: data.publicUrl })
      setAvatarUrl(data.publicUrl)
    }
    setAvatarLoading(false)
  }

  const toggleDay = (day) => {
    setAvailDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const saveAvail = async () => {
    await save({ availability_days: availDays, hours_per_week: hoursPerWeek })
    setShowAvail(false)
  }

  const saveNotif = async () => {
    await save({ notif_new_matches: notifMatches, notif_reminders: notifReminders })
    setShowNotif(false)
  }

  const saveParent = async () => {
    await save({ parent_name: editParentName.trim() || null, parent_email: editParentEmail.trim() || null, parent_phone: editParentPhone.trim() || null, parent_consent: editParentConsent })
    setParentName(editParentName.trim())
    setParentEmail(editParentEmail.trim())
    setParentPhone(editParentPhone.trim())
    setParentConsent(editParentConsent)
    setShowParent(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onSignOut()
  }

  const profileCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
        <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
          <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.primaryLight, color: T.primary, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(24,160,80,0.3)', overflow: 'hidden' }}>
            {avatarLoading ? <span style={{ fontSize: 12 }}>...</span>
              : avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (nameVal || user?.name || 'U')[0].toUpperCase()}
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', border: '1.5px solid #fff' }}>✎</div>
        </label>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{nameVal || user?.name || 'Teen'}</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>
            {age ? `Age ${age}` : ''}{age && (grade || user?.grade) ? ' · ' : ''}{grade || user?.grade || ''}{(age || grade) && (region || user?.zip) ? ' · ' : ''}{region || user?.zip || ''}
          </div>
          <div style={{ fontSize: 12, color: T.primary, fontWeight: 700, marginTop: 2 }}>{totalHours} hours · {orgCount} orgs helped</div>
        </div>
        <button onClick={() => setShowEditProfile(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.bg, border: `1px solid ${T.border}`, color: T.textSub, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}>Edit</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Region</div>
          <div style={{ fontSize: 13, color: region ? T.text : T.textMuted }}>{region || 'Not set (affects your matches)'}</div>
        </div>
        <button onClick={() => setShowRegion(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.primaryLight, color: T.primary, border: 'none', cursor: 'pointer', fontWeight: 600 }}>{region ? 'Change' : 'Set'}</button>
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
          return (
            <span key={interest} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: c.bg, color: c.text, fontWeight: 500, border: interest === prefCause ? `1.5px solid ${c.text}` : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {interest === prefCause && '⭐'}{interest}
              <span onClick={() => removeInterest(interest)} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>
            </span>
          )
        })}
        <button onClick={() => setShowCause(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.bg, border: `1.5px dashed rgba(24,160,80,0.6)`, color: T.primary, cursor: 'pointer', fontWeight: 500 }}>+ Add</button>
      </div>
    </div>
  )

  const settingsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {[
        { label: 'Notification settings', action: () => setShowNotif(true) },
        { label: 'Availability', action: () => setShowAvail(true) },
        { label: 'School information', action: () => setShowSchool(true) },
        { label: 'Parent / Guardian info', action: () => { setEditParentName(parentName); setEditParentEmail(parentEmail); setEditParentPhone(parentPhone); setEditParentConsent(parentConsent); setShowParent(true) } },
        { label: 'Sign out', color: T.danger, action: handleSignOut },
      ].map(({ label, color, action }, i, arr) => (
        <button key={label} onClick={action} style={{ width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#fff', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none', textAlign: 'left' }}>
          <span style={{ fontSize: 14, color: color || T.text, fontWeight: label === 'Sign out' ? 500 : 400 }}>{label}</span>
          {label !== 'Sign out' && <span style={{ color: T.textMuted, fontSize: 18 }}>›</span>}
        </button>
      ))}
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', flexShrink: 0, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <img src="/logo.png" alt="Give Hour" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
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

        {applications.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>My Applications</div>
            {applications.map(a => {
              const statusColor = a.status === 'accepted' ? T.primary : a.status === 'declined' ? T.danger : T.textMuted
              return (
                <div key={a.id} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{a.org_listings?.title}</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
                    {new Date(a.submitted_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: statusColor, marginTop: 4, textTransform: 'capitalize' }}>{a.status}</div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 24, paddingBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>🔖 Saved Listings</div>
          {savedLoading ? (
            <div style={{ fontSize: 13, color: T.textMuted }}>Loading…</div>
          ) : savedListings.length === 0 ? (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: T.textMuted }}>No saved listings yet. Tap 🔖 Save on any opportunity.</div>
            </div>
          ) : (
            savedListings.map(l => {
              const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
              return (
                <div key={l.id} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>{l.org}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>{l.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500 }}>{l.cause}</span>
                    {l.location && <span style={{ fontSize: 11, color: T.textMuted }}>· {l.location}</span>}
                    {l.hours && <span style={{ fontSize: 11, color: T.textMuted }}>· {l.hours}</span>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showCause && (
        <Modal title="Pick a cause" subtitle="Your top pick boosts those listings in your feed" onClose={() => setShowCause(false)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
            {CAUSES.map(cause => {
              const c = CAUSE[cause] || { bg: T.primaryLight, text: T.primary }
              return (
                <button key={cause} onClick={() => saveCause(cause)} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 20, background: prefCause === cause ? c.text : c.bg, color: prefCause === cause ? '#fff' : c.text, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {prefCause === cause ? '⭐ ' : ''}{cause}
                </button>
              )
            })}
          </div>
        </Modal>
      )}

      {showRegion && (
        <Modal title="Your region" subtitle="Used to surface nearby opportunities in your feed" onClose={() => setShowRegion(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            {US_REGIONS.map(r => (
              <button key={r} onClick={() => saveRegion(r)} style={{ padding: '12px 16px', borderRadius: 10, background: region === r ? T.primaryLight : T.bg, color: region === r ? T.primary : T.text, border: `1px solid ${region === r ? T.primary : T.border}`, cursor: 'pointer', fontSize: 13, fontWeight: region === r ? 600 : 400, textAlign: 'left' }}>
                {region === r ? '✓ ' : ''}{r}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {showEditProfile && (
        <Modal title="Edit profile" onClose={() => setShowEditProfile(false)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Name</div>
            <input value={nameVal} onChange={e => setNameVal(e.target.value)} placeholder="Your name" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <button onClick={saveName} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Save</button>
        </Modal>
      )}

      {showSchool && (
        <Modal title="School information" onClose={() => setShowSchool(false)}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>School name</div>
            <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Mission High School" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Grade</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setGrade(g)} style={{ padding: '8px 16px', borderRadius: 20, background: grade === g ? T.primary : T.bg, color: grade === g ? '#fff' : T.text, border: `1px solid ${grade === g ? T.primary : T.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Age</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AGES.map(a => (
                <button key={a} onClick={() => setAge(a)} style={{ padding: '8px 16px', borderRadius: 20, background: age === a ? T.primary : T.bg, color: age === a ? '#fff' : T.text, border: `1px solid ${age === a ? T.primary : T.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{a}</button>
              ))}
            </div>
          </div>
          <button onClick={saveSchool} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Save</button>
        </Modal>
      )}

      {showAvail && (
        <Modal title="Your availability" subtitle="Helps us recommend opportunities that fit your schedule" onClose={() => setShowAvail(false)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>Days available</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DAYS.map(day => {
                const on = availDays.includes(day)
                return (
                  <button key={day} onClick={() => toggleDay(day)} style={{ padding: '7px 14px', borderRadius: 20, background: on ? T.primaryLight : T.bg, color: on ? T.primary : T.text, border: `1.5px solid ${on ? T.primary : T.border}`, cursor: 'pointer', fontSize: 12, fontWeight: on ? 600 : 400 }}>{day.slice(0, 3)}</button>
                )
              })}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>Hours per week</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HOURS_OPTS.map(h => (
                <button key={h} onClick={() => setHoursPerWeek(h)} style={{ padding: '10px 14px', borderRadius: 8, background: hoursPerWeek === h ? T.primaryLight : T.bg, color: hoursPerWeek === h ? T.primary : T.text, border: `1px solid ${hoursPerWeek === h ? T.primary : T.border}`, cursor: 'pointer', fontSize: 13, fontWeight: hoursPerWeek === h ? 600 : 400, textAlign: 'left' }}>{hoursPerWeek === h ? '✓ ' : ''}{h}</button>
              ))}
            </div>
          </div>
          <button onClick={saveAvail} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Save</button>
        </Modal>
      )}

      {showNotif && (
        <Modal title="Notification settings" onClose={() => setShowNotif(false)}>
          {[
            { label: 'New match alerts', sub: 'When new listings match your profile', val: notifMatches, set: setNotifMatches },
            { label: 'Reminders', sub: 'Nudges to log hours after an opportunity', val: notifReminders, set: setNotifReminders },
          ].map(({ label, sub, val, set }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{sub}</div>
              </div>
              <div onClick={() => set(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, background: val ? T.primary : '#ccc', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: val ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
            </div>
          ))}
          <button onClick={saveNotif} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', marginTop: 16 }}>Save</button>
        </Modal>
      )}

      {showParent && (
        <Modal title="Parent / Guardian info" subtitle="Shared with orgs when you apply to volunteer" onClose={() => setShowParent(false)}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Parent / Guardian name</div>
            <input value={editParentName} onChange={e => setEditParentName(e.target.value)} placeholder="Jane Smith" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Parent email</div>
            <input type="email" value={editParentEmail} onChange={e => setEditParentEmail(e.target.value)} placeholder="parent@email.com" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Parent phone</div>
            <input type="tel" value={editParentPhone} onChange={e => setEditParentPhone(e.target.value)} placeholder="(415) 555-0100" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={editParentConsent} onChange={e => setEditParentConsent(e.target.checked)} style={{ marginTop: 2, accentColor: T.primary, width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: T.textSub, lineHeight: 1.5 }}>My parent or guardian consents to me volunteering through Give Hour.</span>
          </label>
          <button onClick={saveParent} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Save</button>
        </Modal>
      )}
    </div>
  )
}
