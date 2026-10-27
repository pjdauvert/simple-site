import React from 'react';
import { Box, Chip, IconButton, InputAdornment, Stack, TextField } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { type Dayjs } from 'dayjs';
import ClearIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useIntl } from 'react-intl';
import { MONTH_VIEWS, PICKER_BUTTON_SX, PICKER_FIELD_SX, pickerLocale } from '../../utils/datePickers';
import { monthFirstDay, monthLastDay, monthOfDay, type EventSearchCriteria } from './eventSearchRules';
import { TOUCH_TARGET } from '../../features/theme/muiTheme';

/** Minimum size of anything the visitor taps. */

/**
 * The two date bounds. Each is a whole MONTH — a visitor explores "next
 * spring", not "the 14th" — so the picker opens on the years and stops at the
 * months; the day it carries is only there to name one.
 */
const BOUNDS = [
  { bound: 'from', label: 'page.events.search.from', toDay: monthFirstDay },
  { bound: 'to', label: 'page.events.search.to', toDay: monthLastDay },
] as const;

/** A bound as the picker holds it: the first day of its month, or nothing. */
const boundValue = (day: string): Dayjs | null => {
  const month = monthOfDay(day);
  return month ? dayjs(`${month}-01`) : null;
};

/**
 * The search page's filters, all DISPLAY-ONLY — the page holds them in state.
 * The bounds use the same Material pickers as the admin, in the interface
 * locale in use, each clearable and each offering the current month, so a
 * visitor can always come back to "from now on".
 */
export const EventSearchQueryField: React.FC<{
  value: string;
  onChange: (query: string) => void;
}> = ({ value, onChange }) => {
  const intl = useIntl();
  return (
    <TextField
      label={intl.formatMessage({ id: 'page.events.search.query' })}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      helperText={intl.formatMessage({ id: 'page.events.search.query.help' })}
      slotProps={{
        input: {
          sx: { minHeight: TOUCH_TARGET },
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="disabled" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label={intl.formatMessage({ id: 'page.events.search.query.clear' })}
                onClick={() => onChange('')}
                sx={{ minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
};

/** The month bounds, side by side on a wide screen and stacked in the sheet. */
export const EventSearchMonthFields: React.FC<{
  criteria: EventSearchCriteria;
  onChange: (next: Partial<EventSearchCriteria>) => void;
}> = ({ criteria, onChange }) => {
  const intl = useIntl();

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={pickerLocale(intl.locale)}
      // The picker's own chrome speaks the interface language too.
      localeText={{
        clearButtonLabel: intl.formatMessage({ id: 'page.events.search.dates.clear' }),
        todayButtonLabel: intl.formatMessage({ id: 'page.events.search.dates.thisMonth' }),
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {BOUNDS.map(({ bound, label, toDay }) => (
          <DatePicker
            key={bound}
            label={intl.formatMessage({ id: label })}
            views={MONTH_VIEWS}
            openTo="year"
            value={boundValue(criteria[bound])}
            // Each bound caps the other, so the range can never be inverted.
            minDate={bound === 'to' ? boundValue(criteria.from) ?? undefined : undefined}
            maxDate={bound === 'from' ? boundValue(criteria.to) ?? undefined : undefined}
            onChange={(value) => onChange({ [bound]: value?.isValid() ? toDay(value.format('YYYY-MM')) : '' })}
            slotProps={{
              field: { clearable: true, onClear: () => onChange({ [bound]: '' }) },
              // Clearing and "this month" are reachable from the calendar too,
              // not only from the field.
              actionBar: { actions: ['clear', 'today'] },
              textField: { size: 'small', fullWidth: true, sx: PICKER_FIELD_SX },
              openPickerButton: {
                sx: PICKER_BUTTON_SX,
                'aria-label': intl.formatMessage({ id: `page.events.search.${bound}.choose` }),
              },
              clearButton: {
                sx: { width: TOUCH_TARGET, height: TOUCH_TARGET },
                'aria-label': intl.formatMessage({ id: `page.events.search.${bound}.clear` }),
              },
            }}
          />
        ))}
      </Box>
    </LocalizationProvider>
  );
};

/**
 * The bounds currently applied, as removable chips — the phone keeps its
 * month fields in a sheet, so this is what tells the visitor the list is cut
 * at all, and the one gesture that undoes it.
 */
export const EventSearchBoundChips: React.FC<{
  criteria: EventSearchCriteria;
  onChange: (next: Partial<EventSearchCriteria>) => void;
}> = ({ criteria, onChange }) => {
  const intl = useIntl();
  const applied = BOUNDS.filter(({ bound }) => monthOfDay(criteria[bound]));
  if (applied.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {applied.map(({ bound, label }) => (
        <Chip
          key={bound}
          label={`${intl.formatMessage({ id: label })}: ${intl.formatDate(
            new Date(`${monthOfDay(criteria[bound])}-01T00:00:00`),
            { month: 'long', year: 'numeric' },
          )}`}
          onDelete={() => onChange({ [bound]: '' })}
          sx={{ minHeight: 32 }}
        />
      ))}
    </Stack>
  );
};
