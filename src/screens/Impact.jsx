import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const BADGES = [
  { icon: '🌱', label: 'First Step',      threshold: 1 },
  { icon: '👟', label: 'Getting Started', threshold: 5 },
  { icon: '🔥', label: 'On Fire',         threshold: 10 },
  { icon: '⭐', label: 'Committed',       threshold: 25 },
  { icon: '💯', label: 'Century Club',    threshold: 50 },
  { icon: '🚀', label: 'Superstar',       threshold: 100 },
  { icon: '🏆', label: 'Legend',          threshold: 250 },
]

function fmtHours(h) {
  if (!h) return '0h'
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

export default function Impact({ user, onNavigate }) {
  const [history, setHistory]         = useState([])
  const [totalHours, setTotalHours]   = useState(0)
  const [hoursGoal, setHoursGoal]     = useState(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput]     = useState('')
  const [selectedYear, setSelectedYear] = useState(null)
  const [showLetter, setShowLetter]   = useState(false)
  const [letter, setLetter]           = useState('')
  const [letterLoading, setLetterLoading] = useState(false)
  const [highlight, setHighlight]     = useState('')
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [{ data: rows }, { data: prof }] = await Promise.all([
          supabase.from('hours_log').select('*').eq('user_id', user?.id).order('logged_at'),
          supabase.from('users').select('hours_goal').eq('id', user?.id).maybeSingle(),
        ])
        const entries = rows || []
        setHistory(entries)
        setTotalHours(entries.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0))
        if (prof?.hours_goal) { setHoursGoal(prof.hours_goal); setGoalInput(String(prof.hours_goal)) }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [user])

  const saveGoal = async () => {
    const g = parseFloat(goalInput)
    if (!g || g <= 0) return
    try {
      await supabase.from('users').update({ hours_goal: g }).eq('id', user?.id)
      setHoursGoal(g)
      setEditingGoal(false)
    } catch (e) { console.error(e) }
  }

  // derived data
  const orgCount  = new Set(history.map(r => r.org).filter(Boolean)).size
  const sessions  = history.length

  const byYear = {}
  for (const r of history) {
    if (!r.logged_at) continue
    const y = new Date(r.logged_at).getFullYear()
    byYear[y] = (byYear[y] || 0) + (parseFloat(r.hours) || 0)
  }
  const years        = Object.keys(byYear).sort()
  const maxYearHours = Math.max(...Object.values(byYear), 1)

  const byCat = {}
  for (const r of history) {
    const cat = r.category || 'Uncategorized'
    byCat[cat] = (byCat[cat] || 0) + (parseFloat(r.hours) || 0)
  }
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1])

  const pct       = hoursGoal ? Math.min(100, Math.round((totalHours / hoursGoal) * 100)) : 0
  const nextBadge = BADGES.find(b => totalHours < b.threshold)

  const openLetterModal = () => {
    setLetter('')
    setShowLetter(true)
  }

  const generateLetter = async () => {
    setLetterLoading(true)
    try {
      const topCats   = catEntries.slice(0, 3).map(([c]) => c).join(', ') || 'community service'
      const orgNames  = [...new Set(history.map(r => r.org).filter(Boolean))].join(', ') || 'various organizations'
      const allDates  = history.map(r => r.logged_at).filter(Boolean).map(d => new Date(d)).sort((a, b) => a - b)
      const dateRange = allDates.length >= 2
        ? `${allDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to ${allDates[allDates.length - 1].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
        : 'the past year'
      const activityNotes = history.filter(r => r.notes).slice(0, 8).map(r => `- ${r.org || 'Independent'}: ${r.notes}`).join('\n')

      const res  = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user?.name || 'Student', totalHours: Math.round(totalHours), orgs: orgNames, categories: topCats, dateRange, highlight, notes: activityNotes }),
      })
      const data = await res.json()
      setLetter(data.letter || 'Could not generate draft.')
    } catch (e) { setLetter('Could not generate draft at this time.') }
    setLetterLoading(false)
  }

  const copyEssay = () => navigator.clipboard.writeText(letter).catch(() => {})

  const inp = { background: '#F4F6F8', border: '1.5px solid #DCE0E5', borderRadius: 10, padding: '9px 14px', fontSize: 15, color: T.text, outline: 'none', fontFamily: 'inherit' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{user?.name ? `${user.name.split(' ')[0]}'s Impact` : 'My Impact'}</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Your volunteer story so far</div>
      </div>

      <div style={{ padding: isDesktop ? '28px 40px' : '16px 20px', maxWidth: isDesktop ? 800 : 'none', margin: '0 auto' }}>

        {/* stats card */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {[[Math.round(totalHours), 'total hours', T.primary, T.primaryLight], [orgCount, 'organizations', T.accent, T.accentLight], [sessions, 'sessions', T.warning, T.warningLight]].map(([val, lbl, color, bg]) => (
            <div key={lbl} style={{ flex: 1, background: bg, borderRadius: 14, padding: '16px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 11, color, opacity: 0.8, marginTop: 4 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* goal + progress */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hoursGoal && !editingGoal ? 12 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>🎯 Hours Goal</div>
            {!editingGoal && (
              <button onClick={() => { setEditingGoal(true); setGoalInput(hoursGoal ? String(hoursGoal) : '') }}
                style={{ background: T.primaryLight, border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: T.primary, cursor: 'pointer' }}>
                {hoursGoal ? '✏️ Edit' : '+ Set goal'}
              </button>
            )}
          </div>
          {editingGoal && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
              <input type="number" min="1" step="1" value={goalInput} onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveGoal()} placeholder="e.g. 50" autoFocus style={{ ...inp, width: 100 }} />
              <span style={{ fontSize: 13, color: T.textSub }}>hours</span>
              <button onClick={saveGoal} style={{ background: T.primary, border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingGoal(false)} style={{ background: 'none', border: 'none', fontSize: 13, color: T.textMuted, cursor: 'pointer' }}>Cancel</button>
            </div>
          )}
          {hoursGoal && !editingGoal && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: T.textSub }}>{fmtHours(totalHours)} of {hoursGoal}h goal</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: pct >= 100 ? T.primary : T.text }}>{pct}%</span>
              </div>
              <div style={{ height: 10, background: '#E8EAED', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? T.primary : 'linear-gradient(90deg, #18A050, #34C97A)', borderRadius: 20, transition: 'width 0.5s ease' }} />
              </div>
              {pct >= 100 && <div style={{ marginTop: 7, fontSize: 12, color: T.primary, fontWeight: 600 }}>🎉 Goal reached! Keep going!</div>}
              {nextBadge && pct < 100 && <div style={{ marginTop: 6, fontSize: 11, color: T.textMuted }}>Next badge: {nextBadge.icon} {nextBadge.label} at {nextBadge.threshold}h</div>}
            </>
          )}
        </div>

        {/* badges */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>🏅 Badges</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {BADGES.map(b => {
              const earned = totalHours >= b.threshold
              return (
                <div key={b.label} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: earned ? T.primaryLight : '#F4F6F8', border: `1.5px solid ${earned ? T.primary : '#DCE0E5'}`, borderRadius: 12, padding: '12px 14px', minWidth: 70, opacity: earned ? 1 : 0.5 }}>
                  <span style={{ fontSize: 24, filter: earned ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: earned ? T.primary : T.textMuted, textAlign: 'center', lineHeight: 1.3 }}>{b.label}</span>
                  <span style={{ fontSize: 9, color: earned ? T.primary : T.textMuted }}>{b.threshold}h</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* yearly chart */}
        {years.length > 0 && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>📅 Hours by Year</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 14 }}>Tap a bar to see the breakdown</div>
            <div style={{ display: 'flex', gap: 10, height: 160, alignItems: 'stretch' }}>
              {years.map(year => {
                const hrs  = byYear[year]
                const barH = Math.max(Math.round((hrs / maxYearHours) * 100), 4)
                return (
                  <div key={year} onClick={() => setSelectedYear(year)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, height: 18, lineHeight: '18px' }}>{Math.round(hrs)}h</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                      <div style={{ width: '70%', height: barH, background: 'linear-gradient(180deg, #34C97A, #18A050)', borderRadius: '4px 4px 0 0', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'} />
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, height: 18, lineHeight: '18px', marginTop: 4 }}>{year}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* year breakdown popup */}
        {selectedYear && (() => {
          const yearEntries = history
            .filter(r => r.logged_at && new Date(r.logged_at).getFullYear() === parseInt(selectedYear))
            .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
          const yearTotal = yearEntries.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0)
          const byCat = {}
          for (const r of yearEntries) {
            const cat = r.category || 'Uncategorized'
            byCat[cat] = (byCat[cat] || 0) + (parseFloat(r.hours) || 0)
          }
          return (
            <>
              <div onClick={() => setSelectedYear(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500 }} />
              <div style={{
                position: 'fixed',
                ...(isDesktop
                  ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, maxHeight: '82vh', borderRadius: 18 }
                  : { bottom: 0, left: 0, right: 0, maxHeight: '88vh', borderRadius: '18px 18px 0 0' }),
                background: '#fff', zIndex: 501, display: 'flex', flexDirection: 'column',
                boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
              }}>
                {/* header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{selectedYear} Breakdown</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{Math.round(yearTotal)}h across {yearEntries.length} session{yearEntries.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button onClick={() => setSelectedYear(null)} style={{ background: T.bg, border: 'none', borderRadius: 8, width: 30, height: 30, fontSize: 16, cursor: 'pointer', color: T.textSub }}>✕</button>
                </div>

                <div style={{ overflowY: 'auto', padding: '16px 20px 24px', flex: 1 }}>
                  {/* by category mini bars */}
                  {Object.keys(byCat).length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>By Category</div>
                      {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, hrs]) => (
                        <div key={cat} style={{ marginBottom: 9 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{cat}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.primary }}>{fmtHours(hrs)}</span>
                          </div>
                          <div style={{ height: 6, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${yearTotal > 0 ? (hrs / yearTotal) * 100 : 0}%`, background: T.primary, borderRadius: 4 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* individual sessions */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Sessions</div>
                  {yearEntries.map(r => (
                    <div key={r.id} style={{ background: T.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.org || 'Independent'}</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                          {new Date(r.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {r.category && ` · ${r.category}`}
                          {r.location && ` · ${r.location}`}
                        </div>
                        {r.notes && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{r.notes}</div>}
                      </div>
                      <span style={{ background: T.primaryLight, color: T.primary, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>{fmtHours(r.hours)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        })()}

        {/* hours by category */}
        {catEntries.length > 0 && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Hours by Category</div>
            {catEntries.map(([cat, hrs]) => {
              const pct = totalHours > 0 ? (hrs / totalHours) * 100 : 0
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{cat}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.primary }}>{fmtHours(hrs)}</span>
                  </div>
                  <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: T.primary, borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* UC PIQ #7 draft */}
        <div style={{ border: `1.5px solid rgba(24,160,80,0.4)`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ fontSize: 28 }}>🎓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>Draft my Community PIQ</div>
              <div style={{ fontSize: 11, color: T.primary, fontWeight: 600, marginBottom: 6 }}>"What have you done to make your community a better place?"</div>
              <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, marginBottom: 12 }}>AI drafts a ~350-word first-person response based on your actual volunteer hours and activities.</div>
              <button onClick={openLetterModal} disabled={totalHours === 0} style={{ width: '100%', padding: 12, background: totalHours === 0 ? '#B8D8C8' : T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: totalHours === 0 ? 'default' : 'pointer' }}>
                {totalHours === 0 ? 'Log some hours first' : 'Draft my Community PIQ →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showLetter && (
        <>
          <div onClick={() => setShowLetter(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900 }} />
          <div style={{
            position: 'fixed',
            ...(isDesktop
              ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 580, maxHeight: '90vh', borderRadius: 18 }
              : { bottom: 0, left: 0, right: 0, maxHeight: '94vh', borderRadius: '18px 18px 0 0' }),
            background: '#fff', zIndex: 901, display: 'flex', flexDirection: 'column',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
          }}>
            {/* header */}
            <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>🎓 Draft my Community PIQ</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>"What have you done to make your community a better place?"</div>
              </div>
              <button onClick={() => setShowLetter(false)} style={{ background: T.bg, border: 'none', borderRadius: 8, width: 30, height: 30, fontSize: 16, cursor: 'pointer', color: T.textSub }}>✕</button>
            </div>

            {/* body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>

              {/* setup */}
              {!letter && !letterLoading && (
                <div>
                  <div style={{ background: T.bg, borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>
                    The AI will use your logged hours, organizations, and activity notes to write a first-person draft. Edit it before submitting — it's a starting point, not a final answer.
                  </div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anything specific to highlight? <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <textarea
                    value={highlight}
                    onChange={e => setHighlight(e.target.value)}
                    placeholder="e.g. I started an after-school tutoring program, or I want to focus on my work at Bay Area Food Bank"
                    rows={3}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', color: T.text, background: '#F4F6F8', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5, marginBottom: 16 }}
                  />
                  <button onClick={generateLetter} style={{ width: '100%', padding: 13, background: T.primary, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                    Draft my Community PIQ →
                  </button>
                </div>
              )}

              {/* loading */}
              {letterLoading && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: T.textMuted, fontSize: 14 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✍️</div>
                  Writing your draft…
                </div>
              )}

              {/* essay */}
              {letter && !letterLoading && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Draft</div>
                    <div style={{ fontSize: 11, color: letter.trim().split(/\s+/).length >= 300 ? T.primary : T.textMuted, fontWeight: 600 }}>
                      {letter.trim().split(/\s+/).length} / 350 words
                    </div>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.85, color: T.text, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{letter}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8, marginBottom: 4 }}>This is an AI draft — review, personalize, and make it your own before submitting.</div>
                </>
              )}
            </div>

            {/* footer */}
            {letter && !letterLoading && (
              <div style={{ padding: '12px 20px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={copyEssay} style={{ flex: 1, padding: '10px 0', background: T.primaryLight, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: T.primary, cursor: 'pointer' }}>📋 Copy draft</button>
                <button onClick={() => setLetter('')} style={{ padding: '10px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.textMuted, cursor: 'pointer' }}>↺ Redo</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
