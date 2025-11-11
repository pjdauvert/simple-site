import { createContext } from 'react';
import type { SiteConfig } from '../../types/site.interface';

export interface SiteConfigContextValue {
  config: SiteConfig;
}

export const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

