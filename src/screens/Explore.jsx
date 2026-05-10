import { useState, useEffect, useCallback } from 'react'
import { T, CAUSE } from '../lib/theme'

// ---------- constants ----------
const AGE_GROUPS = [
  { key: 'All Ages',      label: 'All Ages' },
  { key: 'Teens (13-17)', label: '🧑 Teens (13–17)' },
  { key: '18+ Only',      label: '18+ Only' },
  { key: 'Open',          label: 'No Age Listed' },
]

const CAUSES = [
  { key: 'All',          label: 'All' },
  { key: 'Education',    label: '📚 Education' },
  { key: 'Environment',  label: '🌿 Environment' },
  { key: 'Animals',      label: '🐾 Animals' },
  { key: 'Food Security',label: '🍎 Food Security' },
  { key: 'Health',       label: '❤️ Health' },
  { key: 'Housing',      label: '🏠 Housing' },
  { key: 'Arts',         label: '🎨 Arts' },
  { key: 'Seniors',      label: '🤝 Seniors' },
]

// Ordered sections shown when "All" is active
const SECTIONS = [
  { key: 'All Ages',      label: '✓ All Ages',       desc: 'Everyone is welcome' },
  { key: 'Teens (13-17)', label: '🧑 Teens (13–17)', desc: 'Open to teen volunteers' },
  { key: '18+ Only',      label: '18+ Only',         desc: 'Adults only' },
  { key: 'Open',          label: 'No Age Listed',    desc: 'Age not stated — check the details' },
]

const CA_PROVINCES = new Set(['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon','BC','AB','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'])

function isUS(item) {
  if (item.remote_or_online) return true
  const regions   = item.audience?.regions   || []
  const countries = item.audience?.countries || []
  if (countries.length && countries.every(c => !/united states|usa/i.test(c))) return false
  if (regions.some(r => CA_PROVINCES.has(r))) return false
  return true
}

// ---------- helpers ----------
function deriveCause(activities = []) {
  const names = activities.map(a => (a.name || '').toLowerCase()).join(' ')
  const cats  = activities.map(a => (a.category || '').toLowerCase()).join(' ')
  const all   = names + ' ' + cats
  if (/animal|wildlife|pet|spca|humane/.test(all))                          return 'Animals'
  if (/food|hunger|meal|nutrition|pantry|harvest|farm/.test(all))            return 'Food Security'
  if (/hous|shelter|homeless|habitat/.test(all))                             return 'Housing'
  if (/senior|elder|aged|retirement/.test(all))                              return 'Seniors'
  if (/environ|nature|trail|plant|garden|ecology|conserv|climate/.test(all)) return 'Environment'
  if (/health|medical|cancer|mental|hospital|clinic|nurse/.test(all))        return 'Health'
  if (/art|music|theatre|theater|craft|creative|writing|journalism|design/.test(all)) return 'Arts'
  if (/teach|tutor|coach|mentor|literacy|school|education|youth|kid|child|student|learn/.test(all)) return 'Education'
  return 'Education'
}

function deriveAgeGroup(description = '', title = '', extra = '') {
  const text = (description + ' ' + title + ' ' + extra).toLowerCase()
  if (/must be 18|18\s*[\+&]|18 years or older|18 and over|18 or older|minimum age.*18|age.*18.*require|adults only|adult volunteer|at least 18|18 years of age|age 18|over 18|aged 18/.test(text)) return '18+ Only'
  // 14–16 minimums are still teen-accessible, so group with teens
  if (/must be 1[4-6]|1[4-6]\s*[\+&]|minimum.*1[4-6]|at least 1[4-6]|1[4-6] years or older|1[4-6] and over|1[4-6] years of age|over 1[4-6]|aged 1[4-6]/.test(text)) return 'Teens (13-17)'
  if (/\bteen\b|teenager|high school|high-school|grades?\s+[6-9]|grades?\s+1[012]|middle school|secondary school|ages?\s+1[3-7]|youth.*1[3-7]|1[3-7].*youth|student volunteer|youth volunteer|for youth|youth program|for students/.test(text)) return 'Teens (13-17)'
  if (/all ages|family.{0,20}friendly|open to all|no age restrict|any age|everyone welcome|all welcome|no minimum age|no age requirement|of any age|open to everyone|open to anyone|all are welcome|all volunteers welcome|volunteers of all|all community|anyone can volunteer|welcome to join|no experience required|community members|open to the public|suitable for all|all backgrounds|everyone is welcome/.test(text)) return 'All Ages'
  return 'Open'
}

function deriveLocation(item) {
  if (item.remote_or_online) return 'Remote / Online'
  const { audience } = item
  if (audience?.regions?.length) return audience.regions[0]
  return 'In-Person'
}

function mapOpp(item) {
  return {
    id:          item.id,
    title:       item.title,
    org:         item.organization?.name || '',
    orgLogo:     item.organization?.logo || '',
    cause:       deriveCause(item.activities),
    ageGroup:    deriveAgeGroup(item.description, item.title, [item.requirements, item.age_restriction, (item.activities || []).map(a => a.name).join(' ')].filter(Boolean).join(' ')),
    hours:       item.duration || '',
    location:    deriveLocation(item),
    date:        item.dates || '',
    description: item.description || '',
    externalUrl: item.url || '',
    remote:      !!item.remote_or_online,
    activities:  item.activities || [],
  }
}

// ---------- card ----------
function OppCard({ opp, onSelect }) {
  const cause = CAUSE[opp.cause] || { bg: '#F2F2F2', text: '#666' }
  return (
    <div onClick={() => onSelect(opp)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>{opp.org}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{opp.title}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500 }}>{opp.cause}</span>
        {opp.remote && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 500 }}>Remote</span>}
        {opp.hours && <><span style={{ fontSize: 12, color: T.textMuted }}>·</span><span style={{ fontSize: 12, color: T.textMuted }}>{opp.hours}</span></>}
        {opp.location && !opp.remote && <><span style={{ fontSize: 12, color: T.textMuted }}>·</span><span style={{ fontSize: 12, color: T.textMuted }}>{opp.location}</span></>}
      </div>
      {opp.date && <div style={{ fontSize: 12, color: T.textMuted }}>{opp.date}</div>}
    </div>
  )
}

// ---------- section header ----------
function SectionHeader({ section, count, hasMore }) {
  const is18 = section.key === '18+ Only'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, marginTop: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: is18 ? T.textSub : T.text }}>{section.label}</div>
      <div style={{ fontSize: 12, color: T.textMuted }}>{section.desc}</div>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: T.textMuted, fontWeight: 600 }}>{count}{hasMore ? '+' : ''}</div>
    </div>
  )
}

// ---------- main ----------
export default function Explore({ user, onSelectOpp, isGuest, onSignUp, onLogin, onHome }) {
  const [opps, setOpps]               = useState([])
  const [page, setPage]               = useState(1)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const [activeGroup, setActiveGroup] = useState('All Ages')
  const [activeCause, setActiveCause] = useState('All')
  const [search, setSearch]           = useState('')
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const fetchPage = useCallback(async (pageNum, replace = false) => {
    replace ? setLoading(true) : setLoadingMore(true)
    setError(null)
    try {
      const r = await fetch(`/api/opportunities?page=${pageNum}`)
      if (!r.ok) throw new Error('Failed to load opportunities')
      const data = await r.json()
      const mapped = (data.results || []).filter(isUS).map(mapOpp)
      setOpps(prev => replace ? mapped : [...prev, ...mapped])
      setHasMore(!!data.next)
      setPage(pageNum)
    } catch (e) {
      setError(e.message)
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }, [])

  useEffect(() => { fetchPage(1, true) }, [fetchPage])

  // Filter by search + cause
  const searched = opps.filter(o => {
    const matchSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.org.toLowerCase().includes(search.toLowerCase())
    const matchCause  = activeCause === 'All' || o.cause === activeCause
    return matchSearch && matchCause
  })

  // Then by active group
  const isAll     = activeGroup === 'All Ages'
  const filtered  = isAll ? searched : searched.filter(o => o.ageGroup === activeGroup)

  // Build grouped sections for "All Ages" view
  const grouped = isAll
    ? SECTIONS.map(s => ({ section: s, items: searched.filter(o => o.ageGroup === s.key) })).filter(g => g.items.length > 0)
    : null

  const gridStyle = isDesktop
    ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }
    : { display: 'flex', flexDirection: 'column', gap: 10 }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, display: 'flex', flexDirection: 'column' }}>

      {/* header */}
      {isGuest ? (
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <img src="/logo.png" alt="Give Hour" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Give Hour</div>
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={onLogin} style={{ background: 'none', border: `1.5px solid ${T.border}`, borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>Log in</button>
            <button onClick={onSignUp} style={{ background: T.primary, border: 'none', borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Sign up free</button>
          </div>
        </div>
      ) : (
        <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Explore</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Browse all opportunities</div>
        </div>
      )}

      <div style={{ padding: isDesktop ? '32px 40px' : '14px 20px', flex: 1 }}>

        {/* search */}
        <div style={{ display: 'flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 16, color: T.textMuted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities..." style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: T.text }} />
        </div>

        {/* age group nav */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          {AGE_GROUPS.map(g => {
            const active = activeGroup === g.key
            const is18   = g.key === '18+ Only'
            return (
              <button key={g.key} onClick={() => setActiveGroup(g.key)} style={{
                borderRadius: 20, padding: '7px 16px', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                border: `1.5px solid ${active ? T.primary : is18 ? '#E8AABB' : T.border}`,
                background: active ? T.primary : is18 ? '#FEF0F4' : '#fff',
                color: active ? '#fff' : is18 ? '#A0206A' : T.textSub,
              }}>
                {g.label}
              </button>
            )
          })}
        </div>

        {/* cause pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          {CAUSES.map(c => {
            const active = activeCause === c.key
            const style  = active && c.key !== 'All' ? CAUSE[c.key] : null
            return (
              <button key={c.key} onClick={() => setActiveCause(c.key)} style={{
                borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                border: `1.5px solid ${active ? (style?.text || T.primary) : T.border}`,
                background: active ? (style?.bg || T.primaryLight) : '#fff',
                color: active ? (style?.text || T.primary) : T.textSub,
              }}>
                {c.label}
              </button>
            )
          })}
        </div>

        {/* listings */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading opportunities…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>
            {error} — <button onClick={() => fetchPage(1, true)} style={{ color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>retry</button>
          </div>
        ) : isAll && grouped ? (
          <>
            {grouped.map(({ section, items }) => (
              <div key={section.key} style={{ marginBottom: 32 }}>
                <div style={{ borderBottom: `2px solid ${section.key === '18+ Only' ? '#F0C8D0' : T.border}`, paddingBottom: 10, marginBottom: 14 }}>
                  <SectionHeader section={section} count={items.length} hasMore={hasMore} />
                </div>
                <div style={gridStyle}>
                  {items.map(opp => <OppCard key={opp.id} opp={opp} onSelect={onSelectOpp} />)}
                </div>
              </div>
            ))}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 16 }}>
                <button onClick={() => fetchPage(page + 1)} disabled={loadingMore}
                  style={{ background: T.primaryLight, border: `1.5px solid ${T.primary}`, color: T.primary, borderRadius: 20, padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>No opportunities in this group.</div>
        ) : (
          <>
            <div style={gridStyle}>
              {filtered.map(opp => <OppCard key={opp.id} opp={opp} onSelect={onSelectOpp} />)}
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>Showing {filtered.length} from loaded results — more may exist</div>
                <button onClick={() => fetchPage(page + 1)} disabled={loadingMore}
                  style={{ background: T.primaryLight, border: `1.5px solid ${T.primary}`, color: T.primary, borderRadius: 20, padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
