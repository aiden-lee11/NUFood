const scrapeEndpoints = [
  "/api/scrapeWeeklyItems",
  "/api/scrapeOperatingTimes",
]

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  })
}

function resolveBackendURL() {
  const raw =
    process.env.BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    ""
  return raw.replace(/\/$/, "")
}

export default async function handler(request) {
  try {
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, {
        Allow: "GET",
      })
    }

    const token = process.env.CRON_SECRET
    const authorization = request.headers.get("authorization")
    if (!token || authorization !== `Bearer ${token}`) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    const backendURL = resolveBackendURL()
    if (!backendURL) {
      return jsonResponse(
        { error: "BACKEND_URL or VITE_BACKEND_URL is not configured" },
        500,
      )
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
        return jsonResponse(
          {
            error: `Backend scrape failed at ${endpoint}`,
            results,
          },
          502,
        )
      }
    }

    return jsonResponse({ ok: true, results })
  } catch (error) {
    console.error("scrape cron failed:", error)
    return jsonResponse(
      {
        error: "Cron handler crashed",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    )
  }
}

export const config = {
  maxDuration: 300,
}
