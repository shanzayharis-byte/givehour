# Notebook 4 — Impact
# Reads each user's hours_log from Supabase, calculates their impact stats,
# and writes results to the impact_stats table.
#
# Stats calculated per user:
#   total_hours          — sum of all logged hours
#   causes_helped        — unique causes from volunteered opportunities
#   opportunities_count  — number of distinct opportunities volunteered at
#   streak_days          — current consecutive-day volunteering streak
#
# Setup: set the following environment variables in your Databricks cluster
# (Compute → your cluster → Edit → Advanced → Environment variables):
#
#   SUPABASE_URL   — https://your-project.supabase.co
#   SUPABASE_KEY   — service_role key from Supabase → Settings → API

%pip install supabase

import os
from supabase import create_client
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# ── credentials ───────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

# ── streak calculation ────────────────────────────────────────────────────────
def calc_streak(log_dates):
    if not log_dates:
        return 0
    days  = sorted(set(d[:10] for d in log_dates), reverse=True)
    today = datetime.now(timezone.utc).date()
    streak, check = 0, today
    for day in days:
        d = datetime.strptime(day, "%Y-%m-%d").date()
        if d == check or d == check - timedelta(days=1):
            streak += 1
            check   = d
        else:
            break
    return streak

# ── run ───────────────────────────────────────────────────────────────────────
print("Starting impact calculation...")
db             = create_client(SUPABASE_URL, SUPABASE_KEY)
logs           = db.table("hours_log").select("*").execute().data
listings       = db.table("clean_listings").select("id, cause").execute().data
listings_by_id = {l["id"]: l for l in listings}
print(f"Loaded {len(logs)} log entries")

by_user = defaultdict(list)
for log in logs:
    by_user[log["user_id"]].append(log)

stats = []
for user_id, user_logs in by_user.items():
    total_hours = sum(float(l.get("hours", 0) or 0) for l in user_logs)
    opp_ids     = list({l["opportunity_id"] for l in user_logs if l.get("opportunity_id")})
    causes      = list({listings_by_id[oid]["cause"] for oid in opp_ids if oid in listings_by_id})
    log_dates   = [l["logged_at"] for l in user_logs if l.get("logged_at")]
    stats.append({
        "user_id":             user_id,
        "total_hours":         round(total_hours, 1),
        "causes_helped":       causes,
        "opportunities_count": len(opp_ids),
        "streak_days":         calc_streak(log_dates),
        "last_updated":        datetime.now(timezone.utc).isoformat(),
    })

for i in range(0, len(stats), 100):
    db.table("impact_stats").upsert(stats[i:i+100]).execute()
print(f"Done. Impact stats updated for {len(stats)} users.")
