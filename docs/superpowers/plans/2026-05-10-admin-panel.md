# givehour Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only tab to the givehour app where Shanzay can view all users with last-login info, invite new users by email, and delete accounts.

**Architecture:** Add `is_admin BOOLEAN` to the `users` table; create 3 Vercel serverless routes under `api/admin/` (all protected by JWT + is_admin check using the service key); build `Admin.jsx` screen; wire an Admin nav tab into `App.jsx` that only appears for admin users.

**Tech Stack:** React 19, Vite, Supabase JS v2, Vercel serverless (Node.js ESM), @supabase/supabase-js service-role client

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| Supabase SQL editor | run once | add `is_admin` column |
| `scripts/make-admin.mjs` | create + run + delete | seed shanzay as admin |
| `api/admin/_lib.js` | create | shared admin auth guard |
| `api/admin/users.js` | create | GET all users + last login |
| `api/admin/invite.js` | create | POST invite by email |
| `api/admin/delete-user.js` | create | DELETE user by id |
| `src/screens/Admin.jsx` | create | full admin UI screen |
| `src/App.jsx` | modify | import Admin, add tab + routing |

---

## Task 1: DB Migration — add `is_admin` column

- [ ] **Step 1: Run migration in Supabase SQL editor**

Go to your Supabase project → SQL Editor → New Query. Paste and run:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
```

Expected: "Success. No rows returned."

- [ ] **Step 2: Verify in Table Editor**

Open Supabase → Table Editor → `users`. Confirm the `is_admin` column now exists with type `bool`, default `false`.

- [ ] **Step 3: Commit a migration note**

```bash
cd /root/givehour
git commit --allow-empty -m "chore: add is_admin column to users table (applied via Supabase SQL editor)"
```

---

## Task 2: Seed shanzay.haris@gmail.com as admin

**Files:**
- Create: `scripts/make-admin.mjs`

- [ ] **Step 1: Create the seed script**

Create `/root/givehour/scripts/make-admin.mjs`:

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cmiwwlfazbnrfsvakvhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaXd3bGZhemJucmZzdmFrdmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0NTYyMywiZXhwIjoyMDkzNTIxNjIzfQ.l0naZsiK-AL6r7kB1EZL9W4mW5GfdQ0aCMy6BOp7bNg'
)

const { data, error } = await supabase
  .from('users')
  .update({ is_admin: true })
  .eq('email', 'shanzay.haris@gmail.com')
  .select('id, name, email, is_admin')

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

if (!data?.length) {
  console.log('No user found with email shanzay.haris@gmail.com — sign up first, then re-run.')
  process.exit(0)
}

console.log('Done! Admin row:', data[0])
```

- [ ] **Step 2: Run the script**

```bash
cd /root/givehour
node scripts/make-admin.mjs
```

Expected output:
```
Done! Admin row: { id: '...', name: 'Shanzay Haris', email: 'shanzay.haris@gmail.com', is_admin: true }
```

If you see "No user found" — Shanzay's account doesn't exist yet. Sign in to the app first, then re-run.

- [ ] **Step 3: Commit and clean up**

```bash
git add scripts/make-admin.mjs
git commit -m "scripts: seed shanzay as admin (one-off)"
```

---

## Task 3: Shared admin auth guard

**Files:**
- Create: `api/admin/_lib.js`

- [ ] **Step 1: Create the shared guard**

Create `/root/givehour/api/admin/_lib.js`:

```js
import { createClient } from '@supabase/supabase-js'

function makeAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function requireAdmin(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { ok: false, status: 401, error: 'Missing token' }

  const client = makeAdminClient()
  const { data: { user }, error: authErr } = await client.auth.getUser(token)
  if (authErr || !user) return { ok: false, status: 401, error: 'Invalid token' }

  const { data: dbUser } = await client
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!dbUser?.is_admin) return { ok: false, status: 403, error: 'Not an admin' }

  return { ok: true, user, client }
}
```

- [ ] **Step 2: Verify the env vars are set in Vercel**

Check your Vercel project dashboard → Settings → Environment Variables. Confirm both of these exist:
- `SUPABASE_URL` = `https://cmiwwlfazbnrfsvakvhh.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (the service role JWT from `.env`)

If missing, add them now — the API routes won't work without them.

- [ ] **Step 3: Commit**

```bash
git add api/admin/_lib.js
git commit -m "feat: add admin auth guard for API routes"
```

---

## Task 4: API route — list all users

**Files:**
- Create: `api/admin/users.js`

- [ ] **Step 1: Create the route**

Create `/root/givehour/api/admin/users.js`:

```js
import { requireAdmin } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { client } = auth

  const { data: dbUsers, error: dbErr } = await client
    .from('users')
    .select('id, name, email, role, is_admin')
    .order('name')
  if (dbErr) return res.status(500).json({ error: dbErr.message })

  const { data: { users: authUsers }, error: authErr } = await client.auth.admin.listUsers({ perPage: 1000 })
  if (authErr) return res.status(500).json({ error: authErr.message })

  const loginMap = Object.fromEntries(authUsers.map(u => [u.id, u.last_sign_in_at]))

  const users = (dbUsers || []).map(u => ({
    ...u,
    last_sign_in_at: loginMap[u.id] || null,
  }))

  return res.status(200).json({ users })
}
```

- [ ] **Step 2: Test locally with curl**

Start the Vercel dev server:
```bash
cd /root/givehour && npx vercel dev --listen 3001
```

In a second terminal, get your session token by opening the app at `http://localhost:3001`, signing in, then running in the browser console:
```js
(await (await import('./src/lib/supabase.js')).supabase.auth.getSession()).data.session.access_token
```

Then test the endpoint:
```bash
curl -s -H "Authorization: Bearer <your-token>" http://localhost:3001/api/admin/users | head -200
```

Expected: JSON with `{ users: [...] }` array.

- [ ] **Step 3: Commit**

```bash
git add api/admin/users.js
git commit -m "feat: add GET /api/admin/users endpoint"
```

---

## Task 5: API route — invite user

**Files:**
- Create: `api/admin/invite.js`

- [ ] **Step 1: Create the route**

Create `/root/givehour/api/admin/invite.js`:

```js
import { requireAdmin } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { email } = req.body || {}
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  const { error } = await auth.client.auth.admin.inviteUserByEmail(email)
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add api/admin/invite.js
git commit -m "feat: add POST /api/admin/invite endpoint"
```

---

## Task 6: API route — delete user

**Files:**
- Create: `api/admin/delete-user.js`

- [ ] **Step 1: Create the route**

Create `/root/givehour/api/admin/delete-user.js`:

```js
import { requireAdmin } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId required' })

  if (userId === auth.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }

  const { error } = await auth.client.auth.admin.deleteUser(userId)
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add api/admin/delete-user.js
git commit -m "feat: add DELETE /api/admin/delete-user endpoint"
```

---

## Task 7: Admin screen UI

**Files:**
- Create: `src/screens/Admin.jsx`

- [ ] **Step 1: Create the screen**

Create `/root/givehour/src/screens/Admin.jsx`:

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Admin.jsx
git commit -m "feat: add Admin screen UI"
```

---

## Task 8: Wire Admin into App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the import**

At the top of `src/App.jsx`, find the last screen import line:

```js
import Profile from './screens/Profile'
```

Add directly after it:

```js
import Admin from './screens/Admin'
```

- [ ] **Step 2: Add 'admin' to PROTECTED**

Find:

```js
const PROTECTED = ['feed', 'loghours', 'impact', 'profile']
```

Replace with:

```js
const PROTECTED = ['feed', 'loghours', 'impact', 'profile', 'admin']
```

- [ ] **Step 3: Compute visibleNav inside the component**

Inside `App()`, directly after the state declarations and before the `if (appLoading)` check, add:

```js
  const adminNavItem = { id: 'admin', icon: '⚙️', label: 'Admin' }
  const visibleNav = dbUser?.is_admin ? [...NAV, adminNavItem] : NAV
```

- [ ] **Step 4: Update showNav to use visibleNav**

Find:

```js
  const showNav = authUser && !selectedOpp && NAV.some(n => n.id === activeScreen)
```

Replace with:

```js
  const showNav = authUser && !selectedOpp && visibleNav.some(n => n.id === activeScreen)
```

- [ ] **Step 5: Add 'admin' case to the switch in mainContent()**

Find in the `switch (activeScreen)` block:

```js
      case 'profile':  return <Profile user={dbUser} onSignOut={handleSignOut} />
      default:         return <Auth ...
```

Add the admin case before `default`:

```js
      case 'profile':  return <Profile user={dbUser} onSignOut={handleSignOut} />
      case 'admin':    return <Admin authUser={authUser} />
      default:         return <Auth onLoggedIn={handleLoggedIn} onGuest={handleGuest} isDesktop={isDesktop} initialScreen={activeScreen === 'auth-login' ? 'login' : activeScreen === 'auth-signup' ? 'userType' : 'landing'} />
```

- [ ] **Step 6: Replace NAV with visibleNav in both nav renders**

There are two nav renders in App.jsx — desktop sidebar (around line 120) and mobile bottom nav (around line 153). In **both**, find `{NAV.map(` and replace with `{visibleNav.map(`.

Desktop sidebar — find:
```js
          <nav style={{ padding: '14px 12px', flex: 1 }}>
            {NAV.map(({ id, icon, label }) => (
```

Replace `NAV.map` with `visibleNav.map`.

Mobile bottom nav — find:
```js
          {NAV.map(({ id, icon, label }) => {
```

Replace `NAV.map` with `visibleNav.map`.

- [ ] **Step 7: Start dev server and verify**

```bash
cd /root/givehour && npm run dev
```

Open `http://localhost:5173`, sign in as `shanzay.haris@gmail.com`. Confirm:
- An `⚙️ Admin` tab appears in the nav (desktop sidebar or mobile bottom)
- Clicking it shows the Admin Panel screen
- The users list loads (may need `npx vercel dev` instead of `npm run dev` to test the API routes locally)
- Sign in as a non-admin account and confirm the Admin tab is not visible

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add Admin tab to nav for admin users"
```

---

## Task 9: Deploy and verify on production

- [ ] **Step 1: Push to main**

```bash
cd /root/givehour
git push origin main
```

- [ ] **Step 2: Confirm Vercel env vars are set**

In Vercel → project → Settings → Environment Variables, make sure both exist for Production:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If they're missing, add them and redeploy.

- [ ] **Step 3: Verify on production**

Open `https://givehour.vercel.app`, sign in as `shanzay.haris@gmail.com`. Check:
1. ⚙️ Admin tab appears
2. Users list loads with names, roles, last login
3. Send invite to a test email — confirm invite email arrives
4. Remove a test user (if you have one) — confirm they disappear from the list
5. Confirm you cannot remove yourself (Remove button shows "You" instead)

- [ ] **Step 4: Clean up seed script**

```bash
cd /root/givehour
git rm scripts/make-admin.mjs
git commit -m "chore: remove one-off admin seed script"
git push origin main
```
