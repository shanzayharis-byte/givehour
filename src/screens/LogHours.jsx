import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const CATEGORIES = ['Community', 'Sr. Community', 'Fund Raising', 'Environmental', 'Educational', 'Religious', 'Healthcare', 'Arts', 'Others']

function calcHours(start, end) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  return parseFloat((mins / 60).toFixed(2))
}

function fmtHours(h) {
  if (!h) return ''
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

const EMPTY = { org: '', date: '', category: '', startTime: '', endTime: '', hours: '', location: '', notes: '' }

export default function LogHours({ user }) {
  const [history, setHistory]       = useState([])
  const [form, setForm]             = useState(EMPTY)
  const [editEntry, setEditEntry]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [loading, setLoading]       = useState(true)
  const [isDesktop, setIsDesktop]   = useState(window.innerWidth >= 1024)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [expandedOrgs, setExpandedOrgs] = useState(new Set())
  const formRef = useRef(null)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const loadHistory = async () => {
    try {
      const { data } = await supabase.from('hours_log').select('*').eq('user_id', user?.id).order('logged_at', { ascending: false })
      setHistory(data || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    async function load() { await loadHistory(); setLoading(false) }
    load()
  }, [user])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleTimeChange = (key, val) => {
    const next = { ...form, [key]: val }
    const auto = calcHours(key === 'startTime' ? val : next.startTime, key === 'endTime' ? val : next.endTime)
    if (auto !== '') next.hours = auto
    setForm(next)
  }

  const openEdit = (r) => {
    setEditEntry(r)
    setConfirmDelete(null)
    setForm({
      org:       r.org || '',
      date:      r.logged_at ? new Date(r.logged_at).toISOString().split('T')[0] : '',
      category:  r.category || '',
      startTime: r.start_time || '',
      endTime:   r.end_time || '',
      hours:     String(r.hours),
      location:  r.location || '',
      notes:     r.notes || '',
    })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cancelEdit = () => { setEditEntry(null); setForm(EMPTY) }

  const handleDelete = async (id) => {
    setDeleting(true)
    try {
      const { error: err } = await supabase.from('hours_log').delete().eq('id', id).eq('user_id', user?.id)
      if (err) throw err
      setConfirmDelete(null)
      await loadHistory()
    } catch (e) { console.error('[delete]', e) }
    setDeleting(false)
  }

  const handleSubmit = async () => {
    if (!form.hours || parseFloat(form.hours) <= 0) return
    const payload = {
      org:        form.org || 'Independent',
      hours:      parseFloat(form.hours),
      notes:      form.notes,
      category:   form.category || null,
      start_time: form.startTime || null,
      end_time:   form.endTime || null,
      location:   form.location || null,
      logged_at:  form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    }
    try {
      if (editEntry) {
        const { error: err } = await supabase.from('hours_log').update(payload).eq('id', editEntry.id).eq('user_id', user?.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('hours_log').insert({ user_id: user?.id, ...payload })
        if (err) throw err
      }
      setSubmitted(true)
      await loadHistory()
      setTimeout(() => { setSubmitted(false); setEditEntry(null); setForm(EMPTY) }, 1200)
    } catch (e) { console.error('[submit]', e) }
  }

  const toggleOrg = (key) => setExpandedOrgs(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const pastOrgs    = [...new Set(history.map(r => r.org).filter(Boolean))]
  const suggestions = form.org
    ? pastOrgs.filter(o => o.toLowerCase().includes(form.org.toLowerCase()) && o !== form.org)
    : pastOrgs.slice(0, 5)

  const inp  = { background: '#F4F6F8', border: '1.5px solid #DCE0E5', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: T.text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl  = { fontSize: 11, fontWeight: 600, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }
  const ready = form.hours && parseFloat(form.hours) > 0

  // group history by org
  const grouped = []
  const seenOrgs = {}
  for (const r of history) {
    const key = r.org || 'Independent'
    if (seenOrgs[key] == null) { seenOrgs[key] = grouped.length; grouped.push({ key, rows: [] }) }
    grouped[seenOrgs[key]].rows.push(r)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Log Hours</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Track your volunteer time</div>
      </div>

      <div style={{ padding: isDesktop ? '28px 40px' : '16px 20px', maxWidth: isDesktop ? 700 : 'none', margin: '0 auto' }}>

        <div style={{ fontSize: 13, color: T.textSub, marginBottom: 14, lineHeight: 1.6 }}>
          Every hour counts. Log your sessions below to build your volunteer record and track your progress over time.
        </div>

        {/* inline form */}
        <div ref={formRef} style={{ background: T.card, border: `1.5px solid ${editEntry ? T.primary : T.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
          {editEntry && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.primaryLight, borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.primary }}>✏️ Editing: {editEntry.org || 'Independent'}</span>
              <button onClick={cancelEdit} style={{ background: 'none', border: 'none', fontSize: 12, color: T.primary, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          )}

          {/* Category */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Category <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {CATEGORIES.map(c => {
                const sel = form.category === c
                return (
                  <button key={c} onClick={() => setField('category', sel ? '' : c)}
                    style={{ padding: '6px 13px', borderRadius: 20, border: `1.5px solid ${sel ? T.primary : '#DCE0E5'}`, background: sel ? T.primaryLight : '#F4F6F8', color: sel ? T.primary : T.textSub, fontSize: 12, fontWeight: sel ? 700 : 400, cursor: 'pointer' }}>
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Organization */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={lbl}>Organization <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <input value={form.org} onChange={e => { setField('org', e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              style={inp} placeholder="e.g. Bay Area Food Bank" />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginTop: 2 }}>
                {suggestions.map(s => (
                  <div key={s} onMouseDown={() => { setField('org', s); setShowSuggestions(false) }}
                    style={{ padding: '10px 14px', fontSize: 13, color: T.text, cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date / Start / End — 3 cols on desktop, stacked on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} style={{ ...inp, fontSize: 15 }} />
            </div>
            <div>
              <label style={lbl}>Start Time <span style={{ fontWeight: 400, textTransform: 'none' }}>(opt.)</span></label>
              <input type="time" value={form.startTime} onChange={e => handleTimeChange('startTime', e.target.value)} style={{ ...inp, fontSize: 15 }} />
            </div>
            <div>
              <label style={lbl}>End Time <span style={{ fontWeight: 400, textTransform: 'none' }}>(opt.)</span></label>
              <input type="time" value={form.endTime} onChange={e => handleTimeChange('endTime', e.target.value)} style={{ ...inp, fontSize: 15 }} />
            </div>
          </div>

          {/* Hours / Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Hours {form.startTime && form.endTime && <span style={{ fontWeight: 400, textTransform: 'none', color: T.primary }}>(auto)</span>}</label>
              <input type="number" min="0.1" step="0.25" value={form.hours} onChange={e => setField('hours', e.target.value)} style={{ ...inp, fontSize: 15 }} placeholder="e.g. 2.5" />
            </div>
            <div>
              <label style={lbl}>Location <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input value={form.location} onChange={e => setField('location', e.target.value)} style={inp} placeholder="e.g. Oakland, CA" />
            </div>
          </div>

          {/* Activity */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Activity <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} placeholder="What did you do?" />
          </div>

          <button onClick={handleSubmit} disabled={!ready}
            style={{ width: '100%', padding: 13, borderRadius: 10, border: submitted ? `2px solid ${T.primary}` : 'none', background: submitted ? T.primaryLight : (!ready ? '#B8D8C8' : T.primary), color: submitted ? T.primary : '#fff', fontSize: 14, fontWeight: 700, cursor: ready ? 'pointer' : 'default' }}>
            {submitted ? '✓ Saved!' : editEntry ? 'Save Changes' : 'Log Hours'}
          </button>
        </div>

        {/* history */}
        {history.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>History</div>
            {grouped.map(({ key, rows: entries }) => {
              const expanded   = expandedOrgs.has(key)
              const groupHours = entries.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0)
              const categories = [...new Set(entries.map(r => r.category).filter(Boolean))]
              return (
                <div key={key} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                  <div onClick={() => toggleOrg(key)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{key}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {categories.map(c => (
                          <span key={c} style={{ fontSize: 10, fontWeight: 700, background: T.primaryLight, color: T.primary, borderRadius: 20, padding: '2px 8px' }}>{c}</span>
                        ))}
                        <span style={{ fontSize: 11, color: T.textMuted }}>{entries.length} session{entries.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <span style={{ background: T.primaryLight, color: T.primary, fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>{fmtHours(groupHours)}</span>
                    <span style={{ fontSize: 12, color: T.textMuted, flexShrink: 0, display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                  {expanded && (
                    <div style={{ borderTop: `1px solid ${T.border}` }}>
                      {entries.map((r, i) => {
                        const isConfirming = confirmDelete === r.id
                        return (
                          <div key={r.id} style={{ padding: '12px 16px', borderBottom: i < entries.length - 1 ? `1px solid ${T.border}` : 'none', background: isConfirming ? '#FFF5F5' : 'transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: T.textMuted }}>
                                  {r.logged_at ? new Date(r.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                  {r.start_time && r.end_time && ` · ${r.start_time} – ${r.end_time}`}
                                </div>
                                {r.location && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>📍 {r.location}</div>}
                                {r.notes && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{r.notes}</div>}
                              </div>
                              <span style={{ background: T.primaryLight, color: T.primary, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>{fmtHours(r.hours)}</span>
                            </div>
                            {isConfirming ? (
                              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, color: '#E05252', fontWeight: 600, flex: 1 }}>Delete this entry?</span>
                                <button onClick={() => setConfirmDelete(null)} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: T.text, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={() => handleDelete(r.id)} disabled={deleting} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: '#E05252', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{deleting ? '...' : 'Delete'}</button>
                              </div>
                            ) : (
                              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                                <button onClick={() => openEdit(r)} style={{ background: T.primaryLight, border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: T.primary, cursor: 'pointer' }}>✏️ Edit</button>
                                <button onClick={() => setConfirmDelete(r.id)} style={{ background: '#FFF0F0', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#E05252', cursor: 'pointer' }}>🗑 Delete</button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
