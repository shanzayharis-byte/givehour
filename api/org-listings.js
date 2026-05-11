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
    res.status(200).json(data || [])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
