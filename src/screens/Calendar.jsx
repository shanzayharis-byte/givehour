import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parseFutureDate(str) {
  if (!str || typeof str !== 'string') return null
  const parts = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const d = parts
    ? new Date(+parts[1], +parts[2] - 1, +parts[3], 12, 0, 0)
    : new Date(str)
  if (isNaN(d.getTime())) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return d >= today ? d : null
}

function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isHtml(str) { return /<[a-z][\s\S]*>/i.test(str || '') }
function sanitize(html) { return (html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<iframe[\s\S]*?<\/iframe>/gi, '') }

function OppCard({ l, expanded, onToggle, saved, onSave, user, isGuest }) {
  const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
  return (
    <div style={{ background: T.card, border: `1px solid ${expanded ? T.primary : T.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {l.org}{l.location ? ` · ${l.location}` : ''}
          </div>
        </div>
        <div style={{ background: cause.bg, color: cause.text, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>{l.cause || 'General'}</div>
        <span style={{ fontSize: 14, color: T.textMuted, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${T.border}` }}>
          {l.hours && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 10, marginBottom: 6 }}>⏱ {l.hours} hrs</div>}
          {l.description && (
            isHtml(l.description)
              ? <div dangerouslySetInnerHTML={{ __html: sanitize(l.description) }}
                  style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, marginBottom: 12,
                    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} />
              : <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, marginBottom: 12,
                    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {l.description}
                </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {l.external_url && (
              <a href={l.external_url} target="_blank" rel="noopener noreferrer"
                style={{ background: T.primary, color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                Visit site →
              </a>
            )}
            {(user || isGuest) && (
              <button onClick={(e) => { e.stopPropagation(); onSave() }}
                style={{ background: saved ? T.primaryLight : T.bg, color: saved ? T.primary : T.textSub, border: `1px solid ${saved ? T.primary : T.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saved ? '✓ Saved' : '🔖 Save'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Calendar({ user, onSignUp, onLogin, isGuest }) {
  const today = new Date()
  const [year, setYear]           = useState(today.getFullYear())
  const [month, setMonth]         = useState(today.getMonth())
  const [listings, setListings]   = useState([])
  const [savedIds, setSavedIds]   = useState(new Set())
  const [loading, setLoading]     = useState(true)
  const [savedOnly, setSavedOnly] = useState(false)
  const [selectedKey, setSelectedKey] = useState(localKey(today)) // default to today
  const [expanded, setExpanded]   = useState(null)
  const [noDateOpen, setNoDateOpen] = useState(false)

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
            .from('saved_opportunities').select('listing_id').eq('user_id', user.id)
          setSavedIds(new Set((saved || []).map(r => String(r.listing_id))))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const { byKey, dateless } = useMemo(() => {
    const byKey = {}  // 'YYYY-MM-DD' → { dateObj, items[] }
    const dateless = []
    for (const l of listings) {
      if (savedOnly && !savedIds.has(String(l.id))) continue
      const d = parseFutureDate(l.date)
      if (d) {
        const key = localKey(d)
        if (!byKey[key]) byKey[key] = { dateObj: d, items: [] }
        byKey[key].items.push(l)
      } else if (!l.date) {
        dateless.push(l)
      }
    }
    return { byKey, dateless }
  }, [listings, savedIds, savedOnly])

  const toggleSave = async (l) => {
    if (!user && !isGuest) return
    if (isGuest || !user) { onSignUp?.(); return }
    const idStr = String(l.id)
    if (savedIds.has(idStr)) {
      const { error } = await supabase.from('saved_opportunities').delete().eq('user_id', user.id).eq('listing_id', idStr)
      if (error) { console.error('Failed to unsave:', error); return }
      setSavedIds(prev => { const s = new Set(prev); s.delete(idStr); return s })
    } else {
      const { error } = await supabase.from('saved_opportunities').insert({ user_id: user.id, listing_id: idStr })
      if (error) { console.error('Failed to save:', error); return }
      setSavedIds(prev => new Set([...prev, idStr]))
    }
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedKey(null); setExpanded(null)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedKey(null); setExpanded(null)
  }

  const todayKey = localKey(today)
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const selectedItems = selectedKey ? (byKey[selectedKey]?.items || []) : []
  const selectedLabel = selectedKey
    ? new Date(year, month, parseInt(selectedKey.split('-')[2])).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

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
              onClick={() => { setSavedOnly(v => !v); setSelectedKey(null); setExpanded(null); setNoDateOpen(false) }}
              style={{ background: savedOnly ? T.primary : T.card, color: savedOnly ? '#fff' : T.textSub, border: `1px solid ${savedOnly ? T.primary : T.border}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              🔖 Saved
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading...</div>
        ) : (
          <>
            {/* calendar grid */}
            <div style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 16 }}>
              {/* month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${T.border}` }}>
                <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: T.textSub, padding: '2px 6px', borderRadius: 6 }}>‹</button>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{MONTHS[month]} {year}</div>
                <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: T.textSub, padding: '2px 6px', borderRadius: 6 }}>›</button>
              </div>

              {/* weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '5px 6px 1px' }}>
                {WEEKDAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: T.textMuted, paddingBottom: 2 }}>{d[0]}</div>
                ))}
              </div>

              {/* day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 6px 6px', gap: 1 }}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const group = byKey[key]
                  const isToday = key === todayKey
                  const isSelected = key === selectedKey
                  const count = group?.items.length || 0

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!group) return
                        setSelectedKey(isSelected ? null : key)
                        setExpanded(null)
                      }}
                      style={{
                        height: 36,
                        borderRadius: 7,
                        border: isSelected ? `2px solid ${T.primary}` : isToday ? `2px solid ${T.accent}` : '2px solid transparent',
                        background: isSelected ? T.primaryLight : group ? '#F2FBF5' : 'transparent',
                        cursor: group ? 'pointer' : 'default',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '1px', gap: 0, transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? T.primary : isToday ? T.accent : T.text, lineHeight: 1 }}>
                        {day}
                      </span>
                      {count > 0 && (
                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: isSelected ? T.primary : T.primary, marginTop: 1 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* selected day listings */}
            {selectedKey && (
              <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.primary}`, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{selectedLabel}</div>
                  <button onClick={() => { setSelectedKey(null); setExpanded(null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: T.textMuted, padding: '0 2px' }}>✕</button>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedItems.map(l => (
                    <OppCard key={l.id} l={l}
                      expanded={expanded === l.id}
                      onToggle={() => setExpanded(expanded === l.id ? null : l.id)}
                      saved={savedIds.has(String(l.id))}
                      onSave={() => toggleSave(l)}
                      user={user} isGuest={isGuest} />
                  ))}
                </div>
              </div>
            )}

            {/* empty state — no dated listings this month AND nothing selected */}
            {!selectedKey && Object.keys(byKey).length === 0 && dateless.length === 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 40, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.textSub, marginBottom: 6 }}>
                  {savedOnly ? "You haven't saved any opportunities yet." : 'No upcoming opportunities right now.'}
                </div>
                <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>
                  {savedOnly ? 'Browse opportunities and tap the bookmark to save.' : 'Check back soon.'}
                </div>
              </div>
            )}

            {/* no date listed */}
            {dateless.length > 0 && (
              <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                <button
                  onClick={() => setNoDateOpen(v => !v)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.textSub }}>No date listed <span style={{ color: T.textMuted, fontWeight: 400 }}>({dateless.length})</span></span>
                  <span style={{ fontSize: 14, color: T.textMuted, transform: noDateOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
                </button>
                {noDateOpen && (
                  <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                    {dateless.map(l => (
                      <OppCard key={l.id} l={l}
                        expanded={expanded === l.id}
                        onToggle={() => setExpanded(expanded === l.id ? null : l.id)}
                        saved={savedIds.has(String(l.id))}
                        onSave={() => toggleSave(l)}
                        user={user} isGuest={isGuest} />
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
