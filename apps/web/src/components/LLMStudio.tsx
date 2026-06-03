import { createMemo, createSignal, For, Show } from 'solid-js'
import { API_BASE } from '../lib/api'

type ChatRole = 'system' | 'user' | 'assistant'
type ChatMessage = {
  role: ChatRole
  content: string
}

type ModeId = 'explorer' | 'builder' | 'critic' | 'brainstorm'

const MODES: Array<{
  id: ModeId
  label: string
  desc: string
}> = [
  { id: 'explorer', label: 'Explorer', desc: 'Jawaban jelas, santai, dan memandu langkah berikutnya.' },
  { id: 'builder', label: 'Builder', desc: 'Ubah ide jadi langkah implementasi dan struktur yang konkret.' },
  { id: 'critic', label: 'Critic', desc: 'Review tajam, cari risiko, bug, dan kelemahan.' },
  { id: 'brainstorm', label: 'Brainstorm', desc: 'Cari alternatif ide, konsep, dan pendekatan yang unik.' }
]

const PROMPTS: Record<ModeId, string[]> = {
  explorer: [
    'Jelaskan cara membuat playground AI yang menarik untuk portfolio.',
    'Bantu saya merancang pengalaman chat yang terasa premium.',
    'Apa yang harus saya tampilkan di halaman Project supaya lebih hidup?'
  ],
  builder: [
    'Rancang struktur backend untuk chat streaming yang aman.',
    'Buatkan roadmap fitur interaktif untuk halaman AI studio.',
    'Ubah ide saya menjadi daftar komponen frontend yang jelas.'
  ],
  critic: [
    'Review desain halaman project saya dan cari kelemahan UX-nya.',
    'Cek apakah alur chat ini terlalu panjang atau membingungkan.',
    'Berikan kritik jujur terhadap struktur kode yang saya pakai.'
  ],
  brainstorm: [
    'Kasih 10 ide interaksi unik untuk halaman project AI.',
    'Buat beberapa konsep tema visual yang lebih gila.',
    'Sebutkan variasi fitur chat yang terasa berbeda dari website biasa.'
  ]
}

function systemLabel(mode: ModeId) {
  switch (mode) {
    case 'builder':
      return 'builder mode'
    case 'critic':
      return 'critic mode'
    case 'brainstorm':
      return 'brainstorm mode'
    default:
      return 'explorer mode'
  }
}

export default function LLMStudio() {
  const [mode, setMode] = createSignal<ModeId>('explorer')
  const [input, setInput] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [messages, setMessages] = createSignal<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Tanyakan apa saja. Pilih mode di kanan untuk mengubah gaya jawaban: lebih eksploratif, lebih teknis, lebih kritis, atau lebih kreatif.'
    }
  ])
  let transcriptRef: HTMLDivElement | undefined

  const activePrompts = createMemo(() => PROMPTS[mode()])

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (!transcriptRef) return
      transcriptRef.scrollTop = transcriptRef.scrollHeight
    })
  }

  async function sendPrompt(promptText?: string) {
    const text = (promptText ?? input()).trim()
    if (!text || loading()) return

    const nextMessages = [
      ...messages(),
      { role: 'user' as const, content: text },
      { role: 'assistant' as const, content: '' }
    ]

    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    scrollToBottom()

    const assistantIndex = nextMessages.length - 1

    try {
      const res = await fetch(`${API_BASE}/api/llm/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: mode(),
          messages: nextMessages.slice(0, -1)
        })
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        setMessages((prev) => {
          const copy = [...prev]
          copy[assistantIndex] = {
            role: 'assistant',
            content: errorText || `Request failed with status ${res.status}`
          }
          return copy
        })
        setLoading(false)
        scrollToBottom()
        return
      }

      if (!res.body) {
        const textResponse = await res.text()
        setMessages((prev) => {
          const copy = [...prev]
          copy[assistantIndex] = { role: 'assistant', content: textResponse }
          return copy
        })
        setLoading(false)
        scrollToBottom()
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let streamed = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          streamed += decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const copy = [...prev]
            copy[assistantIndex] = { role: 'assistant', content: streamed }
            return copy
          })
          scrollToBottom()
        }
      }

      setLoading(false)
      scrollToBottom()
    } catch (error: any) {
      setMessages((prev) => {
        const copy = [...prev]
        copy[assistantIndex] = {
          role: 'assistant',
          content: error?.message || 'Terjadi error saat menghubungi model.'
        }
        return copy
      })
      setLoading(false)
      scrollToBottom()
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendPrompt()
    }
  }

  return (
    <section class="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div class="relative overflow-hidden border border-white/10 bg-slate-950/45 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div class="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
          <div class="absolute -left-24 top-10 h-64 w-64 rounded-full bg-fuchsia-500/12 blur-3xl"></div>
          <div class="absolute right-0 top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"></div>
          <div class="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl"></div>
        </div>

        <div class="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p class="text-[0.72rem] uppercase tracking-[0.55em] text-white/45">Project / NVIDIA GLM Studio</p>
            <h1 class="mt-4 max-w-2xl font-display text-4xl leading-[0.95] text-white sm:text-6xl">
              Ubah Projects jadi studio tanya jawab yang hidup.
            </h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Ini bukan chat kosong. Ada mode eksplorasi, builder, critic, dan brainstorm. Jawaban disusun streaming
              dari NVIDIA GLM melalui backend, jadi API key tetap aman di server.
            </p>

            <div class="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-white/55">
              <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2">Streamed answers</span>
              <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2">Mode aware</span>
              <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2">Interactive prompts</span>
            </div>

            <div class="mt-8 grid gap-4 md:grid-cols-2">
              <For each={activePrompts()}>
                {(prompt) => (
                  <button
                    type="button"
                    class="group border border-white/10 bg-white/5 p-4 text-left text-sm leading-6 text-white/75 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
                    onClick={() => sendPrompt(prompt)}
                  >
                    <span class="block text-[0.68rem] uppercase tracking-[0.36em] text-white/40">
                      Quick prompt
                    </span>
                    <span class="mt-2 block">{prompt}</span>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <For each={MODES}>
                {(item) => (
                  <button
                    type="button"
                    classList={{
                      'border-cyan-300/50 bg-cyan-300/12 text-white': mode() === item.id,
                      'border-white/10 bg-white/5 text-white/70': mode() !== item.id
                    }}
                    class="border p-4 text-left transition hover:border-white/25 hover:bg-white/10"
                    onClick={() => setMode(item.id)}
                  >
                    <span class="block text-sm font-semibold">{item.label}</span>
                    <span class="mt-1 block text-xs leading-5 text-white/55">{item.desc}</span>
                  </button>
                )}
              </For>
            </div>

            <div class="border border-white/10 bg-black/25 p-4">
              <p class="text-xs uppercase tracking-[0.4em] text-white/45">Mode</p>
              <p class="mt-2 text-sm text-white/70">
                {systemLabel(mode())} mengubah gaya jawaban tanpa mengubah model.
              </p>
            </div>

            <div class="border border-white/10 bg-black/25 p-4">
              <p class="text-xs uppercase tracking-[0.4em] text-white/45">Backend</p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                API key tetap di server. Frontend hanya memanggil endpoint lokal yang meneruskan request ke NVIDIA.
              </p>
            </div>
          </div>
        </div>

        <div class="relative z-10 mt-8 border border-white/10 bg-slate-950/65 p-4">
          <div
            ref={transcriptRef}
            class="max-h-[32rem] overflow-y-auto pr-2"
          >
            <For each={messages()}>
              {(message) => (
                <div classList={{ 'justify-end': message.role === 'user' }} class="mb-4 flex">
                  <div
                    classList={{
                      'bg-cyan-300/12 border-cyan-300/25 text-white': message.role === 'user',
                      'bg-white/5 border-white/10 text-white/80': message.role !== 'user'
                    }}
                    class="max-w-[90%] border px-4 py-3 text-sm leading-7 sm:max-w-[82%]"
                  >
                    <p class="mb-2 text-[0.65rem] uppercase tracking-[0.35em] text-white/35">
                      {message.role === 'user' ? 'You' : 'GLM'}
                    </p>
                    <pre class="whitespace-pre-wrap font-sans">{message.content || (loading() && message.role === 'assistant' ? 'Menulis jawaban...' : '')}</pre>
                  </div>
                </div>
              )}
            </For>
          </div>

          <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
            <textarea
              rows={3}
              value={input()}
              placeholder="Tulis pertanyaan, ide, atau potongan kode di sini..."
              class="min-h-[88px] resize-y border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/40"
              onInput={(e) => setInput((e.currentTarget as HTMLTextAreaElement).value)}
              onKeyDown={onKeyDown}
            />
            <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                class="min-w-[140px] border border-cyan-300/40 bg-cyan-300/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => sendPrompt()}
                disabled={loading()}
              >
                {loading() ? 'Streaming...' : 'Send'}
              </button>
              <button
                type="button"
                class="min-w-[140px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                onClick={() => {
                  setMessages([
                    {
                      role: 'assistant',
                      content:
                        'Tanyakan apa saja. Pilih mode di kanan untuk mengubah gaya jawaban: lebih eksploratif, lebih teknis, lebih kritis, atau lebih kreatif.'
                    }
                  ])
                  setInput('')
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
