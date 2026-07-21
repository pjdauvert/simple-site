import { describe, it, expect } from 'vitest';
import type { ThemeConfig } from '@simple-site/interfaces';
import { draftToTheme, isDraftValid, newThemeDraft, themeToDraft } from './themeFields';

const fullTheme = {
  themeName: 'X',
  primaryColor: '#111',
  secondaryColor: '#222',
  linkColor: '#333',
  linkHoverColor: '#444',
  backgroundColor: '#fff',
  menuBackgroundColor: '#eee',
  menuHoverColor: '#ddd',
} as unknown as ThemeConfig;

describe('themeFields', () => {
  it('themeToDraft fills missing optional colors with empty strings', () => {
    const draft = themeToDraft(fullTheme);
    expect(draft.themeName).toBe('X');
    expect(draft.primaryColor).toBe('#111');
    expect(draft.tertiaryColor).toBe('');
    expect(draft.textColor).toBe('');
  });

  it('draftToTheme trims the name, keeps required colors and drops empty optional ones', () => {
    const theme = draftToTheme({ ...newThemeDraft(), themeName: '  Solar  ' });
    expect(theme.themeName).toBe('Solar');
    expect('textColor' in theme).toBe(false); // empty optional dropped
    expect('backgroundColor' in theme).toBe(true); // required kept
  });

  it('draftToTheme keeps a non-empty optional color', () => {
    const theme = draftToTheme({ ...newThemeDraft(), themeName: 'Solar', textColor: '#123456' });
    expect(theme.textColor).toBe('#123456');
  });

  it('isDraftValid requires a name and every required color', () => {
    expect(isDraftValid(newThemeDraft())).toBe(false); // no name
    expect(isDraftValid({ ...newThemeDraft(), themeName: 'Ok' })).toBe(true);
    expect(isDraftValid({ ...newThemeDraft(), themeName: 'Ok', primaryColor: '' })).toBe(false);
  });
});
