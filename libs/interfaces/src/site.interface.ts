import { z } from 'zod';
import { ThemeConfigSchema, SiteThemeConfigSchema } from './theme.interface.js';
import { PageConfigurationSchema } from './page.interface.js';
import { GalleryConfigSchema } from './gallery.interface.js';
import { EventsConfigSchema } from './events.interface.js';
import {
  MenuConfigSchema,
  isReservedRoute,
  menuEntryId,
  type MenuEntry,
  type MenuLeafEntry,
} from './menu.interface.js';

/** True when every value produced by `key` is distinct across the list. */
const allUnique = <T>(items: T[], key: (item: T) => string): boolean =>
  new Set(items.map(key)).size === items.length;

// SiteConfig schemas. Page `route` and `pageName` must each be unique across all
// pages — enforced here so both the admin forms (client-side parse) and the config
// write endpoints (server-side parse in ConfigModule) reject duplicates. The
// optional `menu` (absent → nav falls back to pages order) may only reference
// pages that exist, so a stored config can never hold a dangling menu entry.
//
// Two variants share those integrity rules:
// - `StoredSiteConfigSchema` — for READING stored configs. It accepts pages on
//   feature-reserved routes, because a route only becomes reserved when its
//   feature ships: a config stored before that must stay readable, or enabling
//   the release would 500 `GET /api/config` and lock the Pages editor out of
//   the very draft that could fix it.
// - `SiteConfigSchema` — for INCOMING configs (admin writes, imports, client
//   forms). It additionally rejects feature-reserved routes, keeping new
//   collisions out of the store.
export const StoredSiteConfigSchema = z
  .object({
    site: SiteThemeConfigSchema,
    themes: z.array(ThemeConfigSchema),
    pages: z.array(PageConfigurationSchema),
    menu: MenuConfigSchema.optional(),
    // Flag-gated (FEATURE_GALLERY): kept in the stored config even while the
    // flag is off — only its interpretation (rendering, routes, menu) is gated.
    gallery: GalleryConfigSchema.optional(),
    // Flag-gated (FEATURE_EVENTS): same contract as the gallery above.
    events: EventsConfigSchema.optional(),
  })
  .refine((config) => allUnique(config.pages, (p) => p.route), {
    message: 'Page routes must be unique',
    path: ['pages'],
  })
  .refine((config) => allUnique(config.pages, (p) => p.pageName), {
    message: 'Page names must be unique',
    path: ['pages'],
  })
  .superRefine((config, ctx) => {
    if (!config.menu) return;
    const pageNames = new Set(config.pages.map((p) => p.pageName));
    // One global id space: a page/feature may appear once across the top level
    // and every group's children combined (`group:` ids can never collide with
    // leaf ids, so group-id uniqueness is subsumed).
    const seen = new Set<string>();
    const checkId = (entry: MenuEntry, path: (string | number)[]): void => {
      const id = menuEntryId(entry);
      if (seen.has(id)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate menu entry "${id}"`, path });
      }
      seen.add(id);
    };
    const checkPageRef = (entry: MenuLeafEntry, path: (string | number)[]): void => {
      if (entry.type === 'page' && !pageNames.has(entry.pageName)) {
        ctx.addIssue({
          code: 'custom',
          message: `Menu entry references unknown page "${entry.pageName}"`,
          path,
        });
      }
    };
    config.menu.entries.forEach((entry, index) => {
      const path = ['menu', 'entries', index];
      checkId(entry, path);
      if (entry.type === 'group') {
        entry.children.forEach((child, childIndex) => {
          const childPath = [...path, 'children', childIndex];
          checkId(child, childPath);
          checkPageRef(child, childPath);
        });
      } else {
        checkPageRef(entry, path);
      }
    });
  });

export const SiteConfigSchema = StoredSiteConfigSchema.refine(
  (config) => config.pages.every((p) => !isReservedRoute(p.route)),
  {
    message: 'Page routes must not use feature-reserved routes',
    path: ['pages'],
  },
);

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
