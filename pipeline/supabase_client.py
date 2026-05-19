import os
import json
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def select(table, filters=None):
    params = {"select": "*"}
    if filters:
        params.update(filters)
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, params=params)
    r.raise_for_status()
    return r.json()


def insert(table, records):
    if not records:
        return
    # Insert in batches of 500 to avoid request size limits
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, data=json.dumps(batch))
        r.raise_for_status()


def delete_all(table):
    # Delete all rows using a filter that matches everything (id != impossible uuid)
    params = {"id": "neq.00000000-0000-0000-0000-000000000000"}
    r = requests.delete(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, params=params)
    r.raise_for_status()
