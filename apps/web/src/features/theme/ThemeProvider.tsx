import React, { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { ThemeConfig, SiteConfig } from '@simple-site/interfaces';
import { ThemeContext } from './ThemeContext';
import type { ThemeContextValue } from './ThemeContext';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useFavicon } from '../../hooks/useFavicon';
import { initTheme, THEME_KEY } from '../../services/initService';

import { DEFAULT_SITE } from './DefaultThemes';


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

function buildMuiTheme(themeConfig: ThemeConfig): Theme {
  const isDark = themeConfig.backgroundColor.toLowerCase().includes('dark') ||
                 parseInt(themeConfig.backgroundColor.replace('#', ''), 16) < 0x808080;

  const tertiaryMain = themeConfig.tertiaryColor ?? themeConfig.primaryColor;
  const tertiaryDark = themeConfig.tertiaryHoverColor ?? tertiaryMain;
  const paperBg = themeConfig.surfaceColor ?? themeConfig.backgroundColor;

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
          root: { backgroundColor: themeConfig.menuBackgroundColor },
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

const ThemeRenderer = ({
  children,
  contextValue,
  muiTheme,
}: {
  children: ReactNode;
  contextValue: ThemeContextValue;
  muiTheme: Theme;
}) => (
  <ThemeContext.Provider value={contextValue}>
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  </ThemeContext.Provider>
);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const siteContext = useSiteConfig();
  const siteConfig: SiteConfig = siteContext?.config ?? DEFAULT_SITE;

    // Build theme configurations from config:
  // - 0 themes: use default theming
  // - 1 theme: use the theme with no switcheable themes
  // - 2+ themes: list all themes in switcher
  const { themeConfigs, availableThemeNames } = useMemo(() => {
    const siteThemes = Object.fromEntries(siteConfig.themes.map(t => [t.themeName, t]))
    if (siteConfig.themes.length === 1) {
      return { themeConfigs: {}, availableThemeNames: [] };
    }
    return {
      themeConfigs: siteThemes,
      availableThemeNames: Object.keys(siteThemes),
    };
  }, [siteConfig.themes]);

  const [themeName, setThemeName] = useState<string>(() => initTheme(availableThemeNames));
  const themeConfig = useMemo(() => themeConfigs[themeName], [themeName, themeConfigs]);
  const muiTheme = useMemo(() => buildMuiTheme(themeConfig), [themeConfig]);
  useFavicon(siteConfig.site.faviconUrl);

  const switchTheme = (name: string) => {
    setThemeName(name);
    localStorage.setItem(THEME_KEY, name);
  };

  const contextValue: ThemeContextValue = {
    themeName,
    themeConfig,
    siteThemeConfig: siteConfig.site,
    switchTheme,
    availableThemes: availableThemeNames,
  };

  return <ThemeRenderer contextValue={contextValue} muiTheme={muiTheme}>{ children }</ThemeRenderer>;
};
