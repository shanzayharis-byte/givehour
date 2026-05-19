# Give Hour — Claude Code Build Reference

> This document is the single source of truth for building Give Hour.
> Hand it to Claude Code at the start of every session.
> It covers project context, infrastructure, design system, all screens, build instructions, and both systems.

---

## How to use this file

At the start of every Claude Code session paste this:

```
I am building Give Hour. Read givehour-build-reference.md in this repo for full context.
We are working in /root/givehour on the Hostinger VPS.
Do not touch /root/bfcc at any point.
Today we are building: [name the screen or task]
```

When fixing a UI issue paste this:

```
The [component] does not match the design spec in givehour-build-reference.md.
According to the spec it should look like [paste the relevant section].
Fix it to match exactly.
```

---

## Project context

**Give Hour** is a volunteer matching app for Bay Area teens. Teens find personalized volunteer opportunities, log hours, and generate college application letters. Organizations post listings and manage sign-ups.

**Who built it:** Shanzay (high school student). Faiz supports execution.

**Deadline:** System 1 live on Vercel by May 10, 2026. System 2 after.

**Two systems:**
- System 1 — the React app. What teens see and use. Built first.
- System 2 — the nightly data pipeline. Makes the feed personalized. Built after System 1.

---

## Infrastructure

### Where everything lives

| What | Where | Notes |
|---|---|---|
| Project files | Hostinger VPS `/root/givehour` | Claude Code writes here |
| Version control | GitHub `givehour` repo | Claude Code pushes here |
| Live app | Vercel `givehour` deployment | Auto-deploys on every push |
| Database + Auth | Supabase `givehour` project | App reads and writes here |
| Data pipeline | GitHub Actions + Python (stdlib) | System 2 — runs nightly at 2 AM Pacific |

### Critical isolation rule

Give Hour and BFCC share the same Hostinger VPS. They must never touch each other.

| | BFCC | Give Hour |
|---|---|---|
| VPS folder | `/root/bfcc` | `/root/givehour` |
| GitHub repo | `bfcc` repo | `givehour` repo |
| Supabase | BFCC project | givehour project — different URL and keys |
| Vercel | BFCC deployment | givehour deployment |

**Every Claude Code session must start with:** "Do not touch anything in /root/bfcc."

### The build loop

Every change follows this path:

```
Shanzay tells Claude Code what to build
        ↓
Claude Code writes JSX and JS files in /root/givehour on the VPS
        ↓
Claude Code runs: git commit + git push
        ↓
GitHub receives the new code in the givehour repo
        ↓
Vercel detects the push and auto-deploys
        ↓
Live URL updates in about 30 seconds
        ↓
Live app reads and writes data to givehour Supabase
```

### Environment variables

**In /root/givehour/.env.local on the VPS (never pushed to GitHub):**
```
REACT_APP_SUPABASE_URL=https://xyzxyz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...
REACT_APP_OPENAI_API_KEY=sk-...
```

**Same values must also be added in Vercel dashboard under Environment Variables for the live app to work.**

---

## Tech stack

- **React** with inline styles throughout — no Tailwind, no CSS files, no styled-components
- **Supabase JS client** (`@supabase/supabase-js`) — reads and writes directly from the browser
- **Vercel** — serves the built React app
- **OpenAI API** — college letter generator (`gpt-4o-mini`)
- **No custom backend** — Supabase handles database, auth, and API

### Coding conventions

- All styles are inline: `style={{ color: "#18A050", padding: "16px" }}`
- No CSS classes, no external stylesheets
- Import T and CAUSE from `../lib/theme` in every screen file
- Import supabase from `../lib/supabase` in every screen file
- Track `isDesktop` with `useState(window.innerWidth >= 1024)` and a resize listener in every screen
- Wrap all Supabase calls in try/catch
- Show loading state while fetching — never a blank screen
- Show empty state when no data — never a blank list

---

## File structure

```
/root/givehour/
├── .env.local              ← Supabase + OpenAI keys (never in GitHub)
├── .gitignore              ← includes .env.local
├── package.json
├── public/
└── src/
    ├── App.js              ← main shell, navigation, auth state management
    ├── lib/
    │   ├── supabase.js     ← Supabase client connection
    │   └── theme.js        ← design system — T object and CAUSE object
    └── screens/
        ├── Auth.js         ← landing, user type, signup steps 1-3, login
        ├── Feed.js         ← personalized opportunity feed
        ├── Explore.js      ← browse and filter all opportunities
        ├── OpportunityDetail.js  ← full detail + register button
        ← LogHours.js      ← log volunteer hours form + history
        ├── Impact.js       ← impact dashboard + college letter generator
        └── Profile.js      ← user profile + interests + settings
```

### src/lib/supabase.js

```javascript
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### src/lib/theme.js

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
  'Housing':        { bg: '#FFF0E6', text: '#C04E0A' },
  'Food Security':  { bg: '#FFF8E0', text: '#8A6000' },
  'Education':      { bg: '#E8F0FF', text: '#1A4DA0' },
  'Environment':    { bg: '#E6F7EE', text: '#0A6830' },
  'Animals':        { bg: '#F3EEFF', text: '#5B1FA0' },
  'Health':         { bg: '#FEE8F4', text: '#A0206A' },
  'Arts':           { bg: '#FFF0E0', text: '#A05000' },
  'Seniors':        { bg: '#F0F4FF', text: '#2040A0' },
}
```

---

## Design system

### Typography

```
Font family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Page title:  26–28px, weight 700
Section H2:  20–22px, weight 700
Card title:  15px, weight 600
Body text:   13–14px, weight 400, line-height 1.6–1.7
Label/tag:   10–11px, weight 500–600, letter-spacing 0.04em
Section label: 13px, weight 600, color #666B72, ALL CAPS, letter-spacing 0.02em
```

### Component specs

**Primary button**
```
background: #18A050
color: #fff
padding: 15px (full width) or 14px 28px (inline)
border-radius: 12px
border: none
font-size: 15px
font-weight: 600
cursor: pointer
Disabled state: background #B8D8C8, cursor default
Hero version: box-shadow 0 4px 14px rgba(24,160,80,0.3)
```

**Outline button**
```
background: #fff
border: 2px solid #18A050
color: #18A050
Same padding and border-radius as primary
```

**Ghost link**
```
background: none
border: none
font-size: 13px
color: #9EA4AB
cursor: pointer
```

**Input field**
```
background: #F7F8FA
border: 1.5px solid #E8EAED
border-radius: 10px
padding: 11px 14px
font-size: 14px
color: #1A1A1A
outline: none
width: 100%
box-sizing: border-box
font-family: inherit
Label above: 11px, weight 600, color #666B72, letter-spacing 0.04em, ALL CAPS, margin-bottom 5px
```

**Card**
```
background: #FFFFFF
border: 1px solid #E8EAED
border-radius: 14px
padding: 16px
box-shadow: 0 1px 3px rgba(0,0,0,0.05)
```

**Cause tag pill**
```
font-size: 11px
padding: 3px 9px
border-radius: 20px
background: CAUSE[cause].bg
color: CAUSE[cause].text
font-weight: 500
```

**Match badge**
```
font-size: 11px
padding: 3px 8px
border-radius: 20px
font-weight: 600
Score 95+: bg #E6F7EE, color #18A050
Score 85+: bg #FFF8E0, color #D4A010
Score <85: bg #F2F2F2, color #9EA4AB
```

**Top bar (screen header)**
```
background: #FFFFFF
border-bottom: 1px solid #E8EAED
padding: 14px 20px
flex-shrink: 0
Back button: bg #E6F7EE, color #18A050, border-radius 8px, padding 5px 11px, font-size 15px, font-weight 600, border none
Title: font-size 17px, font-weight 600, color #1A1A1A
Subtitle: font-size 11px, color #9EA4AB, margin-top 1px
```

**Avatar circle**
```
width: 38px (small) or 60px (profile)
height: same as width
border-radius: 50%
background: #E6F7EE
color: #18A050
font-size: 16px (small) or 24px (profile)
font-weight: 700
display: flex, align-items: center, justify-content: center
Shows first letter of user name
```

**Section label**
```
font-size: 13px
font-weight: 600
color: #666B72
letter-spacing: 0.02em
text-transform: uppercase
margin-bottom: 12px
```

**Progress bar**
```
height: 8px
background: #F7F8FA
border-radius: 4px
overflow: hidden
Fill: height 100%, background uses CAUSE[cause].text color, border-radius 4px
```

---

## Responsive layout

**Mobile first.** Default styles are mobile. Desktop overrides activate at `window.innerWidth >= 1024`.

Track with this pattern in every screen:
```javascript
const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
useEffect(() => {
  const handle = () => setIsDesktop(window.innerWidth >= 1024)
  window.addEventListener('resize', handle)
  return () => window.removeEventListener('resize', handle)
}, [])
```

| Screen | Mobile layout | Desktop layout |
|---|---|---|
| Auth screens | Full width, max-width 375px centered | Max-width 440px centered, white card with shadow |
| Feed | Single column cards | 3-column grid, padding 32px 40px |
| Explore | Single column | 3-column grid, wider padding |
| Opportunity Detail | Single column | 2-column grid (content left, sticky card right) |
| Log Hours | Stacked form + history | 2-column (form left, history right) |
| Impact | Stacked | 4 stat cards row + 2-column below |
| Profile | Stacked | 2-column (profile + interests left, settings right) |

**Mobile navigation:** Bottom nav bar, 5 tabs, fixed at bottom of screen
**Desktop navigation:** Left sidebar, 220px wide, same 5 tabs vertically

---

## Supabase data model

```sql
users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  grade text,         -- '8th','9th','10th','11th','12th','College'
  zip text,
  school text,
  role text,          -- 'teen','org','parent','admin'
  interests text[],   -- array of cause names e.g. ['Education','Environment']
  created_at timestamptz DEFAULT now()
)

opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org text,
  title text,
  cause text,
  hours text,         -- '3 hrs', '2 hrs/wk'
  date text,          -- 'Sat May 10', 'Ongoing'
  location text,
  description text,
  spots_total int,
  spots_remaining int,
  skills text[],
  created_at timestamptz DEFAULT now()
)

registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  opportunity_id uuid REFERENCES opportunities(id),
  registered_at timestamptz DEFAULT now()
)

hours_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  opportunity_id uuid REFERENCES opportunities(id),
  hours numeric,
  notes text,
  logged_at timestamptz DEFAULT now()
)

-- Written by System 2 nightly pipeline
clean_listings    -- cleaned and standardized copy of opportunities
match_scores      -- (user_id uuid, opportunity_id uuid, score numeric)
impact_stats      -- (user_id uuid, cause text, total_hours numeric)
personalized_feed -- (user_id uuid, opportunity_id uuid, rank int, score numeric)
```

### Seed data (5 Bay Area volunteer listings)

Insert these into the opportunities table before building any screens:

| org | title | cause | hours | date | location |
|---|---|---|---|---|---|
| Habitat for Humanity | Home Build Day | Housing | 6 hrs | Sat May 10 | Oakland |
| Bay Area Food Bank | Weekend Sort & Pack | Food Security | 3 hrs | Sun May 11 | San Jose |
| Literacy for All | Teen Reading Mentor | Education | 2 hrs/wk | Ongoing | Remote |
| Coastside Land Trust | Trail Restoration | Environment | 4 hrs | Sat May 17 | Half Moon Bay |
| SPCA Bay Area | Animal Care Volunteer | Animals | 3 hrs | Sat May 12 | San Francisco |

---

## App.js — main shell

### State

```javascript
const [authUser, setAuthUser] = useState(null)    // Supabase auth user
const [dbUser, setDbUser] = useState(null)         // row from users table
const [activeScreen, setActiveScreen] = useState('landing')
const [selectedOpp, setSelectedOpp] = useState(null)
const [isGuest, setIsGuest] = useState(false)
const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
const [loading, setLoading] = useState(true)
```

### On mount

```javascript
// Check existing session
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    setAuthUser(session.user)
    // fetch dbUser from users table where id = session.user.id
    setActiveScreen('feed')
  }
  setLoading(false)
})
// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  setAuthUser(session?.user ?? null)
})
// Desktop listener
window.addEventListener('resize', () => setIsDesktop(window.innerWidth >= 1024))
```

### Route protection

```javascript
// If not logged in and not guest and trying to access protected screen
if (!authUser && !isGuest && ['feed', 'loghours', 'impact', 'profile'].includes(activeScreen)) {
  setActiveScreen('landing')
}
```

### Mobile bottom nav

Show only when `authUser` exists and `selectedOpp` is null and `activeScreen` is one of the 5 main screens.

```
5 tabs: Feed | Explore | Log Hours | Impact | Profile
Background: #FFFFFF
Border-top: 1px solid #E8EAED
Padding-bottom: 8px

Active tab:
  Icon container: 32x32px, border-radius 10px, background #E6F7EE
  Icon: font-size 17px, color #18A050
  Label: 9px, font-weight 600, color #18A050

Inactive tab:
  No container background
  Icon: font-size 17px, color #9EA4AB
  Label: 9px, font-weight 400, color #9EA4AB
```

### Desktop sidebar

Show when `isDesktop` and `authUser` exists.

```
Width: 220px
Background: #FFFFFF
Border-right: 1px solid #E8EAED
Display: flex, flex-direction column

Top section (padding 22px 20px 18px, border-bottom #E8EAED):
  Logo: <img src="/logo.png" width 34 height 34, border-radius 10, objectFit cover> — clickable, navigates to Feed
  Title: Give Hour 15px bold
  Subtitle: Teen Portal 10px muted

Nav items (padding 14px 12px):
  Each: width 100%, flex row, gap 10px, padding 10px 12px, border-radius 10px, border none, cursor pointer
  Active: background #E6F7EE, color #18A050, font-weight 600
  Inactive: transparent background, color #60666D
```

### Loading state

While `loading` is true show a centered full-screen div:
```
Loading Give Hour...
font-size: 16px
color: #9EA4AB
display: flex, align-items center, justify-content center
height: 100vh
```

### Prop wiring

```
Auth component:
  onLoggedIn(authUser, dbUser) → sets authUser, dbUser, activeScreen 'feed'
  onGuest() → sets isGuest true, activeScreen 'explore'
  initialScreen → optional, skips Auth to a specific internal screen ('landing', 'login', 'userType')

Auth routing in App.jsx:
  activeScreen 'auth-login'  → renders Auth with initialScreen='login'
  activeScreen 'auth-signup' → renders Auth with initialScreen='userType'
  activeScreen 'landing'     → renders Auth with initialScreen='landing'

Feed and Explore:
  user={dbUser}
  onSelectOpp={setSelectedOpp}

Explore also:
  isGuest={isGuest}
  onSignUp={() => { setIsGuest(false); setActiveScreen('auth-signup') }}
  onLogin={() => { setIsGuest(false); setActiveScreen('auth-login') }}

OpportunityDetail:
  opp={selectedOpp}
  user={dbUser}
  onBack={() => setSelectedOpp(null)}
  isGuest={isGuest}
  onSignUp={() => { setSelectedOpp(null); setIsGuest(false); setActiveScreen('auth-signup') }}

LogHours and Impact:
  user={dbUser}

Profile:
  user={dbUser}
  onSignOut={() => {
    supabase.auth.signOut()
    setAuthUser(null)
    setDbUser(null)
    setIsGuest(false)
    setActiveScreen('landing')
  }}
```

---

## Screen specs — System 1

### Screen 1 — Auth.js

Props: `{ onLoggedIn, onGuest, isDesktop, initialScreen }`

Manages all pre-login screens with a single `screen` state variable: `useState(initialScreen || 'landing')`. Pass `initialScreen` to skip directly to any screen ('login', 'userType', etc.).

**Landing (`screen === 'landing'`)**

Full height flex column, white background.

Top section (flex 1, display flex, flex-direction column, align-items center, justify-content center, padding 40px 28px, text-align center):
- App icon: `<img src="/logo.png">` 80x80px circle (border-radius 50%), objectFit cover, box-shadow `0 8px 24px rgba(24,160,80,0.3)`, margin-bottom 24px
- H1: "Give an Hour. Change a Life." — font-size 28px, font-weight 700, line-height 1.2, margin 0 0 10px
- Subtitle: 14px, color #666B72, max-width 280px, line-height 1.7, margin 0 0 28px
- Stats row: flex, gap 20px, background #F7F8FA, border #E8EAED, border-radius 12px, padding 14px 20px — show "2,400+ teens", "180+ orgs", "12,000+ hours". Each: value 17px bold #18A050, label 10px muted below.

Bottom section (padding 24px, display flex, flex-direction column, gap 10px):
- Primary button: "Get started — it's free" → `setScreen('userType')`
- Outline button: "I already have an account" → `setScreen('login')`
- Ghost link: "Browse without signing up →" → calls `onGuest()` prop

**User type (`screen === 'userType'`)**

Top bar with back arrow → `setScreen('landing')`, title "Join Give Hour".

Content padding 24px 20px:
- "Who are you?" — 20px bold, margin-bottom 6px
- Subtitle — 13px #666B72, margin-bottom 24px
- 3 cards, flex column, gap 12px. Each card: white, border #E8EAED, border-radius 14px, padding 18px, flex row, gap 14px, cursor pointer.
  - Icon box: 48x48, border-radius 14px, bg #E6F7EE, display flex center, font-size 22px
  - Title: 15px bold + subtitle 12px gray
  - Right arrow: margin-left auto, color #9EA4AB, font-size 18px "›"
  - Cards: Teen ("I'm a teen" / backpack emoji), Organization ("I'm an organization" / office emoji), Parent ("I'm a parent" / family emoji)
  - All go to `setScreen('step1')`

**Step 1 (`screen === 'step1'`)**

Top bar: "Create account" + subtitle "Step 1 of 3 — Basic info" + back → `setScreen('userType')`.

Content:
- "Tell us about you" — 18px bold, margin-bottom 20px
- 3 input fields: First name, Email, Password — each with ALL CAPS label
- Disclaimer: "By continuing you agree to our Terms of Service and Privacy Policy." — 11px #9EA4AB, margin-bottom 20px
- Continue button: enabled only when all 3 fields filled → `setScreen('step2')`

**Step 2 (`screen === 'step2'`)**

Top bar: "Create account" + "Step 2 of 3 — School info" + back → `setScreen('step1')`.

Content:
- Grade pill buttons: 8th, 9th, 10th, 11th, 12th, College — flex wrap, gap 8px. Selected: bg #18A050, color white, border #18A050. Unselected: white, border #E8EAED, color #666B72.
- Zip code input (required)
- School name input (optional — show "(optional)" in label)
- Continue: enabled when grade and zip filled → `setScreen('step3')`

**Step 3 (`screen === 'step3'`)**

Top bar: "Create account" + "Step 3 of 3 — Your interests" + back → `setScreen('step2')`.

Content:
- "What causes do you care about?" — 18px bold
- "Pick at least 2. We'll use this to personalize your feed." — 13px #666B72, margin-bottom 24px
- Cause buttons flex wrap gap 10px: Housing, Food Security, Education, Environment, Animals, Health, Arts, Seniors
  - Each uses CAUSE[cause] colors
  - Unselected: white bg, border 1.5px solid #E8EAED, color #666B72
  - Selected: CAUSE bg, border 2px solid CAUSE text color, shows "✓ " prefix
  - Padding 10px 16px, border-radius 24px, font-size 13px, cursor pointer
- Button: disabled and showing "Pick X more" when fewer than 2 selected. Enabled and showing "Finish setup →" when 2 or more selected.
- On finish: `supabase.auth.signUp()` with email and password from step 1 state, then insert row into users table with all collected fields and role 'teen', then call `onLoggedIn()` prop.

**Login (`screen === 'login'`)**

Top bar: "Welcome back" + back → `setScreen('landing')`.

Content:
- "Log in" — 20px bold
- "Good to see you again." — 13px #666B72, margin-bottom 24px
- Email input + Password input
- "Forgot password?" — text-align right, margin-bottom 24px, font-size 13px, color #18A050, cursor pointer
- Log in button: enabled when both fields filled. On submit: `supabase.auth.signInWithPassword()` then `onLoggedIn()`.

**Desktop:** Center all auth screens, max-width 440px, margin auto, wrapped in white card with border #E8EAED, border-radius 16px, padding 32px, box-shadow `0 2px 12px rgba(0,0,0,0.08)`.

---

### Screen 2 — Feed.js

Props: `{ user, onSelectOpp }`

Fetch from `supabase opportunities` on mount ordered by `created_at` desc. If `personalized_feed` table has rows for this user, fetch from there instead ordered by rank. Show loading text while fetching.

**Mobile layout (flex 1, overflow-y auto, background #F7F8FA):**

Top section (white background, border-bottom #E8EAED, padding 16px 20px):
- Row 1 (flex, space-between, align-items center, margin-bottom 14px):
  - Left: "Good morning 👋" 13px #9EA4AB above, "Hi, {user.name}" 20px bold #1A1A1A below
  - Right: small avatar circle showing first letter of name
- Row 2 (flex, gap 8px): 3 stat pills
  - Hours: flex 1, bg #E6F7EE, border-radius 10px, padding 10px 8px, text-align center — value 18px bold #18A050, label "hours" 10px #18A050 opacity 0.75
  - Orgs: bg #E8F0FF — value bold #3B72E8, label "orgs"
  - Streak: bg #FFF8E0 — value bold #D4A010, label "streak"

Content (padding 16px 20px):
- Section label: "YOUR TOP MATCHES TODAY"
- Cards (flex column, gap 10px). Each card calls `onSelectOpp(opp)` on click:
  - White card with NEW badge on first card (position absolute, top 14px, right 14px, bg #E6F7EE, color #0A6830, 10px, border-radius 20px, padding 2px 8px, font-weight 600)
  - Org name: 12px, color #9EA4AB, margin-bottom 3px
  - Title: 15px, font-weight 600, color #1A1A1A, margin-bottom 10px
  - Middle row (flex, gap 6px, align-items center, flex-wrap wrap, margin-bottom 10px): cause tag + dot + hours + dot + location
  - Bottom row (flex, space-between): date 12px muted left, match badge right

**Desktop:** Padding 32px 40px. Stats move to top right as colored boxes (flex row, gap 12px, each min-width 80px, text-align center, value 22px bold). Cards become 3-column grid: `display grid, grid-template-columns repeat(3,1fr), gap 16px`.

---

### Screen 3 — Explore.js

Props: `{ user, onSelectOpp, onSignUp, onLogin, isGuest }`

State: `opps`, `activeCause = 'All'`, `search = ''`, `isDesktop`

Fetch all opportunities from Supabase on mount. Filter client-side: match `activeCause` (or all) AND match `search` text against `title` and `org`.

**Guest nav bar (only when `isGuest` is true, replaces normal top bar):**
- White background, border-bottom #E8EAED, padding 14px 20px, flex space-between, align-items center
- Left: logo image `/logo.png` (32x32, border-radius 8) + "Give Hour" 16px bold
- Right: two buttons side by side (gap 10px):
  - "Log in" — outline style: border 1.5px solid #E8EAED, bg none, border-radius 20px, padding 7px 18px, 13px bold, color #1A1A1A → calls `onLogin()`
  - "Sign up free" — filled: bg #18A050, no border, border-radius 20px, padding 7px 18px, 13px bold, white → calls `onSignUp()`

**Normal top bar (when logged in):** "Explore" title + "Browse all opportunities" subtitle.

Content (padding 14px 20px):
- Search bar: flex row, white bg, border #E8EAED, border-radius 10px, padding 10px 14px, gap 8px, margin-bottom 14px. Search icon + input (border none, outline none, flex 1, 13px, font-family inherit).
- Cause pills (flex row, gap 8px, overflow-x auto, margin-bottom 14px): All, Housing, Food Security, Education, Environment, Animals, Health. Active: bg #18A050, border #18A050, white. Inactive: white, border #E8EAED, color #666B72. Each: border-radius 20px, padding 6px 14px, 12px, font-weight 500, white-space nowrap, cursor pointer.
- Cards: same design as Feed. Flex column on mobile, 3-column grid on desktop.
- Empty state (when `filtered.length === 0`): centered text, padding 40px, color #9EA4AB — "No opportunities match this filter. Try a different cause."

**Desktop:** Padding 32px 40px. Same layout, wider.

---

### Screen 4 — OpportunityDetail.js

Props: `{ opp, user, onBack, isGuest, onSignUp }`

State: `registered` (bool), `isDesktop`

On mount: query `registrations` where `user_id = user?.id` AND `opportunity_id = opp.id`. If found, `setRegistered(true)`.

**Mobile layout (flex 1, overflow-y auto, background #F7F8FA):**

Top bar with back button → calls `onBack()`. Shows org name.

Content (padding 20px):
- Cause tag (inline-block, margin-bottom 8px)
- Title: 22px bold, margin 8px 0
- Match badge: bg #E6F7EE, color #18A050, "94% match for you"
- 4-cell grid (display grid, 2 columns, gap 10px, margin 20px 0). Each cell: white, border #E8EAED, border-radius 10px, padding 12px. Content: emoji 16px + CAPS label 10px muted + value 13px bold. Cells: DATE, DURATION, LOCATION, SPOTS LEFT ("12 of 20").
- About card: white, border, border-radius 12px, padding 16px, margin-bottom 14px. "About this opportunity" 13px bold + body text 13px #666B72 line-height 1.7.
- Skills card: white, border, border-radius 12px, padding 16px, margin-bottom 20px. "Skills you'll build" 13px bold + pills in bg #E6F7EE, color #0A6830. Skills: Teamwork, Community impact, Leadership, Project management.

Bottom button:
- When `isGuest`: signup prompt card — bg #E6F7EE, border 1.5px solid rgba(24,160,80,0.3), border-radius 12px, padding 16px, text-align center. "Sign up to register" 14px bold, subtitle 12px gray, "Create free account" green button → calls `onSignUp()`.
- When logged in: full-width button, padding 16px, border-radius 12px, border none, 15px bold, cursor pointer.
  - Not registered: bg #18A050, color white, "Register Now" → insert into registrations, `setRegistered(true)`
  - Registered: bg #E6F7EE, border 2px solid #18A050, color #18A050, "✓ Registered!" → delete from registrations, `setRegistered(false)`

**Desktop:** 2-column grid (1fr 360px), gap 28px, padding 32px 40px.
- Left: all content above (4-cell becomes 4 columns on desktop)
- Right: sticky card (position sticky, top 24px, white, border, border-radius 14px, padding 24px) — match badge, title, org + date, register/signup button, "Save for later" outline button below

---

### Screen 5 — LogHours.js

Props: `{ user }`

State: `history = []`, `totalHours = 0`, `form = { org, date, hours, notes }`, `submitted = false`, `isDesktop`

On mount: fetch `hours_log` where `user_id = user?.id` ordered by `logged_at` desc. Sum `hours` for `totalHours`. Fetch distinct orgs from `opportunities` for the select dropdown. Add resize listener.

**Mobile layout (flex 1, overflow-y auto, background #F7F8FA):**

Top bar: "Log Hours" + "Track your volunteer time" subtitle.

Content (padding 16px 20px):

Total card: bg #18A050, border-radius 12px, padding 16px, margin-bottom 16px, text-align center.
- Large number: 36px bold white, line-height 1 — shows `totalHours`
- Label: "total hours logged" — 13px, rgba(255,255,255,0.85), margin-top 4px

Log form card (white, border #E8EAED, border-radius 12px, padding 16px, margin-bottom 16px):
- "Log new hours" — 14px bold, margin-bottom 14px
- 4 fields with ALL CAPS labels and styled inputs:
  - ORGANIZATION: select with org options + "Select organization..." default
  - DATE: `<input type="date">`
  - HOURS: `<input type="number" min="0.5" step="0.5">`
  - NOTES: `<textarea rows={3}>` (optional)
- Submit button: full width, padding 13px, border-radius 10px, border none, 14px bold, margin-top 4px.
  - Normal: bg #18A050, white — "Submit Hours"
  - Submitted: bg #E6F7EE, border 2px solid #18A050, color #18A050 — "✓ Hours logged!"
  - Disabled (no hours value): bg #B8D8C8, white
  - On submit: insert into `hours_log`, re-fetch history and total, show submitted state for 2 seconds, reset form.

History section:
- "Recent history" — 13px bold, margin-bottom 10px
- Each row: white, border #E8EAED, border-radius 10px, padding 12px 16px, margin-bottom 8px, flex space-between, align-items center.
  - Left: org name 13px bold + date 11px muted below
  - Right: hours pill — bg #E6F7EE, color #18A050, 16px bold, padding 4px 12px, border-radius 20px — "Xh"
- Empty state: centered, padding 20px, 13px #9EA4AB — "No hours logged yet. Submit your first entry above!"

**Desktop:** Padding 32px 40px. Total card full width. Then 2-column grid (1fr 1fr, gap 24px) — form card left, history right.

---

### Screen 6 — Impact.js

Props: `{ user }`

State: `totalHours = 0`, `byCause = []`, `showLetter = false`, `letter = ''`, `letterLoading = false`, `isDesktop`

On mount: fetch `impact_stats` from Supabase where `user_id = user?.id`. If rows exist set `totalHours` and `byCause`. Otherwise calculate live from `hours_log` (group by cause). Add resize listener.

Use mock data if no hours yet: `[{ cause: 'Housing', hours: 12 }, { cause: 'Education', hours: 8 }, { cause: 'Food Security', hours: 6 }]`

**Mobile layout (flex 1, overflow-y auto, background #F7F8FA):**

Top bar: "My Impact" + "Your volunteer story so far" subtitle.

Content (padding 16px 20px):

Hero card: bg `linear-gradient(135deg, #18A050, #0E7A3C)`, border-radius 16px, padding 24px, margin-bottom 14px, text-align center, box-shadow `0 4px 14px rgba(24,160,80,0.25)`.
- Large number: 56px bold white, line-height 1 — `totalHours`
- Label: "total volunteer hours" — 14px, rgba(255,255,255,0.9), margin-top 6px
- Rank badge: margin-top 10px, display inline-block, bg rgba(255,255,255,0.2), border-radius 20px, padding 4px 14px, 12px white bold — "Top 12% of Give Hour teens 🏆"

Hours by cause card (white, border, border-radius 12px, padding 16px, margin-bottom 14px):
- "Hours by cause" — 13px bold, margin-bottom 14px
- Each cause row (margin-bottom 12px):
  - Flex space-between: cause name 13px bold left, hours in CAUSE[cause].text color right 13px bold
  - Progress bar below: height 8px, bg #F7F8FA, fill uses CAUSE[cause].text color, width = hours/totalHours * 100%

College letter card (border 1.5px solid rgba(24,160,80,0.4), border-radius 12px, padding 16px):
- Flex row, gap 12px: graduation emoji 28px left. Right flex 1:
  - "College letter generator" — 13px bold, margin-bottom 4px
  - Description — 12px #666B72, line-height 1.6, margin-bottom 12px
  - "Generate letter →" button — full width, padding 12px, bg #18A050, border none, border-radius 8px, 13px bold white, cursor pointer
  - On click: call OpenAI API (`gpt-4o-mini`) with user name, total hours, top causes and orgs. Show result in modal.

Letter modal (when `showLetter` is true):
- Full-screen overlay: position fixed, top 0, left 0, right 0, bottom 0, bg rgba(0,0,0,0.5), display flex, align-items center, justify-content center, z-index 1000, padding 20px.
- Modal: white, border-radius 16px, padding 24px, max-width 500px, width 100%, max-height 80vh, overflow-y auto.
  - "Your Community Service Letter" — 16px bold, margin-bottom 16px
  - Letter text — 13px, line-height 1.8, white-space pre-wrap
  - "Close" button — full width, padding 12px, bg #F7F8FA, border #E8EAED, border-radius 8px, 13px, cursor pointer, margin-top 16px, calls `setShowLetter(false)`

**Desktop:** Padding 32px 40px. 4 stat cards row at top (grid 4 columns, gap 16px, each: white, border, border-radius 12px, padding 20px 22px — label 13px muted above, value 30px bold color below, sub-label 12px muted). Cards: Total Hours (green), Organizations (blue), Weeks Active (yellow), Letters Ready (purple). Then 2-column grid (1fr 1fr, gap 20px): cause card left, letter card right.

---

### Screen 7 — Profile.js

Props: `{ user, onSignOut }`

State: `totalHours = 0`, `orgCount = 0`, `isDesktop`

On mount: fetch sum of hours from `hours_log` for this user. Fetch distinct org count. Add resize listener.

**Mobile layout (flex 1, overflow-y auto, background #F7F8FA):**

Top bar: "Profile" title.

Content (padding 20px):

Profile card (white, border #E8EAED, border-radius 14px, padding 20px, margin-bottom 14px, flex row, gap 16px, box-shadow `0 1px 3px rgba(0,0,0,0.05)`):
- Avatar: 60x60 circle, bg #E6F7EE, first letter of `user.name`, 24px bold green, border 2px solid rgba(24,160,80,0.3)
- Right column:
  - Name: 18px bold #1A1A1A
  - Grade + zip: 12px #666B72 — `user.grade` then `user.zip` or "Bay Area, CA"
  - Stats: 12px #18A050 bold, margin-top 2px — "{totalHours} hours · {orgCount} orgs helped"

Interests card (white, border, border-radius 12px, padding 16px, margin-bottom 14px):
- "My interests" — 13px bold, margin-bottom 10px
- Pills: flex wrap, gap 8px. Each interest from `user.interests` array using CAUSE colors. Font-size 12px, padding 5px 12px, border-radius 20px, font-weight 500.
- "+ Add" button: bg #F7F8FA, border 1.5px dashed rgba(24,160,80,0.6), color #18A050, same sizing, cursor pointer.

Settings card (white, border, border-radius 12px, overflow hidden):
- 4 rows. Each: padding 14px 16px, flex space-between, align-items center, cursor pointer. Border-bottom #E8EAED between rows (not after last).
  - "Notification settings" — 14px #1A1A1A + right arrow "›" 18px #9EA4AB
  - "Availability" — same
  - "School information" — same
  - "Sign out" — 14px #E03020, font-weight 500, no arrow → calls `supabase.auth.signOut()` then `onSignOut()` prop

**Desktop:** Padding 32px 40px. 2-column grid (1fr 1fr, gap 20px) — profile card + interests card left column, settings card right column.

---

## Key behaviors

1. **Feed personalization:** Check `personalized_feed` table first. If rows exist for the current user, read from there ordered by rank. Otherwise fall back to `opportunities` ordered by `created_at`.

2. **Register toggle:** Tapping Register inserts a row into `registrations`. Tapping again deletes it. Always check on screen mount whether user is already registered.

3. **Impact stats source:** Read from `impact_stats` table if rows exist for user (System 2 has run). Otherwise calculate live from `hours_log` — group by cause, sum hours.

4. **College letter:** Call OpenAI `gpt-4o-mini` with this prompt structure:
   ```
   Write a concise community service letter for [user.name], a high school student 
   who has completed [totalHours] hours of volunteer work through Give Hour. 
   Their top causes are [top 3 causes]. They have worked with [org names]. 
   Write it as if from the Give Hour platform. Keep it under 200 words.
   ```

5. **Auth state:** Always check `supabase.auth.getSession()` on app load before showing any screen. If session exists, show Feed. If not, show Landing.

6. **Loading states:** Every screen that fetches data must show a loading indicator while fetching. Never show a blank screen.

7. **Empty states:**
   - No hours logged: "You haven't logged any hours yet. Find your first opportunity →"
   - No filter results: "No opportunities match this filter. Try a different cause."
   - No interests set: show placeholder causes with an "Add interests" prompt

8. **Error handling:** Wrap all Supabase calls in try/catch. On error show a small error message near the relevant component. Never crash the screen.

9. **Guest mode:** Guest can browse Explore and view Opportunity Detail. Protected screens (Feed, Log Hours, Impact, Profile) redirect to Landing. Opportunity Detail shows signup prompt instead of Register button. Guest banner stays visible on Explore.

---

## Routing reference

| Screen | State value | Protected |
|---|---|---|
| Landing | `'landing'` | No |
| User type selection | `'userType'` | No |
| Signup step 1 | `'step1'` | No |
| Signup step 2 | `'step2'` | No |
| Signup step 3 | `'step3'` | No |
| Login | `'login'` | No |
| Guest explore | `'guestExplore'` | No |
| Feed | `'feed'` | Yes |
| Explore | `'explore'` | No (guest banner) |
| Log Hours | `'loghours'` | Yes |
| Impact | `'impact'` | Yes |
| Profile | `'profile'` | Yes |
| Opportunity Detail | selectedOpp is set | No (register requires login) |

---

## System 2 — Data pipeline reference

> **Status: LIVE — migrated from Azure to GitHub Actions on 2026-05-18**
> System 1 went live 2026-05-09. System 2 pipeline completed and verified 2026-05-18.

### What it does

Runs automatically every night at 2 AM Pacific (10:00 UTC) via GitHub Actions. Takes the raw `opportunities` table, cleans it, scores listings against every teen's profile, aggregates hours, and builds a personalized feed. Writes 4 processed tables back to Supabase.

No Azure account needed. No compiled packages. Zero cost beyond GitHub Actions free tier.

### How it runs

- **Trigger:** GitHub Actions cron `0 10 * * *` (= 2 AM Pacific) — see `.github/workflows/nightly.yml`
- **Manual trigger:** GitHub repo → Actions tab → "Give Hour Nightly Pipeline" → "Run workflow"
- **Runtime:** ~10–20 seconds on `ubuntu-latest`
- **Isolation:** fresh Python venv per run (`.venv/`) — avoids any system package conflicts

### Pipeline scripts

| Script | Input | Output table | Does |
|---|---|---|---|
| `clean_listings.py` | `opportunities` (Supabase) | `clean_listings` | Dedupe by org+title, normalize cause labels, fill blank fields |
| `score_matching.py` | `clean_listings` + `users` | `match_scores` | Score each listing per teen — cause (+40), location (+10), remote (+20), grade (+30) |
| `aggregate_hours.py` | `hours_log` (Supabase) | `impact_stats` | Sum hours, count orgs, find top cause per user |
| `build_feed.py` | `match_scores` | `personalized_feed` | Top 5 ranked listings per user |

Orchestrator: `pipeline.py` runs all 4 steps in sequence, logs progress, exits with code 1 on any failure.

### Supabase output tables

All 4 tables are cleared and rewritten on each run (delete-all then batch insert in chunks of 500).

| Table | Key columns | Notes |
|---|---|---|
| `clean_listings` | id (uuid), org, title, cause, description, location, hours, date | id mirrors `opportunities.id` |
| `match_scores` | user_id (uuid), opportunity_id (uuid), score (int) | all listings × all teen users |
| `impact_stats` | user_id (uuid), total_hours (float), top_cause, orgs_count, entries_count | one row per user |
| `personalized_feed` | user_id (uuid), opportunity_id (uuid), rank (int), score (int) | top 5 per user |

**RLS policies required** (add in Supabase SQL editor):
- `clean_listings` — authenticated users can SELECT
- `personalized_feed` — users can SELECT their own rows (`auth.uid() = user_id`)
- `match_scores` — users can SELECT their own rows
- `impact_stats` — users can SELECT their own rows

The pipeline writes using the service role key (bypasses RLS). The frontend reads using the anon key (respects RLS).

### GitHub Actions secrets

Set in GitHub repo → Settings → Secrets and variables → Actions:

```
SUPABASE_URL              — https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY — service_role key
```

### Matching algorithm

| Signal | Points |
|---|---|
| Cause matches user's preferred_cause | +40 |
| User's grade is in listing's age group ("teen"/"all") | +30 |
| Listing is remote/online | +20 |
| Listing location matches user's region | +10 |

### How System 1 connects to System 2 output

After the pipeline runs, `Feed.jsx` reads from `personalized_feed` joined to `clean_listings`:

```js
.select('score, rank, clean_listings!inner(*)')
```

This join requires a foreign key from `personalized_feed.opportunity_id → clean_listings.id`. Both columns must be `uuid` type — if there's a type mismatch the join silently returns 0 rows.

`Impact.jsx` reads from `impact_stats` for the user's total hours and cause breakdown.

Both screens show a "getting ready" placeholder if the pipeline tables are empty.

### Build checklist — completed 2026-05-18

- [x] Create `pipeline/` directory with 6 Python files + requirements.txt
- [x] Write supabase_client.py using http.client (stdlib only — no supabase SDK)
- [x] Write all 4 pipeline scripts in plain Python (no pandas)
- [x] Create `.github/workflows/nightly.yml` with venv isolation
- [x] Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to GitHub Secrets
- [x] Create 4 Supabase output tables with correct uuid types
- [x] Add RLS policies for authenticated frontend reads
- [x] Verify pipeline runs end to end on GitHub Actions
- [x] Verify personalized feed shows in app for logged-in teen users

---

## Demo script (10 minutes)

1. Open app as guest → Browse opportunities → see generic list
2. Tap an opportunity → see detail → hit signup prompt instead of Register
3. Sign up as a teen → pick Education and Environment interests → finish setup
4. See Feed with personalized matches ranked to interests
5. Register for an opportunity
6. Log 3 hours for a past session
7. Open Impact → see total hours, cause breakdown bars, rank badge
8. Click Generate letter → personalized college letter appears in modal
9. Open Profile → see interests, hours count, settings list
10. Sign out → returns to landing page

---

## Addendum — May 2026 UX overhaul

The original spec described a fixed-shell mobile layout with a bottom tab bar. The shipped app uses a different model — see project memory `project_givehour.md` System 5 for full details. Key deviations from this doc:

- **No bottom nav bar.** Replaced by a green ☰ button (`position: fixed; top: 10px; right: 12px`) that opens a slide-in drawer from the right. Drawer contains the same nav items (per role), plus Sign out at the bottom.
- **No `position: fixed` body / `100dvh` chains.** Mobile uses natural document scroll. `index.css` is just `html, body { background; }` plus `overscroll-behavior-y: none`. Each screen renders content at natural height; the page scrolls.
- **Persistent footer** at the end of the document with Privacy / Terms / Contact links → opens `LegalPage.jsx`.
- **Org nav now includes `orgPost`** route → renders `<PostListingForm>` directly. The inline + Post button on OrgDashboard was removed.
- **LogHours has edit/delete** per-entry. Requires `hours_log` UPDATE + DELETE RLS policies (`auth.uid() = user_id`).
- **Landing rebranded** "Built by a teen, for teens" with a How-it-works 3-step section emphasising teen-friendly filtering, log-from-anywhere tracking, and the service letter generator as the killer feature.

When updating screens, defer to the actual code in `src/screens/` rather than the original spec sections above — the spec is preserved for context but the implementation has evolved past it.
