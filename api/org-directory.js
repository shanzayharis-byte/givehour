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
    for (const org of giveHourOrgs || []) {
      if (!org.name) continue
      if (!map[org.name]) map[org.name] = { org: org.name, count: 0, org_id: org.id, isGiveHour: true }
      else { map[org.name].isGiveHour = true; map[org.name].org_id = org.id }
    }

    res.status(200).json(Object.values(map).sort((a, b) => a.org.localeCompare(b.org)))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
