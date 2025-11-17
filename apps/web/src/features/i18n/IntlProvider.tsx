import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { I18nLocalesEnum, type Locale } from '@simple-site/interfaces';

interface AppIntlProviderProps {
  children: ReactNode;
}

export const AppIntlProvider: React.FC<AppIntlProviderProps> = ({ children }) => {
  const { config } = useSiteConfig();
  const [locale, setLocale] = useState<Locale>(I18nLocalesEnum.EN);

  const switchLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales: Object.keys(config.i18n) as Locale[],
  };

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider locale={locale} messages={config.i18n[locale]} defaultLocale="en">
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};
