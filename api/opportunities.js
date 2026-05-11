// Proxy for the VolunteerConnector public API.
// Runs as a Vercel serverless function so the browser never hits CORS issues.
export default async function handler(req, res) {
  const { page = 1, q = '' } = req.query
  const params = new URLSearchParams({ format: 'json', page })
  if (q) params.set('q', q)

  try {
    const upstream = await fetch(
      `https://www.volunteerconnector.org/api/search/?${params}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Upstream API error' })
    const data = await upstream.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
