# Simple Site

A modern, mobile-first, themable, and multilingual web application built with React, TypeScript, Material-UI, and Zod validation.

- 📱 Mobile-first responsive design with runtime theme switching
- 🌍 Multilingual support (EN / FR) with API-driven translations
- 📦 Dynamic routing and page layout from API-driven configuration
- ☁️ Serverless backend on Netlify Functions

## Quick Start

### Prerequisites

- **nvm** — [install](https://github.com/nvm-sh/nvm)
- Node.js LTS (installed below)

### Install

```bash
git clone <repository-url>
cd simple-site

nvm install --lts && nvm use --lts
npm install -g npm@latest
npm install
npx lefthook install
```

### Develop

```bash
npm run dev          # app + API on http://localhost:3080
```

`npm run dev` runs the Netlify dev stack: it builds the serverless functions,
starts Vite behind it, and serves the SPA **and** `/api/*` from the one port its
banner prints. Running `vite` on its own is not enough — the Netlify
configuration lives at the workspace root, outside Vite's root, so `/api/*`
falls through to the SPA and the app shows only *Error Loading Configuration*;
the Vite banner says so if you start it that way.

### Build & preview

```bash
npm run build
npm run preview      # the production BUILD behind the same stack, http://localhost:3080
```

### Test & lint

```bash
npm test             # unit tests (Vitest)
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run audit        # dependency advisories
```

All four are **required gates** — CI runs them and the pre-commit hook runs lint +
typecheck. See [docs/contributing.md](docs/contributing.md#code-quality-commands) for the
audit thresholds and what to do when one fires.

## Documentation

| Topic | File |
|-------|------|
| Architecture — tech stack, monorepo layout, shared interfaces | [docs/architecture.md](docs/architecture.md) |
| API reference — all serverless endpoints, request/response shapes, env vars | [docs/api.md](docs/api.md) |
| Configuration — site config, themes, pages, translations | [docs/configuration.md](docs/configuration.md) |
| Extending — adding section types, mobile-first patterns | [docs/extending.md](docs/extending.md) |
| Media — upload pipeline, CDN renditions, feature flag | [docs/media.md](docs/media.md) |
| Contributing — guidelines, quality gates, browser support, troubleshooting, roadmap | [docs/contributing.md](docs/contributing.md) |

## License

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)
