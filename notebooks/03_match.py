# Notebook 3 — Match
# Reads clean listings + user profiles from Supabase, scores each listing
# for each user, and writes results to match_scores + personalized_feed.
#
# Scoring (max 100 points):
#   +40  cause matches user's preferred cause
#   +30  age group allows this user
#   +20  remote listing
#   +10  listing is in the user's region
#
# Credentials set in Databricks cluster Spark config (Advanced → Spark):
#   spark.hadoop.SUPABASE_URL
#   spark.hadoop.SUPABASE_KEY

%pip install supabase

from supabase import create_client

SUPABASE_URL = sc._jsc.hadoopConfiguration().get("SUPABASE_URL")
SUPABASE_KEY = sc._jsc.hadoopConfiguration().get("SUPABASE_KEY")
FEED_SIZE    = 20

# ── scoring ───────────────────────────────────────────────────────────────────
AGE_GROUP_OK = {
    "All Ages":      (0,   999),
    "Teens (13-17)": (13,  17),
    "18+ Only":      (18,  999),
    "Open":          (0,   999),
}

def score(listing, user):
    points = 0
    preferred_cause      = (user.get("preferred_cause") or "").strip()
    if preferred_cause and listing["cause"] == preferred_cause:
        points += 40
    user_age             = user.get("age") or 0
    min_age, max_age     = AGE_GROUP_OK.get(listing["age_group"], (0, 999))
    if min_age <= user_age <= max_age:
        points += 30
    if listing["remote"]:
        points += 20
    user_region = (user.get("region") or "").strip().lower()
    if user_region and user_region in listing["location"].lower():
        points += 10
    return points

# ── load + write ──────────────────────────────────────────────────────────────
def load_data(db):
    listings = db.table("clean_listings").select("*").execute().data
    users    = db.table("users").select("id, age, preferred_cause, region").execute().data
    print(f"Loaded {len(listings)} listings and {len(users)} users")
    return listings, users

def write_scores(db, scores):
    for i in range(0, len(scores), 100):
        db.table("match_scores").upsert(scores[i:i+100]).execute()
    print(f"Wrote {len(scores)} match score rows")

def write_feed(db, feed_rows):
    db.table("personalized_feed").delete().neq("id", 0).execute()
    for i in range(0, len(feed_rows), 100):
        db.table("personalized_feed").insert(feed_rows[i:i+100]).execute()
    print(f"Wrote {len(feed_rows)} feed rows")

# ── run ───────────────────────────────────────────────────────────────────────
print("Starting matching...")
db = create_client(SUPABASE_URL, SUPABASE_KEY)
listings, users = load_data(db)

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

write_scores(db, all_scores)
write_feed(db, feed_rows)
print("Done.")
