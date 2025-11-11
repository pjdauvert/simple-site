import type { Breakpoint } from "@mui/material";

export interface ThemeConfig {
  themeName: string;
  primaryColor: string;
  secondaryColor: string;
  linkColor: string;
  linkHoverColor: string;
  backgroundColor: string;
  menuBackgroundColor: string;
  menuHoverColor: string;
}

export interface SiteThemeConfig {
  siteName: string;
  logoUrl?: string;
  faviconUrl?: string;
  containerMaxWidth?: Breakpoint | false;
}