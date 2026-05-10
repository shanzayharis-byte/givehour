import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

function relativeTime(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ROLE_COLOR = {
  teen:   { bg: T.primaryLight, text: T.primary },
  org:    { bg: T.accentLight,  text: T.accent },
  parent: { bg: T.warningLight, text: T.warning },
}

export default function Admin({ authUser }) {
  const [users, setUsers]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null)
  const [inviteError, setInviteError] = useState(null)
  const [confirmId, setConfirmId]     = useState(null)
  const [token, setToken]             = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token)
        loadUsers(session.access_token)
      } else {
        setLoadError('No active session — please sign in again.')
        setLoading(false)
      }
    })
  }, [])

  async function loadUsers(jwt) {
    setLoading(true)
    setLoadError(null)
    try {
      const r = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(data.users)
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.includes('@') || !token) return
    setInviteStatus('sending')
    setInviteError(null)
    try {
      const r = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Invite failed')
      setInviteStatus('sent')
      setInviteEmail('')
      setTimeout(() => setInviteStatus(null), 3000)
    } catch (e) {
      setInviteStatus('error')
      setInviteError(e.message)
    }
  }

  async function handleDelete(userId) {
    if (!token) return
    try {
      const r = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Delete failed')
      setUsers(prev => prev.filter(u => u.id !== userId))
      setConfirmId(null)
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', background: T.bg }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>Admin Panel</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 24 }}>Manage users and send invites.</div>

        {/* Invite card */}
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Invite User
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder="someone@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: T.text, background: T.bg }}
            />
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.includes('@') || inviteStatus === 'sending'}
              style={{ padding: '9px 18px', borderRadius: 8, background: T.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: !inviteEmail.includes('@') ? 0.5 : 1 }}
            >
              {inviteStatus === 'sending' ? '…' : 'Send Invite'}
            </button>
          </div>
          {inviteStatus === 'sent' && (
            <div style={{ marginTop: 8, fontSize: 13, color: T.primary, fontWeight: 500 }}>✓ Invite sent!</div>
          )}
          {inviteStatus === 'error' && (
            <div style={{ marginTop: 8, fontSize: 13, color: T.danger }}>{inviteError}</div>
          )}
        </div>

        {/* Users card */}
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            All Users {!loading && <span style={{ color: T.text }}>· {users.length}</span>}
          </div>

          {loading && <div style={{ fontSize: 14, color: T.textMuted }}>Loading…</div>}
          {loadError && <div style={{ fontSize: 14, color: T.danger }}>{loadError}</div>}

          {!loading && !loadError && users.map((u, i) => {
            const isActive = u.last_sign_in_at &&
              (Date.now() - new Date(u.last_sign_in_at).getTime()) < 15 * 60 * 1000
            const isSelf = u.id === authUser?.id
            const roleStyle = ROLE_COLOR[u.role] || { bg: T.border, text: T.textSub }
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < users.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{u.name || '—'}</span>
                    {isActive && (
                      <span title="Active now" style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF7D', display: 'inline-block', flexShrink: 0 }} />
                    )}
                    {u.is_admin && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#A07000', background: '#FFF8E0', borderRadius: 4, padding: '1px 5px' }}>ADMIN</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                    {u.last_sign_in_at
                      ? <>Last login: <span style={{ color: T.textSub }}>{relativeTime(u.last_sign_in_at)}</span></>
                      : <span>Never logged in</span>}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: roleStyle.bg, color: roleStyle.text, flexShrink: 0 }}>
                  {u.role || '—'}
                </span>
                {isSelf ? (
                  <span style={{ fontSize: 12, color: T.textMuted, width: 52, textAlign: 'center' }}>You</span>
                ) : confirmId === u.id ? (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setConfirmId(null)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: T.textSub }}>Cancel</button>
                    <button onClick={() => handleDelete(u.id)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: 'none', background: T.danger, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Confirm</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(u.id)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSub, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Remove</button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
