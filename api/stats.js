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

    const { highlight, notes } = req.body
    const firstName = (name || 'I').split(' ')[0]

    const prompt = `You are helping ${firstName}, a high school student, draft a response to UC Personal Insight Question #7: "What have you done to make your school or your community a better place?"

Their volunteer data:
- Total hours: ${totalHours} hours over ${dateRange}
- Organizations: ${orgs}
- Types of service: ${categories}
${notes ? `- Activity notes (what they actually did):\n${notes}` : ''}
${highlight ? `- Student wants to highlight: ${highlight}` : ''}

Write a ~350-word first-person essay response as if ${firstName} is writing it. Follow these UC guidelines:
- Focus on SPECIFIC actions ${firstName} took, not the organization's mission
- Reflect on what they learned and how it shaped their values
- Emphasize their individual role and responsibilities
- Show personal growth and genuine motivation
- Warm, authentic teen voice — not overly formal
- Do NOT use a title or heading
- Output only the essay text, nothing else`

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
