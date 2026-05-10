# Notebook 4 — Impact
# Reads each user's hours_log from Supabase, calculates their impact stats,
# and writes them to the impact_stats table so the Impact screen has real numbers.
#
# Stats calculated:
#   total_hours          — sum of all logged hours
#   causes_helped        — list of unique causes they've volunteered for
#   opportunities_count  — number of distinct opportunities logged
#   streak_days          — current consecutive days with a log entry
#   last_updated         — timestamp of this run
#
# Required environment variables (set in Databricks cluster config):
#   SUPABASE_URL  — https://cmiwwlfazbnrfsvakvhh.supabase.co
#   SUPABASE_KEY  — Service role key

import os
from supabase import create_client
from datetime import datetime, timezone, timedelta
from collections import defaultdict

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

# ── streak calculator ─────────────────────────────────────────────────────────
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

# ── aggregate per user ────────────────────────────────────────────────────────
def aggregate(logs, listings_by_id):
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
    return stats

# ── run ───────────────────────────────────────────────────────────────────────
print("Starting impact calculation...")
db = create_client(SUPABASE_URL, SUPABASE_KEY)

logs           = db.table("hours_log").select("*").execute().data
listings       = db.table("clean_listings").select("id, cause").execute().data
listings_by_id = {l["id"]: l for l in listings}

print(f"Loaded {len(logs)} log entries across {len(listings_by_id)} listings")

stats = aggregate(logs, listings_by_id)
print(f"Calculated stats for {len(stats)} users")

for i in range(0, len(stats), 100):
    db.table("impact_stats").upsert(stats[i:i+100]).execute()

print(f"Done. Impact stats updated for {len(stats)} users.")
