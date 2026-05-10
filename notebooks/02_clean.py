# Notebook 2 — Clean
# Reads the latest raw file from Data Lake, removes non-US listings,
# detects age group + cause, and writes clean records to:
#   - Azure Data Lake processed/ container (as JSON)
#   - Supabase clean_listings table
#
# Credentials set in Databricks cluster Spark config (Advanced → Spark):
#   spark.hadoop.AZURE_STORAGE_KEY
#   spark.hadoop.SUPABASE_URL
#   spark.hadoop.SUPABASE_KEY

%pip install azure-storage-blob supabase

import json
import re
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient
from supabase import create_client

# ── credentials (from Spark config) ──────────────────────────────────────────
STORAGE_KEY       = sc._jsc.hadoopConfiguration().get("AZURE_STORAGE_KEY")
CONNECTION_STRING = (
    "DefaultEndpointsProtocol=https;"
    "AccountName=givehourdata;"
    f"AccountKey={STORAGE_KEY};"
    "EndpointSuffix=core.windows.net"
)
CONTAINER_RAW       = "raw"
CONTAINER_PROCESSED = "processed"
SUPABASE_URL        = sc._jsc.hadoopConfiguration().get("SUPABASE_URL")
SUPABASE_KEY        = sc._jsc.hadoopConfiguration().get("SUPABASE_KEY")

# ── US filter ─────────────────────────────────────────────────────────────────
CA_PROVINCES = {
    "Alberta","British Columbia","Manitoba","New Brunswick",
    "Newfoundland and Labrador","Northwest Territories","Nova Scotia",
    "Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon",
    "BC","AB","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"
}

def is_us(item):
    if item.get("remote_or_online"):
        return True
    regions   = item.get("audience", {}).get("regions", [])
    countries = item.get("audience", {}).get("countries", [])
    if countries and all(not re.search(r"united states|usa", c, re.I) for c in countries):
        return False
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
    if re.search(r"animal|wildlife|pet|spca|humane", text):                return "Animals"
    if re.search(r"food|hunger|meal|nutrition|pantry|harvest|farm", text):  return "Food Security"
    if re.search(r"hous|shelter|homeless|habitat", text):                   return "Housing"
    if re.search(r"senior|elder|aged|retirement", text):                    return "Seniors"
    if re.search(r"environ|nature|trail|plant|garden|ecology|conserv|climate", text): return "Environment"
    if re.search(r"health|medical|cancer|mental|hospital|clinic|nurse", text): return "Health"
    if re.search(r"art|music|theatre|theater|craft|creative|writing|design", text): return "Arts"
    return "Education"

# ── location ──────────────────────────────────────────────────────────────────
def derive_location(item):
    if item.get("remote_or_online"):
        return "Remote / Online"
    regions = item.get("audience", {}).get("regions", [])
    return regions[0] if regions else "In-Person"

# ── map one raw item → clean record ──────────────────────────────────────────
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

# ── get latest raw file ───────────────────────────────────────────────────────
def get_latest_raw():
    client    = BlobServiceClient.from_connection_string(CONNECTION_STRING)
    container = client.get_container_client(CONTAINER_RAW)
    blobs     = sorted(container.list_blobs(name_starts_with="volunteerconnector/"), key=lambda b: b.name, reverse=True)
    if not blobs:
        raise Exception("No raw files found — run 01_ingest first")
    latest = blobs[0].name
    print(f"Reading: raw/{latest}")
    blob = client.get_blob_client(container=CONTAINER_RAW, blob=latest)
    return json.loads(blob.download_blob().readall())

# ── save processed file ───────────────────────────────────────────────────────
def save_processed(records):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    blob_name = f"listings/{timestamp}.json"
    client    = BlobServiceClient.from_connection_string(CONNECTION_STRING)
    blob      = client.get_blob_client(container=CONTAINER_PROCESSED, blob=blob_name)
    blob.upload_blob(json.dumps(records, indent=2), overwrite=True)
    print(f"Saved {len(records)} clean records → processed/{blob_name}")

# ── write to Supabase ─────────────────────────────────────────────────────────
def write_to_supabase(records):
    db = create_client(SUPABASE_URL, SUPABASE_KEY)
    for i in range(0, len(records), 100):
        batch = records[i:i+100]
        db.table("clean_listings").upsert(batch).execute()
        print(f"  Upserted rows {i}–{i+len(batch)}")
    print(f"Supabase updated — {len(records)} total records")

# ── run ───────────────────────────────────────────────────────────────────────
print("Starting clean...")
raw     = get_latest_raw()
us_only = [item for item in raw if is_us(item)]
print(f"US listings: {len(us_only)} / {len(raw)} total")
records = [clean_item(item) for item in us_only]
save_processed(records)
write_to_supabase(records)
print("Done.")
