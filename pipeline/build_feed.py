from collections import defaultdict
import supabase_client as db


def run():
    rows = db.select("match_scores")

    if not rows:
        print("No match scores found. Skipping.")
        return

    by_user = defaultdict(list)
    for row in rows:
        by_user[row["user_id"]].append(row)

    records = []
    for user_id, scores in by_user.items():
        top10 = sorted(scores, key=lambda x: x["score"], reverse=True)[:10]
        for rank, entry in enumerate(top10, start=1):
            records.append({
                "user_id": user_id,
                "opportunity_id": entry["opportunity_id"],
                "rank": rank,
                "score": entry["score"]
            })

    db.delete_all("personalized_feed")
    db.insert("personalized_feed", records)

    print(f"personalized_feed: {len(records)} rows written ({len(by_user)} users).")
