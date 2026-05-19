import re
import supabase_client as db


def score_listing_for_user(listing, user):
    score = 0

    user_interests = user.get("interests") or []
    if listing.get("cause") in user_interests:
        score += 60

    listing_location = str(listing.get("location", "")).lower()
    if "remote" in listing_location:
        score += 25
    elif user.get("zip") and listing_location:
        user_zip = str(user.get("zip", ""))[:3]
        zip_match = re.search(r'\b(\d{5})\b', listing_location)
        if zip_match and zip_match.group(1)[:3] == user_zip:
            score += 25
        else:
            score += 10

    score += 15

    return min(score, 100)


def run():
    listings = db.select("clean_listings")
    users = db.select("users", {"role": "eq.teen"})

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

    db.delete_all("match_scores")
    db.insert("match_scores", scores)

    print(f"match_scores: {len(scores)} scores written ({len(users)} users x {len(listings)} listings).")
