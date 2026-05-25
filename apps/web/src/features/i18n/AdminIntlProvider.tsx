import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { I18nLocalesEnum, type I18nDictionary, type Locale } from '@simple-site/interfaces';
import { initLocale, LOCALE_KEY } from '../../services/initService';

interface AdminIntlProviderProps {
  children: ReactNode;
}

export const AdminIntlProvider = ({ children }: AdminIntlProviderProps) => {
  const [locale, setLocale] = useState<Locale>(initLocale());
  const [messages, setMessages] = useState<I18nDictionary>({});

  useEffect(() => {
    fetch('/i18n.json')
      .then<Record<string, I18nDictionary>>(r => r.json())
      .then(all => setMessages(all[locale] ?? all['en'] ?? {}))
      .catch(() => {});
  }, [locale]);

  const switchLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
  };

  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales: Object.values(I18nLocalesEnum) as Locale[],
  };

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider locale={locale} messages={messages} defaultLocale="en">
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};
