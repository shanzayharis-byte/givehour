import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSES = ['All', 'Housing', 'Food Security', 'Education', 'Environment', 'Animals', 'Health', 'Arts', 'Seniors']

function OppCard({ opp, onSelect }) {
  const cause = CAUSE[opp.cause] || { bg: '#F2F2F2', text: '#666' }
  return (
    <div onClick={() => onSelect(opp)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>{opp.org}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{opp.title}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500 }}>{opp.cause}</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>{opp.hours}</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>{opp.location}</span>
      </div>
      <div style={{ fontSize: 12, color: T.textMuted }}>{opp.date}</div>
    </div>
  )
}

export default function Explore({ user, onSelectOpp, isGuest, onSignUp }) {
  const [opps, setOpps] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCause, setActiveCause] = useState('All')
  const [search, setSearch] = useState('')
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false })
        setOpps(data || [])
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = opps.filter(o => {
    const matchCause = activeCause === 'All' || o.cause === activeCause
    const matchSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.org.toLowerCase().includes(search.toLowerCase())
    return matchCause && matchSearch
  })

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, display: 'flex', flexDirection: 'column' }}>
      {isGuest && (
        <div style={{ background: T.primary, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>Sign up to track hours & personalize your feed</span>
          <button onClick={onSignUp} style={{ background: '#fff', border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: T.primary, cursor: 'pointer' }}>Sign up</button>
        </div>
      )}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isGuest && (
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #18A050, #0E7A3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>GH</div>
          )}
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{isGuest ? 'Give Hour' : 'Explore'}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{isGuest ? 'Browse volunteer opportunities' : 'Browse all opportunities'}</div>
          </div>
        </div>
        {isGuest && (
          <button onClick={onSignUp} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Sign up free</button>
        )}
      </div>
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
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>No opportunities match this filter. Try a different cause.</div>
        ) : (
          <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(opp => <OppCard key={opp.id} opp={opp} onSelect={onSelectOpp} />)}
          </div>
        )}
      </div>
    </div>
  )
}
