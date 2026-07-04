/**
 * Human-readable name for a locale code — the language's own endonym, capitalized
 * (e.g. `en` → "English", `fr` → "Français", `de` → "Deutsch"). Falls back to the raw
 * code when the runtime can't resolve it, so any ISO 639-1 code renders sensibly.
 */
export const languageLabel = (code: string): string => {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
  } catch {
    return code;
  }
};
