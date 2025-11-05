import { useContext } from 'react';
import { ThemeContext } from '../features/theme/ThemeContext';
import type { ThemeContextValue } from '../features/theme/ThemeContext';

export const useAppTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
};

