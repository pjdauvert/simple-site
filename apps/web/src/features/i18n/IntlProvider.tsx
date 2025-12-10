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

  const availableLocales = Object.values(I18nLocalesEnum) as Locale[];

  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales,
  };

  if (error) {
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
