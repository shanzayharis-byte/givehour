import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

// ---------- constants ----------
const CAUSES = ['Education','Environment','Animals','Food Security','Health','Housing','Arts','Seniors']
const CAUSE_EMOJI = { Education:'📚', Environment:'🌿', Animals:'🐾', 'Food Security':'🍎', Health:'❤️', Housing:'🏠', Arts:'🎨', Seniors:'🤝' }

const REGIONS = ['Bay Area, CA','Los Angeles, CA','San Diego, CA','New York, NY','Chicago, IL','Houston, TX','Seattle, WA','Austin, TX','Boston, MA','Remote / Online']

const CA_PROVINCES = new Set(['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon','BC','AB','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'])

function isUS(item) {
  if (item.remote_or_online) return true
  const regions   = item.audience?.regions   || []
  const countries = item.audience?.countries || []
  if (countries.length && countries.every(c => !/united states|usa/i.test(c))) return false
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

// ---------- filter modal ----------
function FilterModal({ filters, onChange, onClose }) {
  const [local, setLocal] = useState(filters)
  const set = (key, val) => setLocal(p => ({ ...p, [key]: val }))
  const activeCount = [local.cause, local.region, local.ageGroup].filter(Boolean).length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Filter opportunities</div>
          <button onClick={() => { setLocal({ cause: '', region: '', ageGroup: '' }) }} style={{ fontSize: 12, color: T.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Location</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {REGIONS.map(r => (
            <button key={r} onClick={() => set('region', local.region === r ? '' : r)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${local.region === r ? T.accent : T.border}`, background: local.region === r ? T.accentLight : '#fff', color: local.region === r ? T.accent : T.textSub }}>{r}</button>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Cause</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {CAUSES.map(c => {
            const cs = CAUSE[c] || { bg: T.primaryLight, text: T.primary }
            const active = local.cause === c
            return <button key={c} onClick={() => set('cause', active ? '' : c)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? cs.text : T.border}`, background: active ? cs.bg : '#fff', color: active ? cs.text : T.textSub }}>{CAUSE_EMOJI[c]} {c}</button>
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Age group</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {[['All Ages','All ages welcome'],['Teens (13-17)','Teen-specific'],['Open','No age listed']].map(([key, lbl]) => (
            <button key={key} onClick={() => set('ageGroup', local.ageGroup === key ? '' : key)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${local.ageGroup === key ? T.primary : T.border}`, background: local.ageGroup === key ? T.primaryLight : '#fff', color: local.ageGroup === key ? T.primary : T.textSub }}>{lbl}</button>
          ))}
        </div>

        <button onClick={() => { onChange(local); onClose() }} style={{ width: '100%', padding: 14, background: T.primary, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
          {activeCount > 0 ? `Apply ${activeCount} filter${activeCount > 1 ? 's' : ''}` : 'Apply'}
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: 12, background: 'none', border: 'none', fontSize: 13, color: T.textMuted, cursor: 'pointer', marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  )
}

// ---------- org card ----------
function OrgCard({ org, onSelect }) {
  const firstCause = org.interests?.[0]
  const cs = firstCause && CAUSE[firstCause] ? CAUSE[firstCause] : { bg: T.accentLight, text: T.accent }
  return (
    <div onClick={() => onSelect(org.id)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏢</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{org.name}</div>
      {org.org_type && <div style={{ fontSize: 11, color: T.textMuted }}>{org.org_type}</div>}
      {org.region && <div style={{ fontSize: 11, color: T.textMuted }}>📍 {org.region}</div>}
      {firstCause && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: cs.bg, color: cs.text, fontWeight: 600, alignSelf: 'flex-start' }}>{CAUSE_EMOJI[firstCause]} {firstCause}</span>}
    </div>
  )
}

// ---------- opp card ----------
function OppCard({ opp, onSelect }) {
  const cause = CAUSE[opp.cause] || { bg: '#F2F2F2', text: '#666' }
  return (
    <div onClick={() => onSelect(opp)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, cursor: 'pointer' }}>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>{opp.org}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{opp.title}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500 }}>{opp.cause}</span>
        {opp.remote && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 500 }}>Remote</span>}
        {opp.hours && <span style={{ fontSize: 12, color: T.textMuted }}>· {opp.hours}</span>}
        {opp.location && !opp.remote && <span style={{ fontSize: 12, color: T.textMuted }}>· {opp.location}</span>}
      </div>
      {opp.date && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>{opp.date}</div>}
    </div>
  )
}

// ---------- main ----------
export default function Explore({ user, onSelectOpp, onSelectOrg, isGuest, onSignUp, onLogin, onHome }) {
  const [tab, setTab]                 = useState('opportunities')
  const [opps, setOpps]               = useState([])
  const [page, setPage]               = useState(1)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')
  const [showFilter, setShowFilter]   = useState(false)
  const [filters, setFilters]         = useState({ cause: '', region: '', ageGroup: '' })
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
  const [orgs, setOrgs]               = useState([])
  const [orgsLoading, setOrgsLoading] = useState(true)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    supabase.from('users').select('id, name, org_type, region, interests, website').eq('role', 'org')
      .then(({ data }) => { setOrgs(data || []); setOrgsLoading(false) })
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
    } catch (e) { setError(e.message) }
    finally { replace ? setLoading(false) : setLoadingMore(false) }
  }, [])

  useEffect(() => { fetchPage(1, true) }, [fetchPage])

  const activeFilterCount = [filters.cause, filters.region, filters.ageGroup].filter(Boolean).length

  const filteredOpps = opps.filter(o => {
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) && !o.org.toLowerCase().includes(search.toLowerCase())) return false
    if (filters.cause  && o.cause !== filters.cause) return false
    if (filters.region && !o.location.toLowerCase().includes(filters.region.toLowerCase())) return false
    if (filters.ageGroup && o.ageGroup !== filters.ageGroup) return false
    return true
  })

  const filteredOrgs = orgs.filter(o => {
    if (!search) return true
    return (o.name||'').toLowerCase().includes(search.toLowerCase()) || (o.region||'').toLowerCase().includes(search.toLowerCase()) || (o.org_type||'').toLowerCase().includes(search.toLowerCase())
  })

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
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <img src="/logo.png" alt="Give Hour" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Give Hour</div>
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onLogin} style={{ background: 'none', border: `1.5px solid ${T.border}`, borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>Log in</button>
            <button onClick={onSignUp} style={{ background: T.primary, border: 'none', borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Sign up free</button>
          </div>
        </div>
      ) : (
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Explore</div>
        </div>
      )}

      {/* tabs */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', flexShrink: 0 }}>
        {[['opportunities','Opportunities'],['organizations','Organizations']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '12px 0', fontSize: 13, fontWeight: tab === key ? 700 : 500, color: tab === key ? T.primary : T.textMuted, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `2px solid ${tab === key ? T.primary : 'transparent'}`, transition: 'all 0.15s' }}>
            {label}
            {key === 'organizations' && orgs.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, background: T.accentLight, color: T.accent, borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>{orgs.length}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding: isDesktop ? '28px 40px' : '16px 20px', flex: 1 }}>

        {/* search + filter row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16, color: T.textMuted }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'opportunities' ? 'Search opportunities…' : 'Search organizations…'} style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: T.text }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 16, padding: 0 }}>×</button>}
          </div>
          {tab === 'opportunities' && (
            <button onClick={() => setShowFilter(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${activeFilterCount > 0 ? T.primary : T.border}`, background: activeFilterCount > 0 ? T.primaryLight : T.card, color: activeFilterCount > 0 ? T.primary : T.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              <span>⚙️</span> Filter
              {activeFilterCount > 0 && <span style={{ background: T.primary, color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>}
            </button>
          )}
        </div>

        {/* opportunities tab */}
        {tab === 'opportunities' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>
              {error} — <button onClick={() => fetchPage(1, true)} style={{ color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>retry</button>
            </div>
          ) : filteredOpps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>No opportunities match your filters.</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>{filteredOpps.length}{hasMore ? '+' : ''} opportunities</div>
              <div style={gridStyle}>
                {filteredOpps.map(opp => <OppCard key={opp.id} opp={opp} onSelect={onSelectOpp} />)}
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
          orgsLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading…</div>
          ) : filteredOrgs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6 }}>No organizations yet</div>
              <div style={{ fontSize: 13, color: T.textMuted }}>Organizations that sign up on Give Hour will appear here.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>{filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''}</div>
              <div style={orgGridStyle}>
                {filteredOrgs.map(org => <OrgCard key={org.id} org={org} onSelect={onSelectOrg} />)}
              </div>
            </>
          )
        )}
      </div>

      {showFilter && <FilterModal filters={filters} onChange={setFilters} onClose={() => setShowFilter(false)} />}
    </div>
  )
}
