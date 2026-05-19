import supabase_client as db

AGE_GROUP_MAP = {"all": "All Ages", "teens": "Teens (13-17)", "open": "Open"}


def run():
    listings = db.select("org_listings")
    if not listings:
        print("No org listings found. Skipping.")
        return

    org_users    = db.select("users", {"select": "id,name", "role": "eq.org"})
    org_name_map = {u["id"]: u["name"] for u in org_users}

    records = []
    for item in listings:
        org_id   = item.get("org_id")
        location = "Remote / Online" if item.get("remote") else (item.get("location") or "In-Person")
        records.append({
            "id":           f"org_{item['id']}",
            "title":        item.get("title", ""),
            "org":          org_name_map.get(org_id, item.get("org", "")),
            "org_id":       org_id,
            "cause":        item.get("cause", "Education"),
            "age_group":    AGE_GROUP_MAP.get(item.get("age_group", "open"), "Open"),
            "location":     location,
            "remote":       bool(item.get("remote")),
            "description":  item.get("description", ""),
            "hours":        str(item.get("hours") or ""),
            "date":         str(item.get("date") or ""),
            "external_url": item.get("external_url") or "",
            "source":       "org",
        })

    db.delete_where("clean_listings", "source", "org")
    db.insert("clean_listings", records)
    print(f"clean_listings (org): {len(records)} listings written.")
