# Give Hour System 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Give Hour System 1 React app — 7 screens, auth, navigation — and deploy live to Vercel.

**Architecture:** Foundation-first, wired together as we go. Supabase handles auth + database. All styles are inline (no CSS files, no Tailwind). App.jsx holds top-level state and routes between screens; Auth is shown until the user logs in or browses as a guest.

**Tech Stack:** React 19, Vite, Supabase JS client (`@supabase/supabase-js`), Vercel (auto-deploy from GitHub push)

**Spec:** `docs/superpowers/specs/2026-05-08-givehour-system1-design.md`
**UI reference:** `docs/givehour-build-reference-Shanzay.md`

**Critical rule: Do NOT touch anything in `/root/bfcc` at any point.**

---

## Task 0: Supabase setup (manual — no code to commit)

**Files:** None (SQL runs in Supabase dashboard)

- [ ] **Step 1: Open Supabase dashboard → SQL Editor**

Go to your Supabase project → SQL Editor → New query. Run this SQL to create all tables:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  grade text,
  zip text,
  school text,
  role text default 'teen',
  interests text[],
  created_at timestamptz default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  org text,
  title text,
  cause text,
  hours text,
  date text,
  location text,
  description text,
  spots_total int,
  spots_remaining int,
  skills text[],
  created_at timestamptz default now()
);

create table registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  opportunity_id uuid references opportunities(id),
  registered_at timestamptz default now()
);

create table hours_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  opportunity_id uuid references opportunities(id),
  org text,
  hours numeric,
  notes text,
  logged_at timestamptz default now()
);

create table clean_listings (
  id uuid primary key default gen_random_uuid(),
  org text, title text, cause text, hours text,
  date text, location text, description text,
  created_at timestamptz default now()
);

create table match_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  opportunity_id uuid references opportunities(id),
  score numeric
);

create table impact_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  cause text,
  total_hours numeric
);

create table personalized_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  opportunity_id uuid references opportunities(id),
  rank int,
  score numeric
);
```

- [ ] **Step 2: Run RLS policies**

New query → run:

```sql
-- users
alter table users enable row level security;
create policy "Users can read own row" on users for select using (auth.uid() = id);
create policy "Users can insert own row" on users for insert with check (auth.uid() = id);
create policy "Users can update own row" on users for update using (auth.uid() = id);

-- opportunities (public read)
alter table opportunities enable row level security;
create policy "Opportunities are publicly readable" on opportunities for select using (true);

-- registrations
alter table registrations enable row level security;
create policy "Users can read own registrations" on registrations for select using (auth.uid() = user_id);
create policy "Users can insert own registrations" on registrations for insert with check (auth.uid() = user_id);
create policy "Users can delete own registrations" on registrations for delete using (auth.uid() = user_id);

-- hours_log
alter table hours_log enable row level security;
create policy "Users can read own hours" on hours_log for select using (auth.uid() = user_id);
create policy "Users can insert own hours" on hours_log for insert with check (auth.uid() = user_id);

-- System 2 tables (read-only for users)
alter table personalized_feed enable row level security;
create policy "Users can read own feed" on personalized_feed for select using (auth.uid() = user_id);
alter table impact_stats enable row level security;
create policy "Users can read own stats" on impact_stats for select using (auth.uid() = user_id);
alter table match_scores enable row level security;
create policy "Users can read own scores" on match_scores for select using (auth.uid() = user_id);
```

- [ ] **Step 3: Seed opportunities**

New query → run:

```sql
insert into opportunities (org, title, cause, hours, date, location, description, spots_total, spots_remaining, skills) values
('Habitat for Humanity', 'Home Build Day', 'Housing', '6 hrs', 'Sat May 10', 'Oakland', 'Join us for a full day of building affordable homes for Bay Area families. No experience needed — just bring energy and a willingness to learn.', 20, 12, array['Teamwork','Community impact','Physical labor']),
('Bay Area Food Bank', 'Weekend Sort & Pack', 'Food Security', '3 hrs', 'Sun May 11', 'San Jose', 'Help sort and pack thousands of pounds of food for families in need across the Bay Area.', 30, 18, array['Teamwork','Organization','Community impact']),
('Literacy for All', 'Teen Reading Mentor', 'Education', '2 hrs/wk', 'Ongoing', 'Remote', 'Mentor elementary school students in reading via video call. Flexible scheduling, training provided.', 15, 8, array['Communication','Teaching','Leadership']),
('Coastside Land Trust', 'Trail Restoration', 'Environment', '4 hrs', 'Sat May 17', 'Half Moon Bay', 'Help restore native plant habitats along the San Mateo coast. Gloves and tools provided.', 25, 14, array['Teamwork','Environmental stewardship','Physical labor']),
('SPCA Bay Area', 'Animal Care Volunteer', 'Animals', '3 hrs', 'Sat May 12', 'San Francisco', 'Spend a morning caring for shelter animals — feeding, socializing, and light cleaning.', 10, 4, array['Animal care','Compassion','Responsibility']);
```

- [ ] **Step 4: Disable email confirmation**

Supabase dashboard → Authentication → Email → turn off "Enable email confirmations". This lets users sign up and log in immediately without verifying their email.

- [ ] **Step 5: Copy your Supabase credentials**

Go to Supabase → Project Settings → API. Copy:
- Project URL (e.g. `https://abcxyz.supabase.co`)
- anon / public key (long string starting with `eyJ`)

You will need these in Task 1.

---

## Task 1: Environment + CSS reset + theme.js

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.css`
- Create: `src/lib/theme.js`
- Create: `.env.local` (never committed)

- [ ] **Step 1: Check .gitignore includes .env.local**

Run:
```bash
cat /root/givehour/.gitignore | grep env
```
Expected output includes `.env*.local` or `.env.local`. If missing, add `.env.local` to .gitignore before continuing.

- [ ] **Step 2: Create .env.local with your Supabase keys**

Create `/root/givehour/.env.local` with your actual values from Task 0 Step 5:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
```

Do NOT commit this file.

- [ ] **Step 3: Replace src/index.css with a minimal reset**

Replace the entire contents of `src/index.css` with:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { -webkit-font-smoothing: antialiased; }
```

- [ ] **Step 4: Empty src/App.css**

Replace the entire contents of `src/App.css` with:

```css
/* All styles are inline — see component files */
```

- [ ] **Step 5: Create src/lib/theme.js**

Create `/root/givehour/src/lib/theme.js`:

```javascript
export const T = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#E8EAED',
  primary: '#18A050',
  primaryLight: '#E6F7EE',
  primaryDark: '#0E7A3C',
  accent: '#3B72E8',
  accentLight: '#E8F0FF',
  warning: '#D4A010',
  warningLight: '#FFF8E0',
  danger: '#E03020',
  text: '#1A1A1A',
  textSub: '#666B72',
  textMuted: '#9EA4AB',
}

export const CAUSE = {
  'Housing':       { bg: '#FFF0E6', text: '#C04E0A' },
  'Food Security': { bg: '#FFF8E0', text: '#8A6000' },
  'Education':     { bg: '#E8F0FF', text: '#1A4DA0' },
  'Environment':   { bg: '#E6F7EE', text: '#0A6830' },
  'Animals':       { bg: '#F3EEFF', text: '#5B1FA0' },
  'Health':        { bg: '#FEE8F4', text: '#A0206A' },
  'Arts':          { bg: '#FFF0E0', text: '#A05000' },
  'Seniors':       { bg: '#F0F4FF', text: '#2040A0' },
}
```

- [ ] **Step 6: Start dev server and verify it runs**

```bash
cd /root/givehour && npm run dev
```

Expected: server starts at `http://localhost:5173` with no errors. The page will show the old Vite starter (that's fine — we haven't rewritten App.jsx yet).

- [ ] **Step 7: Commit**

```bash
cd /root/givehour && git add src/index.css src/App.css src/lib/theme.js && git commit -m "feat: add theme, reset CSS"
```

---

## Task 2: App.jsx shell

**Files:**
- Modify: `src/App.jsx` (full rewrite)

- [ ] **Step 1: Rewrite src/App.jsx**

Replace the entire contents of `src/App.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { T } from './lib/theme'

const NAV_TABS = [
  { key: 'feed',     label: 'Feed',     icon: '🏠' },
  { key: 'explore',  label: 'Explore',  icon: '🔍' },
  { key: 'loghours', label: 'Log Hours', icon: '⏱' },
  { key: 'impact',   label: 'Impact',   icon: '📊' },
  { key: 'profile',  label: 'Profile',  icon: '👤' },
]

export default function App() {
  const [authUser, setAuthUser]     = useState(null)
  const [dbUser, setDbUser]         = useState(null)
  const [activeScreen, setActiveScreen] = useState('feed')
  const [selectedOpp, setSelectedOpp]   = useState(null)
  const [isGuest, setIsGuest]       = useState(false)
  const [isDesktop, setIsDesktop]   = useState(window.innerWidth >= 1024)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setAuthUser(session.user)
        const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single()
        setDbUser(data)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) { setAuthUser(null); setDbUser(null) }
    })

    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handleResize)

    return () => { subscription.unsubscribe(); window.removeEventListener('resize', handleResize) }
  }, [])

  const handleLoggedIn = (auth, db) => {
    setAuthUser(auth); setDbUser(db); setActiveScreen('feed'); setIsGuest(false)
  }

  const handleGuest = () => { setIsGuest(true); setActiveScreen('explore') }

  const handleSignOut = () => {
    setAuthUser(null); setDbUser(null); setIsGuest(false); setActiveScreen('feed')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16, color: T.textMuted, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        Loading Give Hour...
      </div>
    )
  }

  if (!authUser && !isGuest) {
    // Auth screens — placeholder until Auth.jsx is built
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>Give Hour</div>
        <button onClick={handleGuest} style={{ background: T.primary, color: '#fff', padding: '12px 24px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Browse as guest (temporary)
        </button>
      </div>
    )
  }

  const showNav = !!authUser && !selectedOpp

  const renderScreen = () => {
    if (selectedOpp) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: T.textMuted, fontSize: 14 }}>
          OpportunityDetail coming soon
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: T.textMuted, fontSize: 14 }}>
        {activeScreen} screen coming soon
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: T.bg, overflow: 'hidden' }}>

      {/* Desktop sidebar */}
      {isDesktop && showNav && (
        <div style={{ width: 220, background: T.card, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #18A050, #0E7A3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>GH</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Give Hour</div>
                <div style={{ fontSize: 10, color: T.textMuted }}>Teen Portal</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '14px 12px', flex: 1 }}>
            {NAV_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveScreen(tab.key); setSelectedOpp(null) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 4, background: activeScreen === tab.key ? T.primaryLight : 'transparent', color: activeScreen === tab.key ? T.primary : '#60666D', fontWeight: activeScreen === tab.key ? 600 : 400, fontSize: 14, fontFamily: 'inherit' }}
              >
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderScreen()}
        </div>

        {/* Mobile bottom nav */}
        {!isDesktop && showNav && (
          <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, display: 'flex', paddingBottom: 8, flexShrink: 0 }}>
            {NAV_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveScreen(tab.key); setSelectedOpp(null) }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px 4px', border: 'none', background: 'none', cursor: 'pointer', gap: 3, fontFamily: 'inherit' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 10, background: activeScreen === tab.key ? T.primaryLight : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
                  {tab.icon}
                </div>
                <span style={{ fontSize: 9, fontWeight: activeScreen === tab.key ? 600 : 400, color: activeScreen === tab.key ? T.primary : T.textMuted }}>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

With dev server running, open `http://localhost:5173`. Expected:
- You see "Give Hour" centered with a "Browse as guest" button
- Click "Browse as guest" → nav appears at bottom (mobile) or left sidebar (desktop)
- Nav tabs switch the screen label (e.g. "explore screen coming soon")
- On desktop (widen window past 1024px) → sidebar shows instead of bottom nav

- [ ] **Step 3: Commit**

```bash
cd /root/givehour && git add src/App.jsx src/App.css src/index.css && git commit -m "feat: App shell with nav and routing"
```

---

## Task 3: Auth.jsx

**Files:**
- Create: `src/screens/Auth.jsx`
- Modify: `src/App.jsx` (replace placeholder with real Auth import)

- [ ] **Step 1: Create src/screens/Auth.jsx**

Create `/root/givehour/src/screens/Auth.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function Auth({ onLoggedIn, onGuest }) {
  const [screen, setScreen]       = useState('landing')
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  // Cross-step form state
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [grade, setGrade]       = useState('')
  const [zip, setZip]           = useState('')
  const [school, setSchool]     = useState('')
  const [interests, setInterests] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const wrap = (content) => {
    if (!isDesktop) return content
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 20, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          {content}
        </div>
      </div>
    )
  }

  const TopBar = ({ title, subtitle, onBack }) => (
    <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      {onBack && <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '5px 11px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>←</button>}
      <div>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  )

  const DesktopBack = ({ label, onBack, subtitle }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 4 : 0 }}>
        <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '5px 11px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>←</button>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{label}</div>
      </div>
      {subtitle && <div style={{ fontSize: 11, color: T.textMuted, marginLeft: 42 }}>{subtitle}</div>}
    </div>
  )

  const Field = ({ label, ...props }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <input style={{ background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.text, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} {...props} />
    </div>
  )

  const PrimaryBtn = ({ children, disabled, onClick }) => (
    <button disabled={disabled} onClick={onClick}
      style={{ background: disabled ? '#B8D8C8' : T.primary, color: '#fff', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, width: '100%', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit' }}>
      {children}
    </button>
  )

  // ── Landing ──────────────────────────────────────────────────────────────
  if (screen === 'landing') return wrap(
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100vh', background: T.card, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #18A050, #0E7A3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', boxShadow: '0 8px 24px rgba(24,160,80,0.3)', marginBottom: 24 }}>GH</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: '0 0 10px', color: T.text, fontFamily: 'inherit' }}>Give an Hour.<br />Change a Life.</h1>
        <p style={{ fontSize: 14, color: T.textSub, maxWidth: 280, lineHeight: 1.7, margin: '0 0 28px', fontFamily: 'inherit' }}>Find personalized volunteer opportunities, log your hours, and build your college application story.</p>
        <div style={{ display: 'flex', gap: 20, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 20px' }}>
          {[['2,400+', 'teens'], ['180+', 'orgs'], ['12,000+', 'hours']].map(([val, lbl]) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.primary }}>{val}</div>
              <div style={{ fontSize: 10, color: T.textMuted }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => setScreen('userType')} style={{ background: T.primary, color: '#fff', padding: 15, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(24,160,80,0.3)', fontFamily: 'inherit' }}>Get started — it's free</button>
        <button onClick={() => setScreen('login')} style={{ background: '#fff', border: `2px solid ${T.primary}`, color: T.primary, padding: 15, borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>I already have an account</button>
        <button onClick={onGuest} style={{ background: 'none', border: 'none', fontSize: 13, color: T.textMuted, cursor: 'pointer', fontFamily: 'inherit' }}>Browse without signing up →</button>
      </div>
    </div>
  )

  // ── User type ─────────────────────────────────────────────────────────────
  if (screen === 'userType') {
    const types = [
      { emoji: '🎒', title: "I'm a teen",         sub: 'Find opportunities and log hours' },
      { emoji: '🏢', title: "I'm an organization", sub: 'Post listings and manage volunteers' },
      { emoji: '👨‍👩‍👧', title: "I'm a parent",        sub: 'Help your teen find opportunities' },
    ]
    return wrap(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100vh', background: T.card, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {!isDesktop ? <TopBar title="Join Give Hour" onBack={() => setScreen('landing')} /> : <DesktopBack label="Join Give Hour" onBack={() => setScreen('landing')} />}
        <div style={{ padding: '24px 20px', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>Who are you?</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>We'll customize your experience.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {types.map(t => (
              <button key={t.title} onClick={() => setScreen('step1')}
                style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, display: 'flex', gap: 14, cursor: 'pointer', alignItems: 'center', fontFamily: 'inherit', textAlign: 'left' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: T.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{t.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: T.textSub }}>{t.sub}</div>
                </div>
                <div style={{ color: T.textMuted, fontSize: 18 }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1 ────────────────────────────────────────────────────────────────
  if (screen === 'step1') return wrap(
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100vh', background: T.card, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {!isDesktop ? <TopBar title="Create account" subtitle="Step 1 of 3 — Basic info" onBack={() => setScreen('userType')} /> : <DesktopBack label="Create account" subtitle="Step 1 of 3 — Basic info" onBack={() => setScreen('userType')} />}
      <div style={{ padding: '24px 20px', flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 20 }}>Tell us about you</div>
        <Field label="First name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your first name" />
        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
        <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 20, lineHeight: 1.6 }}>By continuing you agree to our Terms of Service and Privacy Policy.</div>
        <PrimaryBtn disabled={!name || !email || !password} onClick={() => setScreen('step2')}>Continue</PrimaryBtn>
      </div>
    </div>
  )

  // ── Step 2 ────────────────────────────────────────────────────────────────
  if (screen === 'step2') {
    const grades = ['8th', '9th', '10th', '11th', '12th', 'College']
    return wrap(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100vh', background: T.card, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {!isDesktop ? <TopBar title="Create account" subtitle="Step 2 of 3 — School info" onBack={() => setScreen('step1')} /> : <DesktopBack label="Create account" subtitle="Step 2 of 3 — School info" onBack={() => setScreen('step1')} />}
        <div style={{ padding: '24px 20px', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Grade</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {grades.map(g => (
              <button key={g} onClick={() => setGrade(g)}
                style={{ background: grade === g ? T.primary : '#fff', color: grade === g ? '#fff' : T.textSub, border: `1px solid ${grade === g ? T.primary : T.border}`, borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{g}</button>
            ))}
          </div>
          <Field label="Zip code" type="text" value={zip} onChange={e => setZip(e.target.value)} placeholder="94xxx" />
          <Field label="School name (optional)" type="text" value={school} onChange={e => setSchool(e.target.value)} placeholder="Your school name" />
          <PrimaryBtn disabled={!grade || !zip} onClick={() => setScreen('step3')}>Continue</PrimaryBtn>
        </div>
      </div>
    )
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────
  if (screen === 'step3') {
    const causes = Object.keys(CAUSE)
    const toggle = (c) => setInterests(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

    const handleFinish = async () => {
      setLoading(true); setError('')
      try {
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) throw signUpErr
        const { data: dbData, error: insertErr } = await supabase.from('users').insert({
          id: authData.user.id, name, email, grade, zip, school, interests, role: 'teen'
        }).select().single()
        if (insertErr) throw insertErr
        onLoggedIn(authData.user, dbData)
      } catch (err) {
        setError(err.message || 'Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    return wrap(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100vh', background: T.card, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {!isDesktop ? <TopBar title="Create account" subtitle="Step 3 of 3 — Your interests" onBack={() => setScreen('step2')} /> : <DesktopBack label="Create account" subtitle="Step 3 of 3 — Your interests" onBack={() => setScreen('step2')} />}
        <div style={{ padding: '24px 20px', flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>What causes do you care about?</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24, lineHeight: 1.6 }}>Pick at least 2. We'll use this to personalize your feed.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            {causes.map(c => {
              const sel = interests.includes(c)
              return (
                <button key={c} onClick={() => toggle(c)}
                  style={{ padding: '10px 16px', borderRadius: 24, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', background: sel ? CAUSE[c].bg : '#fff', border: `${sel ? 2 : 1.5}px solid ${sel ? CAUSE[c].text : T.border}`, color: sel ? CAUSE[c].text : T.textSub, fontWeight: sel ? 600 : 400 }}>
                  {sel ? `✓ ${c}` : c}
                </button>
              )
            })}
          </div>
          {error && <div style={{ color: T.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <PrimaryBtn disabled={interests.length < 2 || loading} onClick={handleFinish}>
            {interests.length < 2 ? `Pick ${2 - interests.length} more` : loading ? 'Creating account...' : 'Finish setup →'}
          </PrimaryBtn>
        </div>
      </div>
    )
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (screen === 'login') {
    const handleLogin = async () => {
      setLoading(true); setError('')
      try {
        const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) throw signInErr
        const { data: dbData } = await supabase.from('users').select('*').eq('id', authData.user.id).single()
        onLoggedIn(authData.user, dbData)
      } catch (err) {
        setError(err.message || 'Login failed. Check your email and password.')
      } finally {
        setLoading(false)
      }
    }

    return wrap(
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: isDesktop ? 'auto' : '100vh', background: T.card, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {!isDesktop ? <TopBar title="Welcome back" onBack={() => setScreen('landing')} /> : <DesktopBack label="Welcome back" onBack={() => setScreen('landing')} />}
        <div style={{ padding: '24px 20px', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>Log in</div>
          <div style={{ fontSize: 13, color: T.textSub, marginBottom: 24 }}>Good to see you again.</div>
          <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
          <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
          <div style={{ textAlign: 'right', marginBottom: 24 }}>
            <button style={{ background: 'none', border: 'none', fontSize: 13, color: T.primary, cursor: 'pointer', fontFamily: 'inherit' }}>Forgot password?</button>
          </div>
          {error && <div style={{ color: T.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <PrimaryBtn disabled={!email || !password || loading} onClick={handleLogin}>
            {loading ? 'Logging in...' : 'Log in'}
          </PrimaryBtn>
        </div>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 2: Wire Auth into App.jsx**

In `src/App.jsx`, add the Auth import after the existing imports, and replace the placeholder auth block:

Find this block:
```jsx
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { T } from './lib/theme'
```

Replace with:
```jsx
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { T } from './lib/theme'
import Auth from './screens/Auth'
```

Then find this placeholder block in App.jsx:
```jsx
  if (!authUser && !isGuest) {
    // Auth screens — placeholder until Auth.jsx is built
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>Give Hour</div>
        <button onClick={handleGuest} style={{ background: T.primary, color: '#fff', padding: '12px 24px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Browse as guest (temporary)
        </button>
      </div>
    )
  }
```

Replace with:
```jsx
  if (!authUser && !isGuest) {
    return <Auth onLoggedIn={handleLoggedIn} onGuest={handleGuest} />
  }
```

- [ ] **Step 3: Test the auth flow in browser**

Open `http://localhost:5173`. Test:
1. Landing page shows — "Give an Hour. Change a Life." with stats row
2. "Get started" → user type screen → Teen → step 1 → fill name/email/password → Continue
3. Step 2 → pick a grade + zip → Continue
4. Step 3 → pick 2+ interests → "Finish setup →" button enables → click it
5. After signup → lands on Feed screen (shows "feed screen coming soon")
6. Reload page → still logged in (session persisted)
7. Click Profile tab → "Sign out" (not built yet, that's fine)
8. Go back to landing → "I already have an account" → login with the email/password you just created
9. After login → lands on Feed

If signup fails: check Supabase dashboard → Authentication tab → confirm the user was created. If it was created but insert to `users` failed, check the RLS policy allows insert where `auth.uid() = id`.

- [ ] **Step 4: Commit**

```bash
cd /root/givehour && git add src/screens/Auth.jsx src/App.jsx && git commit -m "feat: Auth screen — landing, signup 3-step, login"
```

---

## Task 4: Feed.jsx

**Files:**
- Create: `src/screens/Feed.jsx`
- Modify: `src/App.jsx` (import + wire)

- [ ] **Step 1: Create src/screens/Feed.jsx**

Create `/root/givehour/src/screens/Feed.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function Feed({ user, onSelectOpp }) {
  const [opps, setOpps]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [totalHours, setTotalHours] = useState(0)
  const [orgCount, setOrgCount]   = useState(0)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => { if (user?.id) fetchData() }, [user])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: pf } = await supabase
        .from('personalized_feed')
        .select('rank, opportunities(*)')
        .eq('user_id', user.id)
        .order('rank')

      if (pf && pf.length > 0) {
        setOpps(pf.map(r => r.opportunities))
      } else {
        const { data } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false })
        setOpps(data || [])
      }

      const { data: logs } = await supabase.from('hours_log').select('hours, org').eq('user_id', user.id)
      if (logs) {
        setTotalHours(logs.reduce((s, r) => s + Number(r.hours), 0))
        setOrgCount(new Set(logs.map(r => r.org).filter(Boolean)).size)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning 👋'
    if (h < 18) return 'Good afternoon 👋'
    return 'Good evening 👋'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: T.textMuted, fontSize: 14, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      Loading your feed...
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: isDesktop ? '16px 40px' : '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: T.textMuted }}>{greeting()}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Hi, {user?.name || 'there'}</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: T.primaryLight, color: T.primary, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: totalHours, lbl: 'hours',  bg: T.primaryLight, color: T.primary },
            { val: orgCount,   lbl: 'orgs',   bg: T.accentLight,  color: T.accent },
            { val: 0,          lbl: 'streak', bg: T.warningLight, color: T.warning },
          ].map(({ val, lbl, bg, color }) => (
            <div key={lbl} style={{ flex: 1, background: bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: 10, color, opacity: 0.75 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: isDesktop ? '32px 40px' : '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.textSub, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 12 }}>YOUR TOP MATCHES TODAY</div>
        <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opps.map((opp, i) => (
            <div key={opp.id} onClick={() => onSelectOpp(opp)}
              style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', position: 'relative' }}>
              {i === 0 && (
                <div style={{ position: 'absolute', top: 14, right: 14, background: T.primaryLight, color: '#0A6830', fontSize: 10, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>NEW</div>
              )}
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>{opp.org}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{opp.title}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: CAUSE[opp.cause]?.bg || T.bg, color: CAUSE[opp.cause]?.text || T.textSub, fontWeight: 500 }}>{opp.cause}</span>
                <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                <span style={{ fontSize: 12, color: T.textMuted }}>{opp.hours}</span>
                <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                <span style={{ fontSize: 12, color: T.textMuted }}>{opp.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>{opp.date}</span>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: T.primaryLight, color: T.primary }}>94% match</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire Feed into App.jsx**

Add import after the Auth import:
```jsx
import Feed from './screens/Feed'
```

Replace the `case 'feed'` in `renderScreen()`:
```jsx
    switch (activeScreen) {
      case 'feed':     return <Feed user={dbUser} onSelectOpp={setSelectedOpp} />
      case 'explore':
      case 'loghours':
      case 'impact':
      case 'profile':
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: T.textMuted, fontSize: 14 }}>
            {activeScreen} screen coming soon
          </div>
        )
    }
```

Also replace the selectedOpp placeholder in `renderScreen()`:
```jsx
    if (selectedOpp) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: T.textMuted, fontSize: 14 }}>
          OpportunityDetail coming soon — tap back in next task
        </div>
      )
    }
```

- [ ] **Step 3: Test Feed in browser**

Log in → Feed screen shows. Expected:
- Greeting with your name and avatar initial
- 3 stat pills (hours=0, orgs=0, streak=0)
- 5 opportunity cards with cause tags, hours, location, date
- First card has "NEW" badge
- Each card has "94% match" badge
- Clicking a card sets selectedOpp → shows "OpportunityDetail coming soon" placeholder
- On desktop: 3-column grid; on mobile: single column

- [ ] **Step 4: Commit**

```bash
cd /root/givehour && git add src/screens/Feed.jsx src/App.jsx && git commit -m "feat: Feed screen"
```

---

## Task 5: Explore.jsx

**Files:**
- Create: `src/screens/Explore.jsx`
- Modify: `src/App.jsx` (import + wire)

- [ ] **Step 1: Create src/screens/Explore.jsx**

Create `/root/givehour/src/screens/Explore.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function Explore({ user, onSelectOpp, isGuest, onSignUp }) {
  const [opps, setOpps]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeCause, setActiveCause] = useState('All')
  const [search, setSearch]       = useState('')
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false })
        setOpps(data || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  const causes = ['All', ...Object.keys(CAUSE)]
  const filtered = opps.filter(o => {
    const mc = activeCause === 'All' || o.cause === activeCause
    const ms = !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.org.toLowerCase().includes(search.toLowerCase())
    return mc && ms
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Guest banner */}
      {isGuest && (
        <div style={{ background: T.primary, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>Sign up to track hours & personalize your feed</span>
          <button onClick={onSignUp} style={{ background: '#fff', border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: T.primary, cursor: 'pointer', fontFamily: 'inherit' }}>Sign up</button>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Explore</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Browse all opportunities</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
        <div style={{ padding: isDesktop ? '32px 40px' : '14px 20px' }}>
          {/* Search */}
          <div style={{ display: 'flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <span style={{ color: T.textMuted }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities..."
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, fontFamily: 'inherit', background: 'none', color: T.text }} />
          </div>

          {/* Cause pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
            {causes.map(c => (
              <button key={c} onClick={() => setActiveCause(c)}
                style={{ background: activeCause === c ? T.primary : '#fff', border: `1px solid ${activeCause === c ? T.primary : T.border}`, color: activeCause === c ? '#fff' : T.textSub, borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                {c}
              </button>
            ))}
          </div>

          {/* Cards */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 14 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.textMuted, fontSize: 13 }}>No opportunities match this filter. Try a different cause.</div>
          ) : (
            <div style={isDesktop ? { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(opp => (
                <div key={opp.id} onClick={() => onSelectOpp(opp)}
                  style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>{opp.org}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{opp.title}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: CAUSE[opp.cause]?.bg || T.bg, color: CAUSE[opp.cause]?.text || T.textSub, fontWeight: 500 }}>{opp.cause}</span>
                    <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                    <span style={{ fontSize: 12, color: T.textMuted }}>{opp.hours}</span>
                    <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                    <span style={{ fontSize: 12, color: T.textMuted }}>{opp.location}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{opp.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire Explore into App.jsx**

Add import:
```jsx
import Explore from './screens/Explore'
```

In `renderScreen()`, update the switch to handle `case 'explore'`:
```jsx
    switch (activeScreen) {
      case 'feed':    return <Feed user={dbUser} onSelectOpp={setSelectedOpp} />
      case 'explore': return <Explore user={dbUser} onSelectOpp={setSelectedOpp} isGuest={isGuest} onSignUp={() => { setIsGuest(false); setSelectedOpp(null) }} />
      case 'loghours':
      case 'impact':
      case 'profile':
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: T.textMuted, fontSize: 14 }}>
            {activeScreen} screen coming soon
          </div>
        )
    }
```

- [ ] **Step 3: Test Explore in browser**

1. Click Explore tab → see all 5 opportunity cards
2. Type "habitat" in search → only Habitat card shows
3. Clear search → click "Environment" cause pill → only Trail Restoration shows
4. Click "All" → all cards return
5. Sign out (refresh page → landing → "Browse without signing up" link)
6. As guest: see green banner "Sign up to track hours..."
7. Click "Sign up" in banner → Auth landing screen shows
8. Go back as guest (fresh reload) → click a card → "OpportunityDetail coming soon" placeholder
9. Click ← back button placeholder (doesn't work yet — will fix in Task 6)

- [ ] **Step 4: Commit**

```bash
cd /root/givehour && git add src/screens/Explore.jsx src/App.jsx && git commit -m "feat: Explore screen with search and cause filter"
```

---

## Task 6: OpportunityDetail.jsx

**Files:**
- Create: `src/screens/OpportunityDetail.jsx`
- Modify: `src/App.jsx` (import + replace placeholder)

- [ ] **Step 1: Create src/screens/OpportunityDetail.jsx**

Create `/root/givehour/src/screens/OpportunityDetail.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function OpportunityDetail({ opp, user, onBack, isGuest, onSignUp }) {
  const [registered, setRegistered] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [isDesktop, setIsDesktop]   = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    if (!user?.id || !opp?.id) return
    const check = async () => {
      try {
        const { data } = await supabase.from('registrations')
          .select('id').eq('user_id', user.id).eq('opportunity_id', opp.id).maybeSingle()
        setRegistered(!!data)
      } catch (err) { console.error(err) }
    }
    check()
  }, [user, opp])

  const handleRegister = async () => {
    if (!user) return
    setRegLoading(true)
    try {
      if (registered) {
        await supabase.from('registrations').delete().eq('user_id', user.id).eq('opportunity_id', opp.id)
        setRegistered(false)
      } else {
        await supabase.from('registrations').insert({ user_id: user.id, opportunity_id: opp.id })
        setRegistered(true)
      }
    } catch (err) { console.error(err) }
    finally { setRegLoading(false) }
  }

  const skills = opp.skills?.length ? opp.skills : ['Teamwork', 'Community impact', 'Leadership', 'Project management']

  const InfoCell = ({ emoji, label, value }) => (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{value}</div>
    </div>
  )

  const RegisterBtn = () => {
    if (isGuest) return (
      <div style={{ background: T.primaryLight, border: '1.5px solid rgba(24,160,80,0.3)', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Sign up to register</div>
        <div style={{ fontSize: 12, color: T.textSub, marginBottom: 12 }}>Create a free account to sign up for this opportunity.</div>
        <button onClick={onSignUp} style={{ background: T.primary, color: '#fff', padding: '10px 24px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Create free account</button>
      </div>
    )
    return (
      <button disabled={regLoading} onClick={handleRegister}
        style={{ width: '100%', padding: 16, borderRadius: 12, border: registered ? `2px solid ${T.primary}` : 'none', fontSize: 15, fontWeight: 700, cursor: regLoading ? 'default' : 'pointer', background: registered ? T.primaryLight : T.primary, color: registered ? T.primary : '#fff', marginBottom: 20, fontFamily: 'inherit' }}>
        {registered ? '✓ Registered!' : 'Register Now'}
      </button>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, borderRadius: 8, padding: '5px 11px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>←</button>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>{opp.org}</div>
      </div>

      <div style={isDesktop ? { padding: '32px 40px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' } : { padding: 20 }}>
        {/* Main content */}
        <div>
          <span style={{ display: 'inline-block', fontSize: 11, padding: '3px 9px', borderRadius: 20, background: CAUSE[opp.cause]?.bg || T.bg, color: CAUSE[opp.cause]?.text || T.textSub, fontWeight: 500, marginBottom: 8 }}>{opp.cause}</span>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: '8px 0' }}>{opp.title}</div>
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: T.primaryLight, color: T.primary }}>94% match for you</span>

          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4,1fr)' : '1fr 1fr', gap: 10, margin: '20px 0' }}>
            <InfoCell emoji="📅" label="Date"     value={opp.date} />
            <InfoCell emoji="⏱" label="Duration" value={opp.hours} />
            <InfoCell emoji="📍" label="Location" value={opp.location} />
            <InfoCell emoji="👥" label="Spots left" value={opp.spots_remaining != null ? `${opp.spots_remaining} of ${opp.spots_total}` : 'Open'} />
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>About this opportunity</div>
            <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.7 }}>{opp.description || 'Join us for a meaningful volunteer experience.'}</div>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>Skills you'll build</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skills.map(s => <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: T.primaryLight, color: '#0A6830', fontWeight: 500 }}>{s}</span>)}
            </div>
          </div>

          {!isDesktop && <RegisterBtn />}
        </div>

        {/* Desktop sticky card */}
        {isDesktop && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: T.primaryLight, color: T.primary, display: 'inline-block', marginBottom: 12 }}>94% match for you</span>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 6 }}>{opp.title}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>{opp.org} · {opp.date}</div>
            {isGuest ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>Sign up to register</div>
                <button onClick={onSignUp} style={{ background: T.primary, color: '#fff', padding: '12px 24px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: 'inherit', marginBottom: 10 }}>Create free account</button>
              </div>
            ) : (
              <>
                <button disabled={regLoading} onClick={handleRegister}
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: registered ? `2px solid ${T.primary}` : 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', background: registered ? T.primaryLight : T.primary, color: registered ? T.primary : '#fff', marginBottom: 10, fontFamily: 'inherit' }}>
                  {registered ? '✓ Registered!' : 'Register Now'}
                </button>
                <button style={{ width: '100%', padding: 14, borderRadius: 12, border: `2px solid ${T.primary}`, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#fff', color: T.primary, fontFamily: 'inherit' }}>Save for later</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire OpportunityDetail into App.jsx**

Add import:
```jsx
import OpportunityDetail from './screens/OpportunityDetail'
```

Replace the selectedOpp placeholder in `renderScreen()`:
```jsx
    if (selectedOpp) {
      return (
        <OpportunityDetail
          opp={selectedOpp}
          user={dbUser}
          onBack={() => setSelectedOpp(null)}
          isGuest={isGuest}
          onSignUp={() => { setIsGuest(false); setSelectedOpp(null) }}
        />
      )
    }
```

- [ ] **Step 3: Test OpportunityDetail in browser**

1. Click any card from Feed or Explore → Detail screen shows
2. Cause tag, title, "94% match", 4 info cells, About section, Skills section all visible
3. "Register Now" button → click → changes to "✓ Registered!" → click again → back to "Register Now"
4. Reload and click same card → "✓ Registered!" persists (fetched from DB on mount)
5. Back button → returns to Feed/Explore
6. Sign out → browse as guest → click card → see signup prompt instead of Register button
7. Click "Create free account" → Auth screen shows

- [ ] **Step 4: Commit**

```bash
cd /root/givehour && git add src/screens/OpportunityDetail.jsx src/App.jsx && git commit -m "feat: OpportunityDetail with register toggle"
```

---

## Task 7: LogHours.jsx

**Files:**
- Create: `src/screens/LogHours.jsx`
- Modify: `src/App.jsx` (import + wire)

- [ ] **Step 1: Create src/screens/LogHours.jsx**

Create `/root/givehour/src/screens/LogHours.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T } from '../lib/theme'

export default function LogHours({ user }) {
  const [history, setHistory]     = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [orgs, setOrgs]           = useState([])
  const [form, setForm]           = useState({ org: '', date: '', hours: '', notes: '' })
  const [submitted, setSubmitted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => { if (user?.id) fetchData() }, [user])

  const fetchData = async () => {
    try {
      const { data: hist } = await supabase
        .from('hours_log').select('*').eq('user_id', user.id).order('logged_at', { ascending: false })
      setHistory(hist || [])
      setTotalHours((hist || []).reduce((s, r) => s + Number(r.hours), 0))

      const { data: oppsData } = await supabase.from('opportunities').select('org').order('org')
      setOrgs([...new Set((oppsData || []).map(o => o.org))])
    } catch (err) { console.error(err) }
  }

  const handleSubmit = async () => {
    if (!form.hours) return
    try {
      await supabase.from('hours_log').insert({
        user_id: user?.id,
        org: form.org || null,
        hours: parseFloat(form.hours),
        notes: form.notes || null,
        logged_at: new Date().toISOString(),
      })
      setSubmitted(true)
      fetchData()
      setTimeout(() => { setSubmitted(false); setForm({ org: '', date: '', hours: '', notes: '' }) }, 2000)
    } catch (err) { console.error(err) }
  }

  const inputStyle = { background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.text, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: T.textSub, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 5, display: 'block' }

  const FormCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>Log new hours</div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Organization</label>
        <select value={form.org} onChange={e => setForm(f => ({ ...f, org: e.target.value }))} style={inputStyle}>
          <option value="">Select organization...</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Date</label>
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Hours</label>
        <input type="number" min="0.5" step="0.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} placeholder="e.g. 3" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Notes (optional)</label>
        <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What did you do?" style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <button disabled={!form.hours} onClick={submitted ? undefined : handleSubmit}
        style={{ width: '100%', padding: 13, borderRadius: 10, border: submitted ? `2px solid ${T.primary}` : 'none', fontSize: 14, fontWeight: 700, cursor: !form.hours ? 'default' : 'pointer', fontFamily: 'inherit', background: !form.hours ? '#B8D8C8' : submitted ? T.primaryLight : T.primary, color: submitted ? T.primary : '#fff', marginTop: 4 }}>
        {submitted ? '✓ Hours logged!' : 'Submit Hours'}
      </button>
    </div>
  )

  const HistorySection = (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>Recent history</div>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, fontSize: 13, color: T.textMuted }}>No hours logged yet. Submit your first entry above!</div>
      ) : history.map(r => (
        <div key={r.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.org || 'Volunteer session'}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{r.logged_at ? new Date(r.logged_at).toLocaleDateString() : ''}</div>
          </div>
          <span style={{ background: T.primaryLight, color: T.primary, fontSize: 16, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{r.hours}h</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Log Hours</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Track your volunteer time</div>
      </div>

      <div style={{ padding: isDesktop ? '32px 40px' : '16px 20px' }}>
        <div style={{ background: T.primary, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalHours}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>total hours logged</div>
        </div>
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {FormCard}
            {HistorySection}
          </div>
        ) : <>{FormCard}{HistorySection}</>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire LogHours into App.jsx**

Add import:
```jsx
import LogHours from './screens/LogHours'
```

Update the switch in `renderScreen()`:
```jsx
      case 'loghours': return <LogHours user={dbUser} />
```

- [ ] **Step 3: Test LogHours in browser**

1. Click "Log Hours" tab → screen shows with 0 total hours
2. Select an org from dropdown, enter hours (e.g. 3), click "Submit Hours"
3. Button briefly shows "✓ Hours logged!" → resets form → history shows new entry
4. Total hours counter updates (e.g. shows 3)
5. Submit another entry → total accumulates
6. Go to Feed → "hours" stat pill now shows updated total
7. On desktop: form left, history right

- [ ] **Step 4: Commit**

```bash
cd /root/givehour && git add src/screens/LogHours.jsx src/App.jsx && git commit -m "feat: LogHours screen with form and history"
```

---

## Task 8: Impact.jsx

**Files:**
- Create: `src/screens/Impact.jsx`
- Modify: `src/App.jsx` (import + wire)

- [ ] **Step 1: Create src/screens/Impact.jsx**

Create `/root/givehour/src/screens/Impact.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const MOCK = [{ cause: 'Housing', hours: 12 }, { cause: 'Education', hours: 8 }, { cause: 'Food Security', hours: 6 }]

export default function Impact({ user }) {
  const [byCause, setByCause]     = useState([])
  const [totalHours, setTotalHours] = useState(0)
  const [showLetter, setShowLetter] = useState(false)
  const [letter, setLetter]       = useState('')
  const [letterLoading, setLetterLoading] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => { if (user?.id) fetchStats() }, [user])

  const fetchStats = async () => {
    try {
      const { data: statsData } = await supabase.from('impact_stats').select('*').eq('user_id', user.id)
      if (statsData?.length) {
        const arr = statsData.map(r => ({ cause: r.cause, hours: Number(r.total_hours) }))
        setByCause(arr)
        setTotalHours(arr.reduce((s, r) => s + r.hours, 0))
        return
      }
      const { data: logData } = await supabase.from('hours_log').select('hours, org').eq('user_id', user.id)
      if (logData?.length) {
        const grouped = {}
        logData.forEach(r => { grouped[r.org || 'Other'] = (grouped[r.org || 'Other'] || 0) + Number(r.hours) })
        const arr = Object.entries(grouped).map(([cause, hours]) => ({ cause, hours })).sort((a, b) => b.hours - a.hours)
        setByCause(arr)
        setTotalHours(arr.reduce((s, r) => s + r.hours, 0))
        return
      }
      setByCause(MOCK)
      setTotalHours(MOCK.reduce((s, r) => s + r.hours, 0))
    } catch {
      setByCause(MOCK)
      setTotalHours(MOCK.reduce((s, r) => s + r.hours, 0))
    } finally {
      setLoading(false)
    }
  }

  const generateLetter = async () => {
    if (!import.meta.env.VITE_OPENAI_API_KEY) return
    setLetterLoading(true)
    try {
      const topCauses = byCause.slice(0, 3).map(c => c.cause).join(', ')
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `Write a concise community service letter for ${user?.name}, a high school student who has completed ${totalHours} hours of volunteer work through Give Hour. Their top causes are ${topCauses}. Write it as if from the Give Hour platform. Keep it under 200 words.` }]
        })
      })
      const data = await res.json()
      setLetter(data.choices[0].message.content)
      setShowLetter(true)
    } catch (err) { console.error(err) }
    finally { setLetterLoading(false) }
  }

  const hasKey = !!import.meta.env.VITE_OPENAI_API_KEY

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: T.textMuted, fontSize: 14, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>Loading...</div>
  )

  const CauseCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Hours by cause</div>
      {byCause.map(({ cause, hours }) => (
        <div key={cause} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{cause}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: CAUSE[cause]?.text || T.primary }}>{hours}h</span>
          </div>
          <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: CAUSE[cause]?.text || T.primary, borderRadius: 4, width: `${totalHours ? (hours / totalHours) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  )

  const LetterCard = (
    <div style={{ border: `1.5px solid rgba(24,160,80,0.4)`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>🎓</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>College letter generator</div>
          <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, marginBottom: 12 }}>Generate a personalized community service letter for your college applications based on your volunteer history.</div>
          <button disabled={!hasKey || letterLoading} onClick={generateLetter}
            style={{ width: '100%', padding: 12, background: !hasKey ? '#B8D8C8' : T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: !hasKey ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {!hasKey ? 'Coming soon — add OpenAI key to activate' : letterLoading ? 'Generating...' : 'Generate letter →'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>My Impact</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Your volunteer story so far</div>
      </div>

      <div style={{ padding: isDesktop ? '32px 40px' : '16px 20px' }}>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #18A050, #0E7A3C)', borderRadius: 16, padding: 24, marginBottom: 14, textAlign: 'center', boxShadow: '0 4px 14px rgba(24,160,80,0.25)' }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalHours}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>total volunteer hours</div>
          <div style={{ marginTop: 10, display: 'inline-block', background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#fff', fontWeight: 700 }}>Top 12% of Give Hour teens 🏆</div>
        </div>

        {isDesktop ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Total Hours',    value: totalHours, color: T.primary },
                { label: 'Organizations',  value: byCause.length, color: T.accent },
                { label: 'Weeks Active',   value: Math.max(1, Math.ceil(totalHours / 3)), color: T.warning },
                { label: 'Letters Ready',  value: totalHours >= 10 ? 1 : 0, color: '#7B3FE4' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ fontSize: 13, color: T.textMuted }}>{label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {CauseCard}
              {LetterCard}
            </div>
          </>
        ) : <>{CauseCard}{LetterCard}</>}
      </div>

      {/* Letter modal */}
      {showLetter && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>Your Community Service Letter</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: T.text, whiteSpace: 'pre-wrap' }}>{letter}</div>
            <button onClick={() => setShowLetter(false)} style={{ width: '100%', padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', marginTop: 16, fontFamily: 'inherit' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire Impact into App.jsx**

Add import:
```jsx
import Impact from './screens/Impact'
```

Update the switch:
```jsx
      case 'impact': return <Impact user={dbUser} />
```

- [ ] **Step 3: Test Impact in browser**

1. Click Impact tab → hero card shows total hours (or mock 26 if none logged)
2. "Hours by cause" card shows bars for each cause
3. College letter button shows "Coming soon — add OpenAI key to activate" (disabled/grey)
4. On desktop: 4 stat cards row + 2-column layout below

- [ ] **Step 4: Commit**

```bash
cd /root/givehour && git add src/screens/Impact.jsx src/App.jsx && git commit -m "feat: Impact screen with stats and disabled letter generator"
```

---

## Task 9: Profile.jsx

**Files:**
- Create: `src/screens/Profile.jsx`
- Modify: `src/App.jsx` (import + wire + sign out)

- [ ] **Step 1: Create src/screens/Profile.jsx**

Create `/root/givehour/src/screens/Profile.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

export default function Profile({ user, onSignOut }) {
  const [totalHours, setTotalHours] = useState(0)
  const [orgCount, setOrgCount]     = useState(0)
  const [isDesktop, setIsDesktop]   = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const fetch = async () => {
      try {
        const { data } = await supabase.from('hours_log').select('hours, org').eq('user_id', user.id)
        if (data) {
          setTotalHours(data.reduce((s, r) => s + Number(r.hours), 0))
          setOrgCount(new Set(data.map(r => r.org).filter(Boolean)).size)
        }
      } catch (err) { console.error(err) }
    }
    fetch()
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onSignOut()
  }

  const ProfileCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 14, display: 'flex', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.primaryLight, color: T.primary, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(24,160,80,0.3)', flexShrink: 0 }}>
        {(user?.name || 'U')[0].toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{user?.name || 'User'}</div>
        <div style={{ fontSize: 12, color: T.textSub }}>{user?.grade}{user?.zip ? ` · ${user.zip}` : ' · Bay Area, CA'}</div>
        <div style={{ fontSize: 12, color: T.primary, fontWeight: 700, marginTop: 2 }}>{totalHours} hours · {orgCount} orgs helped</div>
      </div>
    </div>
  )

  const InterestsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>My interests</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(user?.interests || []).map(c => (
          <span key={c} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: CAUSE[c]?.bg || T.primaryLight, color: CAUSE[c]?.text || T.primary, fontWeight: 500 }}>{c}</span>
        ))}
        <button style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.bg, border: `1.5px dashed rgba(24,160,80,0.6)`, color: T.primary, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>+ Add</button>
      </div>
    </div>
  )

  const SettingsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {['Notification settings', 'Availability', 'School information'].map(label => (
        <div key={label} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 14, color: T.text }}>{label}</span>
          <span style={{ fontSize: 18, color: T.textMuted }}>›</span>
        </div>
      ))}
      <div onClick={handleSignOut} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <span style={{ fontSize: 14, color: T.danger, fontWeight: 500 }}>Sign out</span>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Profile</div>
      </div>
      <div style={{ padding: isDesktop ? '32px 40px' : '20px' }}>
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>{ProfileCard}{InterestsCard}</div>
            <div>{SettingsCard}</div>
          </div>
        ) : <>{ProfileCard}{InterestsCard}{SettingsCard}</>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire Profile into App.jsx**

Add import:
```jsx
import Profile from './screens/Profile'
```

Update the switch — replace the remaining placeholder cases with the full switch:
```jsx
    switch (activeScreen) {
      case 'feed':     return <Feed user={dbUser} onSelectOpp={setSelectedOpp} />
      case 'explore':  return <Explore user={dbUser} onSelectOpp={setSelectedOpp} isGuest={isGuest} onSignUp={() => { setIsGuest(false); setSelectedOpp(null) }} />
      case 'loghours': return <LogHours user={dbUser} />
      case 'impact':   return <Impact user={dbUser} />
      case 'profile':  return <Profile user={dbUser} onSignOut={handleSignOut} />
      default:         return <Feed user={dbUser} onSelectOpp={setSelectedOpp} />
    }
```

- [ ] **Step 3: Test Profile + full app flow in browser**

1. Profile tab → see avatar initial, name, grade, zip, "0 hours · 0 orgs helped"
2. Interest pills from signup show with correct cause colors
3. "+ Add" button visible but does nothing (expected)
4. Settings rows show with arrows (non-functional, expected)
5. "Sign out" → returns to Auth landing screen → session cleared
6. **Full demo flow**: Sign in → Feed → click card → register → Log Hours (submit 3hrs) → Impact (see 3hrs) → Profile (see 3hrs) → Sign out

- [ ] **Step 4: Commit**

```bash
cd /root/givehour && git add src/screens/Profile.jsx src/App.jsx && git commit -m "feat: Profile screen with sign out"
```

---

## Task 10: Build, deploy, verify

**Files:** None (build + push)

- [ ] **Step 1: Run the production build**

```bash
cd /root/givehour && npm run build
```

Expected: build completes with no errors. Output looks like:
```
dist/index.html          x.xx kB
dist/assets/index-xxxx.js    xxx kB
✓ built in x.xxs
```

If there are TypeScript or lint errors, fix them before continuing.

- [ ] **Step 2: Add Vercel environment variables**

Go to your Vercel project dashboard → Settings → Environment Variables. Add:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |

These must be set BEFORE deploying or the live app won't connect to Supabase. If they're already set, skip this step.

- [ ] **Step 3: Push to GitHub**

```bash
cd /root/givehour && git push origin main
```

Expected: Vercel detects the push and starts a deploy (visible in Vercel dashboard → Deployments).

- [ ] **Step 4: Wait for Vercel deploy to complete**

Watch the Vercel dashboard. Deploy typically completes in 30–60 seconds. When status shows "Ready", open the live URL.

- [ ] **Step 5: Smoke test the live app**

On the live Vercel URL, test:
1. Landing page loads — "Give an Hour. Change a Life."
2. "Browse without signing up" → Explore shows with 5 listings
3. Click a listing → detail screen → back button works
4. "Get started" → full signup flow → lands on Feed
5. Click a card → register → ✓ Registered
6. Log Hours → submit 3 hrs → history appears
7. Impact → shows 3 hrs
8. Profile → shows name, interests, hours count
9. Sign out → back to landing

- [ ] **Step 6: Final commit (update plan doc)**

```bash
cd /root/givehour && git add . && git commit -m "feat: System 1 complete — all 7 screens live on Vercel"
```

---

## Notes for after deploy

**To activate the college letter generator:**
1. Add `VITE_OPENAI_API_KEY=sk-...` to `.env.local` on the VPS
2. Add the same key in Vercel dashboard → Environment Variables
3. Redeploy (push any small change) or trigger manual redeploy in Vercel
4. The button on the Impact screen will automatically enable — no code changes needed

**System 2** (data pipeline) is out of scope for this plan. When System 2 is built and starts writing to `personalized_feed` and `impact_stats`, the Feed and Impact screens will automatically use that data without any code changes (the fallback logic handles both states).
