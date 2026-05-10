# Org Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let organizations sign up, post multiple volunteering listings, and receive applications from teens — with role-based routing so orgs and teens see different home screens.

**Architecture:** Role-based routing in `App.jsx` detects `dbUser.role === 'org'` after login and renders org-specific screens instead of the teen Feed. New screens added to `src/screens/`. A Vercel API route handles email notifications on application submit. The Databricks pipeline gets a second ingest source to pull org-posted listings into `clean_listings`.

**Tech Stack:** React 19 + Vite, Supabase (auth + DB), Vercel (serverless API), Nodemailer + Gmail SMTP, Databricks (pipeline)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/screens/OrgDashboard.jsx` | Org home — lists their postings, "Post Opportunity" CTA |
| Create | `src/screens/PostListingForm.jsx` | Form to create a new org listing |
| Create | `src/screens/OrgProfile.jsx` | Public org page teens can visit |
| Create | `src/screens/ApplicantsInbox.jsx` | Org's inbox of applications received |
| Create | `api/apply.js` | Vercel API route — inserts application + sends email |
| Modify | `src/App.jsx` | Org nav, `selectedOrg` state, role-based routing |
| Modify | `src/screens/OpportunityDetail.jsx` | "Apply on Give Hour" button + inline form |
| Modify | `src/screens/Profile.jsx` | "My Applications" section for teens |

---

## Task 1: Create Supabase Tables

**Files:** none (run SQL in Supabase dashboard)

- [ ] **Step 1: Open Supabase SQL editor**

Go to your Supabase project → SQL Editor → New query. Run this:

```sql
-- Org-posted listings
create table org_listings (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references users(id) on delete cascade,
  title       text not null,
  cause       text,
  location    text,
  remote      boolean default false,
  date        date,
  hours       int,
  age_group   text default 'all',
  description text,
  external_url text,
  created_at  timestamptz default now()
);

-- Applications from teens
create table applications (
  id             uuid primary key default gen_random_uuid(),
  teen_id        uuid references users(id) on delete cascade,
  teen_name      text,
  teen_email     text,
  org_listing_id uuid references org_listings(id) on delete cascade,
  org_id         uuid references users(id) on delete cascade,
  message        text,
  submitted_at   timestamptz default now(),
  status         text default 'pending'
);
```

- [ ] **Step 2: Verify in Supabase Table Editor**

Open Table Editor — confirm `org_listings` and `applications` both appear with the correct columns.

- [ ] **Step 3: Commit**

```bash
git -C /root/givehour add -A
git -C /root/givehour commit -m "feat: add org_listings and applications supabase tables"
```

---

## Task 2: Add Nodemailer and Email Env Vars

**Files:**
- Modify: `package.json` (dependency)
- Modify: `.env` (new vars)

- [ ] **Step 1: Install nodemailer**

```bash
cd /root/givehour && npm install nodemailer
```

Expected: nodemailer appears in `dependencies` in package.json.

- [ ] **Step 2: Add Gmail env vars to .env**

Open `/root/givehour/.env` and add these two lines (fill in real values):

```
GMAIL_USER=shanzay.haris@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password-here
```

The Gmail App Password is the same one already configured in Supabase SMTP settings.

- [ ] **Step 3: Add the same vars in Vercel**

Go to Vercel → givehour project → Settings → Environment Variables. Add:
- `GMAIL_USER` = shanzay.haris@gmail.com
- `GMAIL_APP_PASSWORD` = (the app password)

- [ ] **Step 4: Commit**

```bash
cd /root/givehour && git add package.json package-lock.json
git commit -m "feat: add nodemailer for application email notifications"
```

---

## Task 3: Create `/api/apply.js`

**Files:**
- Create: `api/apply.js`

- [ ] **Step 1: Create the file**

Create `/root/givehour/api/apply.js` with this content:

```js
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const makeAdmin = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })

  const client = makeAdmin()
  const { data: { user }, error: authErr } = await client.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const { org_listing_id, org_id, message, teen_name, teen_email } = req.body
  if (!org_listing_id || !org_id) return res.status(400).json({ error: 'Missing fields' })

  // Save application
  const { error: insertErr } = await client.from('applications').insert({
    teen_id: user.id,
    teen_name,
    teen_email,
    org_listing_id,
    org_id,
    message: message || null,
  })
  if (insertErr) return res.status(500).json({ error: insertErr.message })

  // Fetch org email + listing title
  const [{ data: orgUser }, { data: listing }] = await Promise.all([
    client.from('users').select('email, name').eq('id', org_id).maybeSingle(),
    client.from('org_listings').select('title').eq('id', org_listing_id).maybeSingle(),
  ])

  if (orgUser?.email) {
    await transporter.sendMail({
      from: `Give Hour <${process.env.GMAIL_USER}>`,
      to: orgUser.email,
      subject: `New application: ${listing?.title || 'your opportunity'}`,
      text: [
        `Hi ${orgUser.name},`,
        '',
        `${teen_name} (${teen_email}) has applied to your opportunity: "${listing?.title}".`,
        '',
        message ? `Their message: "${message}"` : 'They did not include a message.',
        '',
        'Log in to Give Hour to see all applicants and update their status.',
        '',
        '— The Give Hour Team',
      ].join('\n'),
    }).catch(() => {})
  }

  return res.status(200).json({ ok: true })
}
```

- [ ] **Step 2: Test locally**

Start the dev server: `cd /root/givehour && npm run dev`

In a separate terminal, run:
```bash
curl -s http://localhost:5173/api/apply -X POST \
  -H "Content-Type: application/json" \
  -d '{"org_listing_id":"test","org_id":"test"}'
```
Expected: `{"error":"Missing token"}` — confirms the route loads without crashing.

- [ ] **Step 3: Commit**

```bash
cd /root/givehour && git add api/apply.js
git commit -m "feat: add /api/apply route — saves application and emails org"
```

---

## Task 4: Role-Based Routing in `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports and org nav constant**

Open `src/App.jsx`. After the existing imports (line 11), add:

```js
import OrgDashboard from './screens/OrgDashboard'
import OrgProfile from './screens/OrgProfile'
import ApplicantsInbox from './screens/ApplicantsInbox'
```

After the `NAV` constant (after line 20), add:

```js
const ORG_NAV = [
  { id: 'orgDashboard',   icon: '📋', label: 'Listings' },
  { id: 'orgApplicants',  icon: '📬', label: 'Applicants' },
  { id: 'profile',        icon: '👤', label: 'Profile' },
]
```

- [ ] **Step 2: Add `selectedOrg` state**

In the `App()` function, after the `selectedOpp` state line (line 28), add:

```js
const [selectedOrg, setSelectedOrg]   = useState(null)
```

- [ ] **Step 3: Update `handleLoggedIn` to route orgs to their dashboard**

Replace the existing `handleLoggedIn` (lines 86–91):

```js
const handleLoggedIn = (user, db) => {
  setAuthUser(user)
  setDbUser(db)
  setIsGuest(false)
  setActiveScreen(db?.role === 'org' ? 'orgDashboard' : 'feed')
}
```

- [ ] **Step 4: Update `navigate()` to clear selectedOrg**

Replace the existing `navigate` function (lines 77–84):

```js
const navigate = (screen) => {
  if (PROTECTED.includes(screen) && !authUser && !isGuest) {
    setActiveScreen('landing')
    return
  }
  setSelectedOpp(null)
  setSelectedOrg(null)
  setActiveScreen(screen)
}
```

- [ ] **Step 5: Add org screens to `PROTECTED` and update `mainContent()`**

Replace the `PROTECTED` line (line 22):

```js
const PROTECTED = ['feed', 'loghours', 'impact', 'profile', 'admin', 'orgDashboard', 'orgApplicants']
```

Replace the entire `mainContent` function (lines 114–130):

```js
const mainContent = () => {
  if (selectedOpp) {
    return <OpportunityDetail opp={selectedOpp} user={dbUser} onBack={() => setSelectedOpp(null)} isGuest={isGuest}
      onSelectOrg={(orgId) => { setSelectedOpp(null); setSelectedOrg(orgId) }}
      onSignUp={() => { setSelectedOpp(null); setIsGuest(false); setActiveScreen('landing') }} />
  }
  if (selectedOrg) {
    return <OrgProfile orgId={selectedOrg} onBack={() => setSelectedOrg(null)} onSelectOpp={setSelectedOpp} />
  }
  if (!authUser && !isGuest) {
    return <Auth onLoggedIn={handleLoggedIn} onGuest={handleGuest} isDesktop={isDesktop} initialScreen={activeScreen === 'auth-login' ? 'login' : activeScreen === 'auth-signup' ? 'userType' : 'landing'} />
  }
  switch (activeScreen) {
    case 'feed':          return <Feed user={dbUser} onSelectOpp={setSelectedOpp} />
    case 'explore':       return <Explore user={dbUser} onSelectOpp={setSelectedOpp} isGuest={isGuest} onSignUp={() => { setIsGuest(false); setActiveScreen('auth-signup') }} onLogin={() => { setIsGuest(false); setActiveScreen('auth-login') }} onHome={() => setActiveScreen('landing')} />
    case 'loghours':      return <LogHours user={dbUser} />
    case 'impact':        return <Impact user={dbUser} />
    case 'profile':       return <Profile user={dbUser} onSignOut={handleSignOut} />
    case 'admin':         return <Admin authUser={authUser} />
    case 'orgDashboard':  return <OrgDashboard user={dbUser} />
    case 'orgApplicants': return <ApplicantsInbox user={dbUser} />
    default:              return <Auth onLoggedIn={handleLoggedIn} onGuest={handleGuest} isDesktop={isDesktop} initialScreen={activeScreen === 'auth-login' ? 'login' : activeScreen === 'auth-signup' ? 'userType' : 'landing'} />
  }
}
```

- [ ] **Step 6: Update nav visibility and nav items for org role**

Replace the `visibleNav` line (line 106) and `showNav` line (line 112):

```js
const isOrg = dbUser?.role === 'org'
const adminNavItem = { id: 'admin', icon: '⚙️', label: 'Admin' }
const visibleNav = isOrg ? ORG_NAV : (dbUser?.is_admin ? [...NAV, adminNavItem] : NAV)

// ...existing appLoading check stays the same...

const showNav = authUser && !selectedOpp && !selectedOrg && visibleNav.some(n => n.id === activeScreen)
```

- [ ] **Step 7: Verify routing in browser**

Run `npm run dev`. Log in as an org account. Confirm:
- Home screen is "My Listings" (OrgDashboard), not Feed
- Bottom nav shows Listings / Applicants / Profile
- Log in as a teen — home screen is still Feed with teen nav

- [ ] **Step 8: Commit**

```bash
cd /root/givehour && git add src/App.jsx
git commit -m "feat: role-based routing — orgs land on OrgDashboard with org nav"
```

---

## Task 5: Create `OrgDashboard.jsx`

**Files:**
- Create: `src/screens/OrgDashboard.jsx`

- [ ] **Step 1: Create the file**

Create `/root/givehour/src/screens/OrgDashboard.jsx`:

```jsx
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
```

- [ ] **Step 2: Verify in browser**

Log in as org. Confirm:
- Dashboard shows org name + region in header
- "Post Opportunity" button is visible
- Empty state shows when no listings exist

- [ ] **Step 3: Commit**

```bash
cd /root/givehour && git add src/screens/OrgDashboard.jsx
git commit -m "feat: add OrgDashboard screen with listings list"
```

---

## Task 6: Create `PostListingForm.jsx`

**Files:**
- Create: `src/screens/PostListingForm.jsx`

- [ ] **Step 1: Create the file**

Create `/root/givehour/src/screens/PostListingForm.jsx`:

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

const CAUSES = ['Education', 'Environment', 'Animals', 'Food Security', 'Health', 'Housing', 'Arts', 'Seniors']
const AGE_GROUPS = [
  { value: 'all',   label: 'All Ages' },
  { value: 'teens', label: 'Teens (13–17)' },
  { value: 'open',  label: 'No Age Restriction' },
]

export default function PostListingForm({ user, onBack }) {
  const [form, setForm] = useState({
    title: '', cause: '', location: '', remote: false,
    date: '', hours: '', age_group: 'all', description: '', external_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.title || !form.cause || !form.description) {
      setError('Please fill in title, cause, and description.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('org_listings').insert({
      org_id:      user.id,
      title:       form.title,
      cause:       form.cause,
      location:    form.remote ? null : form.location || null,
      remote:      form.remote,
      date:        form.date || null,
      hours:       form.hours ? parseInt(form.hours) : null,
      age_group:   form.age_group,
      description: form.description,
      external_url: form.external_url || null,
    })
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
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Post Opportunity</div>
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
        {saving ? 'Posting...' : 'Post Opportunity'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Log in as org → click "+ Post Opportunity". Confirm:
- Form renders with all fields
- Cause pills are selectable (one at a time)
- Remote checkbox hides/shows location input
- Submitting with empty title shows error "Please fill in title, cause, and description."
- Valid submission returns to dashboard and the new listing appears

- [ ] **Step 3: Commit**

```bash
cd /root/givehour && git add src/screens/PostListingForm.jsx
git commit -m "feat: add PostListingForm for orgs to post volunteering opportunities"
```

---

## Task 7: Create `OrgProfile.jsx`

**Files:**
- Create: `src/screens/OrgProfile.jsx`

- [ ] **Step 1: Create the file**

Create `/root/givehour/src/screens/OrgProfile.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function OrgProfile({ orgId, onBack, onSelectOpp }) {
  const [org, setOrg]         = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: orgData }, { data: listData }] = await Promise.all([
        supabase.from('users').select('name, region, interests').eq('id', orgId).maybeSingle(),
        supabase.from('org_listings').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      ])
      setOrg(orgData)
      setListings(listData || [])
      setLoading(false)
    }
    load()
  }, [orgId])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>Loading...</div>
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
              {l.remote ? 'Remote' : l.location} · {l.date || 'Flexible'} · {l.hours ? `${l.hours}h` : ''}
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Temporarily add a test button in App.jsx to open OrgProfile with a real org user ID to confirm it renders. Remove the test button after verifying.

- [ ] **Step 3: Commit**

```bash
cd /root/givehour && git add src/screens/OrgProfile.jsx
git commit -m "feat: add public OrgProfile screen with org listings"
```

---

## Task 8: Wire Org Name as Clickable in `OpportunityDetail.jsx`

**Files:**
- Modify: `src/screens/OpportunityDetail.jsx`

- [ ] **Step 1: Add `onSelectOrg` prop and make org name clickable**

Open `src/screens/OpportunityDetail.jsx`. Change the function signature on line 5:

```jsx
export default function OpportunityDetail({ opp, user, onBack, isGuest, onSignUp, onSelectOrg }) {
```

Find the part of the JSX where the org name is displayed (look for `opp.org` in the rendered output). Wrap it in a button that calls `onSelectOrg` when the opp has an `org_id`:

```jsx
{opp.org && (
  opp.org_id && onSelectOrg
    ? <button onClick={() => onSelectOrg(opp.org_id)}
        style={{ background: 'none', border: 'none', padding: 0, color: T.primary, fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}>
        {opp.org}
      </button>
    : <span style={{ color: T.textMuted }}>{opp.org}</span>
)}
```

- [ ] **Step 2: Verify in browser**

Open OrgProfile → tap a listing → see OpportunityDetail. The org name in the header should be underlined/green and tappable. Tapping it navigates back to OrgProfile.

For a listing from Feed/Explore (no `org_id`), the org name shows as plain text — no link.

- [ ] **Step 3: Commit**

```bash
cd /root/givehour && git add src/screens/OpportunityDetail.jsx
git commit -m "feat: make org name clickable on OpportunityDetail when org_id present"
```

---

## Task 9: Add "Apply on Give Hour" to `OpportunityDetail.jsx`

**Files:**
- Modify: `src/screens/OpportunityDetail.jsx`

- [ ] **Step 1: Add application form state**

In `OpportunityDetail`, add these state vars after the existing ones (after line 10):

```jsx
const [applyStep, setApplyStep]     = useState('idle') // 'idle' | 'form' | 'sending' | 'done'
const [appMessage, setAppMessage]   = useState('')
```

- [ ] **Step 2: Add `handleApplyLocal` function**

Add this function after `handleShare` (after line 51):

```jsx
const handleApplyLocal = async () => {
  if (!user?.id) return
  setApplyStep('sending')
  try {
    const session = await import('../lib/supabase').then(m => m.supabase.auth.getSession())
    const token = session.data.session?.access_token
    await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        org_listing_id: opp.id,
        org_id:         opp.org_id,
        message:        appMessage,
        teen_name:      user.name,
        teen_email:     user.email,
      }),
    })
    setApplyStep('done')
  } catch (_) {
    setApplyStep('form')
  }
}
```

- [ ] **Step 3: Replace the `applyButton` definition**

Find the existing `applyButton` const (around line 101). Replace it with:

```jsx
const applyButton = isGuest ? (
  <div style={{ background: T.primaryLight, borderRadius: 14, padding: 16, textAlign: 'center' }}>
    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Sign up to apply</div>
    <button onClick={onSignUp} style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Create account</button>
  </div>
) : externalUrl ? (
  <button onClick={handleApply}
    style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
    Apply on {opp.org ? `${opp.org}'s website` : 'website'} →
  </button>
) : opp.org_id ? (
  applyStep === 'done' ? (
    <div style={{ background: T.primaryLight, borderRadius: 14, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>✅</div>
      <div style={{ fontWeight: 700, color: T.text }}>Application sent!</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>The org will be in touch. Check "My Applications" in your Profile.</div>
    </div>
  ) : applyStep === 'form' || applyStep === 'sending' ? (
    <div style={{ background: T.card, borderRadius: 14, padding: 16, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>Why do you want to help? (optional)</div>
      <textarea value={appMessage} onChange={e => setAppMessage(e.target.value)}
        placeholder="Tell them a bit about yourself..."
        rows={3}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: T.bg, resize: 'none', marginBottom: 12 }} />
      <button onClick={handleApplyLocal} disabled={applyStep === 'sending'}
        style={{ width: '100%', padding: 14, background: applyStep === 'sending' ? '#B8D8C8' : T.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: applyStep === 'sending' ? 'default' : 'pointer' }}>
        {applyStep === 'sending' ? 'Sending...' : 'Send Application'}
      </button>
    </div>
  ) : (
    <button onClick={() => setApplyStep('form')}
      style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
      Apply on Give Hour
    </button>
  )
) : null
```

- [ ] **Step 4: Verify in browser**

Open a listing posted by an org (via OrgProfile) that has no external URL:
- Apply button says "Apply on Give Hour"
- Tapping it shows a textarea + "Send Application" button
- Submitting shows the success state
- Check Supabase → `applications` table has a new row
- Check org's email for notification

For a listing with an external URL — button still says "Apply on website →" and opens the URL.

- [ ] **Step 5: Commit**

```bash
cd /root/givehour && git add src/screens/OpportunityDetail.jsx
git commit -m "feat: add 'Apply on Give Hour' flow for org listings without external URL"
```

---

## Task 10: Add "My Applications" to `Profile.jsx`

**Files:**
- Modify: `src/screens/Profile.jsx`

- [ ] **Step 1: Add applications state**

In `Profile.jsx`, add two state vars after the existing ones (after the `showNotif` line):

```jsx
const [applications, setApplications] = useState([])
```

- [ ] **Step 2: Fetch applications in the `load()` useEffect**

Inside the `load()` async function in the existing `useEffect` (after the `hours_log` fetch block), add:

```js
const { data: apps } = await supabase
  .from('applications')
  .select('*, org_listings(title)')
  .eq('teen_id', user?.id)
  .order('submitted_at', { ascending: false })
setApplications(apps || [])
```

- [ ] **Step 3: Add "My Applications" section to the JSX**

Find the closing `</div>` of the profile content (near the bottom of the return statement). Before it, add:

```jsx
{/* My Applications */}
{applications.length > 0 && (
  <div style={{ marginTop: 24 }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>My Applications</div>
    {applications.map(a => {
      const statusColor = a.status === 'accepted' ? T.primary : a.status === 'declined' ? T.danger : T.textMuted
      return (
        <div key={a.id} style={{ background: T.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{a.org_listings?.title}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
            {new Date(a.submitted_at).toLocaleDateString()}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: statusColor, marginTop: 4, textTransform: 'capitalize' }}>{a.status}</div>
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 4: Verify in browser**

Log in as a teen who has submitted an application. Open Profile — scroll to the bottom. Confirm "My Applications" section appears with the listing title, date, and status.

- [ ] **Step 5: Commit**

```bash
cd /root/givehour && git add src/screens/Profile.jsx
git commit -m "feat: add My Applications section to teen Profile screen"
```

---

## Task 11: Create `ApplicantsInbox.jsx`

**Files:**
- Create: `src/screens/ApplicantsInbox.jsx`

- [ ] **Step 1: Create the file**

Create `/root/givehour/src/screens/ApplicantsInbox.jsx`:

```jsx
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

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('applications')
        .select('*, org_listings(title)')
        .eq('org_id', user.id)
        .order('submitted_at', { ascending: false })
      setApplications(data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const updateStatus = async (id, status) => {
    await supabase.from('applications').update({ status }).eq('id', id)
    setApplications(apps => apps.map(a => a.id === id ? { ...a, status } : a))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Applicants</div>
      <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>
        {applications.length} application{applications.length !== 1 ? 's' : ''} received
      </div>

      {applications.length === 0 && (
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
```

- [ ] **Step 2: Verify in browser**

Log in as org → tap "Applicants" tab. Confirm:
- Empty state shows when no applications
- After a teen applies, the application card shows with teen name, listing title, message, date
- Accept/Decline buttons update the status badge instantly

- [ ] **Step 3: Commit**

```bash
cd /root/givehour && git add src/screens/ApplicantsInbox.jsx
git commit -m "feat: add ApplicantsInbox screen for orgs to review and action applications"
```

---

## Task 12: Update Databricks Pipeline to Include Org Listings

**Files:**
- Modify: `01_ingest` notebook in Databricks (givehour/ folder)

- [ ] **Step 1: Open the 01_ingest notebook in Databricks**

Go to your Databricks workspace → givehour/ folder → open `01_ingest`.

- [ ] **Step 2: Add org listings ingest at the end of the notebook**

Add a new cell at the bottom:

```python
# Ingest org-posted listings from Supabase into clean_listings
from supabase import create_client
import pandas as pd
from datetime import datetime

supabase_url = os.environ["SUPABASE_URL"]
supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
client = create_client(supabase_url, supabase_key)

resp = client.table("org_listings").select("*").execute()
org_rows = resp.data or []

if org_rows:
    clean_rows = []
    for r in org_rows:
        clean_rows.append({
            "id":          r["id"],
            "title":       r.get("title", ""),
            "org":         None,  # org name fetched separately if needed
            "org_id":      r.get("org_id"),
            "cause":       r.get("cause", ""),
            "age_group":   r.get("age_group", "all"),
            "location":    "Remote" if r.get("remote") else (r.get("location") or ""),
            "remote":      r.get("remote", False),
            "description": r.get("description", ""),
            "hours":       r.get("hours"),
            "date":        str(r.get("date")) if r.get("date") else None,
            "external_url": r.get("external_url"),
            "fetched_at":  datetime.utcnow().isoformat(),
            "source":      "org",
        })

    df_org = pd.DataFrame(clean_rows)

    # Upsert org listings into clean_listings
    for row in clean_rows:
        client.table("clean_listings").upsert(row, on_conflict="id").execute()

    print(f"Upserted {len(clean_rows)} org listings into clean_listings")
else:
    print("No org listings found")
```

- [ ] **Step 3: Add `org_id` and `source` columns to `clean_listings` in Supabase**

Run this SQL in Supabase SQL Editor:

```sql
alter table clean_listings add column if not exists org_id uuid;
alter table clean_listings add column if not exists source text default 'api';
```

- [ ] **Step 4: Run the notebook manually to test**

In Databricks, click "Run All" on `01_ingest`. Confirm the output shows org listings upserted.

Check Supabase → `clean_listings` — org-posted listings should appear with `source = 'org'` and their `org_id` set.

- [ ] **Step 5: Commit the GitHub version of the notebook**

If you keep a GitHub copy of the notebook, update it with the new cell and commit:

```bash
cd /root/givehour && git add .
git commit -m "feat: update ingest pipeline to merge org_listings into clean_listings"
```

---

## Final Verification Checklist

- [ ] Org signs up → lands on OrgDashboard (not Feed)
- [ ] Org posts a listing → appears in their dashboard
- [ ] Teen visits an org's public profile → sees all listings
- [ ] Tapping a listing from OrgProfile opens OpportunityDetail
- [ ] Org name on OpportunityDetail is clickable → returns to OrgProfile
- [ ] Listing with no external URL shows "Apply on Give Hour" button
- [ ] Teen submits application → success state shown
- [ ] Application saved to `applications` table in Supabase
- [ ] Org receives email notification
- [ ] Org logs in → Applicants tab shows the application
- [ ] Org can Accept or Decline → status updates instantly
- [ ] Teen's Profile shows "My Applications" with current status
- [ ] Pipeline run merges org listings into `clean_listings` with `org_id`
