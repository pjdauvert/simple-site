import { useContext } from 'react';
import { SiteConfigContext } from '../features/config/SiteConfigContext';

export function useSiteConfig() {
  const context = useContext(SiteConfigContext);
  if (!context) {
    throw new Error('useSiteConfig must be used within SiteConfigProvider');
  }
  return context;
}

