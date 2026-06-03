import { onMount, onCleanup } from 'solid-js'

export default function CosmicBackground(){
  let canvas: HTMLCanvasElement | undefined
  let ctx: CanvasRenderingContext2D | null = null
  let rafId = 0
  const PARTICLE_COUNT = 130
  const particles: any[] = []
  let pointer = { x: -9999, y: -9999 }
  const REPULSE_RADIUS = 1000

  function resize(){
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function initParticles(){
    particles.length = 0
    for(let i=0;i<PARTICLE_COUNT;i++){
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.6 + 0.6,
        alpha: 0.2 + Math.random() * 0.8,
        baseX: 0,
        baseY: 0
      })
    }
    for(const p of particles){ p.baseX = p.x; p.baseY = p.y }
  }

  function step(){
    if (!ctx || !canvas) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0,0,canvas.width,canvas.height)

    for(const p of particles){
      // simple float
      p.x += p.vx
      p.y += p.vy

      // wrap
      if (p.x > window.innerWidth + 20) p.x = -20
      if (p.x < -20) p.x = window.innerWidth + 20
      if (p.y > window.innerHeight + 20) p.y = -20
      if (p.y < -20) p.y = window.innerHeight + 20

      // repulsion
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist < REPULSE_RADIUS){
        const force = (REPULSE_RADIUS - dist) / REPULSE_RADIUS
        const angle = Math.atan2(dy, dx)
        p.x += Math.cos(angle) * force * 8
        p.y += Math.sin(angle) * force * 8
      } else {
        // gently drift back toward base pos
        p.x += (p.baseX - p.x) * 0.002
        p.y += (p.baseY - p.y) * 0.002
      }

      // draw
      ctx.beginPath()
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
      ctx.fill()
    }

    rafId = requestAnimationFrame(step)
  }

  onMount(()=>{
    if (!canvas) return
    ctx = canvas.getContext('2d')
    resize()
    initParticles()

    const onMove = (e: MouseEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999 }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', resize)

    rafId = requestAnimationFrame(step)

    onCleanup(()=>{
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', resize)
    })
  })

  return (
    <canvas ref={canvas!} class="fixed inset-0 w-full h-full pointer-events-none z-0" />
  )
}
