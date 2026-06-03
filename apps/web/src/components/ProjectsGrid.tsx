import { createResource } from 'solid-js'
import { motion } from '@motionone/solid'
import { API_BASE } from '../lib/api'

async function fetchProjects(){
  const res = await fetch(`${API_BASE}/api/projects`)
  if(!res.ok) throw new Error('Failed to load')
  return res.json()
}

export default function ProjectsGrid(){
  const [projects] = createResource(fetchProjects)

  return (
    <section class="py-12">
      <h2 class="text-3xl font-display mb-6">Selected Projects</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.loading && <div class="text-gray-400">Loading projects…</div>}
        {projects()?.map((p: any) => (
          <motion.div
            class="relative bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <a href={p.html_url} target="_blank" rel="noreferrer" class="block">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">{p.name}</h3>
                <div class="text-sm text-yellow-400">★ {p.stargazers_count}</div>
              </div>
              <p class="mt-3 text-sm text-gray-300">{p.description}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                {(p.topics || [p.language]).filter(Boolean).slice(0,5).map((t: string) => (
                  <span class="text-xs px-2 py-1 bg-slate-700 rounded">{t}</span>
                ))}
              </div>
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
