import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const CATEGORIES = ['Community', 'Sr. Community', 'Fund Raising', 'Environmental', 'Educational', 'Religious', 'Healthcare', 'Arts']

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
  const [totalHours, setTotalHours] = useState(0)
  const [form, setForm]             = useState(EMPTY)
  const [editEntry, setEditEntry]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [loading, setLoading]       = useState(true)
  const [isDesktop, setIsDesktop]   = useState(window.innerWidth >= 1024)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const loadHistory = async () => {
    try {
      const { data } = await supabase.from('hours_log').select('*').eq('user_id', user?.id).order('logged_at', { ascending: false })
      const rows = data || []
      setHistory(rows)
      setTotalHours(rows.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0))
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

  const handleEdit = (r) => {
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
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleCancelEdit = () => { setEditEntry(null); setForm(EMPTY) }

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
        setEditEntry(null)
      } else {
        const { error: err } = await supabase.from('hours_log').insert({ user_id: user?.id, ...payload })
        if (err) throw err
      }
      setSubmitted(true)
      setForm(EMPTY)
      await loadHistory()
      setTimeout(() => setSubmitted(false), 2500)
    } catch (e) { console.error('[submit]', e) }
  }

  const pastOrgs  = [...new Set(history.map(r => r.org).filter(Boolean))]
  const suggestions = form.org
    ? pastOrgs.filter(o => o.toLowerCase().includes(form.org.toLowerCase()) && o !== form.org)
    : pastOrgs.slice(0, 5)

  const inp = { background: '#F4F6F8', border: '1.5px solid #DCE0E5', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: T.text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, fontWeight: 600, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }
  const ready = form.hours && parseFloat(form.hours) > 0

  const totalCard = (
    <div style={{ background: 'linear-gradient(135deg, #18A050, #0E7A3C)', borderRadius: 12, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{fmtHours(totalHours)}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>total hours</div>
      </div>
      <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
      <div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{new Set(history.map(r => r.org).filter(Boolean)).size}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>organizations</div>
      </div>
      <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
      <div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{history.length}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>sessions</div>
      </div>
    </div>
  )

  const logForm = (
    <div ref={formRef} style={{ background: T.card, border: `1px solid ${editEntry ? T.primary : T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{editEntry ? 'Edit entry' : 'Log new hours'}</div>
        {editEntry && <button onClick={handleCancelEdit} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: T.textSub, cursor: 'pointer' }}>Cancel</button>}
      </div>

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

      {/* Date */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Date</label>
        <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} style={{ ...inp, fontSize: 15 }} />
      </div>

      {/* Start / End time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Start Time <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
          <input type="time" value={form.startTime} onChange={e => handleTimeChange('startTime', e.target.value)} style={{ ...inp, fontSize: 15 }} />
        </div>
        <div>
          <label style={lbl}>End Time <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
          <input type="time" value={form.endTime} onChange={e => handleTimeChange('endTime', e.target.value)} style={{ ...inp, fontSize: 15 }} />
        </div>
      </div>

      {/* Hours */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Hours {form.startTime && form.endTime && <span style={{ fontWeight: 400, textTransform: 'none', color: T.primary }}>(auto-calculated)</span>}</label>
        <input type="number" min="0.1" step="0.25" value={form.hours} onChange={e => setField('hours', e.target.value)} style={{ ...inp, fontSize: 15 }} placeholder="e.g. 2.5" />
      </div>

      {/* Location */}
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Location <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
        <input value={form.location} onChange={e => setField('location', e.target.value)} style={inp} placeholder="e.g. Oakland, CA" />
      </div>

      {/* Activity */}
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Activity <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
        <textarea rows={3} value={form.notes} onChange={e => setField('notes', e.target.value)} style={{ ...inp, resize: 'vertical' }} placeholder="What did you do?" />
      </div>

      <button onClick={handleSubmit} disabled={!ready}
        style={{ width: '100%', padding: 13, borderRadius: 10, border: submitted ? `2px solid ${T.primary}` : 'none', background: submitted ? T.primaryLight : (!ready ? '#B8D8C8' : T.primary), color: submitted ? T.primary : '#fff', fontSize: 14, fontWeight: 700, cursor: ready ? 'pointer' : 'default' }}>
        {submitted ? '✓ Saved!' : editEntry ? 'Save Changes' : 'Submit Hours'}
      </button>
    </div>
  )

  const historySection = (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>Recent history</div>
      {history.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏱</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>No hours logged yet</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>Submit your first entry to start tracking.</div>
        </div>
      ) : history.map(r => {
        const isConfirming = confirmDelete === r.id
        const isEditing    = editEntry?.id === r.id
        return (
          <div key={r.id} style={{ background: T.card, border: `1px solid ${isConfirming ? '#E05252' : isEditing ? T.primary : T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.org || 'Independent'}</div>
                  {r.category && <span style={{ fontSize: 10, fontWeight: 700, background: T.primaryLight, color: T.primary, borderRadius: 20, padding: '2px 8px' }}>{r.category}</span>}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>
                  {r.logged_at ? new Date(r.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  {r.start_time && r.end_time && ` · ${r.start_time} – ${r.end_time}`}
                </div>
                {r.location && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>📍 {r.location}</div>}
                {r.notes && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{r.notes}</div>}
              </div>
              <span style={{ background: T.primaryLight, color: T.primary, fontSize: 14, fontWeight: 700, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>{fmtHours(r.hours)}</span>
            </div>
            {isConfirming ? (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#E05252', fontWeight: 600, flex: 1 }}>Delete this entry?</span>
                <button onClick={() => setConfirmDelete(null)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleDelete(r.id)} disabled={deleting} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#E05252', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{deleting ? '...' : 'Delete'}</button>
              </div>
            ) : (
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <button onClick={() => handleEdit(r)} style={{ background: T.primaryLight, border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: T.primary, cursor: 'pointer' }}>✏️ Edit</button>
                <button onClick={() => setConfirmDelete(r.id)} style={{ background: '#FFF0F0', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#E05252', cursor: 'pointer' }}>🗑 Delete</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Log Hours</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Track your volunteer time</div>
      </div>
      <div style={{ padding: isDesktop ? '32px 40px' : '16px 20px' }}>
        {totalCard}
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {logForm}
            {historySection}
          </div>
        ) : (
          <>{logForm}{historySection}</>
        )}
      </div>
    </div>
  )
}
