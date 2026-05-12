import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'
import FilterModal from '../components/FilterModal'

function MatchBadge({ score }) {
  const s = score ?? 88
  const bg = s >= 95 ? T.primaryLight : s >= 85 ? T.warningLight : '#F2F2F2'
  const color = s >= 95 ? T.primary : s >= 85 ? T.warning : T.textMuted
  return <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: bg, color }}>{s}% match</span>
}

function OppCard({ opp, onSelect, isFirst, alternate }) {
  const cause = CAUSE[opp.cause] || { bg: '#F2F2F2', text: '#666' }
  const bg = alternate ? '#F9FAFC' : T.card
  return (
    <div
      onClick={() => onSelect(opp)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)' }}
      style={{ background: bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', position: 'relative', transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s' }}
    >
      {isFirst && <span style={{ position: 'absolute', top: 14, right: 14, background: T.primaryLight, color: '#0A6830', fontSize: 10, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>NEW</span>}
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>{opp.org}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{opp.title}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500 }}>{opp.cause}</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>{opp.hours}</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>{opp.location}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>{opp.date}</span>
        <MatchBadge score={opp.score} />
      </div>
    </div>
  )
}

export default function Feed({ user, onSelectOpp, onSignOut }) {
  const [opps, setOpps] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [totalHours, setTotalHours] = useState(0)
  const [orgCount, setOrgCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [isPersonalized, setIsPersonalized] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ cause: '', ageGroup: '', remote: false })
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        if (user?.id) {
          // load impact stats (hours, orgs, streak)
          const [{ data: stats }, { data: hours }] = await Promise.all([
            supabase.from('impact_stats').select('total_hours, streak_days').eq('user_id', user.id).maybeSingle(),
            supabase.from('hours_log').select('hours, org').eq('user_id', user.id),
          ])
          if (stats) {
            setTotalHours(parseFloat(stats.total_hours) || 0)
            setStreak(stats.streak_days || 0)
          } else if (hours) {
            setTotalHours(hours.reduce((s, r) => s + (r.hours || 0), 0))
          }
          if (hours) setOrgCount(new Set(hours.map(r => r.org).filter(Boolean)).size)

          // load personalized feed
          const { data: feed } = await supabase
            .from('personalized_feed')
            .select('score, rank, clean_listings!inner(*)')
            .eq('user_id', user.id)
            .not('clean_listings.age_group', 'eq', '18+ Only')
            .order('rank')
            .limit(10)
          if (feed && feed.length > 0) {
            setOpps(feed.map(r => ({ ...r.clean_listings, score: Math.round(r.score) })))
            setIsPersonalized(true)
            setLoading(false)
            return
          }
        }
        const { data } = await supabase.from('clean_listings').select('*').neq('age_group', '18+ Only').order('fetched_at', { ascending: false }).limit(10)
        setOpps(data || [])
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning 👋' : hour < 17 ? 'Good afternoon 👋' : 'Good evening 👋'
  const initial = (user?.name || 'U')[0].toUpperCase()

  // cause counts in current feed (for the filter modal)
  const causeCounts = {}
  for (const o of opps) if (o.cause) causeCounts[o.cause] = (causeCounts[o.cause] || 0) + 1

  // filtered list
  const q = search.trim().toLowerCase()
  const displayedOpps = opps.filter(o => {
    if (filters.cause && o.cause !== filters.cause) return false
    if (filters.ageGroup && o.age_group !== filters.ageGroup) return false
    if (filters.remote && !o.remote) return false
    if (q && !(`${o.title || ''} ${o.org || ''}`.toLowerCase().includes(q))) return false
    return true
  })

  const activeFilterCount = [filters.cause, filters.ageGroup, filters.remote].filter(Boolean).length

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading Give Hour...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      {/* header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: isDesktop ? '20px 40px' : '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: T.textMuted }}>{greeting}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Hi, {user?.name || 'there'}</div>
          </div>
          {isDesktop ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {[[totalHours, 'hours', T.primary, T.primaryLight], [orgCount, 'orgs', T.accent, T.accentLight], [streak, 'streak', T.warning, T.warningLight]].map(([val, lbl, color, bg]) => (
                <div key={lbl} style={{ minWidth: 80, textAlign: 'center', background: bg, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: 12, color, opacity: 0.75 }}>{lbl}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {!isDesktop && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[[totalHours, 'hours', T.primary, T.primaryLight], [orgCount, 'orgs', T.accent, T.accentLight], [streak, 'streak', T.warning, T.warningLight]].map(([val, lbl, color, bg]) => (
              <div key={lbl} style={{ flex: 1, background: bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
                <div style={{ fontSize: 10, color, opacity: 0.75 }}>{lbl}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* search + filter */}
      {opps.length > 0 && (
        <div style={{ padding: isDesktop ? '20px 40px 0' : '14px 20px 0' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', gap: 10, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', alignItems: 'center' }}>
              <span style={{ fontSize: 16, color: T.textMuted }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title or organization…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: T.text, minWidth: 0 }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: T.textMuted, padding: 0 }}>✕</button>
              )}
            </div>
            <button onClick={() => setShowFilter(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer', flexShrink: 0 }}>
              <span>⚙️</span> Filter
              {activeFilterCount > 0 && <span style={{ background: T.primary, color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>}
            </button>
          </div>
        </div>
      )}

      {/* cards */}
      <div style={{ padding: isDesktop ? '20px 40px 32px' : '14px 20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.textSub, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 12 }}>
          {q || activeFilterCount > 0 ? `${displayedOpps.length} result${displayedOpps.length !== 1 ? 's' : ''}` : (isPersonalized ? 'YOUR TOP MATCHES TODAY' : 'RECENTLY ADDED')}
        </div>
        {opps.length === 0 ? (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>Your feed is getting ready</div>
            <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, maxWidth: 260, margin: '0 auto 20px' }}>Complete your profile (add your region and top cause) so we can find the best matches for you.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <a href="#" style={{ background: T.primary, color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Go to Profile →</a>
            </div>
          </div>
        ) : displayedOpps.length === 0 ? (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>No matches found</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>Try a different search or clear your filters.</div>
            <button onClick={() => { setSearch(''); setFilters({ cause: '', ageGroup: '', remote: false }) }} style={{ background: T.primaryLight, color: T.primary, border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Clear filters</button>
          </div>
        ) : (
          <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayedOpps.map((opp, i) => {
              const cols = isDesktop ? 3 : 1
              const alternate = Math.floor(i / cols) % 2 === 1
              return <OppCard key={opp.id} opp={opp} onSelect={onSelectOpp} isFirst={i === 0 && !q && activeFilterCount === 0} alternate={alternate} />
            })}
          </div>
        )}
      </div>

      {showFilter && <FilterModal filters={filters} onChange={setFilters} onClose={() => setShowFilter(false)} isDesktop={isDesktop} causeCounts={causeCounts} title="Filter feed" />}
    </div>
  )
}
