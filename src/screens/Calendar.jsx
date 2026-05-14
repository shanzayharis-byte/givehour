import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

// Returns a Date if str parses to a valid future date, null otherwise.
function parseFutureDate(str) {
  if (!str || typeof str !== 'string') return null
  const d = new Date(str)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d >= today ? d : null
}

// Format a Date as "Weekday, Month Day" e.g. "Sun, May 18"
function fmtDateHeader(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Calendar({ user, onSignUp, onLogin, isGuest }) {
  const [listings, setListings]       = useState([])
  const [savedIds, setSavedIds]       = useState(new Set())
  const [loading, setLoading]         = useState(true)
  const [savedOnly, setSavedOnly]     = useState(false)
  const [expanded, setExpanded]       = useState(null)   // listing id
  const [noDateOpen, setNoDateOpen]   = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('clean_listings')
          .select('id, title, org, org_id, cause, location, hours, date, description, external_url, source')
          .order('date', { ascending: true })
        setListings(data || [])

        if (user?.id) {
          const { data: saved } = await supabase
            .from('saved_opportunities')
            .select('listing_id')
            .eq('user_id', user.id)
          setSavedIds(new Set((saved || []).map(r => String(r.listing_id))))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 40px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Calendar</div>
          <div style={{ fontSize: 13, color: T.textSub, marginTop: 2 }}>Upcoming volunteer opportunities</div>
        </div>
        {loading && <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading...</div>}
      </div>
    </div>
  )
}
