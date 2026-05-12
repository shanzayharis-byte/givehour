import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

export default function LogHours({ user }) {
  const [history, setHistory]         = useState([])
  const [totalHours, setTotalHours]   = useState(0)
  const [form, setForm]               = useState({ org: '', date: '', hours: '', notes: '' })
  const [editEntry, setEditEntry]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]       = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [loading, setLoading]         = useState(true)
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
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
    async function load() {
      await loadHistory()
      setLoading(false)
    }
    load()
  }, [user])

  const handleEdit = (r) => {
    setEditEntry(r)
    setConfirmDelete(null)
    setForm({
      org:   r.org || '',
      date:  r.logged_at ? new Date(r.logged_at).toISOString().split('T')[0] : '',
      hours: String(r.hours),
      notes: r.notes || '',
    })
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleCancelEdit = () => {
    setEditEntry(null)
    setForm({ org: '', date: '', hours: '', notes: '' })
  }

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
    try {
      if (editEntry) {
        const { error: err } = await supabase.from('hours_log').update({
          org:       form.org || 'Independent',
          hours:     parseFloat(form.hours),
          notes:     form.notes,
          logged_at: form.date ? new Date(form.date).toISOString() : editEntry.logged_at,
        }).eq('id', editEntry.id).eq('user_id', user?.id)
        if (err) throw err
        setEditEntry(null)
      } else {
        const { error: err } = await supabase.from('hours_log').insert({
          user_id:   user?.id,
          org:       form.org || 'Independent',
          hours:     parseFloat(form.hours),
          notes:     form.notes,
          logged_at: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        })
        if (err) throw err
      }
      setSubmitted(true)
      setForm({ org: '', date: '', hours: '', notes: '' })
      await loadHistory()
      setTimeout(() => setSubmitted(false), 2500)
    } catch (e) { console.error('[submit]', e) }
  }

  const pastOrgs = [...new Set(history.map(r => r.org).filter(Boolean))]
  const suggestions = form.org
    ? pastOrgs.filter(o => o.toLowerCase().includes(form.org.toLowerCase()) && o !== form.org)
    : pastOrgs.slice(0, 5)

  const inputStyle = { background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 16, color: T.text, outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }
  const ready      = form.hours && parseFloat(form.hours) > 0

  const totalCard = (
    <div style={{ background: 'linear-gradient(135deg, #18A050, #0E7A3C)', borderRadius: 12, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalHours}</div>
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
        {editEntry && (
          <button onClick={handleCancelEdit} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: T.textSub, cursor: 'pointer' }}>Cancel</button>
        )}
      </div>

      <div style={{ marginBottom: 14, position: 'relative' }}>
        <label style={labelStyle}>Organization <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
        <input
          value={form.org}
          onChange={e => { setForm(f => ({ ...f, org: e.target.value })); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          style={inputStyle}
          placeholder="e.g. Bay Area Food Bank"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginTop: 2 }}>
            {suggestions.map(s => (
              <div key={s} onMouseDown={() => { setForm(f => ({ ...f, org: s })); setShowSuggestions(false) }}
                style={{ padding: '10px 14px', fontSize: 13, color: T.text, cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, fontSize: 16 }} />
        </div>
        <div>
          <label style={labelStyle}>Hours</label>
          <input type="number" min="0.5" step="0.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} style={{ ...inputStyle, fontSize: 16 }} placeholder="e.g. 3" />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
        <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What did you do?" />
      </div>

      <button onClick={handleSubmit} disabled={!ready} style={{ width: '100%', padding: 13, borderRadius: 10, border: submitted ? `2px solid ${T.primary}` : 'none', background: submitted ? T.primaryLight : (!ready ? '#B8D8C8' : T.primary), color: submitted ? T.primary : '#fff', fontSize: 14, fontWeight: 700, cursor: ready ? 'pointer' : 'default' }}>
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
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.org || 'Independent'}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  {r.logged_at ? new Date(r.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </div>
                {r.notes && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{r.notes}</div>}
              </div>
              <span style={{ background: T.primaryLight, color: T.primary, fontSize: 15, fontWeight: 700, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>{r.hours}h</span>
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
