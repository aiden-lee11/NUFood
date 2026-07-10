const scrapeEndpoints = [
  "/api/scrapeWeeklyItems",
  "/api/scrapeOperatingTimes",
]

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    return response.status(405).json({ error: "Method not allowed" })
  }

  const token = process.env.CRON_SECRET
  const authorization = request.headers.authorization
  if (!token || authorization !== `Bearer ${token}`) {
    return response.status(401).json({ error: "Unauthorized" })
  }

  const backendURL = process.env.BACKEND_URL?.replace(/\/$/, "")
  if (!backendURL) {
    return response.status(500).json({ error: "BACKEND_URL is not configured" })
  }
  const backendToken = process.env.SCRAPE_TOKEN || token

  const results = []
  for (const endpoint of scrapeEndpoints) {
    const upstream = await fetch(`${backendURL}${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${backendToken}` },
    })
    const body = await upstream.text()
    results.push({ endpoint, status: upstream.status, body })
    if (!upstream.ok) {
      return response.status(502).json({
        error: `Backend scrape failed at ${endpoint}`,
        results,
      })
    }
  }

  return response.status(200).json({ ok: true, results })
}
