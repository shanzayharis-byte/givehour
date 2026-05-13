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

export default function Impact({ user }) {
  const [history, setHistory]         = useState([])
  const [totalHours, setTotalHours]   = useState(0)
  const [hoursGoal, setHoursGoal]     = useState(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput]     = useState('')
  const [showLetter, setShowLetter]   = useState(false)
  const [letter, setLetter]           = useState('')
  const [letterLoading, setLetterLoading] = useState(false)
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

  const generateLetter = async () => {
    setLetterLoading(true)
    setShowLetter(true)
    try {
      const topCats = catEntries.slice(0, 3).map(([c]) => c).join(', ') || 'community service'
      const orgs    = [...new Set(history.map(r => r.org).filter(Boolean))].join(', ') || 'various organizations'
      const key     = import.meta.env.VITE_OPENAI_API_KEY
      if (!key) {
        setLetter(`Dear Admissions Committee,\n\nI am writing to confirm that ${user?.name || 'this student'} has completed ${Math.round(totalHours)} hours of volunteer service through the Give Hour platform.\n\nTheir dedication to ${topCats} demonstrates exceptional commitment to community service. They have contributed their time and energy to ${orgs}.\n\nWe are proud to recognize their service and recommend them highly.\n\nSincerely,\nGive Hour Platform`)
        setLetterLoading(false)
        return
      }
      const res  = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: `Write a concise community service letter for ${user?.name || 'this student'}, a high school student who has completed ${Math.round(totalHours)} hours of volunteer work through Give Hour. Their top categories are ${topCats}. They have worked with ${orgs}. Write it as if from the Give Hour platform. Keep it under 200 words.` }] }),
      })
      const json = await res.json()
      setLetter(json.choices?.[0]?.message?.content || 'Could not generate letter.')
    } catch (e) { setLetter('Could not generate letter at this time.') }
    setLetterLoading(false)
  }

  const inp = { background: '#F4F6F8', border: '1.5px solid #DCE0E5', borderRadius: 10, padding: '9px 14px', fontSize: 15, color: T.text, outline: 'none', fontFamily: 'inherit' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>My Impact</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Your volunteer story so far</div>
      </div>

      <div style={{ padding: isDesktop ? '28px 40px' : '16px 20px', maxWidth: isDesktop ? 800 : 'none', margin: '0 auto' }}>

        {/* stats card */}
        <div style={{ background: 'linear-gradient(135deg, #18A050, #0E7A3C)', borderRadius: 14, padding: 20, marginBottom: 14, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          {[[Math.round(totalHours), 'total hours'], [orgCount, 'organizations'], [sessions, 'sessions']].map(([val, lbl]) => (
            <div key={lbl}>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{lbl}</div>
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
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>📅 Hours by Year</div>
            <div style={{ display: 'flex', gap: 10, height: 160, alignItems: 'stretch' }}>
              {years.map(year => {
                const hrs  = byYear[year]
                const barH = Math.max(Math.round((hrs / maxYearHours) * 100), 4)
                return (
                  <div key={year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, height: 18, lineHeight: '18px' }}>{Math.round(hrs)}h</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                      <div style={{ width: '70%', height: barH, background: 'linear-gradient(180deg, #34C97A, #18A050)', borderRadius: '4px 4px 0 0' }} />
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, height: 18, lineHeight: '18px', marginTop: 4 }}>{year}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

        {/* college letter */}
        <div style={{ border: `1.5px solid rgba(24,160,80,0.4)`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ fontSize: 28 }}>🎓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>College letter generator</div>
              <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, marginBottom: 12 }}>Generate a personalized community service letter for your college applications based on your Give Hour activity.</div>
              <button onClick={generateLetter} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Generate letter →</button>
            </div>
          </div>
        </div>
      </div>

      {showLetter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>Your Community Service Letter</div>
            {letterLoading
              ? <div style={{ fontSize: 14, color: T.textMuted }}>Generating your letter...</div>
              : <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: T.text }}>{letter}</div>
            }
            <button onClick={() => setShowLetter(false)} style={{ width: '100%', padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', marginTop: 16, color: T.text }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
