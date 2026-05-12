import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'
import FilterModal from '../components/FilterModal'

// ---------- constants ----------
const CAUSES = ['Education','Environment','Animals','Food Security','Health','Housing','Arts','Seniors']
const CAUSE_EMOJI = { Education:'📚', Environment:'🌿', Animals:'🐾', 'Food Security':'🍎', Health:'❤️', Housing:'🏠', Arts:'🎨', Seniors:'🤝' }

const CA_PROVINCES = new Set(['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon','BC','AB','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'])

function isUS(item) {
  if (item.remote_or_online) return true  // remote listings are open to anyone
  const countries = item.audience?.countries || []
  if (countries.length && countries.every(c => !/united states|usa/i.test(c))) return false
  const regions = item.audience?.regions || []
  if (regions.some(r => CA_PROVINCES.has(r))) return false
  return true
}

function deriveCause(activities = []) {
  const all = activities.map(a => (a.name||'').toLowerCase() + ' ' + (a.category||'').toLowerCase()).join(' ')
  if (/animal|wildlife|pet|spca|humane/.test(all))                          return 'Animals'
  if (/food|hunger|meal|nutrition|pantry|harvest|farm/.test(all))            return 'Food Security'
  if (/hous|shelter|homeless|habitat/.test(all))                             return 'Housing'
  if (/senior|elder|aged|retirement/.test(all))                              return 'Seniors'
  if (/environ|nature|trail|plant|garden|ecology|conserv|climate/.test(all)) return 'Environment'
  if (/health|medical|cancer|mental|hospital|clinic|nurse/.test(all))        return 'Health'
  if (/art|music|theatre|theater|craft|creative|writing|design/.test(all))   return 'Arts'
  return 'Education'
}

function deriveAgeGroup(description='', title='', extra='') {
  const text = (description + ' ' + title + ' ' + extra).toLowerCase()
  if (/must be 18|18\s*\+|adults only|at least 18|over 18|18 years or older/.test(text)) return '18+ Only'
  if (/must be 1[4-6]|1[4-6]\s*\+|at least 1[4-6]|over 1[4-6]/.test(text)) return 'Teens (13-17)'
  if (/\bteen\b|teenager|high school|middle school|ages?\s+1[3-7]|youth.*1[3-7]|student volunteer|for youth/.test(text)) return 'Teens (13-17)'
  if (/all ages|family.{0,20}friendly|open to all|any age|everyone welcome|no minimum age|open to everyone|anyone can volunteer/.test(text)) return 'All Ages'
  return 'Open'
}

function deriveLocation(item) {
  if (item.remote_or_online) return 'Remote / Online'
  return item.audience?.regions?.[0] || 'In-Person'
}

function mapOpp(item) {
  const acts = item.activities || []
  return {
    id: item.id, title: item.title,
    org: item.organization?.name || '',
    cause: deriveCause(acts),
    ageGroup: deriveAgeGroup(item.description, item.title, acts.map(a=>a.name).join(' ')),
    hours: item.duration || '', location: deriveLocation(item),
    date: item.dates || '', description: item.description || '',
    externalUrl: item.url || '', remote: !!item.remote_or_online,
  }
}

// ---------- org directory card ----------
// 12-color palette — gives every org a stable, distinctive color from its name
const AVATAR_PALETTE = [
  { bg: '#E6F4EA', fg: '#0E7A3C' }, // green
  { bg: '#FEF0E7', fg: '#C45A1F' }, // orange
  { bg: '#E8EFFC', fg: '#3458C3' }, // blue
  { bg: '#FCE8F1', fg: '#B23170' }, // pink
  { bg: '#F1E8FB', fg: '#6E3FB3' }, // purple
  { bg: '#FFF4D9', fg: '#9C7400' }, // gold
  { bg: '#E0F2F1', fg: '#0B7A75' }, // teal
  { bg: '#FBE9E7', fg: '#B23A3A' }, // red
  { bg: '#E9F0E0', fg: '#5C7A2A' }, // olive
  { bg: '#EAEAF4', fg: '#4A4A8A' }, // indigo
  { bg: '#FDEEDE', fg: '#A65A1F' }, // amber
  { bg: '#E2F0E8', fg: '#2D6A4F' }, // forest
]

function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function OrgDirCard({ org, onSelect, alternate }) {
  const initials = (org.org || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  const c = avatarColor(org.org || '')
  const bg = alternate ? '#F9FAFC' : T.card
  const logo = org.logo_icon_url || org.logo_url || null
  const visibleCauses = (org.causes || []).slice(0, 3)
  const extraCauses = Math.max(0, (org.causes || []).length - visibleCauses.length)
  return (
    <div
      onClick={() => onSelect(org)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      style={{ background: bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: logo ? '#fff' : c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0, letterSpacing: '-0.02em', overflow: 'hidden', border: logo ? `1px solid ${T.border}` : 'none' }}>
          {logo
            ? <img src={logo} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4, boxSizing: 'border-box' }} onError={e => { e.currentTarget.style.display = 'none' }} />
            : initials}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {org.isGiveHour && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 700, whiteSpace: 'nowrap' }}>✓ Give Hour Partner</span>}
          {org.is_501c3 === true && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#FFF8E0', color: '#8A6000', fontWeight: 700, whiteSpace: 'nowrap' }}>501(c)(3)</span>}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{org.org}</div>
        {(org.region || org.org_type) && (
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3, lineHeight: 1.4 }}>
            {org.region && <>📍 {org.region}</>}
            {org.region && org.org_type ? ' · ' : ''}
            {org.org_type}
          </div>
        )}
      </div>

      {org.description && (
        <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {org.description}
        </div>
      )}

      {visibleCauses.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {visibleCauses.map(cause => {
            const s = CAUSE[cause] || { bg: T.primaryLight, text: T.primary }
            return <span key={cause} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: s.bg, color: s.text, fontWeight: 600 }}>{cause}</span>
          })}
          {extraCauses > 0 && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: T.bg, color: T.textMuted, fontWeight: 600 }}>+{extraCauses}</span>}
        </div>
      )}

      <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: T.bg, fontSize: 11, fontWeight: 600, color: T.textSub }}>
        {org.count} listing{org.count !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

const AGE_LABEL = { 'All Ages': 'All Ages', 'Teens (13-17)': 'Teenager', 'Open': 'No age specific' }

// ---------- opp card ----------
function OppCard({ opp, onSelect, alternate }) {
  const cause = CAUSE[opp.cause] || { bg: '#F2F2F2', text: '#666' }
  const ageLabel = AGE_LABEL[opp.ageGroup]
  const bg = alternate ? '#F9FAFC' : T.card
  return (
    <div
      onClick={() => onSelect(opp)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = opp.source === 'org' ? T.primary : T.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      style={{ background: bg, border: `1px solid ${opp.source === 'org' ? T.primary : T.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          {opp.org_logo_icon_url && (
            <img src={opp.org_logo_icon_url} alt="" referrerPolicy="no-referrer"
              style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: '#fff', border: `1px solid ${T.border}` }}
              onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
          <div style={{ fontSize: 12, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.org}</div>
        </div>
        {opp.source === 'org' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>✓ Give Hour Partner</span>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{opp.title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500 }}>{opp.cause}</span>
        {ageLabel && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#F0F4FF', color: '#4A6FA5', fontWeight: 500 }}>{ageLabel}</span>}
        {opp.remote && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 500 }}>Remote</span>}
        {opp.hours && <span style={{ fontSize: 12, color: T.textMuted }}>· {opp.hours}</span>}
        {opp.location && !opp.remote && <span style={{ fontSize: 12, color: T.textMuted }}>· {opp.location}</span>}
      </div>
      {opp.date && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>{opp.date}</div>}
    </div>
  )
}

// ---------- main ----------
export default function Explore({ user, onSelectOpp, onSelectOrg, isGuest, onSignUp, onLogin, onHome, onSignOut }) {
  const [tab, setTab]                 = useState('opportunities')
  const [opps, setOpps]               = useState([])
  const [page, setPage]               = useState(1)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')
  const [showFilter, setShowFilter]   = useState(false)
  const [filters, setFilters]         = useState({ cause: '', ageGroup: '', remote: false })
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
  const [orgDir, setOrgDir]               = useState([])
  const [orgDirLoading, setOrgDirLoading] = useState(true)
  const [activeOrgLetter, setActiveOrgLetter] = useState('')
  const [orgFilters, setOrgFilters] = useState({ cause: '', ageGroup: '', remote: false })
  const [showOrgFilter, setShowOrgFilter] = useState(false)
  const [orgView, setOrgView]             = useState(null)
  const [orgViewListings, setOrgViewListings] = useState([])
  const [orgViewLoading, setOrgViewLoading]   = useState(false)
  const [orgListings, setOrgListings]     = useState([])

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    fetch('/api/org-directory')
      .then(r => r.json())
      .then(data => { setOrgDir(Array.isArray(data) ? data : []); setOrgDirLoading(false) })
      .catch(() => setOrgDirLoading(false))
  }, [])

  useEffect(() => {
    if (!orgView) return
    setOrgViewLoading(true)
    setOrgViewListings([])
    const qs = orgView.org_id
      ? `org=${encodeURIComponent(orgView.org)}&org_id=${orgView.org_id}`
      : `org=${encodeURIComponent(orgView.org)}`
    fetch(`/api/org-directory?${qs}`)
      .then(r => r.json())
      .then(data => { setOrgViewListings(Array.isArray(data) ? data : []); setOrgViewLoading(false) })
      .catch(() => setOrgViewLoading(false))
  }, [orgView])

  useEffect(() => {
    fetch('/api/org-listings')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        setOrgListings(data.map(item => ({
          id:                item.id,
          title:             item.title,
          org:               item.org,
          org_id:            item.org_id,
          cause:             item.cause,
          ageGroup:          item.age_group,
          hours:             item.hours || '',
          location:          item.location || '',
          date:              item.date || '',
          description:       item.description || '',
          externalUrl:       item.external_url || '',
          remote:            !!item.remote,
          source:            'org',
          org_logo_icon_url: item.org_logo_icon_url || item.org_logo_url || null,
        })))
      })
      .catch(() => {})
  }, [])

  const fetchPage = useCallback(async (pageNum, replace = false) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError(null)
    try {
      const r = await fetch(`/api/opportunities?page=${pageNum}`)
      if (!r.ok) throw new Error('Failed to load')
      const data = await r.json()
      const mapped = (data.results || []).filter(isUS).map(mapOpp).filter(o => o.ageGroup !== '18+ Only')
      setOpps(prev => replace ? mapped : [...prev, ...mapped])
      setHasMore(!!data.next)
      setPage(pageNum)
      return { items: mapped, hasMore: !!data.next }
    } catch (e) { setError(e.message); return { items: [], hasMore: false } }
    finally { replace ? setLoading(false) : setLoadingMore(false) }
  }, [])

  // Auto-fetch more pages on initial load until we have at least 9 results
  useEffect(() => {
    let cancelled = false
    async function loadInitial() {
      setLoading(true)
      setError(null)
      let all = []
      let more = true
      let pageNum = 1
      while (all.length < 9 && more && pageNum <= 6) {
        try {
          const r = await fetch(`/api/opportunities?page=${pageNum}`)
          if (!r.ok) throw new Error('Failed to load')
          const data = await r.json()
          const mapped = (data.results || []).filter(isUS).map(mapOpp).filter(o => o.ageGroup !== '18+ Only')
          all = [...all, ...mapped]
          more = !!data.next
          pageNum++
        } catch (e) { if (!cancelled) setError(e.message); break }
      }
      if (!cancelled) {
        setOpps(all)
        setHasMore(more)
        setPage(pageNum - 1)
        setLoading(false)
      }
    }
    loadInitial()
    return () => { cancelled = true }
  }, [])

  const activeFilterCount = [filters.cause, filters.ageGroup, filters.remote].filter(Boolean).length

  const applyFilters = (o) => {
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) && !(o.org||'').toLowerCase().includes(search.toLowerCase())) return false
    if (filters.cause    && o.cause !== filters.cause) return false
    if (filters.ageGroup && o.ageGroup !== filters.ageGroup) return false
    if (filters.remote   && !o.remote) return false
    return true
  }

  const filteredOrgListings = orgListings.filter(applyFilters)
  const filteredVolunteer   = opps.filter(applyFilters)
  const filteredOpps        = [...filteredOrgListings, ...filteredVolunteer]

  // Count opps per cause (applying search + ageGroup only, not cause) for filter modal
  const causeCounts = {}
  for (const o of [...orgListings, ...opps]) {
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) && !(o.org||'').toLowerCase().includes(search.toLowerCase())) continue
    if (filters.ageGroup && o.ageGroup !== filters.ageGroup) continue
    if (filters.remote   && !o.remote) continue
    causeCounts[o.cause] = (causeCounts[o.cause] || 0) + 1
  }

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const availableLetters = new Set(orgDir.map(o => o.org[0]?.toUpperCase()).filter(Boolean))

  const filteredOrgDir = orgDir.filter(o => {
    if (activeOrgLetter && o.org[0]?.toUpperCase() !== activeOrgLetter) return false
    if (search && !o.org.toLowerCase().includes(search.toLowerCase())) return false
    if (orgFilters.cause && !(o.causes || []).includes(orgFilters.cause)) return false
    if (orgFilters.ageGroup && !(o.ageGroups || []).includes(orgFilters.ageGroup)) return false
    if (orgFilters.remote && !o.hasRemote) return false
    return true
  })

  // org cause counts for the filter modal
  const orgCauseCounts = {}
  for (const o of orgDir) for (const c of (o.causes || [])) orgCauseCounts[c] = (orgCauseCounts[c] || 0) + 1

  const orgActiveFilterCount = [orgFilters.cause, orgFilters.ageGroup, orgFilters.remote].filter(Boolean).length

  const gridStyle = isDesktop
    ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }
    : { display: 'flex', flexDirection: 'column', gap: 10 }

  const orgGridStyle = isDesktop
    ? { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }
    : { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, display: 'flex', flexDirection: 'column' }}>

      {/* header */}
      {isGuest ? (
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0 }}>
            <img src="/logo.png" alt="Give Hour" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>Give Hour</div>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={onLogin} style={{ background: 'none', border: 'none', padding: '8px 14px', fontSize: 14, fontWeight: 600, color: T.textSub, cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: 10 }}>Log in</button>
            <button onClick={onSignUp} style={{ background: T.primary, border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(24,160,80,0.25)' }}>Sign up</button>
          </div>
        </div>
      ) : (
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Explore</div>
        </div>
      )}

      {/* tabs */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', flexShrink: 0 }}>
        {[['opportunities','Opportunities'],['organizations','Organizations']].map(([key, label]) => {
          const active = tab === key
          const count = key === 'organizations' ? orgDir.length : (key === 'opportunities' ? filteredOpps.length : 0)
          const countText = count > 0 ? `${count}${key === 'opportunities' && hasMore ? '+' : ''}` : null
          return (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '14px 0', fontSize: 14, fontWeight: active ? 700 : 500, color: active ? T.primary : T.textMuted, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `2px solid ${active ? T.primary : 'transparent'}`, transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {label}
              {countText && <span style={{ fontSize: 11, color: active ? T.primary : T.textMuted, fontWeight: 600, opacity: active ? 1 : 0.6 }}>{countText}</span>}
            </button>
          )
        })}
      </div>

      <div style={{ padding: isDesktop ? '28px 40px' : '16px 20px', flex: 1 }}>

        {/* search + filter row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16, color: T.textMuted }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'opportunities' ? 'Search opportunities…' : 'Search organizations…'} style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: T.text }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 16, padding: 0 }}>×</button>}
          </div>
          {(() => {
            const isOpps = tab === 'opportunities'
            const count = isOpps ? activeFilterCount : orgActiveFilterCount
            const open = () => isOpps ? setShowFilter(true) : setShowOrgFilter(true)
            return (
              <button onClick={open} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${count > 0 ? T.primary : T.border}`, background: count > 0 ? T.primaryLight : T.card, color: count > 0 ? T.primary : T.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                <span>⚙️</span> Filter
                {count > 0 && <span style={{ background: T.primary, color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>}
              </button>
            )
          })()}
        </div>

        {/* opportunities tab */}
        {tab === 'opportunities' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>
              {error} · <button onClick={() => fetchPage(1, true)} style={{ color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>retry</button>
            </div>
          ) : filteredOpps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>No opportunities match your filters.</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>{filteredOpps.length}{hasMore ? '+' : ''} opportunities</div>
              <div style={gridStyle}>
                {filteredOpps.map((opp, i) => {
                  const cols = isDesktop ? 3 : 1
                  const alternate = Math.floor(i / cols) % 2 === 1
                  return <OppCard key={opp.id} opp={opp} alternate={alternate} onSelect={onSelectOpp} />
                })}
              </div>
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button onClick={() => fetchPage(page + 1)} disabled={loadingMore} style={{ background: T.primaryLight, border: `1.5px solid ${T.primary}`, color: T.primary, borderRadius: 20, padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )
        )}

        {/* organizations tab */}
        {tab === 'organizations' && (
          orgView ? (
            /* ── org drill-down ── */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={() => setOrgView(null)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>← Back</button>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{orgView.org}</div>
                  {orgView.isGiveHour && orgView.org_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 700 }}>✓ Give Hour Partner</span>
                      <button onClick={() => onSelectOrg(orgView.org_id, orgView.org)} style={{ fontSize: 11, color: T.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>View profile →</button>
                    </div>
                  )}
                </div>
              </div>
              {orgViewLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 14 }}>Loading…</div>
              ) : orgViewListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 14 }}>No listings found for this organization.</div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>{orgViewListings.length} listing{orgViewListings.length !== 1 ? 's' : ''}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {orgViewListings.map((item, i) => (
                      <OppCard key={item.id} alternate={i % 2 === 1} opp={{ id: item.id, title: item.title, org: item.org || orgView.org, org_id: item.org_id || orgView.org_id, cause: item.cause, ageGroup: item.age_group, hours: item.hours, location: item.location, date: item.date, description: item.description, externalUrl: item.external_url, remote: !!item.remote, source: item.source }} onSelect={onSelectOpp} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : orgDirLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading…</div>
          ) : orgDir.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6 }}>No organizations yet</div>
              <div style={{ fontSize: 13, color: T.textMuted }}>Organizations will appear here once listings are available.</div>
            </div>
          ) : (
            <>
              {/* A–Z strip */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 16, alignItems: 'center' }}>
                <button onClick={() => setActiveOrgLetter('')} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: !activeOrgLetter ? T.primary : 'transparent', color: !activeOrgLetter ? '#fff' : T.textSub, transition: 'all 0.15s' }}>All</button>
                <span style={{ width: 1, height: 14, background: T.border, margin: '0 4px' }} />
                {LETTERS.map(l => {
                  const available = availableLetters.has(l)
                  const active = activeOrgLetter === l
                  return (
                    <button key={l} onClick={() => available && setActiveOrgLetter(active ? '' : l)} disabled={!available} style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', fontSize: 12, fontWeight: active ? 700 : 600, cursor: available ? 'pointer' : 'default', border: 'none', background: active ? T.primary : 'transparent', color: active ? '#fff' : available ? T.textSub : T.border, transition: 'all 0.15s', padding: 0 }}>
                      {l}
                    </button>
                  )
                })}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>{filteredOrgDir.length} organization{filteredOrgDir.length !== 1 ? 's' : ''}</div>
              <div style={orgGridStyle}>
                {filteredOrgDir.map((org, i) => {
                  const cols = isDesktop ? 4 : 2
                  const alternate = Math.floor(i / cols) % 2 === 1
                  return (
                  <OrgDirCard key={org.org} org={org} alternate={alternate} onSelect={(o) => {
                    if (o.org_id) {
                      onSelectOrg(o.org_id, o.org)
                    } else {
                      setOrgView(o)
                    }
                  }} />
                  )
                })}
              </div>
            </>
          )
        )}
      </div>

      {showFilter && <FilterModal filters={filters} onChange={setFilters} onClose={() => setShowFilter(false)} isDesktop={isDesktop} causeCounts={causeCounts} />}
      {showOrgFilter && <FilterModal filters={orgFilters} onChange={setOrgFilters} onClose={() => setShowOrgFilter(false)} isDesktop={isDesktop} causeCounts={orgCauseCounts} title="Filter organizations" />}
    </div>
  )
}
