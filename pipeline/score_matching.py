import re
import supabase_client as db


_CA_PATTERN = re.compile(
    r'\bca\b|california|bay area|san francisco|oakland|'
    r'san jose|berkeley|san mateo|santa clara|'
    r'fremont|hayward|richmond|vallejo|concord|'
    r'sunnyvale|mountain view|palo alto|redwood|'
    r'milpitas|pleasanton|livermore|walnut creek'
)


def is_remote(listing):
    loc = str(listing.get("location", "")).lower()
    return bool(listing.get("remote")) or "remote" in loc or "online" in loc


def is_local(listing):
    """Return True if listing is remote/online or plausibly in CA / Bay Area."""
    if is_remote(listing):
        return True
    loc = str(listing.get("location", "")).lower()
    return bool(_CA_PATTERN.search(loc))


def score_listing_for_user(listing, user):
    score = 0

    user_interests = user.get("interests") or []
    if listing.get("cause") in user_interests:
        score += 60

    listing_location = str(listing.get("location", "")).lower()
    if is_remote(listing):
        score += 10
    else:
        user_zip = str(user.get("zip") or "")[:3]
        zip_match = re.search(r'\b(\d{5})\b', listing_location)
        if user_zip and zip_match and zip_match.group(1)[:3] == user_zip:
            score += 25
        elif _CA_PATTERN.search(listing_location):
            score += 20

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
            if not is_local(listing):
                continue
            scores.append({
                "user_id": user["id"],
                "opportunity_id": listing["id"],
                "score": score_listing_for_user(listing, user)
            })

    db.delete_all("match_scores")
    db.insert("match_scores", scores)

    print(f"match_scores: {len(scores)} scores written ({len(users)} users x {len(listings)} listings).")
