import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { SiteThemeConfig } from '@simple-site/interfaces';
import { ThemeContext } from './ThemeContext';
import type { ThemeContextValue } from './ThemeContext';

const ADMIN_THEME_CONFIG = {
  themeName: 'Default',
  primaryColor: '#0076d2',
  secondaryColor: '#dc004e',
  linkColor: '#1976d2',
  linkHoverColor: '#115293',
  backgroundColor: '#ffffff',
  menuBackgroundColor: '#1976d2',
  menuHoverColor: '#115293',
};

const ADMIN_SITE_THEME: SiteThemeConfig = { siteName: '' };

const muiTheme = createTheme({
  palette: {
    primary: { main: ADMIN_THEME_CONFIG.primaryColor },
    secondary: { main: ADMIN_THEME_CONFIG.secondaryColor },
  },
});

const ADMIN_THEME_CONTEXT: ThemeContextValue = {
  themeName: 'Default',
  themeConfig: ADMIN_THEME_CONFIG,
  siteThemeConfig: ADMIN_SITE_THEME,
  switchTheme: () => {},
  availableThemes: ['Default'],
};

export const AdminThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeContext.Provider value={ADMIN_THEME_CONTEXT}>
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  </ThemeContext.Provider>
);
