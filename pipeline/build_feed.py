import os
import pandas as pd
from supabase import create_client


def run():
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    scores_resp = supabase.table("match_scores").select("*").execute()
    df = pd.DataFrame(scores_resp.data)

    if df.empty:
        print("No match scores found. Skipping.")
        return

    df_sorted = df.sort_values("score", ascending=False)
    top5 = df_sorted.groupby("user_id").head(5).reset_index(drop=True)

    top5["rank"] = top5.groupby("user_id").cumcount() + 1

    supabase.table("personalized_feed").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
    records = top5[["user_id", "opportunity_id", "rank", "score"]].to_dict(orient="records")
    supabase.table("personalized_feed").insert(records).execute()

    print(f"personalized_feed: {len(records)} rows written ({top5['user_id'].nunique()} users).")
