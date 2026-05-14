import { useState, useMemo } from 'react'
import { T } from '../lib/theme'

const PAGES = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'May 2026',
    sections: [
      { h: 'What we collect', p: 'When you sign up for Give Hour, we store your name, email address, and (if you choose) your school, region, age range, and interest tags. When you log volunteer hours, we store the org name, hours, date, and any notes you write.' },
      { h: 'How we use it', p: 'We use your profile information to personalize the opportunities we show you and to display your impact stats. We never sell your data, and we don\'t share it with third parties except where required for the app to function (for example, our database provider).' },
      { h: 'Authentication', p: 'Sign-in is handled by Supabase. We do not see or store your password. You can also sign in with Google, in which case Google handles authentication.' },
      { h: 'Your rights', p: 'You can view, edit, or delete any data you\'ve added at any time from your Profile page. To delete your entire account, contact us using the link below.' },
      { h: 'Cookies', p: 'We use a single session cookie to keep you signed in. We do not use any tracking or advertising cookies.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'May 2026',
    sections: [
      { h: 'Using Give Hour', p: 'Give Hour is a free platform that helps teens find volunteer opportunities and track community service hours. By creating an account, you agree to use the service for its intended purpose and to be honest about the hours you log.' },
      { h: 'Eligibility', p: 'Give Hour is designed for teens aged 13 and older. If you are under 13, please do not create an account.' },
      { h: 'Your content', p: 'When organizations post listings, those listings are the responsibility of the organization. When teens log hours, those entries are the responsibility of the teen. Give Hour is not responsible for the accuracy of either.' },
      { h: 'Acceptable use', p: 'Don\'t post anything illegal, harassing, misleading, or harmful. We reserve the right to remove accounts or content that violates these rules.' },
      { h: 'No warranty', p: 'Give Hour is provided as-is. We work hard to keep the service running and accurate, but we can\'t guarantee zero downtime or perfect data.' },
    ],
  },
  contact: {
    title: 'Contact',
    updated: null,
    sections: [
      { h: 'Get in touch', p: 'Give Hour was built by Shanzay Haris, a high school student, after struggling to find decent volunteer opportunities for teens. The best way to reach out is by email. Every message comes straight to a real person and gets a real response.' },
      { h: 'Email', p: 'hello@givehour.app' },
      { h: 'Reporting a problem', p: 'Found a bug? Have a feature request? Need to report a listing or another user? Please email us with as much detail as possible. Screenshots help a lot.' },
      { h: 'Organizations', p: 'If your organization wants to post volunteer opportunities on Give Hour, just sign up as an organization from the home screen. There\'s no application or approval process for verified non-profits.' },
    ],
  },
}

function ContactForm() {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [status, setStatus]   = useState(null) // null | 'sending' | 'sent' | 'error'
  const [errMsg, setErrMsg]   = useState('')

  // generate a simple math question once per mount
  const [a, b] = useMemo(() => [Math.floor(Math.random() * 9) + 1, Math.floor(Math.random() * 9) + 1], [])

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 14, fontFamily: 'inherit', color: T.text, background: '#fff', boxSizing: 'border-box', outline: 'none', marginBottom: 12 }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (parseInt(captcha) !== a + b) {
      setErrMsg('Incorrect answer — please try the math question again.')
      return
    }
    setStatus('sending')
    setErrMsg('')
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await r.json()
      if (!r.ok) { setErrMsg(data.error || 'Something went wrong.'); setStatus('error'); return }
      setStatus('sent')
    } catch {
      setErrMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ background: T.primaryLight, border: `1px solid ${T.primary}33`, borderRadius: 12, padding: 20, textAlign: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.primary, marginBottom: 4 }}>Message sent!</div>
        <div style={{ fontSize: 13, color: T.textSub }}>Thanks for reaching out. You'll hear back at {email}.</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, display: 'block', marginBottom: 4 }}>Your name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Shanzay H" required style={inp} />

      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, display: 'block', marginBottom: 4 }}>Your email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required style={inp} />

      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, display: 'block', marginBottom: 4 }}>Subject</label>
      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Bug report / Feature request / Question…" required style={inp} />

      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, display: 'block', marginBottom: 4 }}>Message</label>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us what's on your mind…" required rows={5}
        style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />

      {/* math CAPTCHA */}
      <div style={{ background: '#F4F6F8', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6 }}>Quick check — what is {a} + {b}?</div>
        <input type="number" value={captcha} onChange={e => setCaptcha(e.target.value)} placeholder="Answer" required
          style={{ ...inp, marginBottom: 0, width: 100 }} />
      </div>

      {errMsg && <div style={{ fontSize: 13, color: '#C0392B', marginBottom: 10 }}>{errMsg}</div>}

      <button type="submit" disabled={status === 'sending'}
        style={{ width: '100%', padding: 14, background: T.primary, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', cursor: status === 'sending' ? 'default' : 'pointer', opacity: status === 'sending' ? 0.7 : 1 }}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}

export default function LegalPage({ slug, onBack }) {
  const page = PAGES[slug] || PAGES.privacy
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* sticky header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: T.primaryLight, color: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>←</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{page.title}</div>
      </div>

      {/* scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>
        {page.updated && (
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 20 }}>Last updated: {page.updated}</div>
        )}
        {page.sections.map(s => (
          <div key={s.h} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>{s.h}</div>
            <div style={{ fontSize: 14, color: T.textSub, lineHeight: 1.65 }}>{s.p}</div>
          </div>
        ))}
        {slug === 'contact' && <ContactForm />}
      </div>
    </div>
  )
}
