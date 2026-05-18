import os
import pandas as pd
from supabase import create_client


def run():
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    response = supabase.table("opportunities").select("*").execute()
    df = pd.DataFrame(response.data)

    if df.empty:
        print("No opportunities found. Skipping.")
        return

    df = df.drop_duplicates(subset=["org", "title"])

    cause_map = {
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

    df["cause"] = df["cause"].str.lower().map(cause_map).fillna(df["cause"])

    df["description"] = df["description"].fillna("No description provided.")
    df["location"] = df["location"].fillna("Bay Area, CA")
    df["hours"] = df["hours"].fillna("TBD")
    df["date"] = df["date"].fillna("Ongoing")

    supabase.table("clean_listings").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    records = df.to_dict(orient="records")
    supabase.table("clean_listings").insert(records).execute()

    print(f"clean_listings: {len(records)} listings written.")
