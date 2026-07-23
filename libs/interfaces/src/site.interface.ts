import { z } from 'zod';
import { ThemeConfigSchema, SiteThemeConfigSchema } from './theme.interface.js';
import { PageConfigurationSchema } from './page.interface.js';
import { MenuConfigSchema, isReservedRoute, menuEntryId } from './menu.interface.js';

/** True when every value produced by `key` is distinct across the list. */
const allUnique = <T>(items: T[], key: (item: T) => string): boolean =>
  new Set(items.map(key)).size === items.length;

// SiteConfig schema (main schema). Page `route` and `pageName` must each be unique
// across all pages — enforced here so both the admin forms (client-side parse) and
// the config write endpoints (server-side parse in ConfigModule) reject duplicates.
// The optional `menu` (absent → nav falls back to pages order) may only reference
// pages that exist, so a stored config can never hold a dangling menu entry.
export const SiteConfigSchema = z
  .object({
    site: SiteThemeConfigSchema,
    themes: z.array(ThemeConfigSchema),
    pages: z.array(PageConfigurationSchema),
    menu: MenuConfigSchema.optional(),
  })
  .refine((config) => allUnique(config.pages, (p) => p.route), {
    message: 'Page routes must be unique',
    path: ['pages'],
  })
  .refine((config) => allUnique(config.pages, (p) => p.pageName), {
    message: 'Page names must be unique',
    path: ['pages'],
  })
  .refine((config) => config.pages.every((p) => !isReservedRoute(p.route)), {
    message: 'Page routes must not use feature-reserved routes',
    path: ['pages'],
  })
  .superRefine((config, ctx) => {
    if (!config.menu) return;
    const pageNames = new Set(config.pages.map((p) => p.pageName));
    const seen = new Set<string>();
    config.menu.entries.forEach((entry, index) => {
      const id = menuEntryId(entry);
      if (seen.has(id)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate menu entry "${id}"`, path: ['menu', 'entries', index] });
      }
      seen.add(id);
      if (entry.type === 'page' && !pageNames.has(entry.pageName)) {
        ctx.addIssue({
          code: 'custom',
          message: `Menu entry references unknown page "${entry.pageName}"`,
          path: ['menu', 'entries', index],
        });
      }
    });
  });

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
