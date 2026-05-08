# Give Hour — System 1 Build Design

**Date:** 2026-05-08  
**Deadline:** 2026-05-10 (Vercel live)  
**Scope:** System 1 only — the React app teens use. System 2 (data pipeline) is out of scope.

---

## Overview

Give Hour is a volunteer matching app for Bay Area teens. Teens find personalized opportunities, log hours, and generate college application letters. This spec covers the full System 1 build from a blank Vite + React starter to a live Vercel deployment.

Full UI/component design is defined in `docs/givehour-build-reference-Shanzay.md`. This spec records the architecture decisions, environment adaptations, and build plan on top of that reference.

---

## Build approach

Foundation-first, wired together as we go:

1. Supabase tables + seed data
2. `theme.js` + reset CSS
3. `App.jsx` shell + navigation
4. `Auth.jsx`
5. `Feed.jsx`
6. `Explore.jsx`
7. `OpportunityDetail.jsx`
8. `LogHours.jsx`
9. `Impact.jsx`
10. `Profile.jsx`
11. Push to GitHub → Vercel auto-deploys

Each screen is wired into `App.jsx` as it's built so the real flow is testable incrementally.

---

## Infrastructure

| What | Where |
|---|---|
| Project files | `/root/givehour` on Hostinger VPS |
| Version control | GitHub `givehour` repo |
| Live app | Vercel — already connected, auto-deploys on push |
| Database + Auth | Supabase `givehour` project |

**Do not touch `/root/bfcc` at any point.**

---

## Vite environment adaptations

The build reference was written for Create React App. This project uses Vite. Three differences apply:

| Spec says | We use |
|---|---|
| `REACT_APP_SUPABASE_URL` | `VITE_SUPABASE_URL` |
| `REACT_APP_SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` |
| `REACT_APP_OPENAI_API_KEY` | `VITE_OPENAI_API_KEY` |
| `process.env.REACT_APP_*` | `import.meta.env.VITE_*` |
| `.js` file extensions | `.jsx` for React components |

`src/lib/supabase.js` already uses the correct `VITE_` prefix.

**`.env.local` on VPS must use `VITE_` keys. Same values go into Vercel dashboard under Environment Variables.**

---

## File structure

```
/root/givehour/
├── .env.local              ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OPENAI_API_KEY
├── .gitignore              ← .env.local must be listed
├── package.json
├── index.html
├── vite.config.js
└── src/
    ├── App.jsx             ← full rewrite of current starter
    ├── App.css             ← stripped to body/html reset only
    ├── index.css           ← minimal reset
    ├── main.jsx            ← unchanged
    └── lib/
    │   ├── supabase.js     ← already correct
    │   └── theme.js        ← new — T and CAUSE exports
    └── screens/
        ├── Auth.jsx
        ├── Feed.jsx
        ├── Explore.jsx
        ├── OpportunityDetail.jsx
        ├── LogHours.jsx
        ├── Impact.jsx
        └── Profile.jsx
```

---

## Supabase setup (Step 0)

All tables must be created before building screens. Run in Supabase SQL editor:

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
  hours numeric,
  notes text,
  logged_at timestamptz default now()
);

-- System 2 tables (created empty — System 1 falls back gracefully if empty)
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

**Seed data — insert into `opportunities`:**

```sql
insert into opportunities (org, title, cause, hours, date, location, description, spots_total, spots_remaining, skills) values
('Habitat for Humanity', 'Home Build Day', 'Housing', '6 hrs', 'Sat May 10', 'Oakland', 'Join us for a full day of building affordable homes for Bay Area families. No experience needed — just bring energy and a willingness to learn.', 20, 12, array['Teamwork','Community impact','Physical labor']),
('Bay Area Food Bank', 'Weekend Sort & Pack', 'Food Security', '3 hrs', 'Sun May 11', 'San Jose', 'Help sort and pack thousands of pounds of food for families in need across the Bay Area.', 30, 18, array['Teamwork','Organization','Community impact']),
('Literacy for All', 'Teen Reading Mentor', 'Education', '2 hrs/wk', 'Ongoing', 'Remote', 'Mentor elementary school students in reading via video call. Flexible scheduling, training provided.', 15, 8, array['Communication','Teaching','Leadership']),
('Coastside Land Trust', 'Trail Restoration', 'Environment', '4 hrs', 'Sat May 17', 'Half Moon Bay', 'Help restore native plant habitats along the San Mateo coast. Gloves and tools provided.', 25, 14, array['Teamwork','Environmental stewardship','Physical labor']),
('SPCA Bay Area', 'Animal Care Volunteer', 'Animals', '3 hrs', 'Sat May 12', 'San Francisco', 'Spend a morning caring for shelter animals — feeding, socializing, and light cleaning.', 10, 4, array['Animal care','Compassion','Responsibility']);
```

Also enable Row Level Security on the `users` table:

```sql
alter table users enable row level security;

create policy "Users can read own row" on users
  for select using (auth.uid() = id);

create policy "Users can insert own row" on users
  for insert with check (auth.uid() = id);

create policy "Users can update own row" on users
  for update using (auth.uid() = id);
```

---

## App.jsx — shell design

**State:**
```javascript
authUser       // Supabase auth user object
dbUser         // row from users table
activeScreen   // starts at 'landing'
selectedOpp    // when set, OpportunityDetail renders over everything
isGuest        // true when browsing without account
isDesktop      // window.innerWidth >= 1024
loading        // true while checking session on startup
```

**On mount:** `supabase.auth.getSession()` → if session, fetch `dbUser` from users table, set `activeScreen('feed')`. Set up `onAuthStateChange`. Add resize listener for `isDesktop`.

**Route protection:** if `activeScreen` is `feed`, `loghours`, `impact`, or `profile` AND no `authUser` AND not `isGuest` → redirect to `'landing'`.

**Navigation rules:**
- Bottom nav (mobile) + left sidebar (desktop): only when `authUser` exists
- Hidden when on auth screens or when `selectedOpp` is set
- 5 tabs: Feed, Explore, Log Hours, Impact, Profile

**Loading state:** while `loading` is true, render centered "Loading Give Hour..." full-screen, `height: 100vh`.

---

## Auth.jsx

Manages internal `screen` state: `landing` → `userType` → `step1` → `step2` → `step3` → triggers `onLoggedIn`. Also: `login` → triggers `onLoggedIn`.

**Cross-step state held in Auth:** `{ name, email, password, grade, zip, school, interests[] }` — persists across back navigation.

**On finish (step3):**
1. `supabase.auth.signUp({ email, password })`
2. Insert row into `users` table with all collected fields + `role: 'teen'`
3. If insert fails, show inline error (don't crash)
4. Call `onLoggedIn(authUser, dbUser)`

**On login:**
1. `supabase.auth.signInWithPassword({ email, password })`
2. Fetch `users` row where `id = session.user.id`
3. Call `onLoggedIn(authUser, dbUser)`

**Desktop:** all sub-screens wrapped in centered white card, max-width 440px, border-radius 16px, box-shadow `0 2px 12px rgba(0,0,0,0.08)`.

---

## Feed.jsx

Props: `{ user, onSelectOpp }`

On mount: check `personalized_feed` for rows where `user_id = user.id`. If found, fetch ordered by `rank`. Otherwise fetch all from `opportunities` ordered by `created_at desc`.

Stats pills (hours, orgs, streak) pull from `hours_log` — streak shows 0 until System 2 runs.

Match badges use mock score `94` for all cards until System 2 populates `match_scores`.

---

## Explore.jsx

Props: `{ user, onSelectOpp, isGuest, onSignUp }`

Fetches all opportunities on mount. Filters client-side. Guest banner visible when `isGuest`. Empty state when filter returns zero results.

---

## OpportunityDetail.jsx

Props: `{ opp, user, onBack, isGuest, onSignUp }`

On mount: query `registrations` for this user + opp pair to set initial `registered` state.

Register toggle: insert on first tap, delete on second tap.

Back button calls `onBack()` → App clears `selectedOpp` → previous screen reappears underneath.

---

## LogHours.jsx

Props: `{ user }`

Org dropdown fetches distinct orgs from `opportunities`. On submit: inserts into `hours_log`, re-fetches history + total, shows "✓ Hours logged!" for 2 seconds, resets form.

---

## Impact.jsx

Props: `{ user }`

Data source priority: `impact_stats` table first → live calculation from `hours_log` second → mock data if zero hours logged.

**College letter button:** disabled, labeled "Coming soon — add OpenAI key to activate". The `generateLetter` function will be implemented and wired to `VITE_OPENAI_API_KEY` — once the key is added to `.env.local` and Vercel, the button is enabled with no further code changes needed.

---

## Profile.jsx

Props: `{ user, onSignOut }`

Fetches total hours (sum from `hours_log`) and distinct org count on mount.

Interest pills display `user.interests` array with CAUSE colors. "+ Add" button is rendered but non-functional (not in System 1 scope).

Settings rows: Notification settings, Availability, School information — rendered but non-functional. Sign out calls `supabase.auth.signOut()` then `onSignOut()`.

---

## Key behaviors (from spec)

1. Feed personalization: `personalized_feed` → fallback to `opportunities`
2. Register toggle: insert/delete from `registrations`, check on mount
3. Impact stats: `impact_stats` → live from `hours_log` → mock data
4. College letter: disabled until `VITE_OPENAI_API_KEY` is set
5. Auth state: always check session on load before showing any screen
6. Loading states: every data-fetching screen shows loading indicator
7. Empty states: defined for hours history, filter results, interests
8. Error handling: all Supabase calls wrapped in try/catch, inline error messages
9. Guest mode: can browse Explore + view Detail, protected screens redirect to landing

---

## Out of scope (System 1)

- System 2 data pipeline (Azure Data Factory + Databricks)
- Interest editing on Profile
- Notification settings, Availability, School information settings
- College letter generation (until OpenAI key is added)
- Streak calculation
- "Save for later" on OpportunityDetail desktop sticky card
