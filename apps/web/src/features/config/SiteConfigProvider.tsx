import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { SiteConfigContext } from './SiteConfigContext';
import type { SiteConfigContextValue } from './SiteConfigContext';
import type { SiteConfig } from '@simple-site/interfaces';
import { loadSiteConfig } from '../../services/configService';

interface SiteConfigProviderProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
}

export const SiteConfigProvider: React.FC<SiteConfigProviderProps> = ({ 
  children, 
  loadingComponent 
}) => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadSiteConfig()
      .then(loadedConfig => {
        setConfig(loadedConfig);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        setIsLoading(false);
      });
  }, []);

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
        <h1>Error Loading Configuration</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  if (isLoading || !config) {
    return <>{loadingComponent}</>;
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
