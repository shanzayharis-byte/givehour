import { createClient } from '@supabase/supabase-js'

const makeAdminClient = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })

  const db = makeAdminClient()
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

  try {
    const { data: saved } = await db
      .from('saved_opportunities')
      .select('listing_id, saved_at')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (!saved || saved.length === 0) return res.status(200).json([])

    const cleanIds = saved.filter(r => r.listing_id.startsWith('org_')).map(r => r.listing_id)
    const orgIds   = saved.filter(r => !r.listing_id.startsWith('org_')).map(r => r.listing_id)

    const [cleanRows, orgRows] = await Promise.all([
      cleanIds.length
        ? db.from('clean_listings').select('id, title, org, org_id, cause, location, hours, date, source, external_url').in('id', cleanIds).then(r => r.data || [])
        : [],
      orgIds.length
        ? db.from('org_listings').select('id, org_id, title, cause, location, hours, date, external_url').in('id', orgIds).then(r => r.data || [])
        : [],
    ])

    // fetch org names for org_listings rows
    const uniqueOrgIds = [...new Set(orgRows.map(r => r.org_id).filter(Boolean))]
    const orgUsers = uniqueOrgIds.length
      ? await db.from('users').select('id, name').in('id', uniqueOrgIds).then(r => r.data || [])
      : []
    const orgNameMap = Object.fromEntries(orgUsers.map(u => [u.id, u.name]))

    const savedAtMap = Object.fromEntries(saved.map(r => [r.listing_id, r.saved_at]))

    const combined = [
      ...cleanRows.map(r => ({ ...r, saved_at: savedAtMap[r.id], _baseId: r.id.replace(/^org_/, '') })),
      ...orgRows.map(r => ({
        id: r.id,
        title: r.title,
        org: orgNameMap[r.org_id] || '',
        org_id: r.org_id,
        cause: r.cause,
        location: r.location,
        hours: r.hours,
        date: r.date,
        source: 'org',
        external_url: r.external_url,
        saved_at: savedAtMap[r.id],
        _baseId: r.id,
      })),
    ].sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))

    // deduplicate: clean_listings (org_* prefixed) takes priority over org_listings plain UUID
    const seen = new Set()
    const results = combined.filter(r => {
      if (seen.has(r._baseId)) return false
      seen.add(r._baseId)
      return true
    }).map(({ _baseId, ...r }) => r)

    res.status(200).json(results)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
