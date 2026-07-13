import { z } from 'zod';
import { ThemeConfigSchema, SiteThemeConfigSchema } from './theme.interface.js';
import { PageConfigurationSchema } from './page.interface.js';

/** True when every value produced by `key` is distinct across the list. */
const allUnique = <T>(items: T[], key: (item: T) => string): boolean =>
  new Set(items.map(key)).size === items.length;

// SiteConfig schema (main schema). Page `route` and `pageName` must each be unique
// across all pages — enforced here so both the admin forms (client-side parse) and
// the config write endpoints (server-side parse in ConfigModule) reject duplicates.
export const SiteConfigSchema = z
  .object({
    site: SiteThemeConfigSchema,
    themes: z.array(ThemeConfigSchema),
    pages: z.array(PageConfigurationSchema),
  })
  .refine((config) => allUnique(config.pages, (p) => p.route), {
    message: 'Page routes must be unique',
    path: ['pages'],
  })
  .refine((config) => allUnique(config.pages, (p) => p.pageName), {
    message: 'Page names must be unique',
    path: ['pages'],
  });

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
