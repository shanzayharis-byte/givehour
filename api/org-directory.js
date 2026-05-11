import { createClient } from '@supabase/supabase-js'

const makeAdminClient = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { org } = req.query

  try {
    const db = makeAdminClient()

    if (org) {
      const { org_id } = req.query

      // Give Hour org — read directly from org_listings (avoids name-mismatch with clean_listings)
      if (org_id) {
        const { data, error } = await db
          .from('org_listings')
          .select('*')
          .eq('org_id', org_id)
          .order('created_at', { ascending: false })
        if (error) return res.status(500).json({ error: error.message })
        // Normalise to clean_listings shape so the frontend works unchanged
        const normalised = (data || []).map(r => ({
          ...r,
          org: org,
          source: 'org',
          age_group: r.age_group || 'all',
          fetched_at: r.created_at,
        }))
        return res.status(200).json(normalised)
      }

      // Fallback: VolunteerConnector orgs via name match
      const { data, error } = await db
        .from('clean_listings')
        .select('*')
        .eq('org', org)
        .neq('age_group', '18+ Only')
        .order('fetched_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data || [])
    }

    // All orgs from clean_listings — group by name
    const { data, error } = await db
      .from('clean_listings')
      .select('org, source, org_id')
      .not('org', 'is', null)
      .neq('org', '')

    if (error) return res.status(500).json({ error: error.message })

    const map = {}
    for (const row of data || []) {
      if (!row.org) continue
      if (!map[row.org]) map[row.org] = { org: row.org, count: 0, org_id: null, isGiveHour: false }
      map[row.org].count++
      if (row.source === 'org') {
        map[row.org].org_id = row.org_id
        map[row.org].isGiveHour = true
      }
    }

    // Always include Give Hour registered orgs even if they have no clean_listings yet
    const { data: giveHourOrgs } = await db.from('users').select('id, name').eq('role', 'org')

    // Count directly from org_listings per org_id — avoids name-mismatch bugs
    const { data: directListings } = await db.from('org_listings').select('org_id')
    const directCount = {}
    for (const r of directListings || []) directCount[r.org_id] = (directCount[r.org_id] || 0) + 1

    for (const org of giveHourOrgs || []) {
      if (!org.name) continue
      const count = directCount[org.id] || 0
      if (!map[org.name]) map[org.name] = { org: org.name, count, org_id: org.id, isGiveHour: true }
      else { map[org.name].isGiveHour = true; map[org.name].org_id = org.id; if (count > map[org.name].count) map[org.name].count = count }
    }

    res.status(200).json(Object.values(map).sort((a, b) => a.org.localeCompare(b.org)))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
