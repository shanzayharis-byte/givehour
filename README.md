# Give Hour

A volunteer matching platform built for Bay Area teens. Find personalized opportunities, log hours, track your impact, and generate community service letters for college applications.

**Live:** [givehour.vercel.app](https://givehour.vercel.app)

---

## What It Does

- **Personalized feed** — top 10 listings ranked by cause match, age group, region, and remote availability
- **Explore** — browse 700+ teen-appropriate volunteer opportunities with cause and age filters
- **Log hours** — track volunteer hours by opportunity and organization with full history
- **Impact dashboard** — total hours, cause breakdown, streak, and AI-generated college service letters
- **Save & share** — bookmark opportunities and share them with friends
- **Profile** — cause interests, region, school info, availability, and notification settings
- **Teen-only** — 18+ listings are filtered out throughout the entire app

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend / Auth | Supabase (Postgres + Auth + Storage) |
| Hosting | Vercel |
| Data pipeline | Azure Databricks + Azure Data Lake Storage Gen2 |
| Listings source | VolunteerConnector API (VolunteerMatch coming soon) |

---

## Project Structure

```
givehour/
├── src/
│   ├── screens/
│   │   ├── Auth.jsx             # Signup (teen / org / parent) + login
│   │   ├── Feed.jsx             # Personalized top-10 listings + streak
│   │   ├── Explore.jsx          # Browse + filter all listings
│   │   ├── OpportunityDetail.jsx # Apply, save, and share opportunities
│   │   ├── LogHours.jsx         # Log + view volunteer hours history
│   │   ├── Impact.jsx           # Stats + college letter generator
│   │   └── Profile.jsx          # User profile + settings
│   ├── lib/
│   │   ├── supabase.js          # Supabase client
│   │   └── theme.js             # Colors + cause styles
│   └── App.jsx                  # Navigation + auth routing
├── api/
│   └── opportunities.js         # Vercel serverless proxy → VolunteerConnector
└── notebooks/                   # Databricks ETL pipeline
    ├── 01_ingest.py             # Fetch listings → Azure Data Lake raw/
    ├── 02_clean.py              # Clean + detect age/cause → Supabase
    ├── 03_match.py              # Score listings per user → personalized_feed
    └── 04_impact.py             # Aggregate hours → impact_stats
```

---

## Data Pipeline

The Databricks pipeline runs automatically every night at 2 AM via a scheduled job (`givehour-daily-pipeline`). It runs 4 notebooks in order:

1. **01_ingest** — fetches all US listings from VolunteerConnector, saves JSON to Azure Data Lake `raw/`
2. **02_clean** — filters to US-only, detects age group and cause category, writes to `processed/` and Supabase `clean_listings`
3. **03_match** — scores every listing for every user (cause +40, age group +30, remote +20, region +10), writes top 20 per user to `personalized_feed`
4. **04_impact** — reads `hours_log`, calculates total hours / streak / causes, writes to `impact_stats`

### Matching Algorithm

| Signal | Points |
|---|---|
| Cause matches user's preferred cause | +40 |
| Listing age group includes user's age | +30 |
| Remote / online listing | +20 |
| Listing location matches user's region | +10 |

### Databricks Setup

Set the following environment variables on your cluster (Compute → Edit → Advanced → Environment variables):

```
AZURE_STORAGE_KEY   — Access key for the givehourdata storage account
SUPABASE_URL        — https://your-project.supabase.co
SUPABASE_KEY        — service_role key from Supabase → Settings → API
```

---

## Supabase Schema

| Table | Key columns |
|---|---|
| `users` | id, name, role, age, grade, region, preferred_cause, interests, school_name, availability_days, avatar_url |
| `clean_listings` | id, title, org, cause, age_group, location, remote, hours, date, external_url |
| `personalized_feed` | user_id, listing_id, score, rank |
| `match_scores` | user_id, listing_id, score |
| `hours_log` | user_id, opportunity_id, hours, org, logged_at |
| `impact_stats` | user_id, total_hours, causes_helped, opportunities_count, streak_days |
| `saved_opportunities` | user_id, listing_id, saved_at |

---

## Signup Flows

Three distinct signup flows based on account type:

- **Teen** — grade, age, region, school, cause interests (min 2) — first cause = preferred cause for matching
- **Organization** — org name, type, city, website, causes supported
- **Parent** — child's grade, school, zip, family cause interests (optional)

---

## Local Development

```bash
npm install
npm run dev
```

Create a `.env` file with:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-openai-key   # optional — for college letter generation
```

---

Built by [Shanzay Haris](https://github.com/shanzayharis-byte)
