import { createContext } from 'react';
import type { SiteThemeConfig, ThemeConfig } from '../../types/theme.interface';

export interface ThemeContextValue {
  themeName: string;
  themeConfig: ThemeConfig;
  siteThemeConfig: SiteThemeConfig;
  switchTheme: (theme: string) => void;
  availableThemes: string[];
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

