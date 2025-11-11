import { z } from 'zod';
import  { ThemeConfigSchema, SiteThemeConfigSchema } from './theme.interface';
import  { PageConfigurationSchema } from './page.interface';
import  { I18nSchema } from './i18n.interface';

// SiteConfig schema (main schema)
export const SiteConfigSchema = z.object({
  site: SiteThemeConfigSchema,
  themes: z.array(ThemeConfigSchema),
  pages: z.array(PageConfigurationSchema),
  i18n: I18nSchema,
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;