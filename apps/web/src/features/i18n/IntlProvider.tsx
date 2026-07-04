import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { BASE_LOCALE, I18nSchema } from '@simple-site/interfaces';
import type { I18n, I18nDictionary, Locale } from '@simple-site/interfaces';
import { initLocale, LOCALE_KEY } from '../../services/initService';
import { ErrorPage } from '../../pages/error/ErrorPage'
import staticTranslations from '../i18n/i18n.json';

// The bundled admin/base strings, parsed once. Guarded so a malformed bundle can't
// crash module load (it falls back to no static messages / defaultMessage).
const staticBundle: I18n = (() => {
  try { return I18nSchema.parse(staticTranslations); } catch { return {}; }
})();

// Bundled messages for `locale` — empty when the locale isn't in the bundle, so a
// dynamically-added language falls back to each key's defaultMessage (config original).
const getLocalizedStaticMessages = (locale: Locale): I18nDictionary => staticBundle[locale] ?? {};

// Drop empty-string translations from the overlay so the FormattedMessage falls back to
// its defaultMessage (config original) instead of rendering blank — a freshly-added
// language starts with every config key present-but-empty, to be filled in.
const withoutEmpty = (dict: I18nDictionary): I18nDictionary =>
  Object.fromEntries(Object.entries(dict).filter(([, value]) => value !== ''));

interface IntlProviderProps {
  loadTranslations?: (locale: Locale) => Promise<I18nDictionary>;
  loadLanguages?: () => Promise<Locale[]>;
  children: ReactNode;
}

export const IntlProvider: React.FC<IntlProviderProps> = ({
  loadTranslations,
  loadLanguages,
  children
}) => {
  const initialLocale = initLocale();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  // Seed synchronously from the bundled static file so the first render
  // always has real strings — no flash of missing-translation errors.
  const [messages, setMessages] = useState<I18nDictionary>(() => getLocalizedStaticMessages(initialLocale));
  // Seed from the bundled languages; replaced by the live set once the API responds.
  const [availableLocales, setAvailableLocales] = useState<Locale[]>(() => Object.keys(staticBundle) as Locale[]);
  const [error, setError] = useState<Error | null>(null);

  // Load the live set of languages (data-driven) and reconcile the active locale
  // against it — an unavailable saved/browser locale falls back to the base locale.
  useEffect(() => {
    if (!loadLanguages) return;
    let cancelled = false;
    loadLanguages()
      .then(langs => {
        if (cancelled || langs.length === 0) return;
        setAvailableLocales(langs);
        setLocale(current => (langs.includes(current) ? current : BASE_LOCALE));
      })
      .catch(() => { /* keep the bundled languages when the list can't be fetched */ });
    return () => { cancelled = true; };
  }, [loadLanguages]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    const staticMessages = getLocalizedStaticMessages(locale);

    if (loadTranslations) {
      // Overlay API translations on top of static ones once they arrive (empties
      // dropped). The static messages remain visible in the meantime.
      loadTranslations(locale)
        .then(m => {
          if (!cancelled) setMessages({ ...staticMessages, ...withoutEmpty(m) });
        })
        .catch(err => {
          if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
        });
    } else {
      setMessages(staticMessages);
    }

    return () => { cancelled = true; };
  }, [locale, loadTranslations]);

  const switchLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
  };

  // Languages are data-driven: the available set comes from the translations blob
  // (see `loadLanguages`), so admins add / import / remove languages at runtime via
  // the Translations page. A requested locale that isn't offered falls back to
  // BASE_LOCALE, and any key a language hasn't translated falls back to its
  // defaultMessage (the config original).
  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales,
  };

  if (error) return <ErrorPage title='Error loading translations' message={error.message} />;

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider locale={locale} messages={messages} defaultLocale={BASE_LOCALE}>
        { children }
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
};
