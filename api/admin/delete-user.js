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

  // Delete related rows first to satisfy FK constraints, then the user row, then auth
  const related = ['match_scores', 'personalized_feed', 'impact_stats', 'hours_log', 'saved_opportunities']
  for (const table of related) {
    await auth.client.from(table).delete().eq('user_id', userId)
  }

  const { error: dbErr } = await auth.client.from('users').delete().eq('id', userId)
  if (dbErr) return res.status(500).json({ error: dbErr.message })

  const { error: authErr } = await auth.client.auth.admin.deleteUser(userId)
  if (authErr) return res.status(500).json({ error: authErr.message })

  return res.status(200).json({ ok: true })
}
