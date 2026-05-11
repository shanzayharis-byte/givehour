import { createClient } from '@supabase/supabase-js'

const makeAdminClient = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })

  const client = makeAdminClient()
  const { data: { user }, error: authErr } = await client.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const profile = req.body
  if (!profile || !profile.name) return res.status(400).json({ error: 'Missing profile data' })

  const ALLOWED = ['name', 'role', 'grade', 'age', 'zip', 'school_name', 'region', 'interests', 'preferred_cause', 'org_type', 'website']
  const safe = Object.fromEntries(ALLOWED.filter(k => profile[k] !== undefined).map(k => [k, profile[k]]))

  const { error } = await client.from('users').upsert({ id: user.id, ...safe })
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
