import { describe, it, expect } from 'vitest';
import { MONTH_VIEWS, PICKER_BUTTON_SX, PICKER_FIELD_SX, pickerLocale } from './datePickers';
import { TOUCH_TARGET } from '../features/theme/muiTheme';

describe('pickerLocale', () => {
  it('uses a bundled locale, case-insensitively', () => {
    expect(pickerLocale('fr')).toBe('fr');
    expect(pickerLocale('FR')).toBe('fr');
    expect(pickerLocale('en')).toBe('en');
  });

  it('falls back to the language subtag of a regional locale', () => {
    expect(pickerLocale('fr-CA')).toBe('fr');
    expect(pickerLocale('en-GB')).toBe('en');
  });

  // The adapter default (English chrome) is the honest answer for a language
  // whose dayjs locale is not bundled — pulling all ~140 locale files in would
  // cost every visitor far more than the picker chrome is worth.
  it('returns undefined for a language with no bundled dayjs locale', () => {
    expect(pickerLocale('zh-Hant')).toBeUndefined();
    expect(pickerLocale('xx')).toBeUndefined();
  });

  // The fallback chain is only silent if `dayjs/locale/fr` keeps being
  // imported: drop that import and `fr` quietly degrades to English chrome.
  it('still resolves fr after the module side effect, proving the import is live', () => {
    expect(pickerLocale('fr-BE')).toBe('fr');
  });
});

describe('picker chrome', () => {
  it('keeps every picker surface at a full touch target', () => {
    expect(PICKER_BUTTON_SX).toEqual({ width: TOUCH_TARGET, height: TOUCH_TARGET });
    expect(PICKER_FIELD_SX['& .MuiPickersInputBase-root, & .MuiInputBase-root']).toEqual({
      minHeight: TOUCH_TARGET,
    });
  });

  it('asks for a year and a month — never a day', () => {
    expect(MONTH_VIEWS).toEqual(['year', 'month']);
  });
});
