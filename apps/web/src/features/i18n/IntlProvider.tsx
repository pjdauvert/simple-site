import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { I18nLocalesEnum, type I18nDictionary, type Locale } from '@simple-site/interfaces';
import { initLocale, loadTranslations, LOCALE_KEY } from '../../services/initService';

interface BaseIntlProviderProps {
  children: ReactNode;
  loadMessages: (locale: Locale) => Promise<I18nDictionary>;
  loadingComponent?: ReactNode;
  renderError?: (error: Error) => ReactNode;
}

export const BaseIntlProvider: React.FC<BaseIntlProviderProps> = ({
  children,
  loadMessages,
  loadingComponent,
  renderError,
}) => {
  const [locale, setLocale] = useState<Locale>(initLocale());
  const [messages, setMessages] = useState<I18nDictionary | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setMessages(null);
    setError(null);
    loadMessages(locale)
      .then(m => setMessages(m))
      .catch(err => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setMessages({});
      });
  }, [locale, loadMessages]);

  const switchLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
  };

  // INTENTIONAL: available locales are derived from the compile-time enum rather than from the
  // API config. This is a deliberate trade-off: the API translations endpoint is keyed by locale,
  // so accepting an arbitrary runtime locale would require the frontend to handle unknown locales
  // gracefully (missing translations, fallback logic, etc.). Adding a new locale therefore
  // requires a code change to I18nLocalesEnum — which is the correct gate for that work.
  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales: Object.values(I18nLocalesEnum) as Locale[],
  };

  if (error && renderError) return <>{renderError(error)}</>;
  if (messages === null && loadingComponent) return <>{loadingComponent}</>;

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider locale={locale} messages={messages ?? {}} defaultLocale="en">
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};

const renderTranslationError = (error: Error): ReactNode => (
  // KNOWN LIMITATION: this error screen is always rendered in English regardless of user
  // locale. Localising it would require a synchronous fallback message bundle loaded before
  // the async translation fetch — complexity not warranted at this stage. Accepted trade-off:
  // the i18n layer has failed, so no translated string is available anyway.
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

interface AppIntlProviderProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
}

export const AppIntlProvider: React.FC<AppIntlProviderProps> = ({ children, loadingComponent }) => (
  <BaseIntlProvider
    loadMessages={loadTranslations}
    loadingComponent={loadingComponent}
    renderError={renderTranslationError}
  >
    {children}
  </BaseIntlProvider>
);
