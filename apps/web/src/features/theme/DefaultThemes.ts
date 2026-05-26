import type { SiteConfig, SiteThemeConfig, ThemeConfig } from "@simple-site/interfaces";


const DEFAULT_DARK_THEME: ThemeConfig = {
  themeName: 'Dark',
  primaryColor: "#90caf9",
  secondaryColor: "#f48fb1",
  linkColor: "#90caf9",
  linkHoverColor: "#64b5f6",
  backgroundColor: "#121212",
  menuBackgroundColor: "#1e1e1e",
  menuHoverColor: "#2c2c2c"
};

const DEFAULT_LIGHT_THEME: ThemeConfig = {
  themeName: 'Light',
  primaryColor: '#0076d2',
  secondaryColor: '#dc004e',
  linkColor: '#1976d2',
  linkHoverColor: '#115293',
  backgroundColor: '#ffffff',
  menuBackgroundColor: '#1976d2',
  menuHoverColor: '#115293',
};

const DEFAULT_SITE_CONFIG: SiteThemeConfig = { 
  siteName: 'Simple-Site',
  logoUrl: "/logo.svg",
  faviconUrl: "/logo.svg",
  containerMaxWidth: "lg" 
};

export const DEFAULT_SITE: SiteConfig =  { 
    site: DEFAULT_SITE_CONFIG, 
    themes: [DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME],
    pages:[]
  };