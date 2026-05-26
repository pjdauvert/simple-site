import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { SiteConfigContext } from './SiteConfigContext';
import type { SiteConfigContextValue } from './SiteConfigContext';
import type { SiteConfig } from '@simple-site/interfaces';
import { ErrorPage } from '../../pages/error/ErrorPage'
import { Loading } from '../../components';

interface SiteConfigProviderProps {
  children: ReactNode;
  loadSiteConfig?: () => Promise<SiteConfig>;
}

export const SiteConfigProvider: React.FC<SiteConfigProviderProps> = ({ 
  children,
  loadSiteConfig
}) => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(loadSiteConfig));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if(loadSiteConfig) {
    loadSiteConfig()
      .then(loadedConfig => {
        setConfig(loadedConfig);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        setIsLoading(false);
      });
    }
  }, []);

  if (error) {
    return <ErrorPage title="Error Loading Configuration" message={error.message} />;
  }

  if (isLoading || !config) {
    return <Loading message="Loading configuration..." />;
  }

  const contextValue: SiteConfigContextValue = {
    config,
  };

  return (
    <SiteConfigContext.Provider value={contextValue}>
      {children}
    </SiteConfigContext.Provider>
  );
};
