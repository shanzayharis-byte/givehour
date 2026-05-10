# Notebook 1 — Ingest
# Fetches all US volunteer listings from the VolunteerConnector API
# and saves them as a JSON file in Azure Data Lake (raw/ container).
#
# Setup: set the following environment variables in your Databricks cluster
# (Compute → your cluster → Edit → Advanced → Environment variables):
#
#   AZURE_STORAGE_KEY   — Access key for the givehourdata storage account

%pip install azure-storage-blob

import os
import requests
import json
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient

# ── credentials ───────────────────────────────────────────────────────────────
STORAGE_ACCOUNT   = "givehourdata"
STORAGE_KEY       = os.environ["AZURE_STORAGE_KEY"]
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
