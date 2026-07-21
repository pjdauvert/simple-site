import { downloadJson } from '../../../pages/admin/translationsExport';
import { PageConfigurationSchema, type PageConfiguration } from '@simple-site/interfaces';
import { z } from 'zod';

/**
 * Derives a safe JSON filename base for a single page, preferring its `route`
 * and falling back to `pageName`. Mirrors `ConfigVersionsPanel`'s `sanitizeFilename`:
 * collapse runs of disallowed characters to `_`, trim leading/trailing `_`, and
 * fall back to `'page'` when nothing usable remains (e.g. a `/` route).
 */
export const sanitizePageFilename = (page: PageConfiguration): string =>
  (page.route || page.pageName || '')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'page';

/** Triggers a download of the given pages as a single JSON array file. */
export const downloadPagesJson = (pages: PageConfiguration[], filename?: string): void => {
  downloadJson(pages, filename ?? 'pages.json');
};

/** Triggers a download of a single page as JSON, named from its route/pageName. */
export const downloadPageJson = (page: PageConfiguration): void => {
  downloadJson(page, `${sanitizePageFilename(page)}.json`);
};

/**
 * Parses an uploaded pages export: JSON text expected to hold an array of pages.
 * Returns a stable `'invalid'` error code (caller maps it to an i18n message) on
 * malformed JSON or schema validation failure.
 */
export const parsePagesFile = (
  text: string,
): { ok: true; pages: PageConfiguration[] } | { ok: false; error: 'invalid' } => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  const parsed = z.array(PageConfigurationSchema).safeParse(json);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  return { ok: true, pages: parsed.data };
};

/**
 * Parses an uploaded single-page export. Accepts either a single page object or a
 * one-element array (so a page exported from the bulk flow can be re-imported).
 * Returns a stable `'invalid'` error code on malformed JSON or schema failure.
 */
export const parsePageFile = (
  text: string,
): { ok: true; page: PageConfiguration } | { ok: false; error: 'invalid' } => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  const single = PageConfigurationSchema.safeParse(json);
  if (single.success) return { ok: true, page: single.data };
  const array = z.array(PageConfigurationSchema).safeParse(json);
  if (array.success && array.data.length === 1) return { ok: true, page: array.data[0] };
  return { ok: false, error: 'invalid' };
};
