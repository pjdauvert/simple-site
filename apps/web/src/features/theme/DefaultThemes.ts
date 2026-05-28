import type { SiteConfig, SiteThemeConfig, ThemeConfig } from "@simple-site/interfaces";


const DEFAULT_DARK_THEME: ThemeConfig = {
  themeName: 'Dark',
  primaryColor: '#FF8FAB',
  secondaryColor: '#78D4F8',
  tertiaryColor: '#C4EC6E',
  tertiaryHoverColor: '#9BD83C',
  surfaceColor: '#1E2129',
  linkColor: '#FF8FAB',
  linkHoverColor: '#FFB3C2',
  backgroundColor: '#161A20',
  menuBackgroundColor: '#1E2129',
  menuHoverColor: 'rgba(255,255,255,0.08)',
};

const DEFAULT_LIGHT_THEME: ThemeConfig = {
  themeName: 'Light',
  primaryColor: '#29B5F0',
  secondaryColor: '#FF4D6D',
  tertiaryColor: '#9BD83C',
  tertiaryHoverColor: '#82C62F',
  surfaceColor: '#FFFFFF',
  linkColor: '#FF4D6D',
  linkHoverColor: '#E0304F',
  backgroundColor: '#F7F8FB',
  menuBackgroundColor: '#BCE5FC',
  menuHoverColor: 'rgba(255,255,255,0.10)',
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