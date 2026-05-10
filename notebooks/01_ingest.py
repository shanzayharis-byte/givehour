# Notebook 1 — Ingest
# Fetches all US volunteer listings from VolunteerConnector and saves them
# as a JSON file in Azure Data Lake (raw/ container).
# Run this on a schedule (e.g. every night at midnight).
#
# Credentials set in Databricks cluster Spark config (Advanced → Spark):
#   spark.hadoop.AZURE_STORAGE_KEY  — Access key for givehourdata

%pip install azure-storage-blob supabase

import requests
import json
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient

# ── credentials (from Spark config) ──────────────────────────────────────────
STORAGE_ACCOUNT   = "givehourdata"
STORAGE_KEY       = sc._jsc.hadoopConfiguration().get("AZURE_STORAGE_KEY")
CONTAINER_RAW     = "raw"
CONNECTION_STRING = (
    f"DefaultEndpointsProtocol=https;"
    f"AccountName={STORAGE_ACCOUNT};"
    f"AccountKey={STORAGE_KEY};"
    f"EndpointSuffix=core.windows.net"
)

# ── fetch all pages from VolunteerConnector ───────────────────────────────────
API_BASE = "https://www.volunteerconnector.org/api/search/"

def fetch_all_listings():
    listings = []
    page = 1
    while True:
        print(f"  Fetching page {page}...")
        r = requests.get(API_BASE, params={"format": "json", "page": page, "country": "United States"})
        if not r.ok:
            print(f"  Error on page {page}: {r.status_code}")
            break
        data = r.json()
        results = data.get("results", [])
        listings.extend(results)
        print(f"  Got {len(results)} listings (total so far: {len(listings)})")
        if not data.get("next"):
            break
        page += 1
    return listings

# ── save to Azure Data Lake raw/ container ────────────────────────────────────
def save_to_raw(listings):
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    blob_name = f"volunteerconnector/{timestamp}.json"
    payload   = json.dumps(listings, indent=2)
    client    = BlobServiceClient.from_connection_string(CONNECTION_STRING)
    blob      = client.get_blob_client(container=CONTAINER_RAW, blob=blob_name)
    blob.upload_blob(payload, overwrite=True)
    print(f"Saved {len(listings)} listings → raw/{blob_name}")
    return blob_name

# ── run ───────────────────────────────────────────────────────────────────────
print("Starting ingestion...")
listings  = fetch_all_listings()
print(f"Total listings fetched: {len(listings)}")
blob_name = save_to_raw(listings)
print(f"Done. File saved: {blob_name}")
