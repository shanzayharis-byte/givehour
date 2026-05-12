import { createClient } from '@supabase/supabase-js'

const makeAdminClient = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const db = makeAdminClient()
    const { data, error } = await db
      .from('clean_listings')
      .select('*')
      .eq('source', 'org')
      .neq('age_group', '18+ Only')
      .order('fetched_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    const orgIds = [...new Set((data || []).map(l => l.org_id).filter(Boolean))]
    const logos = {}
    if (orgIds.length > 0) {
      const { data: orgs } = await db
        .from('users')
        .select('id, logo_url, logo_icon_url')
        .in('id', orgIds)
      for (const o of orgs || []) {
        logos[o.id] = { logo_url: o.logo_url, logo_icon_url: o.logo_icon_url }
      }
    }

    const enriched = (data || []).map(l => ({
      ...l,
      org_logo_url:      l.org_id ? logos[l.org_id]?.logo_url      || null : null,
      org_logo_icon_url: l.org_id ? logos[l.org_id]?.logo_icon_url || null : null,
    }))

    res.status(200).json(enriched)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
