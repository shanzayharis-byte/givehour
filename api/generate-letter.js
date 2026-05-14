import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, totalHours, orgs, categories, dateRange, addressedTo } = req.body
  if (!name || !totalHours) return res.status(400).json({ error: 'Missing required fields' })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Write a professional community service letter for ${name}, a high school student.

Key facts:
- Total volunteer hours: ${totalHours} hours
- Service period: ${dateRange}
- Organizations served: ${orgs}
- Categories of service: ${categories}
- Recipient: ${addressedTo || 'To Whom It May Concern'}

Write 2–3 short paragraphs in a warm but professional tone suitable for college and scholarship applications. The first paragraph should confirm the hours and commitment. The second should describe the nature of their work across causes. The third should be a brief endorsement. Sign off as "Give Hour" with no specific person's name. Do NOT include a date or address block. Keep it under 200 words. Output only the letter body — no subject line, no extra commentary.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 450,
      messages: [{ role: 'user', content: prompt }],
    })
    res.status(200).json({ letter: message.content[0].text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
