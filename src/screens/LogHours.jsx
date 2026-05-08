import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

export default function LogHours({ user }) {
  const [history, setHistory] = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [orgs, setOrgs] = useState([])
  const [form, setForm] = useState({ org: '', date: '', hours: '', notes: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

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
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    async function load() {
      await loadHistory()
      try {
        const { data } = await supabase.from('opportunities').select('org')
        const unique = [...new Set((data || []).map(r => r.org))]
        setOrgs(unique)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleSubmit = async () => {
    if (!form.hours) return
    try {
      await supabase.from('hours_log').insert({ user_id: user?.id, org: form.org, hours: parseFloat(form.hours), notes: form.notes, logged_at: form.date ? new Date(form.date).toISOString() : new Date().toISOString() })
      setSubmitted(true)
      setForm({ org: '', date: '', hours: '', notes: '' })
      await loadHistory()
      setTimeout(() => setSubmitted(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  const inputStyle = { background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.text, outline: 'none', width: '100%', fontFamily: 'inherit' }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }

  const totalCard = (
    <div style={{ background: T.primary, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalHours}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>total hours logged</div>
    </div>
  )

  const logForm = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Log new hours</div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Organization</label>
        <select value={form.org} onChange={e => setForm(f => ({ ...f, org: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Select organization...</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Date</label>
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Hours</label>
        <input type="number" min="0.5" step="0.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} style={inputStyle} placeholder="e.g. 3" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
        <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What did you do?" />
      </div>
      <button onClick={handleSubmit} disabled={!form.hours} style={{ width: '100%', padding: 13, borderRadius: 10, border: submitted ? `2px solid ${T.primary}` : 'none', background: submitted ? T.primaryLight : (!form.hours ? '#B8D8C8' : T.primary), color: submitted ? T.primary : '#fff', fontSize: 14, fontWeight: 700, cursor: form.hours ? 'pointer' : 'default' }}>
        {submitted ? '✓ Hours logged!' : 'Submit Hours'}
      </button>
    </div>
  )

  const historySection = (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>Recent history</div>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, fontSize: 13, color: T.textMuted }}>No hours logged yet. Submit your first entry above!</div>
      ) : history.map(r => (
        <div key={r.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.org || 'Volunteer work'}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{r.logged_at ? new Date(r.logged_at).toLocaleDateString() : ''}</div>
          </div>
          <span style={{ background: T.primaryLight, color: T.primary, fontSize: 16, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{r.hours}h</span>
        </div>
      ))}
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
