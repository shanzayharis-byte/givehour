import os
import json
import http.client
import urllib.parse

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

_parsed = urllib.parse.urlparse(SUPABASE_URL)
_host = _parsed.netloc


def _request(method, path, params=None, body=None):
    url_path = f"/rest/v1/{path}"
    if params:
        url_path += "?" + urllib.parse.urlencode(params)

    data = json.dumps(body).encode() if body is not None else None
    conn = http.client.HTTPSConnection(_host)
    conn.request(method, url_path, body=data, headers=HEADERS)
    resp = conn.getresponse()
    raw = resp.read()
    conn.close()

    if resp.status >= 400:
        raise Exception(f"Supabase {method} /{path} returned {resp.status}: {raw.decode()}")

    return json.loads(raw) if raw else []


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


def delete_where(table, column, value):
    _request("DELETE", table, params={column: f"eq.{value}"})


def delete_ids(table, ids):
    if not ids:
        return
    _request("DELETE", table, params={"id": f"in.({','.join(str(i) for i in ids)})"})
