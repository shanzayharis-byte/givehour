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
    const { id } = req.query

    if (id) {
      const { data, error } = await db
        .from('users')
        .select('id, name, org_type, region, interests, website, is_501c3, description, logo_url')
        .eq('id', id)
        .maybeSingle()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data || null)
    }

    const { data, error } = await db
      .from('users')
      .select('id, name, org_type, region, zip, interests, website, is_501c3, description, logo_url')
      .eq('role', 'org')
    if (error) return res.status(500).json({ error: error.message })
    res.status(200).json(data || [])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
