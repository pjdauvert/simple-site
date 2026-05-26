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

import { DEFAULT_SITE } from './DefaultThemes';

function buildMuiTheme(themeConfig: ThemeConfig): Theme {
  const isDark = themeConfig.backgroundColor.toLowerCase().includes('dark') ||
                 parseInt(themeConfig.backgroundColor.replace('#', ''), 16) < 0x808080;
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: themeConfig.primaryColor },
      secondary: { main: themeConfig.secondaryColor },
      background: {
        default: themeConfig.backgroundColor,
        paper: themeConfig.backgroundColor,
      },
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

  const [themeName, setThemeName] = useState<string>(availableThemeNames[0]);
  const themeConfig = useMemo(() => themeConfigs[themeName], [themeName, themeConfigs]);
  const muiTheme = useMemo(() => buildMuiTheme(themeConfig), [themeConfig]);
  useFavicon(siteConfig.site.faviconUrl);

  const contextValue: ThemeContextValue = {
    themeName,
    themeConfig,
    siteThemeConfig: siteConfig.site,
    switchTheme: setThemeName,
    availableThemes: availableThemeNames,
  };

  return <ThemeRenderer contextValue={contextValue} muiTheme={muiTheme}>{ children }</ThemeRenderer>;
};
