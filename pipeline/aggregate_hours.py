import os
from collections import defaultdict
from supabase import create_client


def run():
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    rows = supabase.table("hours_log").select("*, opportunities(cause)").execute().data

    if not rows:
        print("No hours logged yet. Skipping.")
        return

    # Sum hours by (user_id, cause)
    totals = defaultdict(float)
    for row in rows:
        opp = row.get("opportunities") or {}
        cause = opp.get("cause") if isinstance(opp, dict) else "Unknown"
        cause = cause or "Unknown"
        key = (row["user_id"], cause)
        totals[key] += float(row.get("hours") or 0)

    records = [
        {"user_id": uid, "cause": cause, "total_hours": total}
        for (uid, cause), total in totals.items()
    ]

    supabase.table("impact_stats").delete().neq("user_id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("impact_stats").insert(records).execute()

    print(f"impact_stats: {len(records)} rows written.")
