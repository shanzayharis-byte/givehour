import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'
import PostListingForm from './PostListingForm'

export default function OrgDashboard({ user }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function fetchListings() {
    const { data } = await supabase
      .from('org_listings')
      .select('*')
      .eq('org_id', user.id)
      .order('created_at', { ascending: false })
    setListings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [user.id])

  if (showForm) {
    return <PostListingForm user={user} onBack={() => { setShowForm(false); fetchListings() }} />
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{user.name}</div>
          <div style={{ fontSize: 13, color: T.textMuted }}>
            {user.region} · {listings.length} listing{listings.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Post Opportunity
        </button>
      </div>

      {loading && <div style={{ color: T.textMuted, textAlign: 'center', padding: 40 }}>Loading...</div>}

      {!loading && listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: T.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No listings yet</div>
          <div style={{ fontSize: 13 }}>Post your first volunteering opportunity to get started.</div>
        </div>
      )}

      {listings.map(l => {
        const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
        return (
          <div key={l.id} style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text, flex: 1 }}>{l.title}</div>
              <span style={{ background: cause.bg, color: cause.text, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 8 }}>{l.cause}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>
              {l.remote ? 'Remote' : l.location} · {l.date || 'No date'} · {l.hours ? `${l.hours}h` : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}
