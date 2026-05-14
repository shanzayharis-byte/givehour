%pip install typing_extensions==4.12.2 supabase azure-storage-blob

import json, re
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient
from supabase import create_client

STORAGE_KEY         = "5p2D8t7KI16dBS8JEsfSeoaPiQDGYXH7/bGE8kOHiWgk4mRBg3UuhvAkR1l1pCc71sbanuIGmatS+AStGrb+RA=="
CONNECTION_STRING   = f"DefaultEndpointsProtocol=https;AccountName=givehourdata;AccountKey={STORAGE_KEY};EndpointSuffix=core.windows.net"
CONTAINER_RAW       = "raw"
CONTAINER_PROCESSED = "processed"
SUPABASE_URL        = "https://cmiwwlfazbnrfsvakvhh.supabase.co"
SUPABASE_KEY        = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaXd3bGZhemJucmZzdmFrdmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0NTYyMywiZXhwIjoyMDkzNTIxNjIzfQ.l0naZsiK-AL6r7kB1EZL9W4mW5GfdQ0aCMy6BOp7bNg"

CA_PROVINCE_ABBREVS = {"AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"}
CA_PROVINCE_NAMES   = {"Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"}
CA_PROVINCES        = CA_PROVINCE_NAMES | CA_PROVINCE_ABBREVS
CA_CITIES_FOR_NAME  = {"Calgary","Edmonton","Montreal","Winnipeg","Halifax","Regina","Saskatoon","Whitehorse","Yellowknife","Mississauga","Brampton","Burnaby","Surrey","Richmond","Kelowna","Abbotsford","Moncton","Fredericton","Charlottetown","Lethbridge","Red Deer","Kamloops","Nanaimo","Kitchener","Waterloo","Guelph","Barrie","Sudbury","Thunder Bay","Sault Ste. Marie"}

def is_canadian_region(region):
    if region in CA_PROVINCES: return True
    parts = [p.strip() for p in region.split(",")]
    if len(parts) >= 2 and parts[-1] in CA_PROVINCE_ABBREVS: return True
    for prov in CA_PROVINCE_NAMES:
        if re.search(r'\b' + re.escape(prov) + r'\b', region, re.I): return True
    return False

def has_canadian_org_name(item):
    org_name = (item.get("organization") or {}).get("name", "")
    for place in CA_PROVINCE_NAMES | CA_CITIES_FOR_NAME:
        if re.search(r'\b' + re.escape(place) + r'\b', org_name, re.I): return True
    return False

def is_us(item):
    if item.get("remote_or_online"): return True
    countries = item.get("audience", {}).get("countries", [])
    if countries and all(not re.search(r"united states|usa", c, re.I) for c in countries): return False
    regions = item.get("audience", {}).get("regions", [])
    if any(is_canadian_region(r) for r in regions): return False
    if has_canadian_org_name(item): return False
    return True

def derive_age_group(description="", title="", extra=""):
    # Professional/leadership roles are not appropriate for teens
    t = title.lower()
    if re.search(
        r"\b(vice president|vp[:,]|board of director|board member|"
        r"executive director|chief\s+\w+\s+officer|\bceo\b|\bcfo\b|\bcto\b|\bcoo\b|"
        r"\bpresident\b|director of|department head|general manager|"
        r"senior manager|program manager|grants manager|development manager|"
        r"committee chair|advisory board|trustee|treasurer|secretary of)\b", t
    ):
        return "18+ Only"
    text = (description + " " + title + " " + extra).lower()
    if re.search(r"must be 18|18\s*\+|18 years or older|adults only|at least 18|over 18", text): return "18+ Only"
    if re.search(r"must be 1[4-6]|1[4-6]\s*\+|minimum.*1[4-6]|at least 1[4-6]|over 1[4-6]", text): return "Teens (13-17)"
    if re.search(r"\bteen\b|teenager|high school|middle school|ages?\s+1[3-7]|youth.*1[3-7]|student volunteer|for youth|for students", text): return "Teens (13-17)"
    if re.search(r"all ages|family.{0,20}friendly|open to all|any age|everyone welcome|no minimum age|open to everyone|anyone can volunteer|no experience required", text): return "All Ages"
    return "Open"

def derive_cause(activities):
    text = " ".join(a.get("name","").lower() for a in activities) + " " + " ".join(a.get("category","").lower() for a in activities)
    if re.search(r"animal|wildlife|pet|spca|humane|rescue|dog|cat|bird|zoo", text): return "Animals"
    if re.search(r"food|hunger|meal|nutrition|pantry|harvest|farm|food bank|soup", text): return "Food Security"
    if re.search(r"hous|shelter|homeless|habitat", text): return "Housing"
    if re.search(r"senior|elder|aged|retirement|nursing home|older adult", text): return "Seniors"
    if re.search(r"environ|nature|trail|plant|garden|ecology|conserv|climate|recycl|park|tree", text): return "Environment"
    if re.search(r"health|medical|cancer|mental|hospital|clinic|nurse|wellness|disability", text): return "Health"
    if re.search(r"art|music|theatre|theater|craft|creative|writing|design|dance|film|museum", text): return "Arts"
    return "Education"

def derive_cause_text(text):
    text = text.lower()
    if re.search(r"animal|wildlife|pet|spca|humane|rescue|dog|cat|bird|zoo", text): return "Animals"
    if re.search(r"food|hunger|meal|nutrition|pantry|harvest|farm|food bank|soup", text): return "Food Security"
    if re.search(r"hous|shelter|homeless|habitat|affordable housing|transitional", text): return "Housing"
    if re.search(r"senior|elder|aged|retirement|nursing home|older adult|aging", text): return "Seniors"
    if re.search(r"environ|nature|trail|plant|garden|ecology|conserv|climate|recycl|park|tree", text): return "Environment"
    if re.search(r"health|medical|cancer|mental|hospital|clinic|nurse|wellness|disability", text): return "Health"
    if re.search(r"art|music|theatre|theater|craft|creative|writing|design|dance|film|museum", text): return "Arts"
    return "Education"

def derive_location(item):
    if item.get("remote_or_online"): return "Remote / Online"
    regions = item.get("audience", {}).get("regions", [])
    return regions[0] if regions else "In-Person"

def clean_item(item):
    activities = item.get("activities", [])
    extra = " ".join(a.get("name","") for a in activities)
    return {
        "id": str(item["id"]), "title": item.get("title",""),
        "org": (item.get("organization") or {}).get("name",""),
        "cause": derive_cause(activities),
        "age_group": derive_age_group(item.get("description",""), item.get("title",""), extra),
        "location": derive_location(item), "remote": bool(item.get("remote_or_online")),
        "description": item.get("description",""), "hours": item.get("duration",""),
        "date": item.get("dates",""), "external_url": item.get("url",""),
        "source": "volunteerconnector",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }

def clean_idealist_item(item):
    org       = item.get("org") or item.get("organization") or {}
    addr      = item.get("address") or {}
    is_remote = bool(item.get("remoteOk") or item.get("remote") or item.get("isRemote"))
    if is_remote:
        location = "Remote / Online"
    else:
        city  = addr.get("city", "")
        state = addr.get("state", "")
        parts = [p for p in [city, state] if p]
        location = ", ".join(parts) if parts else "In-Person"
    url_field    = item.get("url") or {}
    external_url = (url_field.get("en") or next(iter(url_field.values()), "")) if isinstance(url_field, dict) else str(url_field)
    title        = item.get("name") or item.get("title") or ""
    description  = item.get("description") or ""
    age_req = item.get("ageRequirement") or 0
    if age_req >= 18:
        age_group = "18+ Only"
    elif item.get("welcomeTeens"):
        age_group = "Teens (13-17)"
    else:
        age_group = derive_age_group(description, title, "")
    areas = [a.lower() for a in (item.get("areasOfFocus") or [])]
    if any("animal" in a or "wildlife" in a for a in areas):               cause = "Animals"
    elif any("food" in a or "hunger" in a for a in areas):                 cause = "Food Security"
    elif any("hous" in a or "shelter" in a for a in areas):                cause = "Housing"
    elif any("senior" in a or "elder" in a for a in areas):                cause = "Seniors"
    elif any("environ" in a or "climate" in a for a in areas):             cause = "Environment"
    elif any("health" in a or "medical" in a for a in areas):              cause = "Health"
    elif any("art" in a or "music" in a or "culture" in a for a in areas): cause = "Arts"
    else:                                                                    cause = derive_cause_text(title + " " + description)
    return {
        "id":           f"idealist_{item['id']}",
        "title":        title,
        "org":          org.get("name") or org.get("organizationName") or "",
        "org_id":       None,
        "cause":        cause,
        "age_group":    age_group,
        "location":     location,
        "remote":       is_remote,
        "description":  description,
        "hours":        str(item.get("expectedTime") or item.get("commitmentDetails") or item.get("hours") or ""),
        "date":         str(item.get("startDate") or item.get("dates") or ""),
        "external_url": external_url,
        "source":       "idealist",
        "fetched_at":   datetime.now(timezone.utc).isoformat(),
    }

# ── VolunteerConnector ────────────────────────────────────────────────────────
client    = BlobServiceClient.from_connection_string(CONNECTION_STRING)
container = client.get_container_client(CONTAINER_RAW)
db        = create_client(SUPABASE_URL, SUPABASE_KEY)

blobs  = sorted(container.list_blobs(name_starts_with="volunteerconnector/"), key=lambda b: b.name, reverse=True)
latest = blobs[0].name
print(f"Reading: raw/{latest}")
raw     = json.loads(client.get_blob_client(container=CONTAINER_RAW, blob=latest).download_blob().readall())
us_only = [item for item in raw if is_us(item)]
print(f"Listings after filter: {len(us_only)} / {len(raw)} total")
records = [clean_item(item) for item in us_only]

timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
blob_name = f"listings/{timestamp}.json"
client.get_blob_client(container=CONTAINER_PROCESSED, blob=blob_name).upload_blob(json.dumps(records), overwrite=True)
print(f"Saved to processed/{blob_name}")

db.table("clean_listings").delete().gte("id", "").execute()
print("Wiped clean_listings")
for i in range(0, len(records), 100):
    db.table("clean_listings").upsert(records[i:i+100]).execute()
    print(f"  Inserted VolunteerConnector rows {i}–{i+len(records[i:i+100])}")
print(f"Done. {len(records)} VolunteerConnector records written.")

# ── Org listings ──────────────────────────────────────────────────────────────
AGE_GROUP_MAP = {"all": "All Ages", "teens": "Teens (13-17)", "open": "Open"}
org_blobs = sorted(container.list_blobs(name_starts_with="org_listings/"), key=lambda b: b.name, reverse=True)
if not org_blobs:
    print("No org_listings raw file found — skipping")
else:
    print(f"Reading: raw/{org_blobs[0].name}")
    raw_orgs     = json.loads(client.get_blob_client(container=CONTAINER_RAW, blob=org_blobs[0].name).download_blob().readall())
    org_ids      = list({r["org_id"] for r in raw_orgs if r.get("org_id")})
    org_users    = db.table("users").select("id, name").in_("id", org_ids).execute().data
    org_name_map = {u["id"]: u["name"] for u in org_users}
    org_records  = []
    for item in raw_orgs:
        org_records.append({
            "id": f"org_{item['id']}", "title": item.get("title",""),
            "org": org_name_map.get(item.get("org_id",""),""), "org_id": item.get("org_id"),
            "cause": item.get("cause","Education"),
            "age_group": AGE_GROUP_MAP.get(item.get("age_group","open"),"Open"),
            "location": "Remote / Online" if item.get("remote") else (item.get("location") or "In-Person"),
            "remote": bool(item.get("remote")), "description": item.get("description",""),
            "hours": str(item.get("hours","")), "date": str(item.get("date","")),
            "external_url": item.get("external_url","") or "", "source": "org",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        })
    db.table("clean_listings").delete().eq("source", "org").execute()
    for i in range(0, len(org_records), 100):
        db.table("clean_listings").upsert(org_records[i:i+100]).execute()
    print(f"Done. {len(org_records)} org listings written.")

# ── Idealist listings ─────────────────────────────────────────────────────────
idealist_blobs = sorted(container.list_blobs(name_starts_with="idealist/"), key=lambda b: b.name, reverse=True)
if not idealist_blobs:
    print("No idealist raw file found — skipping")
else:
    print(f"Reading: raw/{idealist_blobs[0].name}")
    raw_idealist = json.loads(client.get_blob_client(container=CONTAINER_RAW, blob=idealist_blobs[0].name).download_blob().readall())
    if not raw_idealist:
        print("Idealist raw file is empty — skipping")
    else:
        idealist_records = [clean_idealist_item(item) for item in raw_idealist]
        prof_filtered = sum(1 for r in idealist_records if r["age_group"] == "18+ Only")
        print(f"Idealist: {len(idealist_records)} total, {prof_filtered} tagged 18+ Only")
        db.table("clean_listings").delete().eq("source", "idealist").execute()
        for i in range(0, len(idealist_records), 100):
            db.table("clean_listings").upsert(idealist_records[i:i+100]).execute()
        print(f"Done. {len(idealist_records)} Idealist records written.")
