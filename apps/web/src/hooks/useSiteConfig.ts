import { useContext } from 'react';
import { SiteConfigContext } from '../features/config/SiteConfigContext';

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

