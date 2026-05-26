import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { I18nLocalesEnum, I18nSchema } from '@simple-site/interfaces';
import type { I18nDictionary, Locale } from '@simple-site/interfaces';
import { initLocale, LOCALE_KEY } from '../../services/initService';
import { ErrorPage } from '../../pages/error/ErrorPage' 
import { Loading } from '../../components/Loading';
import staticTranslations from '../i18n/i18n.json';

const getLocalizedStaticMessages = (locale: Locale): I18nDictionary => {
  const staticMessages = I18nSchema.parse(staticTranslations);
  return staticMessages[locale];
}  

interface IntlProviderProps {
  loadTranslations?: (locale: Locale) => Promise<I18nDictionary>;
  children: ReactNode;
}

export const IntlProvider: React.FC<IntlProviderProps> = ({
  loadTranslations,
  children
}) => {
  const initialLocale = initLocale();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<I18nDictionary | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(loadTranslations))

  useEffect(() => {
    setMessages(null);
    setError(null);
    setIsLoading(true);
    try{
      const staticMessages = getLocalizedStaticMessages(locale);
      if(loadTranslations) { 
        loadTranslations(locale)
          .then(m => { 
            setMessages({...staticMessages, ...m}); 
            setIsLoading(false); 
          });
      } else {
        setMessages(staticMessages);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setMessages({});
      setIsLoading(false);
    }
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
  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales: Object.values(I18nLocalesEnum) as Locale[],
  };

  if (error) return <ErrorPage title='Error loading translations' message={error.message} />;
  if (messages === null && isLoading) return <Loading message="Loading translations..." />;

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider locale={locale} messages={messages ?? {}} defaultLocale="en">
        { children }
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};
