import { createSignal } from 'solid-js'
import { API_BASE } from '../lib/api'

export default function PlaygroundChat(){
  const [prompt, setPrompt] = createSignal('Say something creative...')
  const [streamed, setStreamed] = createSignal('')
  const [loading, setLoading] = createSignal(false)

  async function start(){
    setStreamed('')
    setLoading(true)
    const res = await fetch(`${API_BASE}/api/playground/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt() })
    })
    if (!res.body) {
      const text = await res.text()
      setStreamed(text)
      setLoading(false)
      return
    }

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let done = false
    while (!done) {
      const { value, done: d } = await reader.read()
      done = d
      if (value) {
        const chunk = dec.decode(value)
        setStreamed(s => s + chunk)
      }
    }
    setLoading(false)
  }

  return (
    <section class="py-8">
      <h2 class="text-3xl font-display mb-4">AI Playground</h2>
      <div class="bg-slate-900 p-4 rounded-lg">
        <div class="min-h-[120px] p-4 bg-black/30 rounded text-sm whitespace-pre-wrap">{streamed()}</div>
        <div class="mt-4 flex gap-2">
          <input class="flex-1 px-3 py-2 rounded bg-slate-800" value={prompt()} onInput={(e:any)=> setPrompt(e.target.value)} />
          <button class="px-4 py-2 bg-accent rounded" onClick={start} disabled={loading()}>Send</button>
        </div>
      </div>
    </section>
  )
}
