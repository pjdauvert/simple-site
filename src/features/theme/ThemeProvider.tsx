import React, { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { ThemeConfig, ThemeName } from './theme.interface';
import { ThemeContext } from './ThemeContext';
import type { ThemeContextValue } from './ThemeContext';
import siteConfig from '../../config/siteConfig.json';

interface ThemeProviderProps {
  children: ReactNode;
}

// Dynamically build theme configurations from siteConfig
const themeConfigs: Record<ThemeName, ThemeConfig> = siteConfig.themes.reduce(
  (acc, theme) => {
    const { name, ...themeConfig } = theme;
    acc[name as ThemeName] = themeConfig as ThemeConfig;
    return acc;
  },
  {} as Record<ThemeName, ThemeConfig>
);

export const AppThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>('default');
  
  const themeConfig = useMemo(() => themeConfigs[themeName], [themeName]);
  
  const muiTheme: Theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeName === 'dark' ? 'dark' : 'light',
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
        },
      }),
    [themeConfig, themeName]
  );

  const switchTheme = (newTheme: ThemeName) => {
    setThemeName(newTheme);
  };

  const contextValue: ThemeContextValue = {
    themeName,
    themeConfig,
    switchTheme,
    availableThemes: Object.keys(themeConfigs) as ThemeName[],
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

