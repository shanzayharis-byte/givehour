# Notebook 1 — Ingest
# Fetches volunteer listings from two sources:
#   1. VolunteerConnector API  → raw/volunteerconnector/{timestamp}.json
#   2. Supabase org_listings   → raw/org_listings/{timestamp}.json
#
# Setup: set the following environment variables in your Databricks cluster
# (Compute → your cluster → Edit → Advanced → Environment variables):
#
#   AZURE_STORAGE_KEY   — Access key for the givehourdata storage account
#   SUPABASE_URL        — https://your-project.supabase.co
#   SUPABASE_KEY        — service_role key from Supabase → Settings → API
#   (Idealist API key is hardcoded directly in the notebook below)

%pip install azure-storage-blob supabase

import os
import time
import requests
import json
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient
from supabase import create_client

# ── credentials ───────────────────────────────────────────────────────────────
STORAGE_ACCOUNT   = "givehourdata"
STORAGE_KEY       = os.environ["AZURE_STORAGE_KEY"]
SUPABASE_URL      = os.environ["SUPABASE_URL"]
SUPABASE_KEY      = os.environ["SUPABASE_KEY"]
CONTAINER_RAW     = "raw"
CONNECTION_STRING = (
    f"DefaultEndpointsProtocol=https;"
    f"AccountName={STORAGE_ACCOUNT};"
    f"AccountKey={STORAGE_KEY};"
    f"EndpointSuffix=core.windows.net"
)

# ── fetch all listings from VolunteerConnector ────────────────────────────────
BASE_URL = "https://www.volunteerconnector.org/api/search/"
params   = {"format": "json", "country": "United States", "page_size": 100}

all_results = []
url  = BASE_URL
page = 1

print("Fetching listings...")
while url:
    r = requests.get(url, params=params if page == 1 else None)
    r.raise_for_status()
    data = r.json()
    all_results.extend(data.get("results", []))
    url = data.get("next")
    print(f"  Page {page}: {len(data.get('results', []))} results (total: {len(all_results)})")
    page += 1

print(f"Fetched {len(all_results)} total listings")

# ── save to Azure Data Lake raw/ container ────────────────────────────────────
timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
blob_name = f"volunteerconnector/{timestamp}.json"

client = BlobServiceClient.from_connection_string(CONNECTION_STRING)
blob   = client.get_blob_client(container=CONTAINER_RAW, blob=blob_name)
blob.upload_blob(json.dumps(all_results, indent=2), overwrite=True)

print(f"Saved {len(all_results)} listings → raw/{blob_name}")

# ── fetch org listings from Supabase ──────────────────────────────────────────
print("Fetching org listings from Supabase...")
db          = create_client(SUPABASE_URL, SUPABASE_KEY)
org_listings = db.table("org_listings").select("*").execute().data
print(f"Fetched {len(org_listings)} org listings")

org_blob_name = f"org_listings/{timestamp}.json"
org_blob      = client.get_blob_client(container=CONTAINER_RAW, blob=org_blob_name)
org_blob.upload_blob(json.dumps(org_listings, indent=2), overwrite=True)
print(f"Saved {len(org_listings)} org listings → raw/{org_blob_name}")

# ── fetch Idealist volunteer opportunities ────────────────────────────────────
idealist_results = []

try:
    IDEALIST_KEY = "66355e8e431709c2444478cc2e1198b0"
    IDEALIST_URL = "https://api-sandbox.idealist.org/api/v1/listings/volops"
    PAGE_SIZE    = 100

    print("Fetching Idealist listings...")
    since = None
    while True:
        # Build URL manually so `since` colons aren't percent-encoded by requests
        url = IDEALIST_URL if not since else f"{IDEALIST_URL}?since={since}&page_size={PAGE_SIZE}"
        r = requests.get(
            url if since else IDEALIST_URL,
            params=({"page_size": PAGE_SIZE} if not since else None),
            auth=(IDEALIST_KEY, ""),
            headers={"Accept": "application/json"},
            timeout=30
        )
        # Sandbox key has a time-window limit — 400 at boundary means we have all available data
        if r.status_code == 400:
            print(f"  Reached sandbox window boundary — stopping with {len(idealist_results)} listings")
            break
        r.raise_for_status()
        page_data = r.json()

        items = page_data.get("volops", []) if isinstance(page_data, dict) else page_data
        if not items:
            print("  No items returned — done")
            break

        batch = items[1:] if since else items
        idealist_results.extend(batch)
        print(f"  Fetched {len(batch)} items (total: {len(idealist_results)})")

        has_more = page_data.get("hasMore", False) if isinstance(page_data, dict) else False
        if not has_more:
            break

        last_updated = items[-1].get("updated") or items[-1].get("updatedAt")
        if not last_updated:
            print(f"⚠️  Pagination stopped — 'updated' field missing")
            break
        since = last_updated
        time.sleep(0.25)

    idealist_blob_name = f"idealist/{timestamp}.json"
    idealist_blob = client.get_blob_client(container=CONTAINER_RAW, blob=idealist_blob_name)
    idealist_blob.upload_blob(json.dumps(idealist_results, indent=2), overwrite=True)
    print(f"Saved {len(idealist_results)} Idealist listings → raw/{idealist_blob_name}")

except Exception as e:
    print(f"⚠️  Idealist ingest failed: {e} — skipping")
