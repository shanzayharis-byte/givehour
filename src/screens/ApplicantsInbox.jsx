import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const STATUS_COLORS = {
  pending:  { bg: '#FFF8E1', text: '#B8860B' },
  accepted: { bg: '#E8F5E9', text: '#2E7D32' },
  declined: { bg: '#FFEBEE', text: '#C62828' },
}

export default function ApplicantsInbox({ user }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from('applications')
          .select('*, org_listings(title)')
          .eq('org_id', user.id)
          .order('submitted_at', { ascending: false })
        if (err) throw err
        setApplications(data || [])
      } catch (e) {
        console.error(e)
        setError('Failed to load applications')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  const updateStatus = async (id, status) => {
    const { error: err } = await supabase.from('applications').update({ status }).eq('id', id)
    if (!err) setApplications(apps => apps.map(a => a.id === id ? { ...a, status } : a))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Applicants</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>
        {applications.length} application{applications.length !== 1 ? 's' : ''} received
      </div>

      {error && <div style={{ color: T.danger, textAlign: 'center', padding: 20, fontSize: 14 }}>{error}</div>}

      {!error && applications.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: T.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No applications yet</div>
          <div style={{ fontSize: 13 }}>When teens apply to your listings, they'll appear here.</div>
        </div>
      )}

      {applications.map(a => {
        const sc = STATUS_COLORS[a.status] || STATUS_COLORS.pending
        return (
          <div key={a.id} style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{a.teen_name}</div>
              <span style={{ background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' }}>{a.status}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textMuted }}>For: {a.org_listings?.title}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, marginBottom: a.message ? 10 : 0 }}>
              {new Date(a.submitted_at).toLocaleDateString()} · {a.teen_email}
            </div>
            {a.message && (
              <div style={{ fontSize: 13, color: T.text, background: T.bg, borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 10 }}>
                "{a.message}"
              </div>
            )}
            {a.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => updateStatus(a.id, 'accepted')}
                  style={{ flex: 1, padding: 8, background: '#E8F5E9', color: '#2E7D32', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Accept
                </button>
                <button onClick={() => updateStatus(a.id, 'declined')}
                  style={{ flex: 1, padding: 8, background: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Decline
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
