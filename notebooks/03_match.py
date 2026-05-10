# Notebook 3 — Match
# Reads clean listings and user profiles from Supabase, scores each listing
# for each user, and writes results to match_scores + personalized_feed.
#
# Scoring (max 100 points):
#   +40  listing cause matches user's preferred cause
#   +30  listing age group includes this user's age
#   +20  listing is remote / online
#   +10  listing location matches user's region
#
# Setup: set the following environment variables in your Databricks cluster
# (Compute → your cluster → Edit → Advanced → Environment variables):
#
#   SUPABASE_URL   — https://your-project.supabase.co
#   SUPABASE_KEY   — service_role key from Supabase → Settings → API

%pip install supabase

import os
from supabase import create_client

# ── credentials ───────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
FEED_SIZE    = 20   # top N listings stored per user in personalized_feed

# ── scoring ───────────────────────────────────────────────────────────────────
AGE_GROUP_OK = {
    "All Ages":      (0,  999),
    "Teens (13-17)": (13, 17),
    "18+ Only":      (18, 999),
    "Open":          (0,  999),
}

def score(listing, user):
    points = 0
    preferred_cause  = (user.get("preferred_cause") or "").strip()
    if preferred_cause and listing["cause"] == preferred_cause:
        points += 40
    user_age         = user.get("age") or 0
    min_age, max_age = AGE_GROUP_OK.get(listing["age_group"], (0, 999))
    if min_age <= user_age <= max_age:
        points += 30
    if listing["remote"]:
        points += 20
    user_region = (user.get("region") or "").strip().lower()
    if user_region and user_region in (listing.get("location") or "").lower():
        points += 10
    return points

# ── run ───────────────────────────────────────────────────────────────────────
print("Starting matching...")
db       = create_client(SUPABASE_URL, SUPABASE_KEY)
listings = db.table("clean_listings").select("*").execute().data
users    = db.table("users").select("id, age, preferred_cause, region").execute().data
print(f"Loaded {len(listings)} listings and {len(users)} users")

all_scores, feed_rows = [], []
for user in users:
    scored = []
    for listing in listings:
        s = score(listing, user)
        all_scores.append({"user_id": user["id"], "listing_id": listing["id"], "score": s})
        scored.append((s, listing["id"]))
    scored.sort(reverse=True)
    for rank, (s, listing_id) in enumerate(scored[:FEED_SIZE]):
        feed_rows.append({"user_id": user["id"], "listing_id": listing_id, "score": s, "rank": rank + 1})
    print(f"  User {user['id'][:8]}... — top score: {scored[0][0] if scored else 0}")

for i in range(0, len(all_scores), 100):
    db.table("match_scores").upsert(all_scores[i:i+100]).execute()
print(f"Wrote {len(all_scores)} match score rows")

db.table("personalized_feed").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
for i in range(0, len(feed_rows), 100):
    db.table("personalized_feed").insert(feed_rows[i:i+100]).execute()
print(f"Wrote {len(feed_rows)} feed rows. Done.")
