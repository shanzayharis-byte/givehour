import { requireAdmin } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { client } = auth

  const { data: dbUsers, error: dbErr } = await client
    .from('users')
    .select('id, name, email, role, is_admin')
    .order('name')
  if (dbErr) return res.status(500).json({ error: dbErr.message })

  const { data: { users: authUsers }, error: authErr } = await client.auth.admin.listUsers({ perPage: 1000 })
  if (authErr) return res.status(500).json({ error: authErr.message })

  const loginMap = Object.fromEntries(authUsers.map(u => [u.id, u.last_sign_in_at]))

  const users = (dbUsers || []).map(u => ({
    ...u,
    last_sign_in_at: loginMap[u.id] || null,
  }))

  return res.status(200).json({ users })
}
