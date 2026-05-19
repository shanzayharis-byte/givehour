import os
import re
from supabase import create_client


def score_listing_for_user(listing, user):
    score = 0

    # Cause match — 60 points
    user_interests = user.get("interests") or []
    if listing.get("cause") in user_interests:
        score += 60

    # Location match — 25 points
    listing_location = str(listing.get("location", "")).lower()
    if "remote" in listing_location:
        score += 25
    elif user.get("zip") and listing_location:
        user_zip = str(user.get("zip", ""))[:3]
        zip_match = re.search(r'\b(\d{5})\b', listing_location)
        if zip_match and zip_match.group(1)[:3] == user_zip:
            score += 25
        else:
            score += 10  # partial credit for same general Bay Area

    # Grade match — 15 points
    score += 15

    return min(score, 100)


def run():
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    listings = supabase.table("clean_listings").select("*").execute().data
    users = supabase.table("users").select("*").eq("role", "teen").execute().data

    if not listings or not users:
        print("No listings or users found. Skipping.")
        return

    scores = []
    for user in users:
        for listing in listings:
            scores.append({
                "user_id": user["id"],
                "opportunity_id": listing["id"],
                "score": score_listing_for_user(listing, user)
            })

    supabase.table("match_scores").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("match_scores").insert(scores).execute()

    print(f"match_scores: {len(scores)} scores written ({len(users)} users x {len(listings)} listings).")
