# Ultra-fast Portfolio Monorepo

Monorepo combining an Astro + Solid frontend and a Bun + Elysia backend.

Apps:
- `apps/web` — Astro frontend with SolidJS, TailwindCSS, and motion animations.
- `backend` — Bun runtime with ElysiaJS API endpoints (`/api/projects`, `/api/playground/chat`).

Quick dev:

1. Backend (requires Bun):

   ```bash
   cd backend
   bun install
   GITHUB_USERNAME=yourusername GITHUB_TOKEN=token bun run dev
   ```

2. Frontend:

   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

You can configure `GITHUB_USERNAME` and optional `GITHUB_TOKEN` for GitHub API requests.
