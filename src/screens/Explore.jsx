import { useState, useEffect, useCallback } from 'react'
import { T, CAUSE } from '../lib/theme'

const CAUSES = ['All', 'Remote', 'Education', 'Environment', 'Health', 'Animals', 'Food Security', 'Housing', 'Arts', 'Seniors']

// Map VolunteerConnector activity names + categories → app cause labels
function deriveCause(activities = []) {
  const names = activities.map(a => (a.name || '').toLowerCase()).join(' ')
  const cats  = activities.map(a => (a.category || '').toLowerCase()).join(' ')
  const all   = names + ' ' + cats

  if (/animal|wildlife|pet|spca|humane/.test(all))                         return 'Animals'
  if (/food|hunger|meal|nutrition|pantry|harvest|farm/.test(all))           return 'Food Security'
  if (/hous|shelter|homeless|habitat/.test(all))                            return 'Housing'
  if (/senior|elder|aged|retirement/.test(all))                             return 'Seniors'
  if (/environ|nature|trail|plant|garden|ecology|conserv|climate/.test(all)) return 'Environment'
  if (/health|medical|cancer|mental|hospital|clinic|nurse/.test(all))       return 'Health'
  if (/art|music|theatre|theater|craft|creative|writing|journalism|design/.test(all)) return 'Arts'
  if (/teach|tutor|coach|mentor|literacy|school|education|youth|kid|child|student|learn/.test(all)) return 'Education'
  return 'Education' // sensible default
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
    hours:       item.duration || '',
    location:    deriveLocation(item),
    date:        item.dates || '',
    description: item.description || '',
    externalUrl: item.url || '',
    remote:      !!item.remote_or_online,
    activities:  item.activities || [],
  }
}

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

export default function Explore({ user, onSelectOpp, isGuest, onSignUp, onLogin, onHome }) {
  const [opps, setOpps]           = useState([])
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]         = useState(null)
  const [activeCause, setActiveCause] = useState('All')
  const [search, setSearch]       = useState('')
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

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
      const mapped = (data.results || []).map(mapOpp)
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

  const filtered = opps.filter(o => {
    const matchCause  = activeCause === 'All' ? true
                      : activeCause === 'Remote' ? o.remote
                      : o.cause === activeCause
    const matchSearch = !search
      || o.title.toLowerCase().includes(search.toLowerCase())
      || o.org.toLowerCase().includes(search.toLowerCase())
    return matchCause && matchSearch
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, display: 'flex', flexDirection: 'column' }}>
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
        <div style={{ display: 'flex', flexDirection: 'row', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 16, color: T.textMuted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities..." style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'inherit', background: 'transparent', color: T.text }} />
        </div>

        {/* cause pills */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
          {CAUSES.map(c => (
            <button key={c} onClick={() => setActiveCause(c)} style={{ borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer', border: `1.5px solid ${activeCause === c ? T.primary : T.border}`, background: activeCause === c ? T.primary : '#fff', color: activeCause === c ? '#fff' : T.textSub }}>
              {c}
            </button>
          ))}
        </div>

        {/* cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading opportunities…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>
            {error} — <button onClick={() => fetchPage(1, true)} style={{ color: T.primary, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>No opportunities match this filter.</div>
        ) : (
          <>
            <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(opp => <OppCard key={opp.id} opp={opp} onSelect={onSelectOpp} />)}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                  onClick={() => fetchPage(page + 1)}
                  disabled={loadingMore}
                  style={{ background: T.primaryLight, border: `1.5px solid ${T.primary}`, color: T.primary, borderRadius: 20, padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
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
