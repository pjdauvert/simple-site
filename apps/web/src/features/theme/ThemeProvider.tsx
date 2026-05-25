import React, { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { ThemeConfig, SiteThemeConfig } from '@simple-site/interfaces';
import { ThemeContext } from './ThemeContext';
import type { ThemeContextValue } from './ThemeContext';
import { useSiteConfig } from '../../hooks/useSiteConfig';

const DEFAULT_THEME_NAME = 'Default';

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  themeName: 'Default',
  primaryColor: '#0076d2',
  secondaryColor: '#dc004e',
  linkColor: '#1976d2',
  linkHoverColor: '#115293',
  backgroundColor: '#ffffff',
  menuBackgroundColor: '#1976d2',
  menuHoverColor: '#115293',
};

const DEFAULT_SITE_THEME: SiteThemeConfig = { siteName: '' };

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

interface StaticThemeProviderProps {
  children: ReactNode;
  themeConfig?: ThemeConfig;
  siteThemeConfig?: SiteThemeConfig;
}

export const StaticThemeProvider: React.FC<StaticThemeProviderProps> = ({
  children,
  themeConfig = DEFAULT_THEME_CONFIG,
  siteThemeConfig = DEFAULT_SITE_THEME,
}) => {
  const muiTheme = useMemo(() => buildMuiTheme(themeConfig), [themeConfig]);
  const contextValue: ThemeContextValue = {
    themeName: themeConfig.themeName,
    themeConfig,
    siteThemeConfig,
    switchTheme: () => {},
    availableThemes: [themeConfig.themeName],
  };
  return <ThemeRenderer contextValue={contextValue} muiTheme={muiTheme}>{children}</ThemeRenderer>;
};

interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const { config } = useSiteConfig();

  const siteThemeConfig: SiteThemeConfig = config.site;

  // Build theme configurations from config:
  // - 0 themes: use DEFAULT_THEME_CONFIG
  // - 1 theme: override Default with that theme
  // - 2+ themes: list all themes in switcher
  const { themeConfigs, availableThemeNames } = useMemo(() => {
    const names = config.themes.map(t => t.themeName);
    if (names.length === 0) {
      return { themeConfigs: { [DEFAULT_THEME_NAME]: DEFAULT_THEME_CONFIG }, availableThemeNames: [DEFAULT_THEME_NAME] };
    }
    if (names.length === 1) {
      return { themeConfigs: { [DEFAULT_THEME_NAME]: config.themes[0] }, availableThemeNames: [DEFAULT_THEME_NAME] };
    }
    return {
      themeConfigs: Object.fromEntries(config.themes.map(t => [t.themeName, t])),
      availableThemeNames: names,
    };
  }, [config.themes]);

  const [themeName, setThemeName] = useState<string>(availableThemeNames[0]);
  const themeConfig = useMemo(() => themeConfigs[themeName], [themeName, themeConfigs]);
  const muiTheme = useMemo(() => buildMuiTheme(themeConfig), [themeConfig]);

  const contextValue: ThemeContextValue = {
    themeName,
    themeConfig,
    siteThemeConfig,
    switchTheme: setThemeName,
    availableThemes: availableThemeNames,
  };

  return <ThemeRenderer contextValue={contextValue} muiTheme={muiTheme}>{children}</ThemeRenderer>;
};
