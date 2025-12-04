import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import { IntlContext } from './IntlContext';
import type { IntlContextValue } from './IntlContext';
import { I18nLocalesEnum, type ApiResponseSuccessPayload, type I18nDictionary, type Locale } from '@simple-site/interfaces';
import apiService from '../../services/apiService';

interface AppIntlProviderProps {
  children: ReactNode;
}

export const AppIntlProvider: React.FC<AppIntlProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(I18nLocalesEnum.EN);
  const [messages, setMessages] = useState<I18nDictionary>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTranslations = async () => {
      setIsLoading(true);
      const payload = await apiService.get<I18nDictionary>(`translations/${locale}`);
      if (payload.ok) {
        setMessages((payload as ApiResponseSuccessPayload<I18nDictionary>).data);
      }
      setIsLoading(false);
    };

    fetchTranslations();
  }, [locale]);

  const switchLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  const availableLocales = Object.values(I18nLocalesEnum) as Locale[];

  const contextValue: IntlContextValue = {
    locale,
    switchLanguage,
    availableLocales,
  };

  if (isLoading) {
    return null;
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
