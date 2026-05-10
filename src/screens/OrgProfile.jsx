import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function OrgProfile({ orgId, onBack, onSelectOpp }) {
  const [org, setOrg]           = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [{ data: orgData, error: orgErr }, { data: listData, error: listErr }] = await Promise.all([
          supabase.from('users').select('name, region, interests').eq('id', orgId).maybeSingle(),
          supabase.from('org_listings').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
        ])
        if (orgErr) throw orgErr
        if (listErr) throw listErr
        setOrg(orgData)
        setListings(listData || [])
      } catch (e) {
        console.error(e)
        setError('Failed to load org profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>Loading...</div>
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: T.danger, marginBottom: 12 }}>{error}</div>
        <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>Go back</button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack}
          style={{ background: T.primaryLight, color: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{org?.name}</div>
      </div>

      <div style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 20, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: org?.interests?.length ? 8 : 0 }}>{org?.region}</div>
        {org?.interests?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {org.interests.map(c => (
              <span key={c} style={{ background: T.primaryLight, color: T.primary, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{c}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>
        Opportunities ({listings.length})
      </div>

      {listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: T.textMuted, fontSize: 14 }}>No active listings</div>
      )}

      {listings.map(l => {
        const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
        return (
          <button key={l.id}
            onClick={() => onSelectOpp({ ...l, org: org?.name, org_id: l.org_id })}
            style={{ width: '100%', textAlign: 'left', background: T.card, borderRadius: 14, padding: 16, marginBottom: 10, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text, flex: 1 }}>{l.title}</div>
              <span style={{ background: cause.bg, color: cause.text, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, marginLeft: 8, whiteSpace: 'nowrap' }}>{l.cause}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>
              {l.remote ? 'Remote' : l.location} · {l.date || 'Flexible'}{l.hours ? ` · ${l.hours}h` : ''}
            </div>
          </button>
        )
      })}
    </div>
  )
}
