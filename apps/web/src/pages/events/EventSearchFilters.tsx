import React from 'react';
import { Box, Chip, IconButton, InputAdornment, Stack, TextField } from '@mui/material';
import ClearIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useIntl } from 'react-intl';
import { monthFirstDay, monthLastDay, monthOfDay, type EventSearchCriteria } from './eventSearch';

/** Minimum size of anything the visitor taps. */
const TOUCH_TARGET = 44;

/** The two date bounds, each a month the visitor types or picks. */
const BOUNDS = [
  { bound: 'from', label: 'page.events.search.from', toDay: monthFirstDay },
  { bound: 'to', label: 'page.events.search.to', toDay: monthLastDay },
] as const;

/**
 * The search page's filters. Every field is DISPLAY-ONLY and lives in the URL
 * of nothing — the page holds them in state.
 *
 * The bounds are months, not days: a visitor explores "next spring", not "the
 * 14th". They are native month inputs on purpose — a phone opens its own
 * month wheel, a desktop types `2027-05`, and the public bundle carries no
 * date-picker library for a field used twice.
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
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2, sm: 2 } }}>
      {BOUNDS.map(({ bound, label, toDay }) => (
        <TextField
          key={bound}
          type="month"
          label={intl.formatMessage({ id: label })}
          value={monthOfDay(criteria[bound])}
          onChange={(e) => onChange({ [bound]: toDay(e.target.value) })}
          size="small"
          fullWidth
          // Each bound caps the other, so the range can never be inverted.
          slotProps={{
            htmlInput: {
              min: bound === 'to' ? monthOfDay(criteria.from) : undefined,
              max: bound === 'from' ? monthOfDay(criteria.to) : undefined,
            },
            inputLabel: { shrink: true },
            input: { sx: { minHeight: TOUCH_TARGET } },
          }}
        />
      ))}
    </Box>
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
