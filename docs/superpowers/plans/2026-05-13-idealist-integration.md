# Idealist Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Idealist as a third volunteer listing source — ingested nightly via Databricks, stored in Supabase `clean_listings`, mixed into the Explore tab every 3rd card with a purple "🌐 Idealist" badge.

**Architecture:** Databricks `01_ingest.py` fetches Idealist listings with a 30s timeout and graceful failure; `02_clean.py` maps Idealist fields to the `clean_listings` schema and upserts with `source='idealist'`. `Explore.jsx` queries Supabase for Idealist listings on mount, interleaves them into the VolunteerConnector live results, and shows a source badge.

**Tech Stack:** Python (Databricks notebooks), Azure Blob Storage, Supabase, React/JSX

---

### Task 1: Add Idealist API key to Databricks cluster

**Files:**
- No code files — Databricks cluster configuration

- [ ] **Step 1: Open the Databricks cluster settings**

  In Databricks, go to **Compute → your cluster → Edit → Advanced options → Environment variables**. Add:

  ```
  IDEALIST_API_KEY=66355e8e431709c2444478cc2e1198b0
  ```

  Click **Confirm** then **Restart** the cluster so the variable is available.

- [ ] **Step 2: Verify the variable is set**

  In a Databricks notebook cell, run:

  ```python
  import os
  print(os.environ.get("IDEALIST_API_KEY", "NOT SET"))
  ```

  Expected output: `66355e8e431709c2444478cc2e1198b0`

---

### Task 2: Add Idealist ingest block to `01_ingest.py`

**Files:**
- Modify: `notebooks/01_ingest.py`

- [ ] **Step 1: Add `import time` to the imports block**

  In `notebooks/01_ingest.py`, find the imports at the top:

  ```python
  import os
  import requests
  import json
  from datetime import datetime, timezone
  from azure.storage.blob import BlobServiceClient
  from supabase import create_client
  ```

  Replace with:

  ```python
  import os
  import time
  import requests
  import json
  from datetime import datetime, timezone
  from azure.storage.blob import BlobServiceClient
  from supabase import create_client
  ```

- [ ] **Step 2: Append the Idealist fetch block at the end of the file**

  After the final `print(f"Saved {len(org_listings)} org listings → raw/{org_blob_name}")` line, add:

  ```python
  # ── fetch Idealist volunteer opportunities ────────────────────────────────────
  IDEALIST_KEY = os.environ["IDEALIST_API_KEY"]
  IDEALIST_URL = "https://www.idealist.org/api/v1/listings/volops"

  print("Fetching Idealist listings...")
  idealist_results = []

  try:
      since = None
      while True:
          url = IDEALIST_URL if not since else f"{IDEALIST_URL}?since={since}"
          r = requests.get(
              url,
              auth=(IDEALIST_KEY, ""),
              headers={"Accept": "application/json"},
              timeout=30
          )
          r.raise_for_status()
          page_data = r.json()
          # API may return a list or a dict with results/data key
          items = page_data if isinstance(page_data, list) else page_data.get("results", page_data.get("data", []))
          if not items:
              break
          # Idealist's `since` pagination is inclusive — skip the last item from previous page
          batch = items[1:] if since else items
          idealist_results.extend(batch)
          print(f"  Fetched {len(batch)} items (total: {len(idealist_results)})")
          if len(items) < 100:
              break
          since = items[-1].get("updated")
          if not since:
              break
          time.sleep(0.25)

      idealist_blob_name = f"idealist/{timestamp}.json"
      idealist_blob = client.get_blob_client(container=CONTAINER_RAW, blob=idealist_blob_name)
      idealist_blob.upload_blob(json.dumps(idealist_results, indent=2), overwrite=True)
      print(f"Saved {len(idealist_results)} Idealist listings → raw/{idealist_blob_name}")

  except Exception as e:
      print(f"⚠️  Idealist ingest failed: {e} — skipping")
  ```

- [ ] **Step 3: Run the notebook cell by cell in Databricks and verify**

  After running the Idealist block, expected output (success case):
  ```
  Fetching Idealist listings...
    Fetched N items (total: N)
  Saved N Idealist listings → raw/idealist/2026-05-13T...Z.json
  ```

  If the API returns an error or times out, expected output:
  ```
  ⚠️  Idealist ingest failed: <error message> — skipping
  ```
  The notebook should continue without crashing in both cases.

- [ ] **Step 4: Commit**

  ```bash
  cd /root/givehour
  git add notebooks/01_ingest.py
  git commit -m "feat: add Idealist listings ingest with graceful failure"
  ```

---

### Task 3: Add Idealist clean block to `02_clean.py`

**Files:**
- Modify: `notebooks/02_clean.py`

- [ ] **Step 1: Add `derive_cause_text` helper after the existing `derive_cause` function**

  In `notebooks/02_clean.py`, find the end of the `derive_cause` function (the line `return "Education"`). After that function, add:

  ```python
  def derive_cause_text(text):
      """Text-based cause detection for sources that have no activities array (e.g. Idealist)."""
      text = text.lower()
      if re.search(r"animal|wildlife|pet|spca|humane|rescue|dog|cat|bird|zoo|aquarium", text):                     return "Animals"
      if re.search(r"food|hunger|meal|nutrition|pantry|harvest|farm|feeding|food bank|soup", text):                 return "Food Security"
      if re.search(r"hous|shelter|homeless|habitat|affordable housing|transitional", text):                         return "Housing"
      if re.search(r"senior|elder|aged|retirement|nursing home|assisted living|older adult|aging", text):           return "Seniors"
      if re.search(r"environ|nature|trail|plant|garden|ecology|conserv|climate|recycl|clean up|ocean|beach|park|forest|tree|sustainab", text): return "Environment"
      if re.search(r"health|medical|cancer|mental|hospital|clinic|nurse|wellness|disability|blood|hospice|therapy|rehab", text):               return "Health"
      if re.search(r"art|music|theatre|theater|craft|creative|writing|design|dance|film|gallery|mural|perform|drama|culture|museum", text):    return "Arts"
      return "Education"
  ```

- [ ] **Step 2: Append the Idealist clean block at the end of the file**

  After the final `print(f"Supabase updated — {len(org_records)} org listing records in clean_listings")` line (and its surrounding `if not org_blobs / else` block), add:

  ```python
  # ── process Idealist listings ─────────────────────────────────────────────────
  def clean_idealist_item(item):
      org  = item.get("organization") or {}
      addr = item.get("address") or {}
      is_remote = bool(item.get("remote") or item.get("isRemote"))
      if is_remote:
          location = "Remote / Online"
      else:
          city  = addr.get("city", "")
          state = addr.get("state", "")
          parts = [p for p in [city, state] if p]
          location = ", ".join(parts) if parts else "In-Person"
      url_field    = item.get("url") or {}
      external_url = (url_field.get("en") or next(iter(url_field.values()), "")) if isinstance(url_field, dict) else str(url_field)
      title        = item.get("name") or item.get("title") or ""
      description  = item.get("description") or ""
      return {
          "id":           f"idealist_{item['id']}",
          "title":        title,
          "org":          org.get("name") or org.get("organizationName") or "",
          "org_id":       None,
          "cause":        derive_cause_text(title + " " + description),
          "age_group":    derive_age_group(description, title, ""),
          "location":     location,
          "remote":       is_remote,
          "description":  description,
          "hours":        str(item.get("hours") or item.get("commitment") or ""),
          "date":         str(item.get("dates") or item.get("startDate") or ""),
          "external_url": external_url,
          "source":       "idealist",
          "fetched_at":   datetime.now(timezone.utc).isoformat(),
      }

  idealist_blobs = sorted(
      container.list_blobs(name_starts_with="idealist/"),
      key=lambda b: b.name, reverse=True
  )

  if not idealist_blobs:
      print("No idealist raw file found — skipping")
  else:
      print(f"Reading: raw/{idealist_blobs[0].name}")
      raw_idealist = json.loads(
          client.get_blob_client(container=CONTAINER_RAW, blob=idealist_blobs[0].name)
                .download_blob().readall()
      )
      if not raw_idealist:
          print("Idealist raw file is empty — skipping")
      else:
          idealist_records = [clean_idealist_item(item) for item in raw_idealist]
          db.table("clean_listings").delete().eq("source", "idealist").execute()
          for i in range(0, len(idealist_records), 100):
              db.table("clean_listings").upsert(idealist_records[i:i+100]).execute()
          print(f"Supabase updated — {len(idealist_records)} Idealist records in clean_listings")
  ```

- [ ] **Step 3: Run the notebook in Databricks and verify**

  After running the Idealist block, expected output (if ingest ran successfully):
  ```
  Reading: raw/idealist/2026-05-13T...Z.json
  Supabase updated — N Idealist records in clean_listings
  ```

  If the ingest step was skipped (blob missing):
  ```
  No idealist raw file found — skipping
  ```

  In Supabase table editor, query `clean_listings` where `source = 'idealist'` — rows should appear.

- [ ] **Step 4: Commit**

  ```bash
  cd /root/givehour
  git add notebooks/02_clean.py
  git commit -m "feat: add Idealist listings clean and upsert to clean_listings"
  ```

---

### Task 4: Add `idealistOpps` state and Supabase fetch to `Explore.jsx`

**Files:**
- Modify: `src/screens/Explore.jsx`

- [ ] **Step 1: Add `idealistOpps` state**

  In `src/screens/Explore.jsx`, find the `orgListings` state declaration on line ~202:

  ```jsx
  const [orgListings, setOrgListings]     = useState([])
  ```

  Replace with:

  ```jsx
  const [orgListings, setOrgListings]     = useState([])
  const [idealistOpps, setIdealistOpps]   = useState([])
  ```

- [ ] **Step 2: Add Supabase fetch for Idealist listings**

  After the `orgListings` useEffect block (which ends around line 253 with `.catch(() => {})`), add a new useEffect:

  ```jsx
  useEffect(() => {
    supabase
      .from('clean_listings')
      .select('*')
      .eq('source', 'idealist')
      .then(({ data }) => {
        if (!data) return
        setIdealistOpps(data.map(item => ({
          id:          item.id,
          title:       item.title,
          org:         item.org || '',
          org_id:      item.org_id || null,
          cause:       item.cause,
          ageGroup:    item.age_group,
          hours:       item.hours || '',
          location:    item.location || '',
          date:        item.date || '',
          description: item.description || '',
          externalUrl: item.external_url || '',
          remote:      !!item.remote,
          source:      'idealist',
        })))
      })
  }, [])
  ```

- [ ] **Step 3: Verify in browser**

  Run `npm run dev` in `/root/givehour`, open Explore. In the browser console, add a temporary log to confirm the fetch works:

  ```jsx
  // temporary — add inside the .then({ data }) callback before setIdealistOpps
  console.log('Idealist listings from Supabase:', data?.length)
  ```

  If the pipeline hasn't run yet, `data` will be an empty array — that's fine, `idealistOpps` stays `[]` and the tab renders VC listings normally. Remove the log after verifying.

---

### Task 5: Add `interleave` helper and update `filteredOpps`

**Files:**
- Modify: `src/screens/Explore.jsx`

- [ ] **Step 1: Add the `interleave` helper function**

  In `src/screens/Explore.jsx`, find the `mapOpp` function (around line 56). After the closing `}` of `mapOpp`, add:

  ```jsx
  function interleave(primary, secondary, every = 3) {
    if (!secondary.length) return primary
    const out = []
    let sIdx = 0
    primary.forEach((item, i) => {
      out.push(item)
      if ((i + 1) % every === 0) {
        out.push(secondary[sIdx % secondary.length])
        sIdx++
      }
    })
    return out
  }
  ```

- [ ] **Step 2: Update `filteredOpps` to include Idealist**

  Find the three lines around line 312–314:

  ```jsx
  const filteredOrgListings = orgListings.filter(applyFilters)
  const filteredVolunteer   = opps.filter(applyFilters)
  const filteredOpps        = [...filteredOrgListings, ...filteredVolunteer]
  ```

  Replace with:

  ```jsx
  const filteredOrgListings = orgListings.filter(applyFilters)
  const filteredVolunteer   = opps.filter(applyFilters)
  const filteredIdealist    = idealistOpps.filter(applyFilters)
  const filteredOpps        = interleave([...filteredOrgListings, ...filteredVolunteer], filteredIdealist)
  ```

- [ ] **Step 3: Include `idealistOpps` in `causeCounts`**

  Find line ~318:

  ```jsx
  for (const o of [...orgListings, ...opps]) {
  ```

  Replace with:

  ```jsx
  for (const o of [...orgListings, ...opps, ...idealistOpps]) {
  ```

- [ ] **Step 4: Verify interleaving in browser**

  With `npm run dev` running, open Explore → Opportunities tab. If `idealistOpps` is populated, every 4th card should be an Idealist listing (after 3 VC cards). If `idealistOpps` is empty, the list looks identical to before — no gaps, no errors.

---

### Task 6: Add Idealist source badge to `OppCard`

**Files:**
- Modify: `src/screens/Explore.jsx`

- [ ] **Step 1: Add the Idealist badge in `OppCard`**

  In `src/screens/Explore.jsx`, find line ~166 inside `OppCard`:

  ```jsx
  {opp.source === 'org' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>✓ Give Hour Partner</span>}
  ```

  Replace with:

  ```jsx
  {opp.source === 'org' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: T.primaryLight, color: T.primary, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>✓ Give Hour Partner</span>}
  {opp.source === 'idealist' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#EDE9FE', color: '#6D28D9', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>🌐 Idealist</span>}
  ```

- [ ] **Step 2: Verify badge renders correctly**

  With `npm run dev` running, open Explore. If Idealist listings are loaded, each Idealist card should show a purple "🌐 Idealist" pill in the top-right of the card header (same position as the green "✓ Give Hour Partner" badge on org cards). VC cards show no badge.

- [ ] **Step 3: Commit all Explore.jsx changes**

  ```bash
  cd /root/givehour
  git add src/screens/Explore.jsx
  git commit -m "feat: mix Idealist listings into Explore tab with source badge"
  ```

---

### Task 7: Push to Vercel and verify end-to-end

- [ ] **Step 1: Push to GitHub so Vercel deploys**

  ```bash
  cd /root/givehour
  git push origin main
  ```

- [ ] **Step 2: Verify pipeline on Databricks**

  Trigger the `givehour-daily-pipeline` job manually (or run notebooks 01 → 02 in order). Confirm:
  - Notebook 01 prints `Saved N Idealist listings → raw/idealist/...`
  - Notebook 02 prints `Supabase updated — N Idealist records in clean_listings`
  - In Supabase table editor: `clean_listings` has rows with `source = 'idealist'`

- [ ] **Step 3: Verify Explore tab on live site**

  Open `https://givehour.vercel.app`, log in as a teen, go to Explore → Opportunities. Confirm:
  - Idealist cards appear every 3–4 cards in the list
  - Each Idealist card has a purple "🌐 Idealist" badge
  - Org cards still show the green "✓ Give Hour Partner" badge
  - VC cards have no badge
  - Cause and age-group filters still work on Idealist cards
  - If Supabase has no Idealist rows yet, the list shows VC-only with no errors
