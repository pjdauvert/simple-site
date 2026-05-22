# Simple Site

A modern, mobile-first, themable, and multilingual web application built with React, TypeScript, Material-UI, and Zod validation.

## 🚀 Features

- 📱 **Mobile-First Responsive Design** - Optimized for mobile devices with proper breakpoints
- 🎨 **Runtime Theme Switching** - Switch between multiple themes on the fly
- 🌍 **Multilingual Support** - Built-in internationalization with English and French
- 📦 **Dynamic Routing** - Routes automatically generated from configuration


## 🛠️ Tech Stack

- **React 19** - Latest version of the UI library with improved performance and features
- **TypeScript** - Type safety with strict mode and discriminated unions
- **Material-UI (MUI)** - Component library with responsive utilities
- **Zod** - Runtime schema validation and type inference
- **React Intl** - Internationalization
- **React Router** - Client-side routing with dynamic route generation
- **React Markdown** - Markdown rendering support in text sections
- **Vite + Nx** - Vite dev/build orchestrated via Nx run targets
- **Vitest** - Unit testing framework
- **ESLint** - Code linting
- **Lefthook** - Git hooks manager
- **Netlify Functions** - Serverless runtime for backend endpoints

## 🧱 Workspace Layout

This repository follows an Nx-style monorepo so frontend, shared contracts, and serverless functions live together:

```
.
├─ apps/
│  ├─ web/            # Vite React SPA (what runs in the browser)
│  └─ functions/      # Netlify Functions in TypeScript
├─ libs/
│  └─ interfaces/     # Shared Zod schemas & TypeScript interfaces
├─ netlify.toml       # Netlify build + redirects to /.netlify/functions/*
├─ package.json       # Nx scripts (dev/build/test/lint/typecheck)
└─ tsconfig.base.json # Path alias @simple-site/interfaces → libs/interfaces
```

Use the provided npm scripts (`npm run dev`, `npm run build`, `npm run test`, etc.) which delegate to Nx targets under the hood.

## 🔁 Shared Interfaces & Validation

All contracts live in `libs/interfaces` and are exported through the `@simple-site/interfaces` alias defined in `tsconfig.base.json`. The library contains:

- Zod schemas for the site configuration (theme, layout, sections, i18n)
- Section discriminated unions that drive rendering
- Shared types for request/response payloads like the contact form

Because our Netlify functions compile to native NodeNext ESM, the shared library also re-exports files with explicit `.js` extensions so the emitted JavaScript keeps working in Node without bundling.

## ☁️ Serverless Functions

`apps/functions` hosts TypeScript Netlify handlers compiled with `tsc`. All endpoints are accessible under `/api/*` (redirected to `/.netlify/functions/*` by `netlify.toml`). All endpoints require a `Content-Type: application/json` header.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Retrieve the full site configuration |
| POST | `/api/config` | Replace the site configuration |
| GET | `/api/translations/:language` | Retrieve translation dictionary for a locale |
| POST | `/api/translations/:language` | Merge translations for a locale |
| POST | `/api/send-email` | Validate contact form payload and send via Mailgun |
| GET | `/api/db-query` | Fetch sample users from MongoDB |
| GET | `/api/imagekit-sign` | Generate an ImageKit upload signature |
| GET | `/api/google-proxy` | Proxy a Google API call with the server API key |

#### `GET /api/config`

Returns the full `SiteConfig` stored in Netlify Blobs. On first call the blob is seeded from the bundled `siteConfig.json`.

```json
// 200 OK
{ "ok": true, "data": { /* SiteConfig */ } }
```

#### `POST /api/config`

Replaces the stored site configuration. The body must be a valid `SiteConfig` JSON object (validated via Zod).

```json
// Request body
{ /* SiteConfig */ }

// 200 OK
{ "ok": true, "data": { "message": "Configuration updated successfully" } }
```

#### `GET /api/translations/:language`

Returns the translation dictionary for the requested locale. Supported values for `:language`: `en`, `fr`.

```json
// 200 OK
{ "ok": true, "data": { "page.home.hero.content.title": "Welcome", /* ... */ } }
```

#### `POST /api/translations/:language`

Merges the provided key/value pairs into the stored dictionary for the given locale. Existing keys are overwritten; absent keys are preserved.

```json
// Request body — record of dotted translation keys to string values
{ "page.home.hero.content.title": "Welcome to Our Site" }

// 200 OK
{ "ok": true, "data": { "message": "en translations updated successfully" } }
```

#### Error response shape

All errors follow a consistent structure:

```json
{ "ok": false, "code": "INVALID_REQUEST", "message": "...", "timestamp": "...", "path": "..." }
```

Common status codes: `400` (bad request / invalid content type / bad locale), `404` (store key not found), `405` (method not allowed), `500` (internal / configuration error).

### Storage

`/api/config` and `/api/translations/:language` use **Netlify Blobs** (store name: `{APP_NAME}-store`). On first access the blob is seeded automatically from the bundled seed files — no manual setup required.

### Environment variables

Set the following in Netlify (or your local environment) before deploying:

```
APP_NAME                 # Used to namespace the Netlify Blobs store
MONGODB_URI
MAILGUN_API_KEY
MAILGUN_DOMAIN
MAILGUN_TO_EMAIL
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_URL_ENDPOINT
GOOGLE_API_KEY_SERVER
AUTH0_DOMAIN
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET
AUTH0_REDIRECT_URI
```

Netlify reads the static site from `dist/apps/web` and functions from `dist/apps/functions` as defined in `netlify.toml`. Locally you can build both with `npm run build` which runs the Nx `run-many` target.

## 📱 Mobile-First Responsive Design

This application follows a mobile-first approach with the following breakpoints:

- **xs** (0px+): Extra small devices (phones)
- **sm** (600px+): Small devices (large phones, small tablets)
- **md** (900px+): Medium devices (tablets)
- **lg** (1200px+): Large devices (desktops)
- **xl** (1536px+): Extra large devices (large desktops)

### Responsive Features

- **Adaptive Typography** - Font sizes scale based on screen size
- **Flexible Layouts** - Components adjust padding, margins, and spacing
- **Mobile Navigation** - Hamburger menu on mobile, full menu bar on desktop
- **Touch-Friendly** - Appropriately sized touch targets for mobile devices
- **Optimized Images** - Logo and icons scale appropriately

## 🚀 Getting Started

### Prerequisites

- **nvm** (Node Version Manager)
- Latest Node.js LTS (v24.11.0) - will be installed via nvm
- npm (latest version) - will be updated automatically

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd simple-site
```

2. **Install and use the correct Node.js version**
```bash
# Install latest LTS via nvm
nvm install --lts
nvm use --lts

# Update npm to latest
npm install -g npm@latest
```

3. **Install dependencies**
```bash
npm install
```

4. **Install git hooks**
```bash
npx lefthook install
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

**Test on mobile devices:**
- Use your local IP address (e.g., `http://192.168.1.x:5173`)
- Or use browser developer tools to simulate mobile devices

### Building

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

### Testing

Run tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

### Code Quality

Run linter:
```bash
npm run lint
```

Run type checking:
```bash
npm run typecheck
```

## 🎨 Configuration

All application configuration is centralized in a single file: **`apps/web/src/config/siteConfig.json`**

The configuration is:
- ✅ **Loaded Asynchronously** - Simulates API loading with a loading screen
- ✅ **Validated at Runtime** - Zod schemas ensure configuration correctness
- ✅ **Type-Safe** - Full TypeScript type inference from Zod schemas
- ✅ **Context-Based** - Injected throughout the app via React Context

This unified configuration includes:
- Site metadata (name, logo, favicon, container width)
- Theme configurations (colors, styles)
- Page definitions and content sections
- Translations for all languages

### Site Configuration Structure

```json
{
  "site": {
    "siteName": "Simple Site",
    "logoUrl": "/vite.svg",
    "faviconUrl": "/vite.svg",
    "containerMaxWidth": "lg"
  },
  "themes": [
    {
      "themeName": "Dark",
      "primaryColor": "#90caf9",
      "secondaryColor": "#f48fb1",
      "linkColor": "#90caf9",
      "linkHoverColor": "#64b5f6",
      "backgroundColor": "#121212",
      "menuBackgroundColor": "#1e1e1e",
      "menuHoverColor": "#2c2c2c"
    },
    {
      "themeName": "Dark Blue",
      "primaryColor": "#64b5f6",
      "secondaryColor": "#f48fb1",
      "linkColor": "#64b5f6",
      "linkHoverColor": "#90caf9",
      "backgroundColor": "#0d1b2a",
      "menuBackgroundColor": "#1b263b",
      "menuHoverColor": "#415a77"
    }
  ],
  "pages": [
    {
      "pageName": "page.home",
      "menuTitle": "Home",
      "route": "/",
      "sections": [
        {
          "sectionName": "hero",
          "type": "hero",
          "content": {
            "title": "Hero Title",
            "subtitle": "Hero Subtitle",
            "ctaLabel": "Get Started",
            "ctaLink": "/"
          },
          "design": {
            "backgroundColor": "#f0f0f0",
            "textColor": "#0000FF"
          }
        },
        {
          "sectionName": "text",
          "type": "text",
          "content": {
            "title": "Text Title",
            "paragraph": "Text content with **markdown** support"
          },
          "design": {
            "imageUrl": "/image.jpg",
            "imagePosition": "left"
          }
        }
      ]
    }
  ],
  "i18n": {
    "en": {
      "page.home.menuTitle": "Home",
      "page.home.hero.content.title": "Welcome"
    },
    "fr": {
      "page.home.menuTitle": "Accueil",
      "page.home.hero.content.title": "Bienvenue"
    }
  }
}
```

### Adding New Themes

Simply add a new theme object to the `themes` array in `siteConfig.json`:

```json
{
  "themeName": "Custom",
  "primaryColor": "#ff5722",
  "secondaryColor": "#00bcd4",
  "linkColor": "#ff5722",
  "linkHoverColor": "#e64a19",
  "backgroundColor": "#fafafa",
  "menuBackgroundColor": "#ff5722",
  "menuHoverColor": "#e64a19"
}
```

The configuration will be validated by Zod schemas, and the theme will automatically be available in the theme switcher.
If no theme is provided, a default one is hardcoded and will be used. When only one theme is provided, then the theme swithcher will not appear.

### Adding New Pages

Add page definitions to the `pages` array in `siteConfig.json`:

```json
{
  "pageName": "page.contact", // used for i18n key override construction (see Translations)
  "menuTitle": "Contact", // as it will appear in the site menu
  "route": "/contact", //unique route name for the URL
  "sections": [
    ... // add setions here
  ]
}
```

Pages are validated at runtime and routes are automatically generated.

### Translations

Translations are embedded in the page content using the site structure's field names as the i18n key. The application uses React Intl with fallback to the default text values defined in `siteConfig.json`.

Translation keys are automatically constructed using:
```
{pageName}.{sectionName}.content.{field}
```

Example:
- Page name: `page.home`
- Section name: `hero`
- Content field name: `title`
- **Translation key**: `page.home.hero.content.title`

Add translations in the `i18n` object:
```json
{
  "i18n": {
    "en": {
      "page.home.hero.content.title": "Welcome to Our Site",
      "page.home.hero.content.subtitle": "Modern React Application"
    },
    "fr": {
      "page.home.hero.content.title": "Bienvenue sur Notre Site",
      "page.home.hero.content.subtitle": "Application React Moderne"
    }
  }
}
```

The application falls back to the content values in `siteConfig.json` if translations are missing.
If the section contains columns, then the key format becomes: `page.home.text.content.columns.0.title` (`text` type section)

## 🏗️ Architecture

### Async Configuration with Zod Validation

The application loads configuration **asynchronously** with **runtime validation**:

**Key Features:**
- ✅ **Async Loading** - Shows loading screen while config loads
- ✅ **Runtime Validation** - Zod catches configuration errors
- ✅ **Type Inference** - TypeScript types inferred from Zod schemas
- ✅ **Context Injection** - Config available throughout the app
- ✅ **Error Handling** - Graceful error display if config invalid

### Configuration Flow

```
┌─────────────────────────────────────────┐
│  App starts                             │
│  ↓                                      │
│  SiteConfigProvider loads config        │
│  ↓                                      │
│  Loading screen displayed               │
│  ↓                                      │
│  configService.loadSiteConfig()         │
│  ↓                                      │
│  Zod validation (SiteConfigSchema)      │
│  ↓                                      │
│  Config available in Context            │
│  ↓                                      │
│  ├─ IntlProvider (uses config.i18n)     │
│  ├─ ThemeProvider (uses config.themes)  │
│  └─ AppRouter (uses config.pages)       │
└─────────────────────────────────────────┘
```

### Adding New Section Types

The application uses **discriminated unions** with Zod for type-safe section rendering. Here's how to add a new section type:

#### 1. Define Schema in `libs/interfaces/src/sections/section.interface.ts`

```typescript
// Add to SectionTypesEnum
export const SectionTypesEnum = {
  HERO: 'hero',
  TEXT: 'text',
  NEW: 'new', // ← Add new type
} as const;

// Create content schema
const NewContentSchema = z.object({
  title: z.string().optional(),
  images: z.array(z.object({
    url: z.string(),
    alt: z.string(),
  })),
});

// Create design schema (extends base)
const NewDesignSchema = SectionDesignSchema.extend({
  columns: z.number().optional(),
  spacing: z.number().optional(),
});

// Create block schema with sectionName
const NewSectionPropsSchema = BaseSectionPropsSchema.extend({
  type: z.literal(SectionTypesEnum.NEW),
  content: NewContentSchema,
  design: NewDesignSchema.optional(),
});

export type NewSectionProps = z.infer<typeof NewSectionPropsSchema>;
```

#### 2. Update Discriminated Union

```typescript
// Add to discriminated union
export const SectionPropsSchema = z.discriminatedUnion('type', [
  HeroSectionPropsSchema,
  TextSectionPropsSchema,
  NewSectionPropsSchema, // ← Add here
]);

// Update conditional type
export type SectionProps<T extends SectionType> = 
  T extends typeof SectionTypesEnum.HERO 
    ? HeroSectionProps
    : T extends typeof SectionTypesEnum.TEXT
    ? TextSectionProps
    : T extends typeof SectionTypesEnum.NEW
    ? NewSectionProps // ← Add here
    : never;
```

#### 3. Create Section Component

Create `apps/web/src/components/sections/NewSection.tsx`:

```typescript
import React from 'react';
import { Container, Box } from '@mui/material';
import type { NewSectionProps } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useTheme';
import { FormattedMessage } from 'react-intl';

export const NewSection: React.FC<NewSectionProps> = ({
  sectionName,
  content,
  design
}) => {
  const { siteThemeConfig, themeConfig } = useAppTheme();
  return (
    <Box>
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        // use sectionName to contextualize i18n key
        <FormattedMessage id={`${sectionName}.content.title`} defaultMessage={content.title} /> 
        // your component here
      </Container>
    </Box>
  );
};
```

#### 4. Export from `apps/web/src/components/index.ts`

```typescript
export { NewSection } from './sections/NewSection';
```

#### 5. Add to Router in `apps/web/src/pages/dynamic/PageSection.tsx`

```typescript
import { NewSection } from '../../components';

switch (type) {
  case SectionTypesEnum.HERO:
    return <HeroSection {...props} />;
  case SectionTypesEnum.TEXT:
    return <TextSection {...props} />;
  case SectionTypesEnum.NEW: // ← Add here
    return <NewSection {...props} />;
  default:
    return null;
}
```

#### 6. Add to Configuration

Update `apps/web/src/config/siteConfig.json`:

```json
{
  "sections": [
    {
      "sectionName": "new-section",
      "type": "new",
      "content": {
        "title": "Our New section",
        "images": [
          { "url": "/img1.jpg", "alt": "Image 1" },
          { "url": "/img2.jpg", "alt": "Image 2" }
        ]
      },
      "design": {
        "columns": 3,
        "spacing": 2,
        "backgroundColor": "#f5f5f5"
      }
    }
  ]
}
```

#### 7. Add Translations (Optional)

```json
{
  "i18n": {
    "en": {
      "pageName.new-section.content.title": "Super Title of the new section"
    },
    "fr": {
      "pageName.new-section.content.title": "Super titre de la nouvelle section"
    }
  }
}
```


### Mobile-First Development

All components use Material-UI's `sx` prop with mobile-first responsive values:

```typescript
sx={{
  fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
  padding: { xs: 2, sm: 3, md: 4 },
}}
```

## 📄 License

This project is licensed under the [AGPL-3.0 License](https://www.gnu.org/licenses/agpl-3.0.html).

## 🤝 Contributing

1. Ensure all tests pass
2. Follow the existing code style
3. Use mobile-first responsive design patterns
4. Test on multiple screen sizes
5. Pre-commit hooks will run automatically to check code quality
6. All commits must pass linting and type checking

## 🌐 Browser Support

Modern browsers that support ES6+ features and React 19:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 13.4+)
- Chrome Mobile (Android 6+)

**Note**: React 19 requires more recent browser versions than React 18. Ensure your target audience uses modern browsers.


## 📱 Mobile Testing Checklist

- ✅ Touch targets are at least 44x44 pixels
- ✅ Text is readable without zooming (minimum 14px)
- ✅ Navigation works with thumb-friendly hamburger menu
- ✅ Content adapts to portrait and landscape orientations
- ✅ Images and icons scale appropriately
- ✅ No horizontal scrolling on small screens
- ✅ Proper spacing for touch interactions

## 🔧 Troubleshooting

### Node.js Version Issues

If you encounter version-related issues:
```bash
nvm install --lts
nvm use --lts
npm install -g npm@latest
```

### Mobile Device Testing

To test on real mobile devices on your local network:
1. Find your local IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
2. Start dev server: `npm run dev`
3. Access from mobile: `http://YOUR_IP:5173`
4. Ensure your mobile device is on the same network

## 🎯 Future Enhancements

- [ ] Assets management
- [ ] Load configuration from API endpoint instead of JSON file
- [ ] Load i18n resources asynchronously on language select
- [ ] Configuration caching with cache invalidation
- [ ] Additional section types (gallery, contact form, calendar, team, member, event, bibliography, etc.)
- [ ] Advanced responsive images with srcset
- [ ] Configuration edition mechanism
- [ ] Modules management (payment, authentication, external API access)
