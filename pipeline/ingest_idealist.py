import base64
import http.client
import json
import re
import time
import uuid

import supabase_client as db

_CA_PROVINCE_NAMES = {
    "Alberta","British Columbia","Manitoba","New Brunswick",
    "Newfoundland and Labrador","Northwest Territories","Nova Scotia",
    "Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"
}
_CA_CITIES = {
    "Vancouver","Toronto","Montreal","Calgary","Ottawa","Edmonton",
    "Winnipeg","Halifax","Victoria","Saskatoon","Regina","Kelowna",
    "Burnaby","Surrey","Richmond","Mississauga","Brampton","Hamilton",
}
_CA_PROVINCE_ABBREVS = {"AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"}


def _is_canadian(item):
    org   = item.get("org") or item.get("organization") or {}
    org_name = org.get("name") or org.get("organizationName") or ""
    title = item.get("name") or item.get("title") or ""
    addr  = item.get("address") or {}
    state = addr.get("state") or addr.get("province") or ""

    text = (org_name + " " + title).lower()
    if re.search(r'\bcanada\b|\bcanadian\b', text, re.I):
        return True
    for place in _CA_PROVINCE_NAMES | _CA_CITIES:
        if re.search(r'\b' + re.escape(place) + r'\b', text, re.I):
            return True
    if state in _CA_PROVINCE_ABBREVS or state in _CA_PROVINCE_NAMES:
        return True
    return False

IDEALIST_KEY  = "66355e8e431709c2444478cc2e1198b0"
IDEALIST_HOST = "api-sandbox.idealist.org"
_NAMESPACE    = uuid.UUID("00000000-0000-0000-0000-000000000001")

_AUTH = "Basic " + base64.b64encode(f"{IDEALIST_KEY}:".encode()).decode()
_HEADERS = {"Accept": "application/json", "Authorization": _AUTH}


def _get(path):
    conn = http.client.HTTPSConnection(IDEALIST_HOST)
    conn.request("GET", path, headers=_HEADERS)
    resp = conn.getresponse()
    raw  = resp.read()
    conn.close()
    if resp.status == 400:
        return None  # sandbox time-window boundary — no more data
    if resp.status >= 400:
        raise Exception(f"Idealist API {resp.status}: {raw.decode()}")
    return json.loads(raw)


def _derive_cause(areas, title, description):
    a = [x.lower() for x in (areas or [])]
    if any("animal" in x or "wildlife" in x for x in a):                return "Animals"
    if any("food" in x or "hunger" in x for x in a):                    return "Food Security"
    if any("hous" in x or "shelter" in x for x in a):                   return "Housing"
    if any("senior" in x or "elder" in x for x in a):                   return "Seniors"
    if any("environ" in x or "climate" in x for x in a):                return "Environment"
    if any("health" in x or "medical" in x for x in a):                 return "Health"
    if any("art" in x or "music" in x or "culture" in x for x in a):   return "Arts"
    # fall back to text scan
    text = (title + " " + description).lower()
    if re.search(r"animal|wildlife|pet|rescue|dog|cat|bird|zoo", text): return "Animals"
    if re.search(r"food|hunger|meal|pantry|farm|food bank|soup",  text): return "Food Security"
    if re.search(r"hous|shelter|homeless|habitat",                text): return "Housing"
    if re.search(r"senior|elder|aged|retirement|nursing home",    text): return "Seniors"
    if re.search(r"environ|nature|trail|garden|ecology|conserv|climate|recycl|park|tree", text): return "Environment"
    if re.search(r"health|medical|cancer|mental|hospital|clinic|wellness|disability", text): return "Health"
    if re.search(r"art|music|theatre|theater|craft|creative|dance|film|museum", text): return "Arts"
    return "Education"


def _derive_age_group(description, title, age_req, welcome_teens):
    if age_req and age_req >= 18:
        return "18+ Only"
    if welcome_teens:
        return "Teens (13-17)"
    t = title.lower()
    if re.search(
        r"\b(vice president|vp[:,]|board of director|board member|"
        r"executive director|chief\s+\w+\s+officer|\bceo\b|\bcfo\b|\bcto\b|\bcoo\b|"
        r"\bpresident\b|director of|department head|general manager|"
        r"senior manager|program manager|grants manager|committee chair|"
        r"advisory board|trustee|treasurer)\b", t
    ):
        return "18+ Only"
    text = (description + " " + title).lower()
    if re.search(r"must be 18|18\s*\+|18 years or older|adults only|at least 18|over 18", text):
        return "18+ Only"
    if re.search(r"must be 1[4-6]|1[4-6]\s*\+|minimum.*1[4-6]|at least 1[4-6]|over 1[4-6]", text):
        return "Teens (13-17)"
    if re.search(r"\bteen\b|teenager|high school|middle school|ages?\s+1[3-7]|youth.*1[3-7]|student volunteer|for youth|for students", text):
        return "Teens (13-17)"
    if re.search(r"all ages|family.{0,20}friendly|open to all|any age|everyone welcome|no minimum age|anyone can volunteer", text):
        return "All Ages"
    return "Open"


def _map(item):
    org      = item.get("org") or item.get("organization") or {}
    addr     = item.get("address") or {}
    is_remote = bool(item.get("remoteOk") or item.get("remote") or item.get("isRemote"))

    if is_remote:
        location = "Remote / Online"
    else:
        city  = addr.get("city", "")
        state = addr.get("state", "")
        parts = [p for p in [city, state] if p]
        location = ", ".join(parts) if parts else "In-Person"

    url_field = item.get("url") or {}
    if isinstance(url_field, dict):
        external_url = url_field.get("en") or next(iter(url_field.values()), "")
    else:
        external_url = str(url_field)

    title       = item.get("name") or item.get("title") or ""
    description = item.get("description") or ""

    return {
        "id":           str(uuid.uuid5(_NAMESPACE, str(item["id"]))),
        "title":        title,
        "org":          org.get("name") or org.get("organizationName") or "",
        "org_id":       None,
        "cause":        _derive_cause(item.get("areasOfFocus"), title, description),
        "age_group":    _derive_age_group(description, title, item.get("ageRequirement") or 0, item.get("welcomeTeens")),
        "location":     location,
        "remote":       is_remote,
        "description":  description,
        "hours":        str(item.get("expectedTime") or item.get("commitmentDetails") or item.get("hours") or ""),
        "date":         str(item.get("startDate") or item.get("dates") or ""),
        "external_url": external_url,
        "source":       "idealist",
    }


def run():
    results = []
    since   = None
    page    = 1

    print("Fetching Idealist listings...")
    while True:
        path = f"/api/v1/listings/volops?page_size=100"
        if since:
            path += f"&since={since}"

        data = _get(path)
        if data is None:
            print(f"  Reached sandbox boundary — {len(results)} total")
            break

        items = data.get("volops", []) if isinstance(data, dict) else data
        if not items:
            print("  No items returned — done")
            break

        batch = items[1:] if since else items
        results.extend(batch)
        print(f"  Page {page}: {len(batch)} items (total: {len(results)})")

        if not (data.get("hasMore") if isinstance(data, dict) else False):
            break

        last = items[-1].get("updated") or items[-1].get("updatedAt")
        if not last:
            print("  Missing pagination field — stopping")
            break
        since = last
        page += 1
        time.sleep(0.25)

    if not results:
        print("No Idealist listings fetched. Skipping.")
        return

    us_only = [item for item in results if item.get("id") and not _is_canadian(item)]
    print(f"Canadian filter: {len(us_only)} / {len(results)} kept")

    records = [_map(item) for item in us_only]
    teen_count = sum(1 for r in records if r["age_group"] in ("Teens (13-17)", "All Ages", "Open"))
    print(f"Mapped {len(records)} listings ({teen_count} open to teens)")

    db.delete_where("clean_listings", "source", "idealist")
    db.insert("clean_listings", records)
    print(f"clean_listings (idealist): {len(records)} listings written.")
