import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { I18nLocalesEnum, type I18nDictionary, type Locale } from '@simple-site/interfaces';
import { initLocale, loadTranslations, LOCALE_KEY } from '../../services/initService';

interface AppIntlProviderProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
}

export const AppIntlProvider: React.FC<AppIntlProviderProps> = ({ 
  children, 
  loadingComponent 
}) => {
  const [locale, setLocale] = useState<Locale>(initLocale());
  const [messages, setMessages] = useState<I18nDictionary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    loadTranslations(locale)
      .then(loadedMessages => {
        setMessages(loadedMessages);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        setIsLoading(false);
      });
  }, [locale]);

  const switchLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
  };

  // INTENTIONAL: available locales are derived from the compile-time enum rather than from the
  // API config. This is a deliberate trade-off: the API translations endpoint is keyed by locale,
  // so accepting an arbitrary runtime locale would require the frontend to handle unknown locales
  // gracefully (missing translations, fallback logic, etc.). Adding a new locale therefore
  // requires a code change to I18nLocalesEnum — which is the correct gate for that work.
  const availableLocales = Object.values(I18nLocalesEnum) as Locale[];

  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales,
  };

  if (error) {
    // KNOWN LIMITATION: this error screen is always rendered in English regardless of user
    // locale. Localising it would require a synchronous fallback message bundle loaded before
    // the async translation fetch — complexity not warranted at this stage. Accepted trade-off:
    // the i18n layer has failed, so no translated string is available anyway.
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        padding: '20px'
      }}>
        <h1>Error Loading Translations</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  if (isLoading || !messages) {
    return <>{loadingComponent}</>;
  }

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider
        locale={locale}
        messages={messages}
        defaultLocale="en"
      >
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};
