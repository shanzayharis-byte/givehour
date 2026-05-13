import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function Saved({ user, onSelectOpp, isDesktop }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setLoading(false); return }
        const res = await fetch('/api/saved-listings', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (res.ok) setListings(await res.json())
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: isDesktop ? '20px 40px' : '16px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Saved</div>
        {!loading && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>{listings.length} saved listing{listings.length !== 1 ? 's' : ''}</div>}
      </div>

      <div style={{ padding: isDesktop ? '24px 40px 32px' : '16px 20px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading…</div>
        ) : listings.length === 0 ? (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔖</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>No saved listings yet</div>
            <div style={{ fontSize: 13, color: T.textMuted }}>Tap the 🔖 Save button on any opportunity to bookmark it here.</div>
          </div>
        ) : (
          <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
            {listings.map((l, i) => {
              const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
              return (
                <div
                  key={l.id}
                  onClick={() => onSelectOpp({ id: l.id, title: l.title, org: l.org, org_id: l.org_id, cause: l.cause, location: l.location, hours: l.hours, date: l.date, source: l.source, externalUrl: l.external_url })}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)' }}
                  style={{ background: i % 2 === 1 ? '#F9FAFC' : T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                >
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>{l.org}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{l.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: cause.bg, color: cause.text, fontWeight: 500 }}>{l.cause}</span>
                    {l.location && <span style={{ fontSize: 12, color: T.textMuted }}>· {l.location}</span>}
                    {l.hours && <span style={{ fontSize: 12, color: T.textMuted }}>· {l.hours}</span>}
                  </div>
                  {l.date && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>{l.date}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
