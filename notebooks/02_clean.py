# Notebook 2 — Clean
# Reads the latest raw JSON from Azure Data Lake, filters to US-only listings,
# detects age group and cause category, and writes clean records to:
#   - Azure Data Lake processed/ container (as JSON)
#   - Supabase clean_listings table
#
# Setup: set the following environment variables in your Databricks cluster
# (Compute → your cluster → Edit → Advanced → Environment variables):
#
#   AZURE_STORAGE_KEY   — Access key for the givehourdata storage account
#   SUPABASE_URL        — https://your-project.supabase.co
#   SUPABASE_KEY        — service_role key from Supabase → Settings → API

%pip install azure-storage-blob supabase

import os
import json
import re
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient
from supabase import create_client

# ── credentials ───────────────────────────────────────────────────────────────
STORAGE_KEY       = os.environ["AZURE_STORAGE_KEY"]
SUPABASE_URL      = os.environ["SUPABASE_URL"]
SUPABASE_KEY      = os.environ["SUPABASE_KEY"]
CONNECTION_STRING = (
    f"DefaultEndpointsProtocol=https;"
    f"AccountName=givehourdata;"
    f"AccountKey={STORAGE_KEY};"
    f"EndpointSuffix=core.windows.net"
)
CONTAINER_RAW       = "raw"
CONTAINER_PROCESSED = "processed"

# ── US filter ─────────────────────────────────────────────────────────────────
CA_PROVINCES = {
    "Alberta","British Columbia","Manitoba","New Brunswick",
    "Newfoundland and Labrador","Northwest Territories","Nova Scotia",
    "Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon",
    "BC","AB","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"
}

def is_us(item):
    countries = item.get("audience", {}).get("countries", [])
    # Explicitly non-US country → reject even if remote
    if countries and all(not re.search(r"united states|usa", c, re.I) for c in countries):
        return False
    if item.get("remote_or_online"):
        return True
    regions = item.get("audience", {}).get("regions", [])
    if any(r in CA_PROVINCES for r in regions):
        return False
    return True

# ── age group detection ───────────────────────────────────────────────────────
def derive_age_group(description="", title="", extra=""):
    text = (description + " " + title + " " + extra).lower()
    if re.search(r"must be 18|18\s*\+|18 years or older|18 and over|adults only|at least 18|18 years of age|over 18", text):
        return "18+ Only"
    if re.search(r"must be 1[4-6]|1[4-6]\s*\+|minimum.*1[4-6]|at least 1[4-6]|1[4-6] years or older|over 1[4-6]", text):
        return "Teens (13-17)"
    if re.search(r"\bteen\b|teenager|high school|high-school|middle school|secondary school|ages?\s+1[3-7]|youth.*1[3-7]|student volunteer|youth volunteer|for youth|youth program|for students", text):
        return "Teens (13-17)"
    if re.search(r"all ages|family.{0,20}friendly|open to all|any age|everyone welcome|all welcome|no minimum age|no age requirement|open to everyone|open to anyone|all are welcome|volunteers of all|community members|anyone can volunteer|no experience required", text):
        return "All Ages"
    return "Open"

# ── cause detection ───────────────────────────────────────────────────────────
def derive_cause(activities):
    names = " ".join(a.get("name", "").lower() for a in activities)
    cats  = " ".join(a.get("category", "").lower() for a in activities)
    text  = names + " " + cats
    if re.search(r"animal|wildlife|pet|spca|humane|rescue|shelter.*animal|dog|cat|bird|zoo|aquarium", text):                                             return "Animals"
    if re.search(r"food|hunger|meal|nutrition|pantry|harvest|farm|feeding|grocery|kitchen|lunch|dinner|breakfast|food bank|soup", text):                  return "Food Security"
    if re.search(r"hous|shelter|homeless|habitat|affordable housing|transitional|domestic violence|refugee.*hous", text):                                  return "Housing"
    if re.search(r"senior|elder|aged|retirement|nursing home|assisted living|older adult|grandparent|aging", text):                                        return "Seniors"
    if re.search(r"environ|nature|trail|plant|garden|ecology|conserv|climate|recycl|clean up|cleanup|ocean|beach|park|forest|tree|green|sustainab|carbon|pollution", text): return "Environment"
    if re.search(r"health|medical|cancer|mental|hospital|clinic|nurse|wellness|covid|vaccine|disability|blood|hospice|vision|hearing|therapy|rehab", text): return "Health"
    if re.search(r"art|music|theatre|theater|craft|creative|writing|design|dance|film|photo|gallery|mural|perform|drama|choir|band|culture|heritage|museum", text): return "Arts"
    if re.search(r"teach|tutor|coach|mentor|literacy|school|education|youth|kid|child|student|learn|read|math|stem|college|library|homework|afterschool|curriculum", text): return "Education"
    return "Education"

def derive_location(item):
    if item.get("remote_or_online"):
        return "Remote / Online"
    regions = item.get("audience", {}).get("regions", [])
    return regions[0] if regions else "In-Person"

def clean_item(item):
    activities = item.get("activities", [])
    extra      = " ".join(a.get("name", "") for a in activities)
    return {
        "id":           str(item["id"]),
        "title":        item.get("title", ""),
        "org":          (item.get("organization") or {}).get("name", ""),
        "cause":        derive_cause(activities),
        "age_group":    derive_age_group(item.get("description", ""), item.get("title", ""), extra),
        "location":     derive_location(item),
        "remote":       bool(item.get("remote_or_online")),
        "description":  item.get("description", ""),
        "hours":        item.get("duration", ""),
        "date":         item.get("dates", ""),
        "external_url": item.get("url", ""),
        "fetched_at":   datetime.now(timezone.utc).isoformat(),
    }

# ── load latest raw file ──────────────────────────────────────────────────────
client    = BlobServiceClient.from_connection_string(CONNECTION_STRING)
container = client.get_container_client(CONTAINER_RAW)
blobs     = sorted(container.list_blobs(name_starts_with="volunteerconnector/"), key=lambda b: b.name, reverse=True)
if not blobs:
    raise Exception("No raw files found — run notebook 01_ingest first")

latest = blobs[0].name
print(f"Reading: raw/{latest}")
blob    = client.get_blob_client(container=CONTAINER_RAW, blob=latest)
raw     = json.loads(blob.download_blob().readall())

# ── clean and filter ──────────────────────────────────────────────────────────
us_only = [item for item in raw if is_us(item)]
print(f"US listings: {len(us_only)} / {len(raw)} total")
records = [clean_item(item) for item in us_only]

# ── save to Data Lake processed/ ─────────────────────────────────────────────
timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
blob_name = f"listings/{timestamp}.json"
blob      = client.get_blob_client(container=CONTAINER_PROCESSED, blob=blob_name)
blob.upload_blob(json.dumps(records, indent=2), overwrite=True)
print(f"Saved {len(records)} clean records → processed/{blob_name}")

# ── replace VolunteerConnector listings in Supabase ──────────────────────────
# Delete then re-insert so stale/Canadian entries don't linger
db = create_client(SUPABASE_URL, SUPABASE_KEY)
db.table("clean_listings").delete().neq("source", "org").execute()
for i in range(0, len(records), 100):
    db.table("clean_listings").upsert(records[i:i+100]).execute()
print(f"Supabase updated — {len(records)} VolunteerConnector records in clean_listings")

# ── process org listings ──────────────────────────────────────────────────────
AGE_GROUP_MAP = {
    "all":   "All Ages",
    "teens": "Teens (13-17)",
    "open":  "Open",
}

org_blobs = sorted(
    container.list_blobs(name_starts_with="org_listings/"),
    key=lambda b: b.name, reverse=True
)

if not org_blobs:
    print("No org_listings raw file found — skipping org listings")
else:
    print(f"Reading: raw/{org_blobs[0].name}")
    raw_orgs = json.loads(
        client.get_blob_client(container=CONTAINER_RAW, blob=org_blobs[0].name)
              .download_blob().readall()
    )

    # batch-fetch org names from Supabase users table
    org_ids      = list({r["org_id"] for r in raw_orgs if r.get("org_id")})
    org_users    = db.table("users").select("id, name").in_("id", org_ids).execute().data
    org_name_map = {u["id"]: u["name"] for u in org_users}

    org_records = []
    for item in raw_orgs:
        org_records.append({
            "id":           f"org_{item['id']}",
            "title":        item.get("title", ""),
            "org":          org_name_map.get(item.get("org_id", ""), ""),
            "org_id":       item.get("org_id"),
            "cause":        item.get("cause", "Education"),
            "age_group":    AGE_GROUP_MAP.get(item.get("age_group", "open"), "Open"),
            "location":     "Remote / Online" if item.get("remote") else (item.get("location") or "In-Person"),
            "remote":       bool(item.get("remote")),
            "description":  item.get("description", ""),
            "hours":        str(item.get("hours", "")),
            "date":         str(item.get("date", "")),
            "external_url": item.get("external_url", "") or "",
            "source":       "org",
            "fetched_at":   datetime.now(timezone.utc).isoformat(),
        })

    for i in range(0, len(org_records), 100):
        db.table("clean_listings").upsert(org_records[i:i+100]).execute()
    print(f"Supabase updated — {len(org_records)} org listing records in clean_listings")
