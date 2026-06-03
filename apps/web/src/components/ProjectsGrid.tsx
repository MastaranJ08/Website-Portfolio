import { createResource } from 'solid-js'
import { motion } from '@motionone/solid'

async function fetchProjects() {
  const username = import.meta.env.PUBLIC_GITHUB_USERNAME || 'MastaranJ08'
  const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`)
  if (!res.ok) throw new Error('Failed to load')

  const repos = await res.json()
  return (repos || [])
    .filter((repo: any) => !repo.fork)
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export default function ProjectsGrid() {
  const [projects] = createResource(fetchProjects)

  return (
    <section class="py-12">
      <h2 class="text-3xl font-display mb-6">Selected Projects</h2>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.loading && <div class="text-gray-400">Loading projects...</div>}
        {projects.error && <div class="text-red-300">Failed to load projects from GitHub.</div>}
        {projects()?.map((p: any) => (
          <motion.div
            class="relative rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg transition-transform transform hover:scale-105"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <a href={p.html_url} target="_blank" rel="noreferrer" class="block">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-semibold">{p.name}</h3>
                <div class="text-sm text-yellow-400">★ {p.stargazers_count}</div>
              </div>
              <p class="mt-3 text-sm text-gray-300">{p.description}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                {(p.topics || [p.language]).filter(Boolean).slice(0, 5).map((t: string) => (
                  <span class="rounded bg-slate-700 px-2 py-1 text-xs">{t}</span>
                ))}
              </div>
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
