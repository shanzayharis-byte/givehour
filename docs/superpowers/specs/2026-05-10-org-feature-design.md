# Org Feature Design — givehour
**Date:** 2026-05-10  
**Status:** Approved

---

## Overview

Orgs (organizations) can sign up on givehour, post their own volunteering opportunities, and receive applications from teens. Teens can browse a public org profile page. This is built as role-based routing inside the existing app — when `role === "org"`, the user lands on an org-specific dashboard instead of the teen Feed.

---

## Role-Based Routing

- `App.jsx` checks `role` from the `users` table after login
- `role === "org"` → renders `OrgDashboard` as the home screen
- Org bottom nav tabs: **My Listings · Applicants · Profile**
- Teen nav and screens are unchanged

---

## Screens

### 1. `OrgDashboard.jsx` (private)
- Header: org name + city
- List of all org-posted listings: title, cause, date, number of applicants
- "Post New Opportunity" button → opens `PostListingForm`
- Empty state with CTA when no listings yet

### 2. `PostListingForm.jsx`
A form orgs fill out to post a new opportunity. Fields:
- Title (text)
- Cause (pill picker — same 8 causes as teen explore)
- Location (text) or Remote (toggle)
- Date (date picker)
- Hours (number)
- Age group (All Ages / Teens 13–17 / No Age Restriction)
- Description (textarea)
- External URL (optional — if org is listed elsewhere)

On submit → inserts row into `org_listings` table. The daily Databricks pipeline merges `org_listings` into `clean_listings` so they appear in teen Feed and Explore.

### 3. `OrgProfile.jsx` (public)
The app uses state-based navigation (no React Router), so org profiles work the same way as `OpportunityDetail` — `App.jsx` holds a `selectedOrg` state, and when set, renders `OrgProfile` instead of the active screen. Shows:
- Org name, city, causes supported
- All active listings posted by the org (read directly from `org_listings`)
- Tapping a listing → sets `selectedOpp` and renders `OpportunityDetail` as normal

Teens reach an org profile by tapping the org name on any listing card or the `OpportunityDetail` header — same pattern as tapping an opportunity to open its detail view.

### 4. Application Flow (teen side)
- On `OpportunityDetail`: if listing has no `external_url` → show "Apply on Give Hour" button instead of external link
- Tapping opens an inline form: optional short message ("Why do you want to help?")
- On submit:
  - Row inserted into `applications` table
  - Email sent to org via existing Gmail SMTP (Supabase Edge Function or Vercel API route)
  - Application saved to teen profile under "My Applications" tab on `Profile.jsx`

**My Applications (teen Profile tab):**
- Shows: org name, listing title, date submitted, status (Pending / Accepted / Declined)
- Status is updated by the org from their Applicants inbox

### 5. Applicants Inbox (org side — `ApplicantsInbox.jsx`)
- Second tab on org nav
- Lists all applications received: teen name, listing they applied to, message, date
- Org can update status: Pending → Accepted or Declined
- Each application also triggers an email to the org at the time of submission

---

## Data Model

### New table: `org_listings`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| org_id | uuid | references users.id |
| title | text | |
| cause | text | |
| location | text | nullable if remote |
| remote | boolean | |
| date | date | |
| hours | int | |
| age_group | text | "all" / "teens" / "open" |
| description | text | |
| external_url | text | nullable |
| created_at | timestamptz | |

### New table: `applications`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| teen_id | uuid | references users.id |
| org_listing_id | uuid | references org_listings.id |
| org_id | uuid | references users.id |
| message | text | nullable |
| submitted_at | timestamptz | |
| status | text | "pending" / "accepted" / "declined" |

`org_listing_id` references `org_listings` directly (not `clean_listings`) so applications work on the same day a listing is posted, before the daily pipeline merges it into `clean_listings`.

---

## Email Notifications

- Uses existing Gmail SMTP already configured in Supabase
- Triggered on application submit via a Vercel API route (`/api/apply.js`)
- Email to org includes: teen name, listing title, message, date

---

## Pipeline Changes

- Databricks `01_ingest` notebook gains a second source: reads from `org_listings` in Supabase
- Org listings are merged into `clean_listings` with `source: "org"` flag
- No other pipeline changes needed — matching, feed, and impact notebooks are unaffected

---

## What Is Not In Scope

- Org analytics / stats dashboard
- Messaging between org and teen after application
- Org editing or deleting listings (v2)
- Application attachments or resume uploads
