import { defineConfig } from 'astro/config'
import solid from '@astrojs/solid-js'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  integrations: [solid(), tailwind()],
  site: 'http://localhost:3000'
})
