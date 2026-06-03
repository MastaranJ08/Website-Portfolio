import { Elysia, t } from 'elysia'

// Config: upstream API URLs may be set via env vars for flexibility in different deployments.
const ZAI_API_URL = process.env.ZAI_API_URL || 'https://api.z.ai/v1/infer'
const FLUX_API_URL = process.env.FLUX_API_URL || 'https://api.z.ai/v1/images'

export const playgroundRouter = new Elysia({ prefix: '/api/playground' })
  // 1. Code generation endpoint using Z.ai (GLM-5.1)
  .post('/code', async ({ body, set }: any) => {
    const { prompt } = body as { prompt: string }

    // Setup streaming headers explicitly for the client (SSE-like)
    set.headers['Content-Type'] = 'text/event-stream; charset=utf-8'
    set.headers['Cache-Control'] = 'no-cache'
    set.headers['Connection'] = 'keep-alive'

    const apiKey = process.env.ZAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing ZAI_API_KEY environment variable' }), { status: 500 })
    }

    // System prompt instructs the model to return a single plain string containing
    // executable HTML/CSS/JS only. No markdown, no explanation.
    const systemPrompt = `System: You are a code generator. ONLY respond with a single string that is a complete, standalone, executable HTML document (including <html>, <head>, <body>). Do NOT include any markdown, descriptions, or commentary. Do not wrap the HTML in triple backticks. Output must be valid HTML/CSS/JS and self-contained.`

    // Upstream request payload for the Z.ai inference API.
    const upstreamBody = {
      model: 'glm-5.1',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    }

    // Proxy the streaming response from the upstream AI provider to the client.
    const res = await fetch(ZAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(upstreamBody)
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      return new Response(JSON.stringify({ error: 'Upstream request failed', status: res.status, body: text }), { status: 502 })
    }

    // Pass through the ReadableStream from the upstream provider.
    // This keeps the code streaming to the frontend incrementally.
    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  }, {
    body: t.Object({ prompt: t.String() })
  })

  // 2. Image generation endpoint using FLUX.1-Lite-4B
  .post('/image', async ({ body }: any) => {
    const { prompt } = body as { prompt: string }

    const apiKey = process.env.ZAI_API_KEY
    if (!apiKey) return { error: 'Missing ZAI_API_KEY' }

    // Upstream payload - adjust to your provider's expected format if different.
    const upstreamBody = {
      model: 'flux.1-lite-4b',
      prompt
    }

    const res = await fetch(FLUX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(upstreamBody)
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { error: 'Upstream image generation failed', status: res.status, body: text }
    }

    // Expecting a JSON response that contains either a base64 payload or a URL.
    const json = await res.json().catch(() => null)

    // The shape of the response depends on the provider. Normalize to { imageUrl }
    if (!json) return { error: 'Invalid upstream response' }

    if (json.data && json.data[0] && json.data[0].b64_json) {
      // common pattern: image returned as base64 in `b64_json`
      const b64 = json.data[0].b64_json
      return { imageUrl: `data:image/png;base64,${b64}` }
    }

    // or provider may return a hosted URL
    if (json.url) return { imageUrl: json.url }
    if (json.data && json.data[0] && json.data[0].url) return { imageUrl: json.data[0].url }

    // fallback: return the raw json as string for debugging
    return { imageUrl: '', raw: json }
  }, {
    body: t.Object({ prompt: t.String() })
  })

// Note: this module exports `playgroundRouter` which can be mounted into your main Elysia app.
