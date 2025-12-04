import { z } from 'zod';
import { ThemeConfigSchema, SiteThemeConfigSchema } from './theme.interface.js';
import { PageConfigurationSchema } from './page.interface.js';

// SiteConfig schema (main schema)
export const SiteConfigSchema = z.object({
  site: SiteThemeConfigSchema,
  themes: z.array(ThemeConfigSchema),
  pages: z.array(PageConfigurationSchema),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
