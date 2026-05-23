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
npm run dev          # http://localhost:5173
```

### Build & preview

```bash
npm run build
npm run preview
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
