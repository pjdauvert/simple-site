import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { TOUCH_TARGET } from '../features/theme/muiTheme';

/**
 * What every events date picker shares — the admin's event dialog and month
 * filter, and the public search page's bounds: the mobile-first sizing, the
 * locale rule and the month-only views. A date entered on one surface has to
 * read like a date entered on another.
 */

/** A date filter asks for a year and a month — never a day. */
export const MONTH_VIEWS = ['year', 'month'] as const;

/** Mobile-first: dense `small` fields, with a 44px minimum tap height. */
export const PICKER_FIELD_SX = {
  '& .MuiPickersInputBase-root, & .MuiInputBase-root': { minHeight: TOUCH_TARGET },
} as const;
export const PICKER_BUTTON_SX = { width: TOUCH_TARGET, height: TOUCH_TARGET } as const;

/**
 * The dayjs locale driving the picker chrome (month names, 12h/24h, field
 * order) — it follows the interface locale in use. Only the bundled
 * platform-chrome languages are available: `en` is dayjs's built-in locale,
 * `fr` is imported above; a language with no bundled dayjs locale falls back
 * to the adapter default instead of pulling in all ~140 locale files.
 */
export const pickerLocale = (uiLocale: string): string | undefined => {
  const code = uiLocale.toLowerCase();
  if (dayjs.Ls[code]) return code;
  const language = code.split('-')[0];
  return dayjs.Ls[language] ? language : undefined;
};
