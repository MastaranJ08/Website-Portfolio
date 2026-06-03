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
  moonCount?: number
  tilt?: number
  atmosphere?: boolean
  bands?: boolean
  spots?: boolean
  dusty?: boolean
  clouds?: boolean
  ice?: boolean
}

type Comet = {
  x: number
  y: number
  vx: number
  vy: number
  tail: number
  life: number
  hue: number
}

type GravityWell = {
  x: number
  y: number
  power: number
  radius: number
  life: number
  kind: 'wormhole' | 'singularity'
}

type Dust = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: number
  alpha: number
  trail: number[]
}

const PLANET_TEMPLATES: Planet[] = [
  { name: 'Mercury', orbitX: 92, orbitY: 62, size: 5, speed: 0.038, angle: 0.2, hue: 28, moonCount: 0, dusty: true },
  { name: 'Venus', orbitX: 140, orbitY: 106, size: 8, speed: 0.028, angle: 1.4, hue: 38, moonCount: 0, atmosphere: true, clouds: true },
  { name: 'Earth', orbitX: 194, orbitY: 146, size: 9, speed: 0.02, angle: 2.7, hue: 208, moonCount: 1, tilt: 0.1, atmosphere: true, clouds: true },
  { name: 'Mars', orbitX: 246, orbitY: 186, size: 6.5, speed: 0.016, angle: 3.7, hue: 15, moonCount: 2, tilt: -0.12, dusty: true, spots: true },
  { name: 'Jupiter', orbitX: 314, orbitY: 246, size: 18, speed: 0.009, angle: 4.5, hue: 34, moonCount: 4, bands: true, clouds: true },
  { name: 'Saturn', orbitX: 388, orbitY: 304, size: 16, speed: 0.007, angle: 5.4, hue: 47, moonCount: 5, ring: true, tilt: -0.36, bands: true, clouds: true },
  { name: 'Uranus', orbitX: 448, orbitY: 336, size: 11, speed: 0.005, angle: 0.7, hue: 190, moonCount: 2, tilt: 0.14, atmosphere: true, clouds: true, ice: true },
  { name: 'Neptune', orbitX: 516, orbitY: 380, size: 11, speed: 0.004, angle: 2.1, hue: 221, moonCount: 2, tilt: -0.08, atmosphere: true, clouds: true, ice: true },
]

export default function GalaxySandbox() {
  let canvas: HTMLCanvasElement | undefined
  let ctx: CanvasRenderingContext2D | null = null
  let raf = 0
  let tick = 0
  let lastFrame = 0

  const stars: Star[] = []
  const nebulas: Nebula[] = []
  const planets: Planet[] = PLANET_TEMPLATES.map((planet) => ({ ...planet }))
  const comets: Comet[] = []
  const gravityWells: GravityWell[] = []
  const dust: Dust[] = []
  const asteroidBelt: Dust[] = []

  let chaos = 0.68
  let zoom = 1
  let pointer = { x: -9999, y: -9999 }
  let pointerEase = { x: 0, y: 0 }
  let dragging = false
  let dragOffset = { x: 0, y: 0 }
  let systemAnchor = { x: 0, y: 0 }
  const SPEED_MULTIPLIER = 3

  function resize() {
    if (!canvas) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function rand(min: number, max: number) {
    return min + Math.random() * (max - min)
  }

  function seedScene() {
    stars.length = 0
    nebulas.length = 0
    comets.length = 0
    gravityWells.length = 0
    dust.length = 0
    asteroidBelt.length = 0

    const starCount = Math.min(360, Math.floor(window.innerWidth / 4))
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.6 + 0.25,
        alpha: 0.12 + Math.random() * 0.85,
        twinkle: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.08,
        driftY: (Math.random() - 0.5) * 0.08,
      })
    }

    const nebulaPreset = [
      { hue: 270, alpha: 0.14, scale: 0.24, phase: 0 },
      { hue: 325, alpha: 0.1, scale: 0.18, phase: 1.2 },
      { hue: 188, alpha: 0.1, scale: 0.22, phase: 2.3 },
      { hue: 48, alpha: 0.06, scale: 0.14, phase: 3.1 },
    ]
    nebulaPreset.forEach((n, index) => {
      const base = Math.max(window.innerWidth, window.innerHeight)
      nebulas.push({
        x: window.innerWidth * (0.12 + index * 0.24),
        y: window.innerHeight * (0.1 + index * 0.14),
        rx: base * (0.38 + n.scale),
        ry: base * (0.18 + n.scale * 0.7),
        hue: n.hue,
        alpha: n.alpha,
        driftX: rand(-0.1, 0.1),
        driftY: rand(-0.1, 0.1),
        phase: n.phase,
      })
    })

    for (let i = 0; i < 6; i++) {
      comets.push({
        x: -200 - Math.random() * window.innerWidth,
        y: window.innerHeight * rand(0.06, 0.92),
        vx: rand(2.5, 4.6),
        vy: rand(-0.45, 0.65),
        tail: rand(120, 220),
        life: rand(1, 3),
        hue: rand(190, 260),
      })
    }

    for (let i = 0; i < 170; i++) {
      dust.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: rand(-0.22, 0.22),
        vy: rand(-0.22, 0.22),
        r: rand(0.5, 1.2),
        hue: rand(180, 330),
        alpha: rand(0.05, 0.24),
        trail: [],
      })
    }

    for (let i = 0; i < 320; i++) {
      const angle = rand(0, Math.PI * 2)
      const radius = rand(265, 292)
      asteroidBelt.push({
        x: window.innerWidth * 0.5 + Math.cos(angle) * radius,
        y: window.innerHeight * 0.56 + Math.sin(angle) * radius * 0.68,
        vx: rand(-0.12, 0.12),
        vy: rand(-0.12, 0.12),
        r: rand(0.45, 1.55),
        hue: rand(28, 60),
        alpha: rand(0.12, 0.38),
        trail: [],
      })
    }
  }

  function addGravityWell(x: number, y: number, kind: GravityWell['kind']) {
    gravityWells.unshift({
      x,
      y,
      power: kind === 'singularity' ? rand(0.9, 1.4) : rand(0.5, 0.85),
      radius: kind === 'singularity' ? rand(86, 118) : rand(58, 92),
      life: kind === 'singularity' ? 10 : 7,
      kind,
    })
    if (gravityWells.length > 4) gravityWells.pop()
  }

  function bgGradient(w: number, h: number) {
    if (!ctx) return
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 1.05)
    grad.addColorStop(0, 'rgba(20, 18, 38, 0.95)')
    grad.addColorStop(0.42, 'rgba(8, 8, 18, 0.88)')
    grad.addColorStop(1, 'rgba(1, 1, 5, 1)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  function drawNebulae() {
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    nebulas.forEach((n, i) => {
      const pulse = 1 + Math.sin(tick * 0.0012 + n.phase + i) * 0.08
      n.x += Math.sin(tick * 0.0011 + n.phase + i) * 0.35 + n.driftX
      n.y += Math.cos(tick * 0.0009 + n.phase * 1.2) * 0.26 + n.driftY
      const rx = n.rx * pulse
      const ry = n.ry * (0.96 + Math.cos(tick * 0.001 + n.phase) * 0.06)
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rx)
      grd.addColorStop(0, `hsla(${n.hue}, 90%, 65%, ${n.alpha})`)
      grd.addColorStop(0.4, `hsla(${n.hue + 8}, 82%, 48%, ${n.alpha * 0.48})`)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.ellipse(n.x, n.y, rx, ry, Math.sin(tick * 0.0008 + n.phase) * 0.24, 0, Math.PI * 2)
      ctx.fill()

      ctx.filter = 'blur(18px)'
      ctx.strokeStyle = `hsla(${n.hue + 14}, 90%, 72%, ${n.alpha * 0.18})`
      ctx.lineWidth = 18
      ctx.beginPath()
      ctx.ellipse(n.x, n.y, rx * 0.78, ry * 0.72, Math.sin(tick * 0.0006 + n.phase) * 0.28, 0, Math.PI * 2)
      ctx.stroke()
      ctx.filter = 'none'
    })
    ctx.restore()
  }

  function drawStars() {
    if (!ctx) return
    ctx.save()
    stars.forEach((s) => {
      s.x += s.driftX
      s.y += s.driftY
      if (s.x > window.innerWidth + 10) s.x = -10
      if (s.x < -10) s.x = window.innerWidth + 10
      if (s.y > window.innerHeight + 10) s.y = -10
      if (s.y < -10) s.y = window.innerHeight + 10

      const pulse = 0.42 + Math.sin(tick * 0.0014 + s.twinkle) * 0.58
      const flicker = 0.72 + Math.sin(tick * 0.006 + s.twinkle * 3) * 0.28
      ctx!.fillStyle = `rgba(255,255,255,${s.alpha * pulse})`
      ctx!.beginPath()
      ctx!.arc(s.x, s.y, s.r * flicker, 0, Math.PI * 2)
      ctx!.fill()

      if (s.r > 1.2) {
        ctx!.strokeStyle = `rgba(255,255,255,${0.08 * pulse})`
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.moveTo(s.x - 2.4, s.y)
        ctx!.lineTo(s.x + 2.4, s.y)
        ctx!.moveTo(s.x, s.y - 2.4)
        ctx!.lineTo(s.x, s.y + 2.4)
        ctx!.stroke()
      }
    })
    ctx.restore()
  }

  function drawLensFlare(sunX: number, sunY: number, blackHoleX: number, blackHoleY: number) {
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    const dx = blackHoleX - sunX
    const dy = blackHoleY - sunY
    for (let i = 1; i <= 5; i++) {
      const tpos = i / 6
      const x = sunX + dx * tpos
      const y = sunY + dy * tpos
      const size = 12 + i * 9
      ctx.filter = 'blur(10px)'
      const flare = ctx.createRadialGradient(x, y, 0, x, y, size)
      flare.addColorStop(0, `rgba(255,255,255,${0.07 - i * 0.006})`)
      flare.addColorStop(0.25, `hsla(${40 + i * 18}, 100%, 75%, ${0.09 - i * 0.008})`)
      flare.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = flare
      ctx.beginPath()
      ctx.arc(x, y, size * 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.filter = 'none'
    }

    ctx.restore()
  }

  function drawDustField(centerX: number, centerY: number) {
    if (!ctx) return
    ctx.save()
    for (const dot of dust) {
      const dx = centerX - dot.x
      const dy = centerY - dot.y
      const dist = Math.max(60, Math.sqrt(dx * dx + dy * dy))
      const field = Math.min(1, 280 / dist)

      gravityWells.forEach((well) => {
        const wx = well.x - dot.x
        const wy = well.y - dot.y
        const wdist = Math.max(40, Math.sqrt(wx * wx + wy * wy))
        const pull = (well.power * well.radius) / (wdist * wdist)
        dot.vx += (wx / wdist) * pull * 0.11
        dot.vy += (wy / wdist) * pull * 0.11
      })

      dot.vx += Math.sin(tick * 0.0007 + dot.y * 0.002) * 0.006
      dot.vy += Math.cos(tick * 0.0006 + dot.x * 0.002) * 0.006
      dot.vx += (Math.random() - 0.5) * 0.003 * chaos
      dot.vy += (Math.random() - 0.5) * 0.003 * chaos
      dot.x += dot.vx
      dot.y += dot.vy

      if (dot.x < -20) dot.x = window.innerWidth + 20
      if (dot.x > window.innerWidth + 20) dot.x = -20
      if (dot.y < -20) dot.y = window.innerHeight + 20
      if (dot.y > window.innerHeight + 20) dot.y = -20

      dot.trail.push(dot.x)
      dot.trail.push(dot.y)
      if (dot.trail.length > 10) dot.trail.splice(0, 2)

      ctx.fillStyle = `hsla(${dot.hue}, 90%, 80%, ${dot.alpha * field})`
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  function drawAsteroidBelt(centerX: number, centerY: number) {
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (const rock of asteroidBelt) {
      const dx = centerX - rock.x
      const dy = centerY - rock.y
      const dist = Math.max(60, Math.sqrt(dx * dx + dy * dy))
      const pull = Math.min(1.3, 190 / dist)
      rock.vx += (dx / dist) * pull * 0.0018
      rock.vy += (dy / dist) * pull * 0.0018

      const spin = 0.0018 + (0.45 / dist) * 0.24
      const ox = rock.x - centerX
      const oy = rock.y - centerY
      rock.x = centerX + (ox * Math.cos(spin) - oy * Math.sin(spin))
      rock.y = centerY + (ox * Math.sin(spin) + oy * Math.cos(spin)) * 0.995

      rock.x += rock.vx + Math.sin(tick * 0.0008 + rock.y * 0.01) * 0.02
      rock.y += rock.vy + Math.cos(tick * 0.0009 + rock.x * 0.01) * 0.02

      const rx = rock.x - centerX
      const ry = rock.y - centerY
      const ringDist = Math.sqrt(rx * rx + ry * ry)
      if (ringDist < 230) {
        rock.x = centerX + (rx / ringDist) * rand(265, 292)
        rock.y = centerY + (ry / ringDist) * rand(265, 292) * 0.68
      }

      ctx.fillStyle = `hsla(${rock.hue}, 30%, ${50 + rock.r * 10}%, ${rock.alpha})`
      ctx.beginPath()
      ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  function drawSingularity() {
    if (!ctx) return
    const x = window.innerWidth * 0.79 + Math.sin(tick * 0.0003) * 16
    const y = window.innerHeight * 0.28 + Math.cos(tick * 0.00035) * 14
    const radius = 70
    const spin = tick * 0.02 * SPEED_MULTIPLIER

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.7)
    halo.addColorStop(0, 'rgba(255,255,255,0.12)')
    halo.addColorStop(0.1, 'rgba(200,140,255,0.18)')
    halo.addColorStop(0.34, 'rgba(88, 50, 150, 0.12)')
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, radius * 2.7, 0, Math.PI * 2)
    ctx.fill()

    ctx.filter = 'blur(2px)'
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255, 220, 255, ${0.28 - i * 0.05})`
      ctx.lineWidth = 2 + i * 2
      ctx.beginPath()
      ctx.ellipse(x, y, 118 + i * 10, 30 - i * 3, -0.5 + spin * 0.12, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.filter = 'none'

    const accretion = ctx.createLinearGradient(x - 140, y - 40, x + 140, y + 40)
    accretion.addColorStop(0, 'rgba(255, 220, 120, 0)')
    accretion.addColorStop(0.25, 'rgba(255, 160, 90, 0.12)')
    accretion.addColorStop(0.5, 'rgba(230, 130, 255, 0.32)')
    accretion.addColorStop(0.75, 'rgba(90, 180, 255, 0.16)')
    accretion.addColorStop(1, 'rgba(255, 220, 120, 0)')
    ctx.strokeStyle = accretion
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.ellipse(x, y, 138, 36, -0.46 + spin * 0.04, 0, Math.PI * 2)
    ctx.stroke()

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(spin * 0.35)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      ctx.strokeStyle = `rgba(255, 190, 120, ${0.15 - i * 0.004})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 58, Math.sin(a) * 18)
      ctx.lineTo(Math.cos(a) * 120, Math.sin(a) * 34)
      ctx.stroke()
    }
    ctx.restore()

    ctx.fillStyle = 'rgba(0,0,0,0.98)'
    ctx.beginPath()
    ctx.arc(x, y, 28, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  function drawSun(centerX: number, centerY: number) {
    if (!ctx) return
    const x = centerX + Math.sin(tick * 0.0003) * 10
    const y = centerY + Math.cos(tick * 0.0003) * 10
    const sunScale = 0.9 + (zoom - 1) * 0.6
    const pulse = 1 + Math.sin(tick * 0.0045) * 0.05

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    const halo = ctx.createRadialGradient(x, y, 0, x, y, 260)
    halo.addColorStop(0, 'rgba(255, 250, 214, 1)')
    halo.addColorStop(0.14, 'rgba(255, 212, 96, 0.95)')
    halo.addColorStop(0.36, 'rgba(255, 130, 64, 0.32)')
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, y, 260 * sunScale * pulse, 0, Math.PI * 2)
    ctx.fill()

    const core = ctx.createRadialGradient(x - 14, y - 14, 0, x, y, 52)
    core.addColorStop(0, 'rgba(255,255,255,1)')
    core.addColorStop(0.34, 'rgba(255,244,186,0.98)')
    core.addColorStop(1, 'rgba(255, 174, 45, 0.96)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(x, y, 52 * sunScale * pulse, 0, Math.PI * 2)
    ctx.fill()

    ctx.filter = 'blur(20px)'
    ctx.fillStyle = 'rgba(255, 192, 80, 0.32)'
    ctx.beginPath()
    ctx.arc(x, y, 88 * sunScale, 0, Math.PI * 2)
    ctx.fill()
    ctx.filter = 'none'

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.filter = 'blur(10px)'
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + tick * 0.0008
      const sx = x + Math.cos(a) * (72 + i * 5)
      const sy = y + Math.sin(a) * (72 + i * 5) * 0.78
      const spark = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18)
      spark.addColorStop(0, 'rgba(255,255,255,0.24)')
      spark.addColorStop(0.3, 'rgba(255, 215, 120, 0.14)')
      spark.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = spark
      ctx.beginPath()
      ctx.arc(sx, sy, 18, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.filter = 'none'
    ctx.restore()

    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.18 - i * 0.02})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, (76 + i * 10 + Math.sin(tick * 0.006 + i) * 3) * sunScale * pulse, 0, Math.PI * 2)
      ctx.stroke()
    }

    const flareDirection = Math.atan2(y - window.innerHeight * 0.28, x - window.innerWidth * 0.79)
    for (let i = 0; i < 6; i++) {
      const distance = 120 + i * 86
      const fx = x + Math.cos(flareDirection) * distance
      const fy = y + Math.sin(flareDirection) * distance
      const flare = ctx.createRadialGradient(fx, fy, 0, fx, fy, 24 + i * 6)
      flare.addColorStop(0, `rgba(255,255,255,${0.1 - i * 0.012})`)
      flare.addColorStop(0.2, `rgba(255, 204, 100, ${0.08 - i * 0.01})`)
      flare.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = flare
      ctx.beginPath()
      ctx.arc(fx, fy, 24 + i * 6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  function orbitPosition(cx: number, cy: number, planet: Planet) {
    const wobble = Math.sin(tick * 0.0007 + planet.angle) * 0.04
    const tilt = planet.tilt || 0
    const angle = planet.angle + wobble
    return {
      x: cx + Math.cos(angle) * planet.orbitX,
      y: cy + Math.sin(angle + tilt) * planet.orbitY,
    }
  }

  function drawOrbit(cx: number, cy: number, planet: Planet) {
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = 'rgba(215, 214, 255, 0.05)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 10])
    ctx.lineDashOffset = -tick * 0.18 * SPEED_MULTIPLIER
    ctx.beginPath()
    ctx.ellipse(cx, cy, planet.orbitX, planet.orbitY, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.filter = 'blur(2px)'
    ctx.strokeStyle = 'rgba(134, 180, 255, 0.04)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(cx, cy, planet.orbitX, planet.orbitY, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.filter = 'none'
    ctx.restore()
  }

  function drawPlanet(cx: number, cy: number, planet: Planet) {
    if (!ctx) return
    planet.angle += planet.speed * (1 + chaos * 0.75) * SPEED_MULTIPLIER
    const scaledPlanet = {
      ...planet,
      orbitX: planet.orbitX * (0.86 + zoom * 0.18),
      orbitY: planet.orbitY * (0.86 + zoom * 0.18),
      size: planet.size * (0.9 + zoom * 0.06),
    }
    const { x, y } = orbitPosition(cx, cy, scaledPlanet)

    drawOrbit(cx, cy, scaledPlanet)

    ctx.save()
    const size = scaledPlanet.size
    const body = ctx.createRadialGradient(x - size * 0.4, y - size * 0.4, 0, x, y, size * 2.6)
    body.addColorStop(0, `hsla(${planet.hue}, 92%, 76%, 1)`)
    body.addColorStop(0.35, `hsla(${planet.hue}, 72%, 48%, 1)`)
    body.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.clip()

    const lightAngle = Math.atan2(y - cy, x - cx)
    const terminator = ctx.createLinearGradient(
      x + Math.cos(lightAngle) * size,
      y + Math.sin(lightAngle) * size,
      x - Math.cos(lightAngle) * size,
      y - Math.sin(lightAngle) * size,
    )
    terminator.addColorStop(0, 'rgba(0,0,0,0)')
    terminator.addColorStop(0.55, 'rgba(0,0,0,0.08)')
    terminator.addColorStop(1, 'rgba(0,0,0,0.72)')
    ctx.fillStyle = terminator
    ctx.fillRect(x - size, y - size, size * 2, size * 2)

    const highlight = ctx.createLinearGradient(x - size, y - size, x + size, y + size)
    highlight.addColorStop(0, 'rgba(255,255,255,0.25)')
    highlight.addColorStop(0.3, 'rgba(255,255,255,0.08)')
    highlight.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = highlight
    ctx.fillRect(x - size, y - size, size * 2, size * 2)

    const spin = tick * 0.002 * SPEED_MULTIPLIER
    const shadow = ctx.createRadialGradient(
      x + Math.cos(lightAngle) * size * 0.4,
      y + Math.sin(lightAngle) * size * 0.4,
      size * 0.12,
      x,
      y,
      size * 1.15,
    )
    shadow.addColorStop(0, 'rgba(0,0,0,0)')
    shadow.addColorStop(0.5, 'rgba(0,0,0,0.16)')
    shadow.addColorStop(1, 'rgba(0,0,0,0.82)')
    ctx.fillStyle = shadow
    ctx.fillRect(x - size, y - size, size * 2, size * 2)

    if (planet.name === 'Jupiter' || planet.name === 'Saturn') {
      ctx.globalAlpha = 0.9
      for (let band = -5; band <= 5; band++) {
        const yBand = y + band * (size / 5.8)
        const thickness = 2 + Math.abs(band) * 0.15
        const wave = Math.sin(spin + band * 0.62) * (planet.name === 'Jupiter' ? 0.45 : 0.26)
        ctx.fillStyle = band % 2 === 0
          ? `hsla(${planet.hue + band * 2}, 55%, ${52 + band}%, 0.22)`
          : `hsla(${planet.hue + band * 2}, 45%, ${44 + band}%, 0.12)`
        ctx.fillRect(x - size, yBand - thickness / 2, size * 2, thickness)
        ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.abs(wave) * 0.04})`
        ctx.fillRect(x - size, yBand - thickness / 2 + wave, size * 2, 1)
      }
      if (planet.name === 'Jupiter') {
        ctx.fillStyle = 'rgba(196, 88, 66, 0.75)'
        ctx.beginPath()
        ctx.ellipse(x + size * 0.42, y + size * 0.14, size * 0.2, size * 0.14, -0.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.beginPath()
        ctx.ellipse(x - size * 0.18, y + size * 0.28, size * 0.14, size * 0.08, 0.24, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x, y, size * 0.92, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    if (planet.name === 'Earth') {
      ctx.fillStyle = 'rgba(87, 170, 104, 0.72)'
      ctx.beginPath()
      ctx.ellipse(x - size * 0.18, y - size * 0.08, size * 0.26, size * 0.18, -0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(61, 132, 216, 0.86)'
      ctx.beginPath()
      ctx.ellipse(x + size * 0.18, y + size * 0.1, size * 0.24, size * 0.16, 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.beginPath()
      ctx.arc(x - size * 0.26, y - size * 0.28, size * 0.11, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, size * 0.96, 0, Math.PI * 2)
      ctx.stroke()
    }

    if (planet.name === 'Mars') {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(120, 72, 44, ${0.1 + i * 0.04})`
        ctx.beginPath()
        ctx.arc(x + Math.sin(i * 2.2) * size * 0.35, y + Math.cos(i * 1.7) * size * 0.25, size * (0.06 + i * 0.02), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(255, 179, 132, 0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, size * 0.88, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255, 205, 170, 0.08)'
      ctx.beginPath()
      ctx.arc(x - size * 0.12, y - size * 0.22, size * 0.28, 0, Math.PI * 2)
      ctx.fill()
    }

    if (planet.name === 'Uranus' || planet.name === 'Neptune') {
      ctx.filter = 'blur(7px)'
      ctx.fillStyle = `hsla(${planet.hue}, 90%, 72%, 0.22)`
      ctx.beginPath()
      ctx.arc(x, y, size * 1.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.filter = 'none'
    }

    if (planet.name === 'Venus') {
      ctx.strokeStyle = 'rgba(255, 248, 219, 0.09)'
      ctx.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.arc(x - size * 0.15, y - size * 0.15, size * (0.2 + i * 0.11), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(255, 240, 210, 0.07)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, size * 0.92, 0, Math.PI * 2)
      ctx.stroke()
    }

    if (planet.clouds) {
      ctx.globalCompositeOperation = 'screen'
      ctx.filter = 'blur(2px)'
      for (let i = 0; i < 3; i++) {
        const cloudX = x + Math.sin(spin + i * 1.8) * size * 0.24
        const cloudY = y + Math.cos(spin * 0.8 + i) * size * 0.18
        const cloud = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, size * (0.55 + i * 0.2))
        cloud.addColorStop(0, `rgba(255,255,255,${planet.name === 'Earth' ? 0.16 : 0.1})`)
        cloud.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = cloud
        ctx.beginPath()
        ctx.arc(cloudX, cloudY, size * (0.6 + i * 0.15), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.filter = 'none'
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.restore()

    if (planet.atmosphere) {
      ctx.save()
      ctx.filter = 'blur(8px)'
      ctx.strokeStyle = planet.name === 'Earth' ? 'rgba(109, 187, 255, 0.34)' : 'rgba(167, 235, 255, 0.22)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, size * 1.14, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = planet.name === 'Earth' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, size * 1.28, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    if (planet.ice) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.filter = 'blur(1px)'
      for (let i = 0; i < 4; i++) {
        const iceX = x + Math.sin(spin * 1.2 + i) * size * 0.18
        const iceY = y + Math.cos(spin * 0.9 + i * 1.3) * size * 0.14
        ctx.fillStyle = `rgba(220, 245, 255, ${0.07 - i * 0.01})`
        ctx.beginPath()
        ctx.arc(iceX, iceY, size * (0.12 + i * 0.03), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.filter = 'none'
      ctx.restore()
    }

    if (planet.ring) {
      ctx.save()
      ctx.filter = 'blur(4px)'
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.ellipse(x, y, size * 2.35, size * 1.04, -0.5 + tick * 0.0025, 0, Math.PI * 2)
      ctx.stroke()
      ctx.filter = 'none'
      ctx.restore()

      ctx.strokeStyle = 'rgba(250, 228, 173, 0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(x, y, size * 1.95, size * 0.72, -0.5 + tick * 0.0025, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'
      ctx.beginPath()
      ctx.ellipse(x, y, size * 2.2, size * 0.95, -0.5 + tick * 0.0025, 0, Math.PI * 2)
      ctx.stroke()
    }

    if (planet.dusty) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = `rgba(255, 200, 140, ${0.06 - i * 0.005})`
        ctx.beginPath()
        ctx.arc(x + Math.sin(i * 0.7) * size * 0.6, y + Math.cos(i * 1.1) * size * 0.5, 0.7 + i * 0.08, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const moonCount = planet.moonCount || 0
    for (let i = 0; i < moonCount; i++) {
      const moonAngle = tick * 0.003 + i * 1.6 + planet.angle * 4
      const moonRadius = size * (2.2 + i * 0.28)
      const moonX = x + Math.cos(moonAngle) * moonRadius
      const moonY = y + Math.sin(moonAngle) * moonRadius * 0.7
      ctx.fillStyle = i % 2 === 0 ? 'rgba(248, 250, 255, 0.92)' : 'rgba(207, 218, 255, 0.72)'
      ctx.beginPath()
      ctx.arc(moonX, moonY, Math.max(1.2, 2.6 - i * 0.3), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  function drawComets() {
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    comets.forEach((c, index) => {
      const gravity = gravityWells.reduce((acc, well) => {
        const dx = well.x - c.x
        const dy = well.y - c.y
        const dist = Math.max(40, Math.sqrt(dx * dx + dy * dy))
        const pull = (well.power * well.radius) / (dist * dist)
        return {
          x: acc.x + (dx / dist) * pull,
          y: acc.y + (dy / dist) * pull,
        }
      }, { x: 0, y: 0 })

      c.vx += gravity.x * 0.45 + Math.sin(tick * 0.0006 + index) * 0.005
      c.vy += gravity.y * 0.45 + Math.cos(tick * 0.0005 + index) * 0.005
      c.x += c.vx
      c.y += c.vy
      c.life -= 0.0015

      if (c.x > window.innerWidth + 250 || c.y < -250 || c.y > window.innerHeight + 250 || c.life <= 0) {
        c.x = -250 - Math.random() * window.innerWidth * 0.6
        c.y = window.innerHeight * rand(0.1, 0.9)
        c.vx = rand(2.8, 4.5)
        c.vy = rand(-0.55, 0.7)
        c.tail = rand(130, 220)
        c.life = rand(1.4, 3.1)
        c.hue = rand(180, 290)
      }

      const tailX = c.x - c.vx * c.tail
      const tailY = c.y - c.vy * c.tail
      const grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY)
      grad.addColorStop(0, `hsla(${c.hue}, 100%, 92%, 1)`)
      grad.addColorStop(0.2, `hsla(${c.hue + 10}, 90%, 72%, 0.48)`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.strokeStyle = grad
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(tailX, tailY)
      ctx.stroke()

      ctx.filter = 'blur(5px)'
      ctx.strokeStyle = grad
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(tailX, tailY)
      ctx.stroke()
      ctx.filter = 'none'

      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      ctx.arc(c.x, c.y, 2.6, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.restore()
  }

  function drawWells() {
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    gravityWells.forEach((well, index) => {
      well.life -= 0.01
      if (well.life <= 0) return

      const pulse = 1 + Math.sin(tick * 0.014 * SPEED_MULTIPLIER + index) * 0.14
      const alpha = Math.min(1, well.life / (well.kind === 'singularity' ? 10 : 7))

      const aura = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, well.radius * 1.9)
      aura.addColorStop(0, `rgba(255,255,255,${0.18 * alpha})`)
      aura.addColorStop(0.18, `rgba(160,120,255,${0.16 * alpha})`)
      aura.addColorStop(0.45, `rgba(60,40,120,${0.08 * alpha})`)
      aura.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = aura
      ctx.beginPath()
      ctx.arc(well.x, well.y, well.radius * 1.9 * pulse, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = well.kind === 'singularity' ? `rgba(255, 214, 255, ${0.5 * alpha})` : `rgba(167, 243, 255, ${0.45 * alpha})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(well.x, well.y, well.radius * pulse, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = 'rgba(0,0,0,0.98)'
      ctx.beginPath()
      ctx.arc(well.x, well.y, well.kind === 'singularity' ? 18 : 12, 0, Math.PI * 2)
      ctx.fill()

      ctx.save()
      ctx.translate(well.x, well.y)
      ctx.rotate(tick * 0.02 * SPEED_MULTIPLIER)
      ctx.strokeStyle = well.kind === 'singularity' ? 'rgba(255, 205, 255, 0.18)' : 'rgba(145, 235, 255, 0.16)'
      ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(0, 0, well.radius * (0.75 + i * 0.15), well.radius * (0.18 + i * 0.05), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    })

    ctx.restore()
  }

  function drawLensAndGlow(centerX: number, centerY: number) {
    if (!ctx) return
    const sunX = centerX + Math.sin(tick * 0.0003) * 10
    const sunY = centerY + Math.cos(tick * 0.0003) * 10
    const holeX = window.innerWidth * 0.79 + Math.sin(tick * 0.0003) * 16
    const holeY = window.innerHeight * 0.28 + Math.cos(tick * 0.00035) * 14

    drawLensFlare(sunX, sunY, holeX, holeY)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.filter = 'blur(18px)'
    const haze = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 360)
    haze.addColorStop(0, 'rgba(255, 210, 125, 0.12)')
    haze.addColorStop(0.35, 'rgba(110, 145, 255, 0.08)')
    haze.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = haze
    ctx.beginPath()
    ctx.arc(centerX, centerY, 360, 0, Math.PI * 2)
    ctx.fill()
    ctx.filter = 'none'
    ctx.restore()
  }

  function drawHUD() {
    if (!ctx) return
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
    ctx.restore()
  }

  function drawScene() {
    if (!ctx) return
    const w = window.innerWidth
    const h = window.innerHeight
    const centerX = systemAnchor.x || w * 0.5
    const centerY = systemAnchor.y || h * 0.56
    const orbitCenterX = centerX
    const orbitCenterY = centerY

    bgGradient(w, h)
    drawNebulae()
    drawStars()
    drawDustField(centerX, centerY)
    drawAsteroidBelt(centerX, centerY)
    drawSingularity()
    drawSun(centerX, centerY)
    drawWells()
    planets.forEach((planet) => drawPlanet(orbitCenterX, orbitCenterY, planet))
    drawComets()
    drawLensAndGlow(centerX, centerY)
    drawHUD()
  }

  function loop(now: number) {
    const dt = lastFrame ? Math.min(2.5, (now - lastFrame) / 16.6667) : 1
    lastFrame = now
    tick += dt * 1.6
    const follow = 1 - Math.pow(0.0015, dt)
    pointerEase.x += (pointer.x - pointerEase.x) * follow
    pointerEase.y += (pointer.y - pointerEase.y) * follow

    if (!dragging) {
      systemAnchor.x = window.innerWidth * 0.5 + Math.sin(tick * 0.0004) * 12 + pointerEase.x * 0.03
      systemAnchor.y = window.innerHeight * 0.56 + Math.cos(tick * 0.0003) * 12 + pointerEase.y * 0.03
    } else {
      systemAnchor.x = pointerEase.x + dragOffset.x
      systemAnchor.y = pointerEase.y + dragOffset.y
    }

    gravityWells.forEach((well) => {
      if (well.kind === 'singularity') {
        well.x += Math.sin(tick * 0.004) * 0.24 * dt
        well.y += Math.cos(tick * 0.0035) * 0.18 * dt
      }
    })

    drawScene()
    raf = requestAnimationFrame(loop)
  }

  function spawnChaosBurst(x: number, y: number) {
    addGravityWell(x, y, Math.random() > 0.62 ? 'singularity' : 'wormhole')
    for (let i = 0; i < 8; i++) {
      comets.unshift({
        x,
        y,
        vx: rand(-2.8, 2.8),
        vy: rand(-2.8, 2.8),
        tail: rand(90, 180),
        life: rand(0.6, 1.8),
        hue: rand(175, 320),
      })
    }
    if (comets.length > 16) comets.length = 16
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
    const onDown = (e: MouseEvent) => {
      dragging = e.button === 0 && e.altKey
      if (dragging) {
        dragOffset.x = systemAnchor.x - pointerEase.x
        dragOffset.y = systemAnchor.y - pointerEase.y
      } else {
        spawnChaosBurst(e.clientX, e.clientY)
      }
    }
    const onUp = () => {
      dragging = false
    }
    const onLeave = () => {
      pointer.x = -9999
      pointer.y = -9999
      dragging = false
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom = Math.min(1.45, Math.max(0.82, zoom - e.deltaY * 0.0008))
      chaos = Math.min(1, Math.max(0.2, chaos + e.deltaY * 0.00015))
    }
    const onResize = () => {
      resize()
      seedScene()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        seedScene()
      }
      if (e.key === ' ') {
        addGravityWell(window.innerWidth * 0.5, window.innerHeight * 0.54, 'singularity')
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)

    raf = requestAnimationFrame(loop)

    onCleanup(() => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
    })
  })

  return (
    <section class="relative w-screen overflow-hidden" style="margin-left:calc(50% - 50vw); margin-right:calc(50% - 50vw); min-height:calc(100svh - 12rem); isolation:isolate;">
      <div class="absolute inset-0 z-0">
        <canvas ref={canvas!} class="fixed inset-0 h-full w-full pointer-events-none" aria-hidden="true" />
      </div>

      <div class="relative z-10 flex min-h-[calc(100svh-12rem)] flex-col justify-between px-6 py-6 sm:px-10 sm:py-8">
        <header class="max-w-3xl">
          <p class="text-[0.72rem] uppercase tracking-[0.55em] text-white/55">Playground / Solar Sandbox</p>
          <h1 class="mt-4 max-w-2xl font-display text-4xl leading-[0.92] text-white sm:text-7xl">
            Tata surya yang meledak, melengkung, dan bisa kamu ganggu.
          </h1>
          <p class="mt-4 max-w-xl text-sm leading-6 text-white/72 sm:text-base">
            Klik untuk memicu anomali, scroll untuk mengubah intensitas chaos, tekan spasi untuk menaruh singularitas
            baru. Ini bukan simulator akurat. Ini playground visual yang sengaja dibuat liar.
          </p>
        </header>

        <div class="grid gap-4 sm:max-w-4xl sm:grid-cols-3">
          <div class="border border-white/10 bg-black/18 p-4 backdrop-blur-md">
            <p class="text-xs uppercase tracking-[0.35em] text-white/45">Controls</p>
            <p class="mt-2 text-sm text-white/72">Click to spawn anomaly. Scroll to dial chaos. Space to drop a black hole.</p>
          </div>
          <div class="border border-white/10 bg-black/18 p-4 backdrop-blur-md">
            <p class="text-xs uppercase tracking-[0.35em] text-white/45">Structure</p>
            <p class="mt-2 text-sm text-white/72">Orbit rings, moons, comets, asteroid dust, wormholes, and a collapsing core.</p>
          </div>
          <div class="border border-white/10 bg-black/18 p-4 backdrop-blur-md">
            <p class="text-xs uppercase tracking-[0.35em] text-white/45">Feel</p>
            <p class="mt-2 text-sm text-white/72">More sandbox, more motion, more gravity. Built to look alive at a glance.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
