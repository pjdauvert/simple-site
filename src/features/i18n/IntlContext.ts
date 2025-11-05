import { createContext } from 'react';

export type Locale = 'en' | 'fr';

export interface IntlContextValue {
  locale: Locale;
  switchLanguage: (locale: Locale) => void;
  availableLocales: Locale[];
}

export const IntlContext = createContext<IntlContextValue | undefined>(undefined);

