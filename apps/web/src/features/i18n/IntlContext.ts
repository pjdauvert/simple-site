import { createContext } from 'react';
import type { Locale } from '@simple-site/interfaces';

export interface IntlContextValue {
  locale: Locale;
  switchLanguage: (locale: Locale) => void;
  availableLocales: Locale[];
  defaultLocale: Locale;
}

export const IntlContext = createContext<IntlContextValue | undefined>(undefined);
