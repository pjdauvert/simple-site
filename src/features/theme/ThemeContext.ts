import { createContext } from 'react';
import type { ThemeConfig } from '../../types/theme.interface';

export interface ThemeContextValue {
  themeName: string;
  themeConfig: ThemeConfig;
  switchTheme: (theme: string) => void;
  availableThemes: string[];
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

