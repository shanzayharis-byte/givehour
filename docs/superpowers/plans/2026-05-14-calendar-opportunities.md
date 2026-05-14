# Calendar Opportunities Timeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hours-log Calendar screen with a public opportunities timeline showing upcoming volunteer events grouped by date, with a Saved toggle and inline quick-preview cards.

**Architecture:** Single-file rewrite of `src/screens/Calendar.jsx`. Fetches all `clean_listings` rows directly from Supabase, parses and partitions them into dated (future) vs dateless buckets, and cross-references `saved_opportunities` for the Saved toggle. No new API endpoints needed.

**Tech Stack:** React 19, Supabase JS client, existing theme (`T`, `CAUSE` from `src/lib/theme.js`)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/screens/Calendar.jsx` | **Rewrite** | Full opportunities timeline UI |
| `src/App.jsx` | No change needed | Already imports and routes `calendar` |

---

### Task 1: Date parsing utility + data fetch

**Files:**
- Modify: `src/screens/Calendar.jsx` (replace entire file)

- [ ] **Step 1: Write the shell with data fetching**

Replace `src/screens/Calendar.jsx` entirely with:

```jsx
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
      setLoading(false)
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
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Calendar.jsx
git commit -m "feat: calendar shell with data fetch"
```

---

### Task 2: Partition listings into dated buckets

**Files:**
- Modify: `src/screens/Calendar.jsx`

- [ ] **Step 1: Add partitioning logic inside the component, before the return**

Add this block after the `useEffect`, before `return`:

```jsx
  // Partition into future-dated groups and dateless
  const dated = []   // [{ dateObj, dateStr, items }]
  const dateless = []

  const dateMap = {}
  for (const l of listings) {
    if (savedOnly && !savedIds.has(String(l.id))) continue
    const d = parseFutureDate(l.date)
    if (d) {
      const key = d.toISOString().split('T')[0]
      if (!dateMap[key]) {
        dateMap[key] = { dateObj: d, dateStr: fmtDateHeader(d), items: [] }
        dated.push(dateMap[key])
      }
      dateMap[key].items.push(l)
    } else {
      dateless.push(l)
    }
  }
  dated.sort((a, b) => a.dateObj - b.dateObj)
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Calendar.jsx
git commit -m "feat: partition listings into dated and dateless buckets"
```

---

### Task 3: Saved toggle + timeline list UI

**Files:**
- Modify: `src/screens/Calendar.jsx`

- [ ] **Step 1: Replace the return block with the full timeline UI**

Replace the entire `return (...)` with:

```jsx
  const toggleSave = async (l) => {
    if (!user && !isGuest) return
    if (isGuest || !user) { onSignUp?.(); return }
    const idStr = String(l.id)
    if (savedIds.has(idStr)) {
      await supabase.from('saved_opportunities').delete().eq('user_id', user.id).eq('listing_id', idStr)
      setSavedIds(prev => { const s = new Set(prev); s.delete(idStr); return s })
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: user.id, listing_id: idStr })
      setSavedIds(prev => new Set([...prev, idStr]))
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 40px' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Calendar</div>
            <div style={{ fontSize: 13, color: T.textSub, marginTop: 2 }}>Upcoming volunteer opportunities</div>
          </div>
          {user && (
            <button
              onClick={() => { setSavedOnly(v => !v); setExpanded(null) }}
              style={{ background: savedOnly ? T.primary : T.card, color: savedOnly ? '#fff' : T.textSub, border: `1px solid ${savedOnly ? T.primary : T.border}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              🔖 Saved
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted, fontSize: 14 }}>Loading...</div>
        ) : dated.length === 0 && dateless.length === 0 ? (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSub, marginBottom: 6 }}>
              {savedOnly ? "You haven't saved any opportunities yet." : 'No upcoming opportunities right now.'}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>
              {savedOnly ? 'Browse opportunities and tap the bookmark to save.' : 'Check back soon.'}
            </div>
          </div>
        ) : (
          <>
            {/* dated timeline */}
            {dated.map(group => (
              <div key={group.dateObj.toISOString()} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, paddingLeft: 4 }}>
                  {group.dateStr}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(l => (
                    <OppCard
                      key={l.id}
                      l={l}
                      expanded={expanded === l.id}
                      onToggle={() => setExpanded(expanded === l.id ? null : l.id)}
                      saved={savedIds.has(String(l.id))}
                      onSave={() => toggleSave(l)}
                      user={user}
                      isGuest={isGuest}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* no date section */}
            {dateless.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setNoDateOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 8 }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>No date listed ({dateless.length})</span>
                  <span style={{ fontSize: 14, color: T.textMuted, transform: noDateOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
                </button>
                {noDateOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dateless.map(l => (
                      <OppCard
                        key={l.id}
                        l={l}
                        expanded={expanded === l.id}
                        onToggle={() => setExpanded(expanded === l.id ? null : l.id)}
                        saved={savedIds.has(String(l.id))}
                        onSave={() => toggleSave(l)}
                        user={user}
                        isGuest={isGuest}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in` — will warn about missing `OppCard` component, that's fine for now (added next task).

- [ ] **Step 3: Commit**

```bash
git add src/screens/Calendar.jsx
git commit -m "feat: calendar timeline UI with saved toggle and date groups"
```

---

### Task 4: OppCard component (compact row + accordion preview)

**Files:**
- Modify: `src/screens/Calendar.jsx` — add `OppCard` above the default export

- [ ] **Step 1: Add the OppCard component**

Insert this above `export default function Calendar(...)`:

```jsx
function OppCard({ l, expanded, onToggle, saved, onSave, user, isGuest }) {
  const cause = CAUSE[l.cause] || { bg: '#F2F2F2', text: '#666' }
  return (
    <div style={{ background: T.card, border: `1px solid ${expanded ? T.primary : T.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      {/* compact row */}
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {l.org}{l.location ? ` · ${l.location}` : ''}
          </div>
        </div>
        <div style={{ background: cause.bg, color: cause.text, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>{l.cause || 'General'}</div>
        <span style={{ fontSize: 14, color: T.textMuted, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>

      {/* expanded preview */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${T.border}` }}>
          {l.hours && (
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 10, marginBottom: 6 }}>⏱ {l.hours} hrs</div>
          )}
          {l.description && (
            <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, marginBottom: 12,
              display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {l.description}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {l.external_url && (
              <a
                href={l.external_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: T.primary, color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
              >
                Visit site →
              </a>
            )}
            {(user || isGuest) && (
              <button
                onClick={(e) => { e.stopPropagation(); onSave() }}
                style={{ background: saved ? T.primaryLight : T.bg, color: saved ? T.primary : T.textSub, border: `1px solid ${saved ? T.primary : T.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {saved ? '✓ Saved' : '🔖 Save'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Calendar.jsx
git commit -m "feat: OppCard accordion with inline preview, save button, visit site link"
```

---

### Task 5: Wire guest props from App.jsx + final verification

**Files:**
- Modify: `src/App.jsx` — pass `isGuest` and `onSignUp` to Calendar

- [ ] **Step 1: Update the Calendar case in App.jsx**

In `src/App.jsx`, find:
```jsx
case 'calendar':      return <Calendar user={dbUser} />
```

Replace with:
```jsx
case 'calendar':      return <Calendar user={dbUser} isGuest={isGuest} onSignUp={() => { setIsGuest(false); setActiveScreen('auth-signup') }} onLogin={() => { setIsGuest(false); setActiveScreen('auth-login') }} />
```

- [ ] **Step 2: Final build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in` with no errors.

- [ ] **Step 3: Commit and push**

```bash
git add src/screens/Calendar.jsx src/App.jsx
git commit -m "feat: opportunities calendar timeline — replace hours log with public event board"
git push origin main
```
