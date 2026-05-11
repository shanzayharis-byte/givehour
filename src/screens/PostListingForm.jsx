import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const CAUSES = ['Education', 'Environment', 'Animals', 'Food Security', 'Health', 'Housing', 'Arts', 'Seniors']
const AGE_GROUPS = [
  { value: 'all',   label: 'All Ages' },
  { value: 'teens', label: 'Teens (13–17)' },
  { value: 'open',  label: 'No Age Restriction' },
]

export default function PostListingForm({ user, onBack, editListing }) {
  const [form, setForm] = useState({
    title:        editListing?.title        || '',
    cause:        editListing?.cause        || '',
    location:     editListing?.location     || '',
    remote:       editListing?.remote       ?? false,
    date:         editListing?.date         || '',
    hours:        editListing?.hours        != null ? String(editListing.hours) : '',
    age_group:    editListing?.age_group    || 'all',
    description:  editListing?.description  || '',
    external_url: editListing?.external_url || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const isEditing = !!editListing

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.title || !form.cause || !form.description) {
      setError('Please fill in title, cause, and description.')
      return
    }
    setSaving(true)
    const payload = {
      title:        form.title,
      cause:        form.cause,
      location:     form.remote ? null : form.location || null,
      remote:       form.remote,
      date:         form.date || null,
      hours:        form.hours ? parseInt(form.hours) : null,
      age_group:    form.age_group,
      description:  form.description,
      external_url: form.external_url || null,
    }
    const { error: err } = isEditing
      ? await supabase.from('org_listings').update(payload).eq('id', editListing.id).eq('org_id', user.id)
      : await supabase.from('org_listings').insert({ ...payload, org_id: user.id })
    setSaving(false)
    if (err) { setError(err.message); return }
    onBack()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit',
    boxSizing: 'border-box', background: T.bg,
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack}
          style={{ background: T.primaryLight, color: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{isEditing ? 'Edit Opportunity' : 'Post Opportunity'}</div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Title *</div>
        <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Weekend Food Bank Volunteer" style={inputStyle} />
      </div>

      {/* Cause */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Cause *</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CAUSES.map(c => (
            <button key={c} onClick={() => set('cause', c)}
              style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${form.cause === c ? T.primary : T.border}`, background: form.cause === c ? T.primaryLight : T.bg, color: form.cause === c ? T.primary : T.textMuted, fontSize: 13, fontWeight: form.cause === c ? 600 : 400, cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Location</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={form.remote} onChange={e => set('remote', e.target.checked)} />
          Remote / virtual
        </label>
        {!form.remote && (
          <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
            placeholder="City, State" style={inputStyle} />
        )}
      </div>

      {/* Date */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Date</div>
        <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
      </div>

      {/* Hours */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Hours needed</div>
        <input type="number" value={form.hours} onChange={e => set('hours', e.target.value)}
          placeholder="e.g. 3" style={inputStyle} />
      </div>

      {/* Age group */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Age Group</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {AGE_GROUPS.map(a => (
            <button key={a.value} onClick={() => set('age_group', a.value)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1px solid ${form.age_group === a.value ? T.primary : T.border}`, background: form.age_group === a.value ? T.primaryLight : T.bg, color: form.age_group === a.value ? T.primary : T.textMuted, fontSize: 12, fontWeight: form.age_group === a.value ? 600 : 400, cursor: 'pointer' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Description *</div>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Tell teens what they'll be doing and why it matters..."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* External URL */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Website / sign-up link (optional)</div>
        <input type="url" value={form.external_url} onChange={e => set('external_url', e.target.value)}
          placeholder="https://" style={inputStyle} />
      </div>

      {error && <div style={{ color: T.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button onClick={handleSubmit} disabled={saving}
        style={{ width: '100%', padding: 16, background: saving ? '#B8D8C8' : T.primary, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Post Opportunity'}
      </button>
    </div>
  )
}
