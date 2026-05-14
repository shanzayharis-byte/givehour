import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  // POST — AI letter generation
  if (req.method === 'POST') {
    const { name, totalHours, orgs, categories, dateRange, addressedTo } = req.body
    if (!name || !totalHours) return res.status(400).json({ error: 'Missing required fields' })

    const prompt = `You are Give Hour, a community service tracking platform. Write a third-person verification letter on behalf of Give Hour confirming a student's volunteer service. The letter is addressed to "${addressedTo || 'To Whom It May Concern'}".

Student: ${name}
Total verified hours: ${totalHours}
Service period: ${dateRange}
Organizations: ${orgs}
Service categories: ${categories}

Rules:
- Write entirely in third person — never use "I" or "my" (you are the platform, not the student)
- 2–3 short paragraphs, professional and warm tone
- Paragraph 1: verify ${name}'s total hours and service period
- Paragraph 2: describe the nature of their work across the organizations and causes listed
- Paragraph 3: brief endorsement of the student
- Do NOT include a salutation, date, or address block — just the body paragraphs
- Under 180 words
- Output only the letter body, nothing else`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 450,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await response.json()
      const letter = data.choices?.[0]?.message?.content
      if (!letter) throw new Error(data.error?.message || 'No response from model')
      return res.status(200).json({ letter })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // GET — platform stats
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Cache-Control', 's-maxage=300')

  try {
    const supabase = db()
    const [orgsRes, hoursRes] = await Promise.all([
      supabase.from('clean_listings').select('org').not('org', 'is', null).neq('org', ''),
      supabase.from('hours_log').select('hours'),
    ])

    const orgCount   = new Set((orgsRes.data || []).map(r => r.org).filter(Boolean)).size
    const hoursTotal = (hoursRes.data || []).reduce((s, r) => s + (r.hours || 0), 0)

    res.status(200).json({ orgCount, hoursTotal })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
