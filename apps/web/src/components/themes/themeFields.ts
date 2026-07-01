import type { ThemeConfig } from '@simple-site/interfaces';

/** An editable theme: every field is a string; optional colors may be ''. */
export type ThemeDraft = Record<string, string>;

export interface ColorFieldMeta {
  key: string;
  required: boolean;
}

/** The color fields of a ThemeConfig, in display order (required ones can't be blank). */
export const COLOR_FIELDS: ColorFieldMeta[] = [
  { key: 'primaryColor', required: true },
  { key: 'secondaryColor', required: true },
  { key: 'tertiaryColor', required: false },
  { key: 'tertiaryHoverColor', required: false },
  { key: 'surfaceColor', required: false },
  { key: 'linkColor', required: true },
  { key: 'linkHoverColor', required: true },
  { key: 'textColor', required: false },
  { key: 'backgroundColor', required: true },
  { key: 'menuBackgroundColor', required: true },
  { key: 'menuTextColor', required: false },
  { key: 'menuHoverColor', required: true },
];

/** Full config theme → editable draft (missing optional colors become ''). */
export const themeToDraft = (theme: ThemeConfig): ThemeDraft => {
  const source = theme as unknown as Record<string, string>;
  const draft: ThemeDraft = { themeName: theme.themeName };
  for (const { key } of COLOR_FIELDS) draft[key] = source[key] ?? '';
  return draft;
};

/** Draft → config theme: trim the name, keep required colors, drop empty optional ones. */
export const draftToTheme = (draft: ThemeDraft): ThemeConfig => {
  const theme: Record<string, string> = { themeName: draft.themeName.trim() };
  for (const { key, required } of COLOR_FIELDS) {
    const value = (draft[key] ?? '').trim();
    if (required || value) theme[key] = value;
  }
  return theme as unknown as ThemeConfig;
};

/** A blank theme pre-filled with sensible defaults for the required colors. */
export const newThemeDraft = (): ThemeDraft => ({
  themeName: '',
  primaryColor: '#1976d2',
  secondaryColor: '#9c27b0',
  tertiaryColor: '',
  tertiaryHoverColor: '',
  surfaceColor: '',
  linkColor: '#1976d2',
  linkHoverColor: '#1565c0',
  textColor: '',
  backgroundColor: '#ffffff',
  menuBackgroundColor: '#f5f5f5',
  menuTextColor: '',
  menuHoverColor: '#e0e0e0',
});

/** True when a draft is complete enough to save (name + all required colors set). */
export const isDraftValid = (draft: ThemeDraft): boolean =>
  Boolean(draft.themeName.trim()) &&
  COLOR_FIELDS.every((f) => !f.required || Boolean((draft[f.key] ?? '').trim()));
