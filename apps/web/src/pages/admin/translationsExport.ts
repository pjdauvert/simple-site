import type { I18n, I18nDictionary } from '@simple-site/interfaces';

/** Reserved pseudo-language for the config's original ("native") source values in an export. */
export const NATIVE_KEY = 'native';

/**
 * Builds the export object (same `i18n.json` shape as import) for the selected entries.
 * `native` maps to the config's original values; every other selection maps to that
 * language's dictionary.
 */
export const buildExportPayload = (
  selection: string[],
  translations: I18n,
  originals: I18nDictionary,
): Record<string, I18nDictionary> => {
  const out: Record<string, I18nDictionary> = {};
  for (const sel of selection) {
    out[sel] = sel === NATIVE_KEY ? { ...originals } : { ...(translations[sel] ?? {}) };
  }
  return out;
};

/** Triggers a client-side download of `data` as a pretty-printed JSON file. */
export const downloadJson = (data: unknown, filename: string): void => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
