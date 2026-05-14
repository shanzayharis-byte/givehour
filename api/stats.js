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

    const prompt = `Write a professional community service letter for ${name}, a high school student.

Key facts:
- Total volunteer hours: ${totalHours} hours
- Service period: ${dateRange}
- Organizations served: ${orgs}
- Categories of service: ${categories}
- Recipient: ${addressedTo || 'To Whom It May Concern'}

Write 2–3 short paragraphs in a warm but professional tone suitable for college and scholarship applications. The first paragraph should confirm the hours and commitment. The second should describe the nature of their work across causes. The third should be a brief endorsement. Sign off as "Give Hour" with no specific person's name. Do NOT include a date or address block. Keep it under 200 words. Output only the letter body — no subject line, no extra commentary.`

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
