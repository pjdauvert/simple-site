import React, { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { ThemeConfig, SiteThemeConfig } from '../../types/theme.interface';
import { ThemeContext } from './ThemeContext';
import type { ThemeContextValue } from './ThemeContext';
import siteConfig from '../../config/siteConfig.json';

interface ThemeProviderProps {
  children: ReactNode;
}

// Hardcoded Default theme
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

// General site theme configuration
const siteThemeConfig: SiteThemeConfig = siteConfig.site as unknown as SiteThemeConfig;

// Dynamically build theme configurations from siteConfig
const configThemes: Record<string, ThemeConfig> = siteConfig.themes.reduce(
  (acc, theme) => {
    const { themeName, ...themeConfig } = theme;
    acc[themeName] = themeConfig as ThemeConfig;
    return acc;
  },
  {} as Record<string, ThemeConfig>
);

// Determine available themes based on config
const configThemeNames = siteConfig.themes.map(theme => theme.themeName);

// Build final theme configs and available themes based on the rules:
// - 0 themes in config: use hardcoded Default
// - 1 theme in config: override Default with that theme
// - 2+ themes in config: list all themes in switcher
let themeConfigs: Record<string, ThemeConfig>;
let availableThemeNames: string[];

if (configThemeNames.length === 0) {
  // No themes in config: use hardcoded Default
  themeConfigs = { [DEFAULT_THEME_NAME]: DEFAULT_THEME_CONFIG };
  availableThemeNames = [DEFAULT_THEME_NAME];
} else if (configThemeNames.length === 1) {
  // One theme in config: override Default with that theme
  themeConfigs = { [DEFAULT_THEME_NAME]: configThemes[configThemeNames[0]] };
  availableThemeNames = [DEFAULT_THEME_NAME];
} else {
  // Multiple themes in config: list all themes
  themeConfigs = configThemes;
  availableThemeNames = configThemeNames;
}

export const AppThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<string>(availableThemeNames[0]);
  
  const themeConfig = useMemo(() => themeConfigs[themeName], [themeName]);
  
  const muiTheme: Theme = useMemo(
    () => {
      // Detect dark theme based on background color brightness
      const isDark = themeConfig.backgroundColor.toLowerCase().includes('dark') ||
                     parseInt(themeConfig.backgroundColor.replace('#', ''), 16) < 0x808080;
      
      return createTheme({
        palette: {
          mode: isDark ? 'dark' : 'light',
          primary: {
            main: themeConfig.primaryColor,
          },
          secondary: {
            main: themeConfig.secondaryColor,
          },
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
                '&:hover': {
                  color: themeConfig.linkHoverColor,
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: themeConfig.menuBackgroundColor,
              },
            },
          },
        },
        // Mobile-first breakpoints
        breakpoints: {
          values: {
            xs: 0,
            sm: 600,
            md: 900,
            lg: 1200,
            xl: 1536,
          },
        }
      });
    },
    [themeConfig]
  );

  const switchTheme = (newTheme: string) => {
    setThemeName(newTheme);
  };

  const contextValue: ThemeContextValue = {
    themeName,
    themeConfig,
    siteThemeConfig,
    switchTheme,
    availableThemes: availableThemeNames,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

