import os
from collections import defaultdict
from supabase import create_client


def run():
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    rows = supabase.table("match_scores").select("*").execute().data

    if not rows:
        print("No match scores found. Skipping.")
        return

    # Group by user_id, sort each group by score descending, take top 5
    by_user = defaultdict(list)
    for row in rows:
        by_user[row["user_id"]].append(row)

    records = []
    for user_id, scores in by_user.items():
        top5 = sorted(scores, key=lambda x: x["score"], reverse=True)[:5]
        for rank, entry in enumerate(top5, start=1):
            records.append({
                "user_id": user_id,
                "opportunity_id": entry["opportunity_id"],
                "rank": rank,
                "score": entry["score"]
            })

    supabase.table("personalized_feed").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("personalized_feed").insert(records).execute()

    print(f"personalized_feed: {len(records)} rows written ({len(by_user)} users).")
