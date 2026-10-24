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
npm run dev          # app + API on http://localhost:5173
```

`npm run dev` builds the serverless functions first, then starts Vite with the
Netlify emulator: the SPA **and** `/api/*` are served from the one port the
banner prints. The API is emulated from the functions **build**
(`dist/apps/functions`), so a bare `vite` without that build answers 404 on
every `/api/*` call and the app shows only *Error Loading Configuration* — the
dev banner says so explicitly when the build is missing.

### Build & preview

```bash
npm run build
npm run preview      # production build behind the full Netlify stack, http://localhost:3080
```

### Test & lint

```bash
npm test             # unit tests (Vitest)
npm run lint         # ESLint
npm run typecheck    # TypeScript
```

## Documentation

| Topic | File |
|-------|------|
| Architecture — tech stack, monorepo layout, shared interfaces | [docs/architecture.md](docs/architecture.md) |
| API reference — all serverless endpoints, request/response shapes, env vars | [docs/api.md](docs/api.md) |
| Configuration — site config, themes, pages, translations | [docs/configuration.md](docs/configuration.md) |
| Extending — adding section types, mobile-first patterns | [docs/extending.md](docs/extending.md) |
| Contributing — guidelines, browser support, troubleshooting, roadmap | [docs/contributing.md](docs/contributing.md) |

## License

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)
