# Simple Site

A modern, mobile-first, themable, and multilingual web application built with React, TypeScript, and Material-UI.

## 🚀 Features

- 📱 **Mobile-First Responsive Design** - Optimized for mobile devices with proper breakpoints
- 🎨 **Runtime Theme Switching** - Switch between light and dark themes on the fly
- 🌍 **Multilingual Support** - Built-in internationalization with English and French
- 🏗️ **Clean Architecture** - Separation of smart and dumb components
- 🔒 **Type-Safe** - Full TypeScript support with strict mode enabled
- ✅ **Pre-commit Checks** - Automated linting and type checking before commits
- 🧪 **Testing Setup** - Vitest configured with React Testing Library
- ⚡ **Latest Node.js** - Using Node.js v24.11.0 LTS managed by nvm
- 🚀 **React 19** - Using the latest React version with enhanced features

## 🛠️ Tech Stack

- **React 19** - Latest version of the UI library with improved performance and features
- **TypeScript** - Type safety with strict mode
- **Material-UI (MUI)** - Component library with responsive utilities
- **React Intl** - Internationalization
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Vitest** - Unit testing framework
- **ESLint** - Code linting
- **Lefthook** - Git hooks manager
- **Node.js 24.11.0 LTS** - Latest stable version via nvm
- **npm 11.6.2** - Latest npm version

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

## 📁 Project Structure

```
src/
├── assets/              # Static assets (images, fonts)
├── components/          # Reusable dumb components
│   ├── Hero.tsx        # Mobile-responsive hero section
│   └── index.ts
├── features/            # Feature-specific modules
│   ├── theme/          # Theme management
│   │   ├── ThemeContext.ts
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeSwitcher.tsx
│   │   ├── theme.interface.ts
│   │   └── themes/
│   │       ├── defaultTheme.json
│   │       └── darkTheme.json
│   └── i18n/           # Internationalization
│       ├── IntlContext.ts
│       ├── IntlProvider.tsx
│       ├── LanguageSwitcher.tsx
│       └── messages/
│           ├── en.json
│           └── fr.json
├── hooks/              # Custom React hooks
│   ├── useTheme.ts
│   └── useIntl.ts
├── layouts/            # Layout components with responsive breakpoints
│   ├── MenuBar.tsx     # Responsive navigation (mobile + desktop)
│   ├── Footer.tsx      # Responsive footer
│   └── MainLayout.tsx
├── pages/              # Page components with mobile-first design
│   ├── Home.tsx
│   ├── Calendar.tsx
│   └── AboutUs.tsx
├── services/           # API and external services
├── styles/             # Global styles with mobile-first media queries
│   └── global.css
├── types/              # TypeScript type definitions
│   ├── theme.interface.ts
│   └── menu.interface.ts
├── utils/              # Utility functions
├── config/             # Configuration files
│   └── menuConfig.json
├── test/               # Test setup
│   └── setup.ts
├── App.tsx             # Main application component
├── router.tsx          # React Router configuration
└── main.tsx            # Application entry point
```

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

### Theme Configuration

Themes are defined in JSON files located in `src/features/theme/themes/`. Each theme includes:

- `primaryColor` - Primary brand color
- `secondaryColor` - Secondary accent color
- `linkColor` - Default link color
- `linkHoverColor` - Link hover state color
- `backgroundColor` - Page background color
- `menuBackgroundColor` - Navigation menu background
- `menuHoverColor` - Menu item hover state
- `logoUrl` - Logo image URL

**Example theme file:**
```json
{
  "primaryColor": "#1976d2",
  "secondaryColor": "#dc004e",
  "linkColor": "#1976d2",
  "linkHoverColor": "#115293",
  "backgroundColor": "#ffffff",
  "menuBackgroundColor": "#1976d2",
  "menuHoverColor": "#115293",
  "logoUrl": "/vite.svg"
}
```

### Menu Configuration

Menu items are defined in `src/config/menuConfig.json`:

```json
{
  "items": [
    {
      "title": "Home",
      "intlKey": "menu.home",
      "route": "/"
    }
  ]
}
```

### Translations

Translation files are located in `src/features/i18n/messages/`:
- `en.json` - English translations
- `fr.json` - French translations

To add a new language:
1. Create a new JSON file (e.g., `es.json`)
2. Add translations for all keys
3. Update `IntlProvider.tsx` and `IntlContext.ts` to include the new locale

## 🏗️ Architecture

### Smart vs Dumb Components

**Smart Components** (Container): Manage state, side effects, and business logic
- `App.tsx`
- `AppThemeProvider`
- `AppIntlProvider`
- `MainLayout` (uses hooks)

**Dumb Components** (Presentational): Receive props and render UI
- `Hero` - Fully responsive hero section
- `MenuBar` - Adaptive navigation (mobile hamburger menu / desktop menu bar)
- `Footer` - Responsive footer with flexbox layout

### Custom Hooks

- `useAppTheme()` - Access theme state and switching functionality
- `useAppIntl()` - Access language state and switching functionality

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

## 📄 Pages

- **Home** (`/`) - Landing page with responsive hero section
- **Calendar** (`/calendar`) - Calendar page with icon (placeholder)
- **About Us** (`/about`) - About page with feature list

## 🌐 Browser Support

Modern browsers that support ES6+ features and React 19:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 13.4+)
- Chrome Mobile (Android 6+)

**Note**: React 19 requires more recent browser versions than React 18. Ensure your target audience uses modern browsers.

## ⚠️ React 19 Compatibility Note

This project uses **React 19** with `react-intl` which internally depends on React 18 types. Due to React 19's expanded `ReactNode` type (which includes `bigint`), there's a type incompatibility that is safely handled with type assertions in the `IntlProvider`.

The build process has been optimized:
- `npm run build` - Builds the production bundle (recommended)
- `npm run build:check` - Builds with strict TypeScript project references (may show type warnings)
- `npm run typecheck` - Type checking works correctly with `tsc --noEmit`

This is a temporary compatibility issue that will be resolved when `react-intl` officially supports React 19.

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

## 📊 Performance

- **Build Size**: ~505 KB (gzipped: ~162 KB)
- **Mobile-First**: Optimized for mobile performance
- **Code Splitting**: Consider implementing dynamic imports for larger apps
- **Tree Shaking**: Enabled via Vite

## 🎯 Future Enhancements

- [ ] Progressive Web App (PWA) support
- [ ] Dark mode auto-detection based on system preferences
- [ ] Additional language support
- [ ] Advanced responsive images with srcset
- [ ] Offline support with service workers
- [ ] Performance monitoring
