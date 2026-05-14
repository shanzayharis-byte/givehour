# Calendar — Opportunities Timeline

**Date:** 2026-05-14  
**Status:** Approved

---

## Overview

Replace the current hours-log calendar with a public opportunities timeline. Teens can browse upcoming volunteer opportunities sorted by date, toggle to see only their saved ones, and quickly preview details inline without leaving the screen.

---

## Data & Filtering

- Pull from `clean_listings` where `date` is not null/empty; filter to future dates only
- Group by parsed date for the timeline section
- Separately pull all dateless rows for the "No date listed" section at the bottom
- For the Saved toggle: cross-reference `saved_opportunities` for the logged-in user
- Malformed or unparseable date strings → treat as dateless, drop into bottom section
- Guests can browse but cannot save (prompt to sign up on Save tap)

---

## Layout

### Header
- "Calendar" heading
- **Saved toggle** pill — off by default; when on, filters timeline and no-date section to saved opportunities only

### Timeline
- Scrollable list grouped by date with headers: e.g. "Sun, May 18"
- Under each date header: one or more compact opportunity cards showing title, org, cause chip, location
- Cards are tap-to-expand (accordion). Only one open at a time.

### Expanded card (inline preview)
- Description snippet
- Hours
- **Save / Unsave button**
- **"Visit site →"** button linking to `external_url`

### No date listed section
- Collapsible, collapsed by default
- Same card style as timeline
- Label: "No date listed"

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| No upcoming dated opportunities | Empty state: "No upcoming opportunities right now. Check back soon." |
| Saved toggle on, nothing saved | "You haven't saved any opportunities yet. Browse and tap the bookmark to save." |
| Guest taps Save | Nudge to sign up (same pattern as Explore) |
| Malformed date string | Treat as dateless → drop into bottom section |

---

## What Changes

- `src/screens/Calendar.jsx` — full rewrite (replace hours-log grid with opportunities timeline)
- `src/App.jsx` — no nav changes needed; Calendar tab already wired up
