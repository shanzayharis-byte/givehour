import os
import pandas as pd
from supabase import create_client


def run():
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    hours_resp = supabase.table("hours_log").select("*, opportunities(cause)").execute()
    df = pd.DataFrame(hours_resp.data)

    if df.empty:
        print("No hours logged yet. Skipping.")
        return

    df["cause"] = df["opportunities"].apply(
        lambda x: x.get("cause") if isinstance(x, dict) else "Unknown"
    )

    grouped = df.groupby(["user_id", "cause"])["hours"].sum().reset_index()
    grouped.rename(columns={"hours": "total_hours"}, inplace=True)

    supabase.table("impact_stats").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
    records = grouped.to_dict(orient="records")
    supabase.table("impact_stats").insert(records).execute()

    print(f"impact_stats: {len(records)} rows written.")
