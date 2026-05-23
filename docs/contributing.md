# Contributing

## Guidelines

1. All tests must pass before opening a PR (`npm test`)
2. Follow the existing code style — ESLint and TypeScript strict mode are enforced by pre-commit hooks
3. Use mobile-first responsive design patterns (see [extending.md](extending.md))
4. Test on multiple screen sizes
5. Keep documentation in sync — update the relevant file(s) under `docs/` whenever a PR changes a user-visible capability, API endpoint, configuration schema, or architectural decision

## Code Quality Commands

```bash
npm test             # Vitest unit tests
npm run test:ui      # Vitest with browser UI
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit across all projects
```

Pre-commit hooks (Lefthook) run `lint` and `typecheck` automatically. Do not bypass them with `--no-verify`.

## Browser Support

Modern browsers supporting ES6+ and React 19:

| Browser | Minimum |
|---------|---------|
| Chrome | latest |
| Firefox | latest |
| Safari | latest |
| Edge | latest |
| Mobile Safari | iOS 13.4+ |
| Chrome Mobile | Android 6+ |

React 19 requires more recent browser versions than React 18.

## Mobile Testing Checklist

Before merging any UI change:

- [ ] Touch targets are at least 44 × 44 px
- [ ] Text is readable without zooming (minimum 14 px)
- [ ] Navigation works with the hamburger menu on mobile
- [ ] Content adapts to portrait and landscape orientations
- [ ] Images and icons scale appropriately
- [ ] No horizontal scrolling on small screens
- [ ] Proper spacing for touch interactions

## Troubleshooting

### Node.js version issues

```bash
nvm install --lts
nvm use --lts
npm install -g npm@latest
```

### Testing on a real mobile device

```bash
# 1. Find your local IP
ifconfig        # macOS / Linux
ipconfig        # Windows

# 2. Start the dev server
npm run dev

# 3. Open http://YOUR_IP:5173 on the device (must be on the same network)
```

## Roadmap

- [ ] Assets management
- [ ] Configuration caching with cache invalidation
- [ ] Additional section types (gallery, contact form, calendar, team, member, event, bibliography, …)
- [ ] Advanced responsive images with `srcset`
- [ ] Configuration edition mechanism
- [ ] Modules management (payment, authentication, external API access)
