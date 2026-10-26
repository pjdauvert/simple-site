import dayjs from 'dayjs';
import 'dayjs/locale/fr';

/**
 * What the events admin's date pickers share: the mobile-first sizing and the
 * locale rule. Both the event dialog (full dates and times) and the list's
 * month filter mount pickers, and a date entered in one has to read like a
 * date entered in the other.
 */

/** Mobile-first: the admin's dense `small` fields, with a 44px minimum tap height. */
export const PICKER_FIELD_SX = {
  '& .MuiPickersInputBase-root, & .MuiInputBase-root': { minHeight: 44 },
} as const;
export const PICKER_BUTTON_SX = { width: 44, height: 44 } as const;

/**
 * The dayjs locale driving the picker chrome (month names, 12h/24h, field
 * order). Only the bundled platform-chrome languages are available — `en` is
 * dayjs's built-in locale, `fr` is imported above; an admin-added language
 * with no bundled dayjs locale falls back to the adapter default instead of
 * pulling in all ~140 locale files.
 */
export const pickerLocale = (uiLocale: string): string | undefined => {
  const code = uiLocale.toLowerCase();
  if (dayjs.Ls[code]) return code;
  const language = code.split('-')[0];
  return dayjs.Ls[language] ? language : undefined;
};
