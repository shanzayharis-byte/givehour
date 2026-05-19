import os
import json
import urllib.request
import urllib.parse

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def _request(method, path, params=None, body=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise Exception(f"Supabase {method} {path} failed ({e.code}): {body}")


def select(table, filters=None):
    params = {"select": "*"}
    if filters:
        params.update(filters)
    return _request("GET", table, params=params)


def insert(table, records):
    if not records:
        return
    batch_size = 500
    for i in range(0, len(records), batch_size):
        _request("POST", table, body=records[i:i + batch_size])


def delete_all(table):
    _request("DELETE", table, params={"id": "neq.00000000-0000-0000-0000-000000000000"})
