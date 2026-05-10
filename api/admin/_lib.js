import { createClient } from '@supabase/supabase-js'

function makeAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function requireAdmin(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { ok: false, status: 401, error: 'Missing token' }

  const client = makeAdminClient()
  const { data: { user }, error: authErr } = await client.auth.getUser(token)
  if (authErr || !user) return { ok: false, status: 401, error: 'Invalid token' }

  const { data: dbUser } = await client
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!dbUser?.is_admin) return { ok: false, status: 403, error: 'Not an admin' }

  return { ok: true, user, client }
}
