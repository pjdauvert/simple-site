import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { I18nLocalesEnum, I18nSchema } from '@simple-site/interfaces';
import type { I18nDictionary, Locale } from '@simple-site/interfaces';
import { initLocale, LOCALE_KEY } from '../../services/initService';
import { ErrorPage } from '../../pages/error/ErrorPage'
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
  // Seed synchronously from the bundled static file so the first render
  // always has real strings — no flash of missing-translation errors.
  const [messages, setMessages] = useState<I18nDictionary>(() => {
    try {
      return getLocalizedStaticMessages(initialLocale);
    } catch {
      return {};
    }
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    let staticMessages: I18nDictionary;
    try {
      staticMessages = getLocalizedStaticMessages(locale);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    if (loadTranslations) {
      // Overlay API translations on top of static ones once they arrive.
      // The static messages remain visible in the meantime.
      loadTranslations(locale)
        .then(m => {
          if (!cancelled) setMessages({ ...staticMessages, ...m });
        })
        .catch(err => {
          if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
        });
    } else {
      setMessages(staticMessages);
    }

    return () => { cancelled = true; };
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

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider locale={locale} messages={messages} defaultLocale="en">
        { children }
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};
