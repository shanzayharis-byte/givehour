import { requireAdmin } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { email, name } = req.body || {}
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  const opts = name ? { data: { name } } : {}
  const { error } = await auth.client.auth.admin.inviteUserByEmail(email, opts)
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
