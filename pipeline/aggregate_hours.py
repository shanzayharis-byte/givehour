from collections import defaultdict
import supabase_client as db


def run():
    rows = db.select("hours_log", {"select": "*, opportunities(cause)"})

    if not rows:
        print("No hours logged yet. Skipping.")
        return

    totals = defaultdict(float)
    for row in rows:
        opp = row.get("opportunities") or {}
        cause = (opp.get("cause") if isinstance(opp, dict) else None) or "Unknown"
        totals[(row["user_id"], cause)] += float(row.get("hours") or 0)

    records = [
        {"user_id": uid, "cause": cause, "total_hours": total}
        for (uid, cause), total in totals.items()
    ]

    db.delete_all("impact_stats")
    db.insert("impact_stats", records)

    print(f"impact_stats: {len(records)} rows written.")
