import { onMount, onCleanup } from 'solid-js'

export default function MovingCosmicBackground(){
  let canvas: HTMLCanvasElement | undefined
  let ctx: CanvasRenderingContext2D | null = null
  let raf = 0

  const STAR_COUNT = 140
  const stars: any[] = []
  const nebulae: any[] = []

  function resize(){
    if (!canvas) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function init(){
    stars.length = 0
    nebulae.length = 0
    for(let i=0;i<STAR_COUNT;i++){
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.6 + 0.4,
        alpha: 0.2 + Math.random() * 0.9,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05
      })
    }

    // Nebula layers (soft radial blobs)
    const colors = [ '72,40,120', '30,20,50', '110,60,180' ]
    for(let i=0;i<3;i++){
      nebulae.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: (Math.max(window.innerWidth, window.innerHeight) * (0.35 + Math.random()*0.6)),
        alpha: 0.04 + Math.random()*0.12,
        vx: (Math.random() - 0.5) * 0.02 * (i+1),
        vy: (Math.random() - 0.5) * 0.02 * (i+1),
        color: colors[i % colors.length]
      })
    }
  }

  function draw(){
    if (!ctx || !canvas) return
    const w = canvas.width
    const h = canvas.height

    // Clear with transparent so CSS background shows through
    ctx.clearRect(0,0,canvas.width,canvas.height)

    // Draw subtle nebulae with additive blending for glow
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for(const n of nebulae){
      n.x += n.vx
      n.y += n.vy
      // wrap
      if (n.x - n.r > window.innerWidth) n.x = -n.r
      if (n.x + n.r < 0) n.x = window.innerWidth + n.r
      if (n.y - n.r > window.innerHeight) n.y = -n.r
      if (n.y + n.r < 0) n.y = window.innerHeight + n.r

      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r)
      grd.addColorStop(0, `rgba(${n.color}, ${n.alpha})`)
      grd.addColorStop(0.4, `rgba(${n.color}, ${n.alpha*0.5})`)
      grd.addColorStop(1, `rgba(10,10,12,0)`)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI*2)
      ctx.fill()
    }
    ctx.restore()

    // Draw stars
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    for(const s of stars){
      s.x += s.vx
      s.y += s.vy
      // wrap
      if (s.x > window.innerWidth + 2) s.x = -2
      if (s.x < -2) s.x = window.innerWidth + 2
      if (s.y > window.innerHeight + 2) s.y = -2
      if (s.y < -2) s.y = window.innerHeight + 2

      ctx.beginPath()
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2)
      ctx.fill()
    }
    ctx.restore()

    // subtle parallax slight motion (shift nebula target positions slowly)
    raf = requestAnimationFrame(draw)
  }

  onMount(()=>{
    if (!canvas) return
    ctx = canvas.getContext('2d')
    resize()
    init()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(draw)

    onCleanup(()=>{
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    })
  })

  return (
    <canvas ref={canvas!} class="fixed inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true"></canvas>
  )
}
