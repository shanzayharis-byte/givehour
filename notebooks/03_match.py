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
# Age group filter: listings tagged "18+ Only" are excluded from teen users' feeds.

%pip install supabase

import os
from supabase import create_client

# ── credentials ───────────────────────────────────────────────────────────────
SUPABASE_URL = "https://cmiwwlfazbnrfsvakvhh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaXd3bGZhemJucmZzdmFrdmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0NTYyMywiZXhwIjoyMDkzNTIxNjIzfQ.l0naZsiK-AL6r7kB1EZL9W4mW5GfdQ0aCMy6BOp7bNg"
FEED_SIZE    = 20   # top N listings stored per user in personalized_feed

# ── scoring ───────────────────────────────────────────────────────────────────
AGE_GROUP_OK = {
    "All Ages":      (0,  999),
    "Teens (13-17)": (13, 17),
    "18+ Only":      (18, 999),
    "Open":          (0,  999),
}

def score(listing, user):
    user_age         = user.get("age") or 0
    min_age, max_age = AGE_GROUP_OK.get(listing["age_group"], (0, 999))

    # Hard exclude — 18+ listings never show to users under 18
    if user_age < 18 and listing["age_group"] == "18+ Only":
        return -1

    points = 0
    preferred_cause = (user.get("preferred_cause") or "").strip()
    if preferred_cause and listing["cause"] == preferred_cause:
        points += 40
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
        if s >= 0:  # skip hard-excluded listings
            all_scores.append({"user_id": user["id"], "listing_id": listing["id"], "score": s})
            scored.append((s, listing["id"]))
    scored.sort(reverse=True)
    for rank, (s, listing_id) in enumerate(scored[:FEED_SIZE]):
        feed_rows.append({"user_id": user["id"], "listing_id": listing_id, "score": s, "rank": rank + 1})
    print(f"  User {user['id'][:8]}... — {len(scored)} eligible listings, top score: {scored[0][0] if scored else 0}")

for i in range(0, len(all_scores), 100):
    db.table("match_scores").upsert(all_scores[i:i+100]).execute()
print(f"Wrote {len(all_scores)} match score rows")

db.table("personalized_feed").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
for i in range(0, len(feed_rows), 100):
    db.table("personalized_feed").insert(feed_rows[i:i+100]).execute()
print(f"Wrote {len(feed_rows)} feed rows. Done.")
