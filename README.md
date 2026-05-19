# Give Hour

**Built by a teen, for teens.** Finding good volunteer opportunities as a teen is hard — most volunteer sites are built for adults. Give Hour filters for orgs that actually accept teens, lets you log every hour you volunteer (even from school or family stuff), and turns it all into a service letter for college apps.

Organizations can sign up independently to post listings and receive applications directly through the app.

**Live:** [givehour.vercel.app](https://givehour.vercel.app)
**GitHub:** [github.com/shanzayharis-byte/givehour](https://github.com/shanzayharis-byte/givehour)

---

## What It Does

### For Teens
- **Personalized feed** — top 10 listings ranked by cause match, age group, region, and remote availability
- **Explore** — browse 700+ teen-appropriate volunteer opportunities with cause and age filters
- **Apply** — apply to org-posted listings directly through Give Hour with an optional message
- **Log hours from anywhere** — track every volunteer hour with full edit/delete history. School events, religious org, family stuff, opportunities found here — log it all in one place
- **Impact dashboard** — total hours, cause breakdown, streak, and AI-generated college service letters
- **Save & share** — bookmark opportunities and share them with friends
- **My Applications** — track application status (Pending / Accepted / Declined) from the Profile tab

### For Organizations
- **Post listings** — create volunteer opportunities directly from the side menu, with cause, location/remote, date, hours, and age group
- **Applicants inbox** — view all applications received, accept or decline with one tap
- **Email notifications** — receive an email for every new application via Gmail SMTP
- **Public org profile** — teens can browse your listings and learn about your organization

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend / Auth | Supabase (Postgres + Auth + Storage) |
| Hosting | Vercel (frontend + serverless API routes) |
| Data pipeline | Python (stdlib only) — 4-script pipeline in `pipeline/` |
| Orchestration | GitHub Actions — nightly cron at 2 AM Pacific (10:00 UTC) |
| Listings source | VolunteerConnector API |
| Email | Gmail SMTP via Nodemailer (Vercel API routes) |

---

## Project Structure

```
givehour/
├── src/
│   ├── screens/
│   │   ├── Auth.jsx              # Signup (teen / org / parent) + login
│   │   ├── Feed.jsx              # Personalized top-10 listings + streak
│   │   ├── Explore.jsx           # Browse + filter all listings
│   │   ├── OpportunityDetail.jsx # Apply, save, and share opportunities
│   │   ├── LogHours.jsx          # Log + view volunteer hours history
│   │   ├── Impact.jsx            # Stats + college letter generator
│   │   ├── Profile.jsx           # User profile + settings (role-aware)
│   │   ├── OrgDashboard.jsx      # Org's listings (Post is in the menu drawer)
│   │   ├── PostListingForm.jsx   # Form to create a new org listing
│   │   ├── OrgProfile.jsx        # Public org page (name, city, listings)
│   │   ├── ApplicantsInbox.jsx   # Org's received applications
│   │   └── LegalPage.jsx         # Privacy / Terms / Contact (footer links)
│   ├── lib/
│   │   ├── supabase.js           # Supabase client
│   │   └── theme.js              # Colors + cause styles
│   └── App.jsx                   # Navigation + role-based auth routing
├── api/
│   ├── opportunities.js          # Vercel proxy → VolunteerConnector
│   ├── save-profile.js           # Upsert user profile (server-side, service role)
│   └── apply.js                  # Submit application + send org email
└── pipeline/                     # Nightly data pipeline (runs on GitHub Actions)
    ├── pipeline.py               # Orchestrator — runs all 4 steps in sequence
    ├── clean_listings.py         # Dedupe + normalize opportunities → clean_listings
    ├── score_matching.py         # Score listings per user → match_scores
    ├── aggregate_hours.py        # Sum hours from hours_log → impact_stats
    ├── build_feed.py             # Top 5 per user from match_scores → personalized_feed
    ├── supabase_client.py        # Thin HTTP wrapper for Supabase REST API (stdlib only)
    ├── requirements.txt          # python-dotenv only — zero compiled dependencies
    └── README.md                 # Pipeline docs
```

---

## Role-Based Routing

After login, the app routes based on `users.role`:

| Role | Home screen | Navigation (in drawer) |
|---|---|---|
| `teen` | Feed | Feed · Explore · Log Hours · Impact · Profile |
| `org` | Org Dashboard | Listings · Post · Applicants · Explore · Profile |
| `parent` | Feed | Feed · Explore · Log Hours · Impact · Profile |

---

## Navigation & Layout

- **Mobile:** Page scrolls naturally — no fixed body, no internal scroll containers. Navigation lives in a slide-in drawer accessed from a green ☰ button pinned to the top-right corner. Sign-out lives at the bottom of the drawer. Footer with brand + Privacy / Terms / Contact links sits at the end of the document.
- **Desktop:** Persistent left sidebar with logo, nav items, and sign-out. Main content scrolls in the right pane. No hamburger / drawer (the sidebar replaces it).
- **Landing page** (signed out): Hero with "Built by a teen · for teens" badge, How-it-works section explaining the 3-step value prop (find teen-friendly opportunities → log every hour → generate a service letter), then CTAs.

---

## Signup Flows

Three distinct flows based on account type selected on the first screen:

- **Teen** — grade, age, region, school, cause interests (min 2) — first cause = preferred cause for matching
- **Organization** — org name, type (Nonprofit / School / etc.), city, website, causes supported (min 1)
- **Parent** — child's grade, school, zip, family cause interests (optional)

Profile is saved via `/api/save-profile` (Vercel serverless, service role key). Falls back to `session.user.user_metadata` when localStorage is unavailable (e.g. email confirmed in a different browser). If setup fails, shows a clear error screen instead of silently routing to the wrong view.

---

## Auth Features

- Duplicate email: friendly error on step 1
- Forgot password: sends reset link via Gmail SMTP
- Confirmation email subject and body vary by role (org vs teen) using Supabase email template variables
- Supabase Site URL set to `https://givehour.vercel.app`

---

## Data Pipeline

Runs every night at 2 AM Pacific via GitHub Actions (`nightly.yml` — cron `0 10 * * *`). Python scripts use only stdlib + python-dotenv. No pandas, no compiled packages, no Azure required.

1. **clean_listings** — dedupes opportunities table by org+title, normalizes cause labels, writes to `clean_listings`
2. **score_matching** — scores every clean listing for every teen user (cause, location, remote, grade), writes to `match_scores`
3. **aggregate_hours** — reads `hours_log`, sums hours by user + cause + org, writes to `impact_stats`
4. **build_feed** — takes top 5 scores per user from `match_scores`, writes ranked rows to `personalized_feed`

The pipeline can also be triggered manually from the GitHub Actions tab → "Run workflow".

### Matching Algorithm

| Signal | Points |
|---|---|
| Cause matches preferred cause | +40 |
| Age group includes user's age | +30 |
| Remote / online listing | +20 |
| Location matches user's region | +10 |

---

## Supabase Schema

| Table | Key columns |
|---|---|
| `users` | id, name, role, age, grade, region, preferred_cause, interests, school_name, org_type, website, avatar_url |
| `clean_listings` | id (uuid), org, title, cause, description, location, hours, date |
| `org_listings` | id, org_id, title, cause, location, remote, date, hours, age_group, description, external_url |
| `applications` | id, teen_id, org_listing_id, org_id, message, submitted_at, status |
| `match_scores` | user_id, opportunity_id, score — written by pipeline |
| `personalized_feed` | user_id, opportunity_id, score, rank — top 5 per user, written by pipeline |
| `hours_log` | user_id, opportunity_id, hours, org, logged_at |
| `impact_stats` | user_id, total_hours, top_cause, orgs_count, entries_count — written by pipeline |
| `saved_opportunities` | user_id, listing_id, saved_at |

---

## Vercel Environment Variables

```
VITE_SUPABASE_URL              — public Supabase URL
VITE_SUPABASE_ANON_KEY         — public anon key
SUPABASE_URL                   — same URL (for API routes)
SUPABASE_SERVICE_ROLE_KEY      — service role key (server-side only)
GMAIL_USER                     — shanzay.haris@gmail.com
GMAIL_APP_PASSWORD             — Gmail App Password for SMTP
VITE_OPENAI_API_KEY            — optional, for college letter generation
```

## GitHub Actions Secrets

These are set in the givehour GitHub repo under Settings → Secrets → Actions:

```
SUPABASE_URL              — https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY — service_role key (pipeline writes directly, bypasses RLS)
```

---

## Local Development

```bash
npm install
npm run dev
```

Create `.env`:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-openai-key
```

---

Built by [Shanzay Haris](https://github.com/shanzayharis-byte)
