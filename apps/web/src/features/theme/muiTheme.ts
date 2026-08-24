import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ThemeConfig } from '@simple-site/interfaces';

const DESIGN_SHADOWS: [string, string, string, string, string, string] = [
  '0 1px 2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
  '0 2px 4px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.08)',
  '0 4px 8px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
  '0 8px 16px rgba(0,0,0,0.14), 0 4px 8px rgba(0,0,0,0.10)',
  '0 16px 32px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.10)',
  '0 24px 48px rgba(0,0,0,0.18), 0 12px 24px rgba(0,0,0,0.12)',
];

function buildShadowsArray(): Theme['shadows'] {
  const shadows = Array(25).fill('none') as Theme['shadows'];
  shadows[1] = DESIGN_SHADOWS[0];
  shadows[2] = DESIGN_SHADOWS[1];
  shadows[4] = DESIGN_SHADOWS[2];
  shadows[8] = DESIGN_SHADOWS[3];
  shadows[16] = DESIGN_SHADOWS[4];
  shadows[24] = DESIGN_SHADOWS[5];
  return shadows;
}

/**
 * The brand gradient — the theme's primary → secondary → tertiary sweep used as
 * the placeholder background wherever an image is expected but absent (cards,
 * event posters…). Tertiary falls back to primary on two-color themes.
 */
export const brandGradient = (theme: Theme): string => {
  const primary = theme.palette.primary.main;
  const tertiary = theme.palette.tertiary?.main ?? primary;
  return `linear-gradient(135deg, ${primary} 0%, ${theme.palette.secondary.main} 50%, ${tertiary} 100%)`;
};

/** Builds a MUI theme from a site `ThemeConfig` (palette, shadows, component overrides). */
export function buildMuiTheme(themeConfig: ThemeConfig): Theme {
  const isDark = themeConfig.backgroundColor.toLowerCase().includes('dark') ||
                 parseInt(themeConfig.backgroundColor.replace('#', ''), 16) < 0x808080;

  const tertiaryMain = themeConfig.tertiaryColor ?? themeConfig.primaryColor;
  const tertiaryDark = themeConfig.tertiaryHoverColor ?? tertiaryMain;
  const paperBg = themeConfig.surfaceColor ?? themeConfig.backgroundColor;
  const menuTextColor = themeConfig.menuTextColor ?? themeConfig.textColor;

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: themeConfig.primaryColor },
      secondary: { main: themeConfig.secondaryColor },
      tertiary: { main: tertiaryMain, dark: tertiaryDark },
      background: {
        default: themeConfig.backgroundColor,
        paper: paperBg,
      },
      ...(themeConfig.textColor ? { text: { primary: themeConfig.textColor } } : {}),
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 500 },
      h4: { fontWeight: 500 },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 },
      body1: { fontWeight: 400 },
      body2: { fontWeight: 400 },
      caption: { fontWeight: 400, fontSize: '0.75rem', lineHeight: 1.4 },
    },
    shadows: buildShadowsArray(),
    shape: {
      borderRadius: 4,
    },
    components: {
      MuiLink: {
        styleOverrides: {
          root: {
            color: themeConfig.linkColor,
            '&:hover': { color: themeConfig.linkHoverColor },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: themeConfig.menuBackgroundColor,
            ...(menuTextColor ? { color: menuTextColor } : {}),
            borderRadius: 0,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            '.MuiAppBar-root &:hover': {
              backgroundColor: themeConfig.menuHoverColor,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
    },
    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },
  });
}
