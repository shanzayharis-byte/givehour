import { requireAdmin } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId required' })

  if (userId === auth.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }

  const { error } = await auth.client.auth.admin.deleteUser(userId)
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
