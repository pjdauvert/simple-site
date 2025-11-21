import { createContext } from 'react';
import type { SiteConfig } from '@simple-site/interfaces';

export interface SiteConfigContextValue {
  config: SiteConfig;
}

export const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);
