import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'
import PostListingForm from './PostListingForm'

export default function OrgDashboard({ user }) {
  const [listings, setListings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [showForm, setShowForm]       = useState(false)
  const [editListing, setEditListing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]       = useState(false)

  async function fetchListings() {
    try {
      const { data, error: err } = await supabase
        .from('org_listings')
        .select('*')
        .eq('org_id', user.id)
        .order('created_at', { ascending: false })
      if (err) throw err
      setListings(data || [])
    } catch (e) {
      console.error(e)
      setError('Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  async function deleteListing(id) {
    setDeleting(true)
    try {
      const { error: err } = await supabase
        .from('org_listings')
        .delete()
        .eq('id', id)
        .eq('org_id', user.id)
      if (err) throw err
      setListings(prev => prev.filter(l => l.id !== id))
      setConfirmDelete(null)
    } catch (e) {
      setError('Failed to delete listing')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => { fetchListings() }, [user.id])

  if (showForm || editListing) {
    return <PostListingForm user={user} editListing={editListing} onBack={() => { setShowForm(false); setEditListing(null); fetchListings() }} />
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

      {error && <div style={{ color: T.danger, textAlign: 'center', padding: 20, fontSize: 14 }}>{error}</div>}

      {!loading && listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: T.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No listings yet</div>
          <div style={{ fontSize: 13 }}>Post your first volunteering opportunity to get started.</div>
        </div>
      )}

      {listings.map(l => {
        const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
        const isConfirming = confirmDelete === l.id
        return (
          <div key={l.id} style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${isConfirming ? '#E05252' : T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text, flex: 1 }}>{l.title}</div>
              <span style={{ background: cause.bg, color: cause.text, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 8 }}>{l.cause}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>
              {l.remote ? 'Remote' : l.location} · {l.date || 'No date'}{l.hours ? ` · ${l.hours}h` : ''}
            </div>
            {isConfirming ? (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#E05252', fontWeight: 600, flex: 1 }}>Delete this listing?</span>
                <button onClick={() => setConfirmDelete(null)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => deleteListing(l.id)} disabled={deleting} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#E05252', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            ) : (
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                <button onClick={() => setEditListing(l)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.primaryLight, border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: T.primary, cursor: 'pointer' }}>✏️ Edit</button>
                <button onClick={() => setConfirmDelete(l.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFF0F0', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#E05252', cursor: 'pointer' }}>🗑 Delete</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
