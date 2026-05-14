import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, subject, message } = req.body || {}

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' })
  }

  try {
    await transporter.sendMail({
      from: `Give Hour Contact <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: `${name.trim()} <${email.trim()}>`,
      subject: `[Give Hour Contact] ${subject.trim()}`,
      text: `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}`,
      html: `
        <p><strong>From:</strong> ${name.trim()} &lt;${email.trim()}&gt;</p>
        <p><strong>Subject:</strong> ${subject.trim()}</p>
        <hr/>
        <p style="white-space:pre-wrap">${message.trim().replace(/</g, '&lt;')}</p>
      `,
    })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Contact email error:', e)
    return res.status(500).json({ error: 'Failed to send message. Please try again.' })
  }
}
