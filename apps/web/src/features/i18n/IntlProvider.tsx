import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { I18nLocalesEnum, type Locale } from '@simple-site/interfaces';
import i18nMessages from '../../config/i18n.json';

interface AppIntlProviderProps {
  children: ReactNode;
}

export const AppIntlProvider: React.FC<AppIntlProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(I18nLocalesEnum.EN);

  const switchLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales: Object.keys(i18nMessages) as Locale[],
  };

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider
        locale={locale}
        messages={i18nMessages[locale]}
        defaultLocale="en"
      >
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};
