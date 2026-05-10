import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const makeAdminClient = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })

  const client = makeAdminClient()
  const { data: { user }, error: authErr } = await client.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const { org_listing_id, org_id, message, teen_name } = req.body
  if (!org_listing_id || !org_id) return res.status(400).json({ error: 'Missing fields' })
  if (message && message.length > 2000) return res.status(400).json({ error: 'Message too long' })

  // Check for duplicate application
  const { data: existing } = await client
    .from('applications')
    .select('id')
    .eq('teen_id', user.id)
    .eq('org_listing_id', org_listing_id)
    .maybeSingle()
  if (existing) return res.status(409).json({ error: 'Already applied' })

  // Save application
  const { error: insertErr } = await client.from('applications').insert({
    teen_id: user.id,
    teen_name,
    teen_email: user.email,
    org_listing_id,
    org_id,
    message: message || null,
  })
  if (insertErr) return res.status(500).json({ error: insertErr.message })

  // Fetch org email + listing title
  const [{ data: orgUser }, { data: listing }] = await Promise.all([
    client.from('users').select('email, name').eq('id', org_id).maybeSingle(),
    client.from('org_listings').select('title').eq('id', org_listing_id).maybeSingle(),
  ])

  if (orgUser?.email) {
    await transporter.sendMail({
      from: `Give Hour <${process.env.GMAIL_USER}>`,
      to: orgUser.email,
      subject: `New application: ${listing?.title || 'your opportunity'}`,
      text: [
        `Hi ${orgUser.name},`,
        '',
        `${teen_name} (${user.email}) has applied to your opportunity: "${listing?.title}".`,
        '',
        message ? `Their message: "${message}"` : 'They did not include a message.',
        '',
        'Log in to Give Hour to see all applicants and update their status.',
        '',
        '— The Give Hour Team',
      ].join('\n'),
    }).catch(err => console.error('email send failed', err.message))
  }

  return res.status(200).json({ ok: true })
}
