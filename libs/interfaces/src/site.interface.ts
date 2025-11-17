import { z } from 'zod';
import { ThemeConfigSchema, SiteThemeConfigSchema } from './theme.interface.js';
import { PageConfigurationSchema } from './page.interface.js';
import { I18nSchema } from './i18n.interface.js';

// SiteConfig schema (main schema)
export const SiteConfigSchema = z.object({
  site: SiteThemeConfigSchema,
  themes: z.array(ThemeConfigSchema),
  pages: z.array(PageConfigurationSchema),
  i18n: I18nSchema,
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
