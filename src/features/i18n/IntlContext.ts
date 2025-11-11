import { createContext } from 'react';
import type { Locale } from '../../types/i18n.interface';

export interface IntlContextValue {
  locale: Locale;
  switchLanguage: (locale: Locale) => void;
  availableLocales: Locale[];
}

export const IntlContext = createContext<IntlContextValue | undefined>(undefined);

