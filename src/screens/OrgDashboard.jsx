import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'
import PostListingForm from './PostListingForm'

export default function OrgDashboard({ user, editTargetId, onConsumeEditTarget, onSelectOpp }) {
  const [listings, setListings]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [showForm, setShowForm]           = useState(false)
  const [editListing, setEditListing]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]           = useState(false)
  const [isDesktop, setIsDesktop]         = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

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
      const { error: err } = await supabase.from('org_listings').delete().eq('id', id).eq('org_id', user.id)
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

  useEffect(() => {
    if (!editTargetId || listings.length === 0) return
    const match = listings.find(l => String(l.id) === String(editTargetId))
    if (match) { setEditListing(match); onConsumeEditTarget?.() }
  }, [editTargetId, listings, onConsumeEditTarget])

  if (showForm || editListing) {
    return <PostListingForm user={user} editListing={editListing} onBack={() => { setShowForm(false); setEditListing(null); fetchListings() }} />
  }

  const causeSet = new Set(listings.map(l => l.cause).filter(Boolean))

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>

      {/* header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: isDesktop ? '20px 40px' : '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{user.name}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {user.org_type || 'Organization'}{user.region ? ` · ${user.region}` : ''}
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{ background: T.primary, border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 10px rgba(24,160,80,0.25)', flexShrink: 0 }}
          >
            + New listing
          </button>
        </div>

        {/* stats row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {[
            [listings.length, listings.length === 1 ? 'listing' : 'listings', T.primary, T.primaryLight],
            [causeSet.size, causeSet.size === 1 ? 'cause' : 'causes', T.accent, T.accentLight],
          ].map(([val, lbl, color, bg]) => (
            <div key={lbl} style={{ background: bg, borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: 11, color, opacity: 0.8 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* content */}
      <div style={{ padding: isDesktop ? '24px 40px 32px' : '16px 20px 24px' }}>

        {loading && <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading…</div>}
        {error   && <div style={{ color: '#E05252', textAlign: 'center', padding: 20, fontSize: 14 }}>{error}</div>}

        {!loading && listings.length === 0 && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>No listings yet</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>Post your first volunteering opportunity to get started.</div>
            <button onClick={() => setShowForm(true)} style={{ background: T.primary, border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(24,160,80,0.25)' }}>
              + Post your first listing
            </button>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textSub, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 12 }}>
              Your listings
            </div>
            <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
              {listings.map(l => {
                const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
                const isConfirming = confirmDelete === l.id
                return (
                  <div key={l.id} style={{ background: T.card, borderRadius: 14, border: `1px solid ${isConfirming ? '#E05252' : T.border}`, transition: 'border-color 0.15s, box-shadow 0.15s', overflow: 'hidden' }}>
                    <div
                      onClick={() => onSelectOpp && onSelectOpp({ id: `org_${l.id}`, title: l.title, org: user.name, org_id: l.org_id || user.id, cause: l.cause, location: l.location, hours: l.hours, date: l.date, description: l.description, externalUrl: l.external_url, remote: !!l.remote, source: 'org' })}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFC' }}
                      onMouseLeave={e => { e.currentTarget.style.background = T.card }}
                      style={{ padding: 16, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>{l.title}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ background: cause.bg, color: cause.text, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{l.cause}</span>
                            {l.age_group && l.age_group !== 'all' && (
                              <span style={{ background: '#F0F4FF', color: '#4A6FA5', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20 }}>{l.age_group}</span>
                            )}
                            {l.remote && <span style={{ background: T.primaryLight, color: T.primary, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20 }}>Remote</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: T.textMuted }}>
                        {[l.remote ? 'Remote' : l.location, l.date, l.hours ? `${l.hours}h` : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>

                    {isConfirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderTop: `1px solid #FEE2E2` }}>
                        <span style={{ fontSize: 13, color: '#E05252', fontWeight: 600, flex: 1 }}>Delete this listing?</span>
                        <button onClick={() => setConfirmDelete(null)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: '#fff', fontSize: 13, fontWeight: 600, color: T.text, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => deleteListing(l.id)} disabled={deleting} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#E05252', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          {deleting ? '…' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: `1px solid ${T.border}` }}>
                        <button onClick={() => setEditListing(l)} style={{ flex: 1, background: T.primaryLight, border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 13, fontWeight: 600, color: T.primary, cursor: 'pointer' }}>✏️ Edit</button>
                        <button onClick={() => setConfirmDelete(l.id)} style={{ flex: 1, background: '#FFF0F0', border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 13, fontWeight: 600, color: '#E05252', cursor: 'pointer' }}>🗑 Delete</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
