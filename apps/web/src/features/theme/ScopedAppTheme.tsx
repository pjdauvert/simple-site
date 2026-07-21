import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import type { SiteThemeConfig, ThemeConfig } from '@simple-site/interfaces';
import { ThemeContext } from './ThemeContext';
import type { ThemeContextValue } from './ThemeContext';
import { buildMuiTheme } from './muiTheme';

interface ScopedAppThemeProps {
  themeConfig: ThemeConfig;
  siteThemeConfig: SiteThemeConfig;
  children: ReactNode;
}

/**
 * Applies a specific theme to a subtree — both the MUI theme and the app's
 * `ThemeContext` (which `useAppTheme` reads) — without affecting the rest of the
 * page. Used to preview page content under a chosen theme.
 */
export const ScopedAppTheme: React.FC<ScopedAppThemeProps> = ({ themeConfig, siteThemeConfig, children }) => {
  const muiTheme = useMemo(() => buildMuiTheme(themeConfig), [themeConfig]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName: themeConfig.themeName,
      themeConfig,
      siteThemeConfig,
      switchTheme: () => {},
      availableThemes: [],
    }),
    [themeConfig, siteThemeConfig],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
