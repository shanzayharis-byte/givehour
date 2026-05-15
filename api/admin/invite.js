import nodemailer from 'nodemailer'
import { requireAdmin } from './_lib.js'

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

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { email, name } = req.body || {}
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  // Generate the invite link without Supabase sending its own email
  const { data: linkData, error: linkErr } = await auth.client.auth.admin.generateLink({
    type: 'invite',
    email,
    options: name ? { data: { name } } : {},
  })
  if (linkErr) return res.status(500).json({ error: linkErr.message })

  const inviteUrl = linkData?.properties?.action_link
  if (!inviteUrl) return res.status(500).json({ error: 'Could not generate invite link' })

  const greeting = name ? `Hi ${name},` : 'Hi there,'
  const subjectName = name ? ` ${name}` : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#16a34a;padding:32px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Give Hour 🌱</div>
            <div style="font-size:13px;color:#bbf7d0;margin-top:4px;">Connecting teens with meaningful volunteer opportunities</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">${greeting}</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              You've been invited to join <strong>Give Hour</strong> — a platform that helps teens find and apply to volunteer opportunities that actually matter to them.
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
              Click the button below to set your password and get started. The link is valid for <strong>24 hours</strong>.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <a href="${inviteUrl}"
                     style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.2px;">
                    Accept Invitation →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
              Or copy and paste this link into your browser:<br>
              <span style="color:#16a34a;word-break:break-all;">${inviteUrl}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
              If you weren't expecting this invitation, you can safely ignore this email.<br>
              Questions? Reply to this email and we'll help you out.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    greeting,
    '',
    `You've been invited to join Give Hour — a platform that helps teens find and apply to volunteer opportunities that actually matter to them.`,
    '',
    'Click the link below to set your password and get started (valid for 24 hours):',
    '',
    inviteUrl,
    '',
    'If you weren't expecting this, you can safely ignore this email.',
    '',
    '— The Give Hour Team',
  ].join('\n')

  try {
    await transporter.sendMail({
      from: `Give Hour <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `You're invited to Give Hour${subjectName ? ', ' + subjectName : ''}!`,
      html,
      text,
    })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to send invite email: ' + e.message })
  }

  return res.status(200).json({ ok: true })
}
