import { useContext } from 'react';
import { IntlContext } from '../features/i18n/IntlContext';
import type { IntlContextValue } from '../features/i18n/IntlContext';

export const useAppIntl = (): IntlContextValue => {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error('useAppIntl must be used within AppIntlProvider');
  }
  return context;
};

