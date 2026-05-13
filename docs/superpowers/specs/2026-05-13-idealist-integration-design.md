---
title: Idealist API Integration
date: 2026-05-13
status: approved
---

## Overview

Add Idealist as a third volunteer listing source in givehour. Listings are ingested nightly via the Databricks pipeline and stored in `clean_listings` (Supabase). The Explore tab mixes them with live VolunteerConnector results, with a source badge so teens can see where each listing comes from. The Idealist API call fails gracefully — a timeout or error skips Idealist without crashing the pipeline.

## API Details

- Base URL: `https://www.idealist.org`
- Endpoint: `GET /api/v1/listings/volops`
- Auth: Basic HTTP, API key as username, empty password
- Key: `66355e8e431709c2444478cc2e1198b0` (stored in Databricks env var `IDEALIST_API_KEY`)
- Pagination: `?since=<last_item_updated_timestamp>`, up to 100 per page, inclusive (last item repeated)
- Rate limit: none enforced, but wait 250ms between pages, no parallel requests

## Section 1 — Pipeline: Ingest (`01_ingest.py`)

Add a third fetch block after the existing VolunteerConnector and org_listings blocks.

**Behavior:**
- Wrapped entirely in `try/except` with a 30-second per-request timeout
- Paginates using the `since` parameter; stops when a page returns fewer than 100 results
- Sleeps 250ms between pages
- On success: saves results to `raw/idealist/{timestamp}.json`
- On any failure (timeout, HTTP error, parse error): prints `⚠️  Idealist ingest failed: {error} — skipping`, does not save a blob, continues to next pipeline step. `02_clean` handles a missing blob gracefully.

**New env var required:**
- `IDEALIST_API_KEY` — set in Databricks cluster Advanced → Environment variables

## Section 2 — Pipeline: Clean (`02_clean.py`)

Add an Idealist processing block after the org_listings block.

**Behavior:**
- Reads the latest `raw/idealist/` blob from Azure Data Lake
- If no blob exists (first run, or ingest failed): prints a skip message, continues — no crash
- If blob is empty array: skips upsert silently

**Field mapping:**

| Idealist field | `clean_listings` field | Notes |
|---|---|---|
| `id` | `id` | Prefixed `idealist_{id}` to avoid collisions with VC |
| `name` | `title` | Idealist uses "name", not "title" |
| `organization.name` | `org` | Nested object |
| derived | `cause` | Run cause detection on `description + name` as plain text (Idealist has no `activities` array) |
| derived | `age_group` | Run age detection on `description + name` as plain text |
| `address` | `location` | City + state string; "Remote / Online" if remote flag set |
| remote flag | `remote` | Boolean |
| `description` | `description` | Plain text |
| `url['en']` | `external_url` | Pick English from multilingual URL map |
| `'idealist'` | `source` | Hard-coded string |

**Supabase update strategy:** Delete all rows where `source='idealist'`, then batch-upsert new records (100 at a time). Same pattern as VolunteerConnector.

## Section 3 — Explore Tab (`Explore.jsx`)

**Data fetching:**
- On mount, query Supabase: `clean_listings` where `source = 'idealist'`
- Store in `idealistOpps` state (array)
- VolunteerConnector live fetch is unchanged

**Interleaving:**
- When rendering the card list, every 3rd slot is filled from `idealistOpps` (cycling through the array)
- Pattern: VC, VC, VC, Idealist, VC, VC, VC, Idealist, …
- Idealist cards cycle from the start when exhausted (so all Idealist listings surface across a long list)
- If `idealistOpps` is empty (pipeline hasn't run yet, or ingest failed): list renders VC cards only, no gaps

**Source badge:**

| `source` value | Badge | Style |
|---|---|---|
| `'idealist'` | `🌐 Idealist` | Purple pill (`#EDE9FE` bg, `#6D28D9` text) |
| `'org'` | `✓ Give Hour Partner` | Green pill (existing, unchanged) |
| no source / VC | none | No badge — default source, keeps cards clean |

Badge renders in the card header, same position as the existing org badge.

**Filtering:** Cause, age group, and location filters apply to both VC and Idealist cards equally — filtering operates on the rendered merged list, no special handling needed.

## Error Handling Summary

| Failure point | Behavior |
|---|---|
| Idealist API timeout (ingest) | Warning logged, empty blob saved, pipeline continues |
| Idealist API HTTP error (ingest) | Same as above |
| No `raw/idealist/` blob (clean) | Skip block, log message, continue |
| Supabase Idealist query fails (Explore) | `idealistOpps` stays empty, VC-only list renders normally |

## Files Changed

| File | Change |
|---|---|
| `notebooks/01_ingest.py` | Add Idealist fetch block with graceful failure |
| `notebooks/02_clean.py` | Add Idealist clean/upsert block |
| `src/screens/Explore.jsx` | Fetch Idealist from Supabase, interleave, add source badge |

## Out of Scope

- Jobs and internships endpoints (volunteer ops only)
- Real-time Idealist search (listings come from nightly batch only)
- Databricks job reconfiguration (notebooks run in existing 4-task pipeline order)
