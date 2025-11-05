import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue, Locale } from './IntlContext';
import siteConfig from '../../config/siteConfig.json';

interface AppIntlProviderProps {
  children: ReactNode;
}

export const AppIntlProvider: React.FC<AppIntlProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('en');

  const switchLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales: Object.keys(siteConfig.i18n) as Locale[],
  };

  // Type assertion needed due to React 19 ReactNode type incompatibility with react-intl's bundled React 18 types
  const childrenCompat = children as unknown as React.ReactNode;
  
  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider locale={locale} messages={siteConfig.i18n[locale as Locale]} defaultLocale="en">
        {childrenCompat}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};

