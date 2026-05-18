# Give Hour Nightly Pipeline

Runs every night at 2am Pacific via GitHub Actions. Replaces Azure Data Factory + Databricks.

## What it does

1. **clean_listings.py** — Reads opportunities from Supabase, removes duplicates, standardizes cause names, fills missing fields. Writes to `clean_listings`.
2. **score_matching.py** — Scores every listing against every teen user profile (cause 60pts + location 25pts + grade 15pts). Writes to `match_scores`.
3. **aggregate_hours.py** — Sums logged hours by user and cause. Writes to `impact_stats`.
4. **build_feed.py** — Takes top 5 scored listings per user. Writes to `personalized_feed`.

## Running manually

```bash
cd pipeline
pip install -r requirements.txt
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python pipeline.py
```

## GitHub Actions

The workflow is at `.github/workflows/nightly.yml`. It runs on cron (`0 10 * * *` = 2am Pacific) and can also be triggered manually from the Actions tab.

Secrets required in repo settings:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
