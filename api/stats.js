import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300') // cache 5 min on Vercel edge

  try {
    const supabase = db()
    const [orgsRes, hoursRes] = await Promise.all([
      supabase.from('clean_listings').select('org').not('org', 'is', null).neq('org', ''),
      supabase.from('hours_log').select('hours'),
    ])

    const orgCount   = new Set((orgsRes.data || []).map(r => r.org).filter(Boolean)).size
    const hoursTotal = (hoursRes.data || []).reduce((s, r) => s + (r.hours || 0), 0)

    res.status(200).json({ orgCount, hoursTotal })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
