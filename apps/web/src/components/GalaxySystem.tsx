import { onCleanup, onMount } from 'solid-js'

type Star = {
  x: number
  y: number
  r: number
  alpha: number
  twinkle: number
  driftX: number
  driftY: number
}

type Nebula = {
  x: number
  y: number
  rx: number
  ry: number
  hue: number
  alpha: number
  driftX: number
  driftY: number
  phase: number
}

type Planet = {
  name: string
  orbitX: number
  orbitY: number
  size: number
  speed: number
  angle: number
  hue: number
  ring?: boolean
  moon?: boolean
  moonSize?: number
  moonSpeed?: number
}

type Comet = {
  x: number
  y: number
  vx: number
  vy: number
  tail: number
  life: number
}

export default function GalaxySystem() {
  let canvas: HTMLCanvasElement | undefined
  let ctx: CanvasRenderingContext2D | null = null
  let raf = 0
  let t = 0

  const stars: Star[] = []
  const nebulas: Nebula[] = []
  const planets: Planet[] = []
  const comets: Comet[] = []

  let pointer = { x: -9999, y: -9999 }
  let pointerEase = { x: 0, y: 0 }

  function resize() {
    if (!canvas) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function seedScene() {
    stars.length = 0
    nebulas.length = 0
    planets.length = 0
    comets.length = 0

    const starCount = Math.min(260, Math.floor(window.innerWidth / 5))
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.35,
        alpha: 0.2 + Math.random() * 0.8,
        twinkle: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.06,
        driftY: (Math.random() - 0.5) * 0.06,
      })
    }

    const nebulaData = [
      { hue: 268, alpha: 0.12, scale: 0.22, phase: 0.0 },
      { hue: 314, alpha: 0.09, scale: 0.16, phase: 1.3 },
      { hue: 202, alpha: 0.1, scale: 0.2, phase: 2.1 },
    ]

    nebulaData.forEach((n, index) => {
      const base = Math.max(window.innerWidth, window.innerHeight)
      nebulas.push({
        x: window.innerWidth * (0.18 + index * 0.32),
        y: window.innerHeight * (0.22 + index * 0.18),
        rx: base * (0.35 + n.scale),
        ry: base * (0.18 + n.scale * 0.7),
        hue: n.hue,
        alpha: n.alpha,
        driftX: (Math.random() - 0.5) * 0.12,
        driftY: (Math.random() - 0.5) * 0.12,
        phase: n.phase,
      })
    })

    planets.push(
      { name: 'Mercury', orbitX: 92, orbitY: 64, size: 5, speed: 0.028, angle: 0.9, hue: 30 },
      { name: 'Venus', orbitX: 136, orbitY: 108, size: 8, speed: 0.021, angle: 2.2, hue: 42 },
      { name: 'Earth', orbitX: 188, orbitY: 150, size: 9, speed: 0.016, angle: 4.1, hue: 210, moon: true, moonSize: 2.4, moonSpeed: 0.09 },
      { name: 'Mars', orbitX: 236, orbitY: 180, size: 6.5, speed: 0.013, angle: 1.4, hue: 16 },
      { name: 'Jupiter', orbitX: 310, orbitY: 248, size: 19, speed: 0.008, angle: 3.3, hue: 32, ring: false },
      { name: 'Saturn', orbitX: 385, orbitY: 300, size: 16, speed: 0.006, angle: 0.5, hue: 48, ring: true },
      { name: 'Neptune', orbitX: 470, orbitY: 352, size: 11, speed: 0.004, angle: 5.0, hue: 224 },
    )

    const cometCount = 4
    for (let i = 0; i < cometCount; i++) {
      comets.push({
        x: -100 - Math.random() * window.innerWidth * 0.4,
        y: window.innerHeight * (0.12 + Math.random() * 0.72),
        vx: 2.3 + Math.random() * 2.1,
        vy: -0.3 + Math.random() * 0.6,
        tail: 120 + Math.random() * 140,
        life: 1 + Math.random() * 1.8,
      })
    }
  }

  function bgGradient(w: number, h: number) {
    if (!ctx) return
    const grad = ctx.createRadialGradient(w * 0.52, h * 0.45, 0, w * 0.52, h * 0.45, Math.max(w, h) * 0.9)
    grad.addColorStop(0, 'rgba(25, 19, 46, 0.95)')
    grad.addColorStop(0.45, 'rgba(10, 10, 18, 0.82)')
    grad.addColorStop(1, 'rgba(2, 2, 8, 1)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  function drawNebulae(w: number, h: number) {
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    nebulas.forEach((n, i) => {
      n.x += Math.sin(t * 0.0004 + n.phase + i) * 0.08 + n.driftX
      n.y += Math.cos(t * 0.0003 + n.phase * 1.3) * 0.06 + n.driftY
      const x = n.x + pointerEase.x * 0.04
      const y = n.y + pointerEase.y * 0.04
      const rx = n.rx * (0.98 + Math.sin(t * 0.00035 + n.phase) * 0.02)
      const ry = n.ry * (0.98 + Math.cos(t * 0.00028 + n.phase) * 0.02)
      const grd = ctx.createRadialGradient(x, y, 0, x, y, rx)
      grd.addColorStop(0, `hsla(${n.hue}, 88%, 60%, ${n.alpha})`)
      grd.addColorStop(0.36, `hsla(${n.hue + 12}, 82%, 42%, ${n.alpha * 0.45})`)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, (Math.sin(n.phase) * Math.PI) / 18, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.restore()
  }

  function drawStars(w: number, h: number) {
    if (!ctx) return
    ctx.save()
    stars.forEach((s) => {
      s.x += s.driftX
      s.y += s.driftY
      if (s.x > w + 10) s.x = -10
      if (s.x < -10) s.x = w + 10
      if (s.y > h + 10) s.y = -10
      if (s.y < -10) s.y = h + 10

      const pulse = 0.5 + Math.sin(t * 0.0012 + s.twinkle) * 0.5
      ctx!.beginPath()
      ctx!.fillStyle = `rgba(255,255,255,${s.alpha * pulse})`
      ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx!.fill()
    })
    ctx.restore()
  }

  function drawBlackHole(w: number, h: number) {
    if (!ctx) return
    const x = w * 0.83 + Math.sin(t * 0.00025) * 18
    const y = h * 0.28 + Math.cos(t * 0.00028) * 14
    const radius = 62

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.3)
    halo.addColorStop(0, 'rgba(255,255,255,0.15)')
    halo.addColorStop(0.18, 'rgba(180,120,255,0.14)')
    halo.addColorStop(0.42, 'rgba(70,40,120,0.08)')
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, radius * 2.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(228, 190, 255, 0.55)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x, y, 95, 28, -0.42, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(119, 92, 230, 0.25)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.ellipse(x, y, 82, 20, -0.42, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = 'rgba(0,0,0,0.98)'
    ctx.beginPath()
    ctx.arc(x, y, 24, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  function drawSun(w: number, h: number) {
    if (!ctx) return
    const x = w * 0.5 + pointerEase.x * 0.02
    const y = h * 0.58 + pointerEase.y * 0.02

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 220)
    glow.addColorStop(0, 'rgba(255, 246, 194, 1)')
    glow.addColorStop(0.18, 'rgba(255, 205, 90, 0.92)')
    glow.addColorStop(0.4, 'rgba(255, 132, 66, 0.35)')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, 220, 0, Math.PI * 2)
    ctx.fill()

    const core = ctx.createRadialGradient(x - 18, y - 18, 0, x, y, 48)
    core.addColorStop(0, 'rgba(255,255,255,1)')
    core.addColorStop(0.3, 'rgba(255,244,186,0.95)')
    core.addColorStop(1, 'rgba(255,179,60,0.96)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(x, y, 48, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.arc(x, y, 70 + i * 10 + Math.sin(t * 0.002 + i) * 2.5, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  function planetPos(centerX: number, centerY: number, planet: Planet) {
    const x = centerX + Math.cos(planet.angle) * planet.orbitX
    const y = centerY + Math.sin(planet.angle) * planet.orbitY
    return { x, y }
  }

  function drawOrbit(centerX: number, centerY: number, planet: Planet) {
    if (!ctx) return
    ctx.save()
    ctx.strokeStyle = 'rgba(174, 173, 220, 0.1)'
    ctx.setLineDash([4, 8])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, planet.orbitX, planet.orbitY, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  function drawPlanet(centerX: number, centerY: number, planet: Planet) {
    if (!ctx) return
    planet.angle += planet.speed
    const { x, y } = planetPos(centerX, centerY, planet)
    const wobble = Math.sin(t * 0.001 + planet.speed * 100) * 0.6

    drawOrbit(centerX, centerY, planet)

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    const body = ctx.createRadialGradient(x - planet.size * 0.4, y - planet.size * 0.4, 0, x, y, planet.size * 2.2)
    body.addColorStop(0, `hsla(${planet.hue}, 88%, 74%, 1)`)
    body.addColorStop(0.38, `hsla(${planet.hue}, 70%, 48%, 1)`)
    body.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(x, y, planet.size + wobble, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.arc(x - planet.size * 0.35, y - planet.size * 0.35, planet.size * 0.28, 0, Math.PI * 2)
    ctx.fill()

    if (planet.ring) {
      ctx.strokeStyle = 'rgba(240, 219, 165, 0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(x, y, planet.size * 1.8, planet.size * 0.72, -0.48, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
      ctx.beginPath()
      ctx.ellipse(x, y, planet.size * 2.1, planet.size * 0.94, -0.48, 0, Math.PI * 2)
      ctx.stroke()
    }

    if (planet.moon) {
      const moonAngle = planet.angle * (planet.moonSpeed || 0.09) * 6
      const moonDistance = planet.size * 2.9
      const moonX = x + Math.cos(moonAngle) * moonDistance
      const moonY = y + Math.sin(moonAngle) * moonDistance * 0.72
      ctx.fillStyle = 'rgba(240, 246, 255, 0.9)'
      ctx.beginPath()
      ctx.arc(moonX, moonY, planet.moonSize || 2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  function drawComets() {
    if (!ctx || !canvas) return
    const w = window.innerWidth
    const h = window.innerHeight

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    comets.forEach((c, index) => {
      c.x += c.vx
      c.y += c.vy + Math.sin(t * 0.0005 + index) * 0.03
      c.life -= 0.002

      if (c.x > w + 160 || c.y < -160 || c.life <= 0) {
        c.x = -180 - Math.random() * w * 0.5
        c.y = h * (0.12 + Math.random() * 0.7)
        c.vx = 2.3 + Math.random() * 2.3
        c.vy = -0.3 + Math.random() * 0.7
        c.tail = 120 + Math.random() * 150
        c.life = 1 + Math.random() * 1.8
      }

      const tailX = c.x - c.vx * c.tail
      const tailY = c.y - c.vy * c.tail
      const gradient = ctx.createLinearGradient(c.x, c.y, tailX, tailY)
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
      gradient.addColorStop(0.25, 'rgba(180,220,255,0.45)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.strokeStyle = gradient
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(tailX, tailY)
      ctx.stroke()

      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      ctx.arc(c.x, c.y, 2.4, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.restore()
  }

  function drawDust(w: number, h: number) {
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 38; i++) {
      const x = (w * 0.08 + i * 24 + (Math.sin(t * 0.0004 + i) * 18)) % w
      const y = h * (0.16 + (i % 7) * 0.11) + Math.cos(t * 0.0003 + i) * 8
      ctx.fillStyle = `rgba(255,255,255,${0.02 + (i % 5) * 0.01})`
      ctx.beginPath()
      ctx.arc(x, y, 0.8 + (i % 3) * 0.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  function drawScene() {
    if (!ctx || !canvas) return
    const w = window.innerWidth
    const h = window.innerHeight
    const centerX = w * 0.52 + pointerEase.x * 0.03
    const centerY = h * 0.57 + pointerEase.y * 0.03

    bgGradient(w, h)
    drawNebulae(w, h)
    drawStars(w, h)
    drawDust(w, h)
    drawBlackHole(w, h)
    drawSun(w, h)

    planets.forEach((planet) => drawPlanet(centerX, centerY, planet))
    drawComets()

    // foreground haze for depth
    ctx.save()
    const haze = ctx.createLinearGradient(0, h * 0.7, 0, h)
    haze.addColorStop(0, 'rgba(0,0,0,0)')
    haze.addColorStop(1, 'rgba(3, 3, 8, 0.65)')
    ctx.fillStyle = haze
    ctx.fillRect(0, h * 0.68, w, h * 0.32)
    ctx.restore()
  }

  function loop() {
    t += 1
    pointerEase.x += (pointer.x - pointerEase.x) * 0.04
    pointerEase.y += (pointer.y - pointerEase.y) * 0.04
    drawScene()
    raf = requestAnimationFrame(loop)
  }

  onMount(() => {
    if (!canvas) return
    ctx = canvas.getContext('2d')
    resize()
    seedScene()

    const onMove = (e: MouseEvent) => {
      pointer.x = e.clientX - window.innerWidth * 0.5
      pointer.y = e.clientY - window.innerHeight * 0.5
    }
    const onLeave = () => {
      pointer.x = -9999
      pointer.y = -9999
    }
    const onResize = () => {
      resize()
      seedScene()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', onResize)

    raf = requestAnimationFrame(loop)

    onCleanup(() => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', onResize)
    })
  })

  return (
    <section class="relative w-screen" style="margin-left:calc(50% - 50vw); margin-right:calc(50% - 50vw); min-height:calc(100svh - 12rem); overflow:hidden; isolation:isolate;">
      <div class="absolute inset-0 z-0">
        <canvas ref={canvas!} class="fixed inset-0 h-full w-full pointer-events-none" aria-hidden="true" />
      </div>

      <div class="relative z-10 flex min-h-[calc(100svh-12rem)] flex-col justify-between px-6 py-6 sm:px-10 sm:py-8">
        <header class="max-w-2xl">
          <p class="text-[0.72rem] uppercase tracking-[0.55em] text-white/55">Projects / Galactic Atlas</p>
          <h1 class="mt-4 max-w-xl font-display text-4xl leading-[0.95] text-white sm:text-6xl">
            Tata surya, nebula, dan singularitas dalam satu layar.
          </h1>
          <p class="mt-4 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
            Ini bukan daftar project. Ini arena visual untuk melihat planet mengorbit, komet melintas, dan ruang
            gelap berdenyut di pinggir galaksi.
          </p>
        </header>

        <div class="grid gap-4 text-sm text-white/65 sm:max-w-3xl sm:grid-cols-3">
          <p>
            <span class="block text-white/90">Orbit</span>
            Planet bergerak di lintasan elips dengan kecepatan berbeda.
          </p>
          <p>
            <span class="block text-white/90">Nebula</span>
            Awan warna bercahaya membentuk kedalaman dan atmosfer ruang angkasa.
          </p>
          <p>
            <span class="block text-white/90">Singularitas</span>
            Black hole jauh di latar untuk memberi rasa gravitasi dan skala.
          </p>
        </div>
      </div>
    </section>
  )
}
