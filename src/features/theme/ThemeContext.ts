import { createContext } from 'react';
import type { ThemeConfig, ThemeName } from './theme.interface';

export interface ThemeContextValue {
  themeName: ThemeName;
  themeConfig: ThemeConfig;
  switchTheme: (theme: ThemeName) => void;
  availableThemes: ThemeName[];
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

