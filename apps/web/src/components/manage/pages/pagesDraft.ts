import { HOME_ROUTE, type PageConfiguration, type SectionProps, type SectionType, isReservedRoute } from '@simple-site/interfaces';
import { SECTION_REGISTRY } from '../../sections/registry';

/** i18n key segments must match this (see the i18n key convention). */
const I18N_SEGMENT = /^[a-zA-Z0-9_.]+$/;

/** Move an array item from one index to another, returning a new array. */
export const moveItem = <T>(items: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/** A section name unique within a page (`section1`, `section2`, …). */
export const uniqueSectionName = (existing: string[]): string => {
  const taken = new Set(existing);
  let i = existing.length + 1;
  let name = `section${i}`;
  while (taken.has(name)) {
    i += 1;
    name = `section${i}`;
  }
  return name;
};

/** Build a blank, schema-valid section of the given type with a page-unique name. */
export const createSection = (type: SectionType, existingNames: string[]): SectionProps<SectionType> =>
  SECTION_REGISTRY[type].createDefault(uniqueSectionName(existingNames));

/** A blank page with a unique route + pageName. */
export const createPage = (existingRoutes: string[], existingPageNames: string[]): PageConfiguration => {
  const routes = new Set(existingRoutes);
  const names = new Set(existingPageNames);
  let i = existingRoutes.length + 1;
  let route = `/page${i}`;
  let pageName = `page.page${i}`;
  while (routes.has(route) || names.has(pageName)) {
    i += 1;
    route = `/page${i}`;
    pageName = `page.page${i}`;
  }
  return { menuTitle: `Page ${i}`, pageName, route, sections: [] };
};

/** Field-level problems on a single page, used to flag inputs after a failed save. */
export interface PageFieldErrors {
  route?: 'empty' | 'duplicate' | 'reserved';
  pageName?: 'empty' | 'duplicate' | 'pattern';
}

/** Validate structural page fields across the whole set (routes/pageNames must be unique). */
export const validatePages = (pages: PageConfiguration[]): PageFieldErrors[] => {
  const routeCounts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  for (const p of pages) {
    routeCounts.set(p.route.trim(), (routeCounts.get(p.route.trim()) ?? 0) + 1);
    nameCounts.set(p.pageName.trim(), (nameCounts.get(p.pageName.trim()) ?? 0) + 1);
  }
  return pages.map((p) => {
    const errors: PageFieldErrors = {};
    const route = p.route.trim();
    const pageName = p.pageName.trim();
    if (!route) errors.route = 'empty';
    else if ((routeCounts.get(route) ?? 0) > 1) errors.route = 'duplicate';
    else if (isReservedRoute(route)) errors.route = 'reserved';
    if (!pageName) errors.pageName = 'empty';
    else if (!I18N_SEGMENT.test(pageName)) errors.pageName = 'pattern';
    else if ((nameCounts.get(pageName) ?? 0) > 1) errors.pageName = 'duplicate';
    return errors;
  });
};

/** True when no page has any field error. */
export const pagesAreValid = (errors: PageFieldErrors[]): boolean =>
  errors.every((e) => !e.route && !e.pageName);

/** True for the reserved home page (identified by its route). */
export const isHomePage = (page: Pick<PageConfiguration, 'route'>): boolean => page.route === HOME_ROUTE;
