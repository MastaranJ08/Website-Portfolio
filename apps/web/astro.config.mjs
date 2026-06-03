import { defineConfig } from 'astro/config'
import solid from '@astrojs/solid-js'
import tailwind from '@astrojs/tailwind'

const isGithubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  integrations: [solid(), tailwind()],
  site: isGithubPages
    ? 'https://mastaranj08.github.io/Website-Portfolio'
    : 'http://localhost:4321',
  base: isGithubPages ? '/Website-Portfolio' : '/',
  trailingSlash: 'always'
})
