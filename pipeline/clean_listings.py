import supabase_client as db

CAUSE_MAP = {
    "housing": "Housing",
    "food": "Food Security",
    "food security": "Food Security",
    "education": "Education",
    "environment": "Environment",
    "animals": "Animals",
    "health": "Health",
    "arts": "Arts",
    "seniors": "Seniors",
}


def run():
    rows = db.select("opportunities")

    if not rows:
        print("No opportunities found. Skipping.")
        return

    # Remove duplicates by org + title
    seen = set()
    deduped = []
    for row in rows:
        key = (row.get("org"), row.get("title"))
        if key not in seen:
            seen.add(key)
            deduped.append(row)

    records = []
    for row in deduped:
        cause_raw = (row.get("cause") or "").lower()
        row["cause"] = CAUSE_MAP.get(cause_raw, row.get("cause"))
        row["description"] = row.get("description") or "No description provided."
        row["location"] = row.get("location") or "Bay Area, CA"
        row["hours"] = row.get("hours") or "TBD"
        row["date"] = row.get("date") or "Ongoing"
        records.append(row)

    db.delete_all("clean_listings")
    db.insert("clean_listings", records)

    print(f"clean_listings: {len(records)} listings written.")
