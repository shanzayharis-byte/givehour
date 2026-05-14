import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmtHours(h) {
  if (!h) return ''
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

function toLocalDateStr(isoStr) {
  const d = new Date(isoStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Calendar({ user }) {
  const today = new Date()
  const [year, setYear]       = useState(today.getFullYear())
  const [month, setMonth]     = useState(today.getMonth())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // 'YYYY-MM-DD'

  useEffect(() => {
    if (!user?.id) return
    supabase.from('hours_log').select('*').eq('user_id', user.id).order('logged_at').then(({ data }) => {
      setEntries(data || [])
      setLoading(false)
    })
  }, [user?.id])

  // group entries by local date string
  const byDate = {}
  for (const e of entries) {
    if (!e.logged_at) continue
    const key = toLocalDateStr(e.logged_at)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(e)
  }

  const todayStr = toLocalDateStr(today.toISOString())

  // calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  const selectedEntries = selected ? (byDate[selected] || []) : []
  const totalHoursThisMonth = Object.entries(byDate)
    .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .reduce((sum, [, arr]) => sum + arr.reduce((s, e) => s + (e.hours || 0), 0), 0)

  const activeDaysThisMonth = Object.keys(byDate).filter(k =>
    k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)
  ).length

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 40px' }}>

        {/* header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Calendar</div>
          <div style={{ fontSize: 13, color: T.textSub, marginTop: 2 }}>Your volunteer history</div>
        </div>

        {/* month summary chips */}
        {!loading && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ background: T.primaryLight, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: T.primary, fontWeight: 600 }}>
              {fmtHours(totalHoursThisMonth) || '0h'} this month
            </div>
            <div style={{ background: T.accentLight, borderRadius: 10, padding: '8px 14px', fontSize: 13, color: T.accent, fontWeight: 600 }}>
              {activeDaysThisMonth} day{activeDaysThisMonth !== 1 ? 's' : ''} active
            </div>
          </div>
        )}

        {/* calendar card */}
        <div style={{ background: T.card, borderRadius: 18, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 20 }}>
          {/* month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.textSub, padding: '4px 8px', borderRadius: 8 }}>‹</button>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{MONTHS[month]} {year}</div>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.textSub, padding: '4px 8px', borderRadius: 8 }}>›</button>
          </div>

          {/* day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 12px 4px' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: T.textMuted, paddingBottom: 6 }}>{d}</div>
            ))}
          </div>

          {/* grid */}
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: T.textMuted, fontSize: 14 }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 12px 12px', gap: 2 }}>
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasEntries = !!byDate[dateStr]
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selected
                const dayHours = hasEntries ? byDate[dateStr].reduce((s, e) => s + (e.hours || 0), 0) : 0

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelected(isSelected ? null : dateStr)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 10,
                      border: isSelected ? `2px solid ${T.primary}` : isToday ? `2px solid ${T.accent}` : '2px solid transparent',
                      background: isSelected ? T.primaryLight : hasEntries ? '#F2FBF5' : 'transparent',
                      cursor: hasEntries || isToday ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '4px 2px',
                      gap: 2,
                      transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? T.primary : isToday ? T.accent : T.text }}>
                      {day}
                    </span>
                    {hasEntries && (
                      <span style={{ fontSize: 9, color: isSelected ? T.primary : T.primaryDark, fontWeight: 600, lineHeight: 1 }}>
                        {fmtHours(dayHours)}
                      </span>
                    )}
                    {hasEntries && (
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? T.primary : T.primary, marginTop: 1 }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* selected day detail */}
        {selected && (
          <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: T.textMuted }}>✕</button>
            </div>

            {selectedEntries.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', color: T.textMuted, fontSize: 14 }}>No hours logged this day.</div>
            ) : (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedEntries.map(e => (
                  <div key={e.id} style={{ background: T.bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{e.org || 'Volunteer Session'}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.primary, flexShrink: 0, marginLeft: 8 }}>{fmtHours(e.hours)}</div>
                    </div>
                    {e.category && (
                      <div style={{ display: 'inline-block', background: T.primaryLight, color: T.primary, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 8px', marginBottom: e.notes ? 6 : 0 }}>
                        {e.category}
                      </div>
                    )}
                    {e.notes && (
                      <div style={{ fontSize: 12, color: T.textSub, marginTop: 4, lineHeight: 1.5 }}>{e.notes}</div>
                    )}
                    {(e.start_time || e.location) && (
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                        {e.start_time && e.end_time ? `${e.start_time} – ${e.end_time}` : ''}
                        {e.start_time && e.location ? '  ·  ' : ''}
                        {e.location || ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* empty state */}
        {!loading && entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.textSub, marginBottom: 6 }}>No hours logged yet</div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>Log your volunteer hours and they'll show up here on the calendar.</div>
          </div>
        )}

      </div>
    </div>
  )
}
