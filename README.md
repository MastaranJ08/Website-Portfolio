# Ultra-fast Portfolio Monorepo

Monorepo with an Astro + Solid frontend.

Apps:
- `apps/web` - Astro frontend with SolidJS, TailwindCSS, and motion animations.

## Local dev

1. Install frontend deps:

   ```bash
   cd apps/web
   npm install
   ```

2. Run the site:

   ```bash
   npm run dev
   ```

## GitHub Pages deploy

This repo is configured for free static deployment on GitHub Pages.

1. Push to the `main` branch.
2. In GitHub, enable `Settings > Pages > GitHub Actions`.
3. The workflow at [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) will build and deploy automatically.

## GitHub data

The Projects page reads public repositories directly from GitHub using the browser.
Set `PUBLIC_GITHUB_USERNAME` at build time if you want to override the default username.
