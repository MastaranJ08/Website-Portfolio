import CosmicBackground from './CosmicBackground'

export default function Hero() {
  return (
    <section class="relative overflow-hidden py-16 md:py-24">
      <CosmicBackground />
      <div
        class="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            'radial-gradient(600px 400px at 50% 40%, rgba(124,58,237,0.15), transparent)',
        }}
      ></div>

      <div class="relative z-10 max-w-[1200px] mx-auto px-4">
        <div class="max-w-3xl">
          <p class="text-sm uppercase tracking-[0.28em] text-gray-400 mb-4">
            Portfolio / Mobile / AI
          </p>
          <h1 class="text-5xl md:text-6xl font-display leading-tight mb-6">
            Building clean products, mobile apps, and AI experiments.
          </h1>
          <p class="text-lg text-gray-300 leading-relaxed max-w-2xl mb-8">
            I design and build software with a focus on practical interfaces,
            strong engineering structure, and interactive experiences that feel
            intentional instead of generic.
          </p>

          <div class="flex flex-wrap gap-3 mb-10">
            <a
              href="/projects/"
              class="px-5 py-3 rounded-md bg-indigo-600 text-white font-medium"
            >
              View Projects
            </a>
            <a
              href="/playground/"
              class="px-5 py-3 rounded-md bg-slate-800 text-gray-100 font-medium"
            >
              Open Playground
            </a>
            <a
              href="/about/"
              class="px-5 py-3 rounded-md border border-white/10 text-gray-200 font-medium"
            >
              About Me
            </a>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div class="rounded-xl bg-black/40 border border-white/10 p-5 backdrop-blur-sm">
            <h2 class="text-lg font-semibold mb-2">Mobile</h2>
            <p class="text-sm text-gray-300 leading-relaxed">
              Jetpack Compose, Kotlin, and Flutter experiences built for
              clarity and speed.
            </p>
          </div>
          <div class="rounded-xl bg-black/40 border border-white/10 p-5 backdrop-blur-sm">
            <h2 class="text-lg font-semibold mb-2">Web</h2>
            <p class="text-sm text-gray-300 leading-relaxed">
              Astro, Solid, and clean frontend integration with an emphasis on
              routing and maintainability.
            </p>
          </div>
          <div class="rounded-xl bg-black/40 border border-white/10 p-5 backdrop-blur-sm">
            <h2 class="text-lg font-semibold mb-2">AI Playground</h2>
            <p class="text-sm text-gray-300 leading-relaxed">
              The interactive sandbox lives on its own page at
              <span class="text-gray-100">/playground/</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
