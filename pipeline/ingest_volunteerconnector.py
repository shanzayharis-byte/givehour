import http.client
import json
import re
import time
import uuid
import urllib.parse

import supabase_client as db

VC_HOST      = "www.volunteerconnector.org"
VC_BASE_PATH = "/api/search/"
_NAMESPACE   = uuid.UUID("00000000-0000-0000-0000-000000000002")

CA_PROVINCE_ABBREVS = {"AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"}
CA_PROVINCE_NAMES   = {
    "Alberta","British Columbia","Manitoba","New Brunswick",
    "Newfoundland and Labrador","Northwest Territories","Nova Scotia",
    "Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"
}
CA_CITIES = {
    "Vancouver","Toronto","Montreal","Calgary","Ottawa","Edmonton",
    "Winnipeg","Halifax","Victoria","Saskatoon","Regina","Kelowna",
    "Burnaby","Surrey","Richmond","Mississauga","Brampton","Hamilton",
}
CA_PROVINCES = CA_PROVINCE_NAMES | CA_PROVINCE_ABBREVS


def _get_page(path):
    conn = http.client.HTTPSConnection(VC_HOST)
    conn.request("GET", path, headers={"Accept": "application/json"})
    resp = conn.getresponse()
    raw  = resp.read()
    conn.close()
    if resp.status >= 400:
        raise Exception(f"VolunteerConnector API {resp.status}: {raw.decode()}")
    return json.loads(raw)


def _is_canadian_region(region):
    if region in CA_PROVINCES:
        return True
    parts = [p.strip() for p in region.split(",")]
    if len(parts) >= 2 and parts[-1] in CA_PROVINCE_ABBREVS:
        return True
    for prov in CA_PROVINCE_NAMES:
        if re.search(r'\b' + re.escape(prov) + r'\b', region, re.I):
            return True
    return False


def _is_canadian_text(text):
    """Return True if text contains a clear Canadian indicator."""
    if re.search(r'\bcanada\b|\bcanadian\b', text, re.I):
        return True
    for place in CA_PROVINCE_NAMES | CA_CITIES:
        if re.search(r'\b' + re.escape(place) + r'\b', text, re.I):
            return True
    return False


def _is_us(item):
    # Check country exclusions first — even remote listings can be Canada-only
    countries = item.get("audience", {}).get("countries", [])
    if countries and all(not re.search(r"united states|usa", c, re.I) for c in countries):
        return False

    # Canadian keyword in org name → skip
    org_name = (item.get("organization") or {}).get("name", "")
    if _is_canadian_text(org_name):
        return False

    # Canadian region in audience → skip (even for remote listings)
    regions = item.get("audience", {}).get("regions", [])
    if any(_is_canadian_region(r) for r in regions):
        return False
    if any(_is_canadian_text(r) for r in regions):
        return False

    # "Canada" or Canadian city in title → skip
    title = item.get("title") or ""
    if _is_canadian_text(title):
        return False

    return True


def _derive_location(item):
    if item.get("remote_or_online"):
        return "Remote / Online"
    regions = item.get("audience", {}).get("regions", [])
    return regions[0] if regions else "In-Person"


def _derive_cause(activities):
    text = " ".join(
        a.get("name", "").lower() + " " + a.get("category", "").lower()
        for a in activities
    )
    if re.search(r"animal|wildlife|pet|spca|humane|rescue|dog|cat|bird|zoo", text): return "Animals"
    if re.search(r"food|hunger|meal|nutrition|pantry|harvest|farm|food bank|soup", text): return "Food Security"
    if re.search(r"hous|shelter|homeless|habitat", text): return "Housing"
    if re.search(r"senior|elder|aged|retirement|nursing home|older adult", text): return "Seniors"
    if re.search(r"environ|nature|trail|plant|garden|ecology|conserv|climate|recycl|park|tree", text): return "Environment"
    if re.search(r"health|medical|cancer|mental|hospital|clinic|nurse|wellness|disability", text): return "Health"
    if re.search(r"art|music|theatre|theater|craft|creative|writing|design|dance|film|museum", text): return "Arts"
    return "Education"


def _derive_age_group(description, title, extra=""):
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
    if re.search(r"all ages|family.{0,20}friendly|open to all|any age|everyone welcome|no minimum age|anyone can volunteer", text): return "All Ages"
    return "Open"


def _map(item):
    activities = item.get("activities", [])
    extra      = " ".join(a.get("name", "") for a in activities)
    title      = item.get("title", "")
    description = item.get("description", "")
    return {
        "id":           str(uuid.uuid5(_NAMESPACE, str(item["id"]))),
        "title":        title,
        "org":          (item.get("organization") or {}).get("name", ""),
        "org_id":       None,
        "cause":        _derive_cause(activities),
        "age_group":    _derive_age_group(description, title, extra),
        "location":     _derive_location(item),
        "remote":       bool(item.get("remote_or_online")),
        "description":  description,
        "hours":        str(item.get("duration") or ""),
        "date":         str(item.get("dates") or ""),
        "external_url": item.get("url") or "",
        "source":       "volunteerconnector",
    }


def run():
    results = []
    params  = urllib.parse.urlencode({"format": "json", "country": "United States", "page_size": 100})
    path    = f"{VC_BASE_PATH}?{params}"
    page    = 1

    print("Fetching VolunteerConnector listings...")
    while path:
        data = _get_page(path)
        batch = data.get("results", [])
        results.extend(batch)
        print(f"  Page {page}: {len(batch)} results (total: {len(results)})")

        next_url = data.get("next")
        if not next_url:
            break
        parsed = urllib.parse.urlparse(next_url)
        path   = parsed.path + ("?" + parsed.query if parsed.query else "")
        page  += 1
        time.sleep(0.1)

    us_only = [item for item in results if _is_us(item)]
    print(f"US filter: {len(us_only)} / {len(results)} kept")

    records = [_map(item) for item in us_only if item.get("id")]
    print(f"Mapped {len(records)} VolunteerConnector listings")

    db.delete_where("clean_listings", "source", "volunteerconnector")
    db.insert("clean_listings", records)
    print(f"clean_listings (volunteerconnector): {len(records)} listings written.")
