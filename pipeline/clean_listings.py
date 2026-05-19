import os
import re
from supabase import create_client

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
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    response = supabase.table("opportunities").select("*").execute()
    rows = response.data

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

    # Standardize cause names and fill missing fields
    records = []
    for row in deduped:
        cause_raw = (row.get("cause") or "").lower()
        row["cause"] = CAUSE_MAP.get(cause_raw, row.get("cause"))
        row["description"] = row.get("description") or "No description provided."
        row["location"] = row.get("location") or "Bay Area, CA"
        row["hours"] = row.get("hours") or "TBD"
        row["date"] = row.get("date") or "Ongoing"
        records.append(row)

    supabase.table("clean_listings").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("clean_listings").insert(records).execute()

    print(f"clean_listings: {len(records)} listings written.")
