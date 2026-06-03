import { Elysia } from 'elysia'
import { playgroundRouter } from './playgroundRouter.js'

const app = new Elysia()

// Mount playground router
app.use(playgroundRouter)

app.get('/api/projects', async (c: any) => {
  const username = process.env.GITHUB_USERNAME || 'YOUR_GITHUB_USERNAME'
  const token = process.env.GITHUB_TOKEN
  const url = `https://api.github.com/users/${username}/repos?per_page=100`
  const headers: Record<string,string> = { 'Accept': 'application/vnd.github.v3+json' }
  if (token) headers.Authorization = `token ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) return c.json({ error: 'Failed to fetch from GitHub', status: res.status }, 502)

  const repos = await res.json()

  const data = (repos || [])
    .filter((r: any) => !r.fork && (r.stargazers_count ?? 0) > 0)
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      html_url: r.html_url,
      stargazers_count: r.stargazers_count,
      language: r.language,
      topics: r.topics || []
    }))

  return c.json(data)
})

app.post('/api/playground/chat', async (c: any) => {
  const payload = await c.body
  const prompt = (payload && (payload as any).prompt) || 'Hello from mock AI.'

  const encoder = new TextEncoder()
  const text = `Mock reply streaming for: ${prompt}\nThis simulates a streaming response. Enjoy the typing effect!`

  const stream = new ReadableStream({
    start(controller) {
      let i = 0
      function push() {
        if (i >= text.length) {
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(text[i]))
        i++
        setTimeout(push, 25)
      }
      push()
    }
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
})

type ChatRole = 'system' | 'user' | 'assistant'
type ChatMessage = { role: ChatRole; content: string }

const NVIDIA_API_URL = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1'
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'z-ai/glm-5.1'
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.ZAI_API_KEY

const MODE_SYSTEM_PROMPTS: Record<string, string> = {
  explorer:
    'You are an interactive portfolio assistant. Be concise, creative, and useful. Respond in Indonesian unless the user asks otherwise. Help the user explore ideas, ask clarifying questions when needed, and provide examples that are easy to follow.',
  builder:
    'You are a product and code builder. Turn rough ideas into concrete steps, UI suggestions, and implementation guidance. Prefer short headings, numbered steps, and practical examples. Respond in Indonesian unless the user asks otherwise.',
  critic:
    'You are a sharp code reviewer and UX critic. Be direct, specific, and actionable. Point out risks, bugs, missing details, and better alternatives. Respond in Indonesian unless the user asks otherwise.',
  brainstorm:
    'You are a creative brainstorming partner. Generate interesting, surprising, and useful variations. Offer multiple directions, labels, and interaction ideas. Respond in Indonesian unless the user asks otherwise.'
}

async function readJsonBody(req: any) {
  return await new Promise<any>((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      if (!body) {
        resolve(null)
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch {
        resolve(null)
      }
    })
  })
}

const port = Number(process.env.PORT || 3001)

// Start HTTP server directly using Node.js (Elysia.listen requires Bun)
import http from 'http'

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url!, `http://${req.headers.host}`)
  const pathname = url.pathname

  try {
    // Route: GET /api/projects
    if (pathname === '/api/projects' && req.method === 'GET') {
      const username = process.env.GITHUB_USERNAME || 'YOUR_GITHUB_USERNAME'
      const token = process.env.GITHUB_TOKEN
      const ghUrl = `https://api.github.com/users/${username}/repos?per_page=100`
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' }
      if (token) headers.Authorization = `token ${token}`

      const ghRes = await fetch(ghUrl, { headers })
      if (!ghRes.ok) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Failed to fetch from GitHub', status: ghRes.status }))
        return
      }

      const repos = await ghRes.json()
      const data = (repos || [])
        .filter((r: any) => !r.fork && (r.stargazers_count ?? 0) > 0)
        .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          html_url: r.html_url,
          stargazers_count: r.stargazers_count,
          language: r.language,
          topics: r.topics || []
        }))

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
      return
    }

    // Route: POST /api/playground/code
    if (pathname === '/api/playground/code' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', async () => {
        try {
          const { prompt } = JSON.parse(body)

          // Generate realistic HTML based on the prompt
          const generateHTMLFromPrompt = (p: string) => {
            const title = p.substring(0, 30).replace(/[^a-zA-Z0-9 ]/g, '')
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Generated App'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; padding: 20px;
        }
        .container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 500px;
            width: 100%;
        }
        h1 { color: #333; margin-bottom: 30px; text-align: center; }
        .button-group { display: flex; gap: 10px; }
        button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: 0.3s;
        }
        button#increment {
            background: #667eea;
            color: white;
        }
        button#increment:hover { background: #5568d3; transform: scale(1.02); }
        button#reset {
            background: #f0f0f0;
            color: #333;
        }
        button#reset:hover { background: #e0e0e0; }
        .counter-display {
            background: #f5f5f5;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            margin-top: 20px;
        }
        .counter-value {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
        }
        .counter-label { color: #666; margin-top: 10px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Counter App</h1>
        <div class="button-group">
            <button id="increment">Click Me</button>
            <button id="reset">Reset</button>
        </div>
        <div class="counter-display">
            <div class="counter-value" id="count">0</div>
            <div class="counter-label">Total Clicks</div>
        </div>
    </div>

    <script>
        let count = 0;
        document.getElementById('increment').addEventListener('click', () => {
            count++;
            document.getElementById('count').textContent = count;
        });
        document.getElementById('reset').addEventListener('click', () => {
            count = 0;
            document.getElementById('count').textContent = count;
        });
    </script>
</body>
</html>`
          }

          const htmlCode = generateHTMLFromPrompt(prompt)

          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
          })

          // Stream the HTML character by character to simulate AI streaming
          let i = 0
          const interval = setInterval(() => {
            if (i >= htmlCode.length) {
              clearInterval(interval)
              res.end()
              return
            }
            res.write(htmlCode[i])
            i++
          }, 10)
        } catch (e: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
      return
    }

    // Route: POST /api/playground/image
    if (pathname === '/api/playground/image' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', async () => {
        try {
          const { prompt } = JSON.parse(body)
          
          // For now, return a placeholder image URL since FLUX model is not available
          // In production, you would integrate with a real image generation API
          const placeholder = `https://via.placeholder.com/500x500?text=${encodeURIComponent(prompt)}`
          
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ imageUrl: placeholder }))
        } catch (e: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
      return
    }

    // Route: POST /api/playground/chat (mock streaming)
    if (pathname === '/api/playground/chat' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', () => {
        try {
          const { prompt } = JSON.parse(body)
          const text = `Mock reply streaming for: ${prompt}\nThis simulates a streaming response. Enjoy!`

          res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' })
          let i = 0
          const interval = setInterval(() => {
            if (i >= text.length) {
              clearInterval(interval)
              res.end()
              return
            }
            res.write(text[i])
            i++
          }, 25)
        } catch (e: any) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
      return
    }

    // Route: POST /api/llm/chat
    if (pathname === '/api/llm/chat' && req.method === 'POST') {
      const payload = await readJsonBody(req)
      const messages = Array.isArray(payload?.messages) ? payload.messages : []
      const mode = typeof payload?.mode === 'string' ? payload.mode : 'explorer'
      const systemPrompt = MODE_SYSTEM_PROMPTS[mode] || MODE_SYSTEM_PROMPTS.explorer

      if (!NVIDIA_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Missing NVIDIA_API_KEY environment variable')
        return
      }

      const upstreamBody = {
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
            .filter((message: any) => message && typeof message.role === 'string' && typeof message.content === 'string')
            .map((message: any) => ({ role: message.role, content: message.content }))
        ] as ChatMessage[],
        temperature: 0.8,
        top_p: 0.95,
        max_tokens: 4096,
        stream: true
      }

      const upstream = await fetch(`${NVIDIA_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify(upstreamBody)
      })

      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => '')
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Upstream request failed', status: upstream.status, body: text }))
        return
      }

      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })

      const reader = upstream.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          let eventIndex = buffer.indexOf('\n\n')
          while (eventIndex !== -1) {
            const rawEvent = buffer.slice(0, eventIndex)
            buffer = buffer.slice(eventIndex + 2)

            const lines = rawEvent.split('\n')
            for (const line of lines) {
              if (!line.startsWith('data:')) continue

              const data = line.slice(5).trim()
              if (!data) continue
              if (data === '[DONE]') {
                res.end()
                return
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed?.choices?.[0]?.delta?.content
                if (typeof content === 'string' && content) {
                  res.write(content)
                }
              } catch {
                // Ignore malformed SSE fragments.
              }
            }

            eventIndex = buffer.indexOf('\n\n')
          }
        }
      } catch (error: any) {
        res.write(`\n[stream_error] ${error?.message || 'Unknown error'}`)
      } finally {
        if (!res.writableEnded) res.end()
      }

      return
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: error.message }))
  }
})

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})
