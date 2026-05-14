import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

// Returns a Date if str parses to a valid future date, null otherwise.
function parseFutureDate(str) {
  if (!str || typeof str !== 'string') return null
  const d = new Date(str)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d >= today ? d : null
}

// Format a Date as "Weekday, Month Day" e.g. "Sun, May 18"
function fmtDateHeader(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Calendar({ user, onSignUp, onLogin, isGuest }) {
  const [listings, setListings]       = useState([])
  const [savedIds, setSavedIds]       = useState(new Set())
  const [loading, setLoading]         = useState(true)
  const [savedOnly, setSavedOnly]     = useState(false)
  const [expanded, setExpanded]       = useState(null)   // listing id
  const [noDateOpen, setNoDateOpen]   = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('clean_listings')
          .select('id, title, org, org_id, cause, location, hours, date, description, external_url, source')
          .order('date', { ascending: true })
        setListings(data || [])

        if (user?.id) {
          const { data: saved } = await supabase
            .from('saved_opportunities')
            .select('listing_id')
            .eq('user_id', user.id)
          setSavedIds(new Set((saved || []).map(r => String(r.listing_id))))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  // Partition into future-dated groups and dateless
  const { dated, dateless } = useMemo(() => {
    const dated = []   // [{ dateObj, dateStr, items }]
    const dateless = []

    const dateMap = {}
    for (const l of listings) {
      if (savedOnly && !savedIds.has(String(l.id))) continue
      const d = parseFutureDate(l.date)
      if (d) {
        const key = d.toISOString().split('T')[0]
        if (!dateMap[key]) {
          dateMap[key] = { dateObj: d, dateStr: fmtDateHeader(d), items: [] }
          dated.push(dateMap[key])
        }
        dateMap[key].items.push(l)
      } else {
        dateless.push(l)
      }
    }
    dated.sort((a, b) => a.dateObj - b.dateObj)
    return { dated, dateless }
  }, [listings, savedIds, savedOnly])

  const toggleSave = async (l) => {
    if (!user && !isGuest) return
    if (isGuest || !user) { onSignUp?.(); return }
    const idStr = String(l.id)
    if (savedIds.has(idStr)) {
      await supabase.from('saved_opportunities').delete().eq('user_id', user.id).eq('listing_id', idStr)
      setSavedIds(prev => { const s = new Set(prev); s.delete(idStr); return s })
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: user.id, listing_id: idStr })
      setSavedIds(prev => new Set([...prev, idStr]))
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 40px' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Calendar</div>
            <div style={{ fontSize: 13, color: T.textSub, marginTop: 2 }}>Upcoming volunteer opportunities</div>
          </div>
          {user && (
            <button
              onClick={() => { setSavedOnly(v => !v); setExpanded(null) }}
              style={{ background: savedOnly ? T.primary : T.card, color: savedOnly ? '#fff' : T.textSub, border: `1px solid ${savedOnly ? T.primary : T.border}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              🔖 Saved
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading...</div>
        ) : dated.length === 0 && dateless.length === 0 ? (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSub, marginBottom: 6 }}>
              {savedOnly ? "You haven't saved any opportunities yet." : 'No upcoming opportunities right now.'}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>
              {savedOnly ? 'Browse opportunities and tap the bookmark to save.' : 'Check back soon.'}
            </div>
          </div>
        ) : (
          <>
            {/* dated timeline */}
            {dated.map(group => (
              <div key={group.dateObj.toISOString()} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 4 }}>
                  {group.dateStr}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(l => (
                    <OppCard
                      key={l.id}
                      l={l}
                      expanded={expanded === l.id}
                      onToggle={() => setExpanded(expanded === l.id ? null : l.id)}
                      saved={savedIds.has(String(l.id))}
                      onSave={() => toggleSave(l)}
                      user={user}
                      isGuest={isGuest}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* no date section */}
            {dateless.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setNoDateOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 8 }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>No date listed ({dateless.length})</span>
                  <span style={{ fontSize: 14, color: T.textMuted, transform: noDateOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
                </button>
                {noDateOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dateless.map(l => (
                      <OppCard
                        key={l.id}
                        l={l}
                        expanded={expanded === l.id}
                        onToggle={() => setExpanded(expanded === l.id ? null : l.id)}
                        saved={savedIds.has(String(l.id))}
                        onSave={() => toggleSave(l)}
                        user={user}
                        isGuest={isGuest}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
