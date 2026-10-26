import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { eventDescriptionKey, eventLocationKey, eventNameKey } from '@simple-site/interfaces';
import { MediaUrlField } from '../../media';
import { TranslateAdornment } from '../TranslateAdornment';
import { slugify } from '../slugify';
import { PICKER_BUTTON_SX, PICKER_FIELD_SX, pickerLocale } from './datePickers';
import { applyWhen, readWhen, type EventDraft, type EventFieldErrors, type EventWhenPatch } from './eventsDraft';

interface EventFormDialogProps {
  open: boolean;
  event: EventDraft;
  errors: EventFieldErrors;
  showErrors: boolean;
  /** Enables the media-library picker on the illustration field. */
  enablePicker: boolean;
  /** Live edits — the list holds the state. */
  onChange: (next: EventDraft) => void;
  /** Discard the changes made since the dialog opened, and close. */
  onCancel: () => void;
  /** Commit and close — the list auto-saves the draft afterwards. */
  onConfirm: () => void;
}

const NAME_ERROR: Record<NonNullable<EventFieldErrors['name']>, string> = {
  empty: 'page.manage.events.error.nameEmpty',
};
const SLUG_ERROR: Record<NonNullable<EventFieldErrors['slug']>, string> = {
  empty: 'page.manage.events.error.slugEmpty',
  duplicate: 'page.manage.events.error.slugDuplicate',
  pattern: 'page.manage.events.error.slugPattern',
  reserved: 'page.manage.events.error.slugReserved',
};

/**
 * Edit form for one event. The slug auto-derives from the name until edited by
 * hand, and becomes read-only once the event has been saved (public URL and
 * i18n-key identity — see `EventDraft.persisted`). Dates and times are split
 * and edited in the ADMIN's own timezone — never shown, never chosen (see
 * `eventsDraft.readWhen` / `buildWhen`): the times only appear while the event
 * fits in a single local day, since one spanning several is stored (and
 * rendered) as whole days. Name, description and location are translation
 * defaults — a saved event links each to its translation key.
 */
export const EventFormDialog: React.FC<EventFormDialogProps> = ({
  open,
  event,
  errors,
  showErrors,
  enablePicker,
  onChange,
  onCancel,
  onConfirm,
}) => {
  const intl = useIntl();
  const [slugTouched, setSlugTouched] = useState(false);
  const slugLocked = Boolean(event.persisted);

  // Re-arm per event: an already-customized slug must never be silently rewritten.
  useEffect(() => {
    if (!open) return;
    setSlugTouched(event.slug !== '' && event.slug !== slugify(event.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setName = (name: string): void => {
    const next = { ...event, name };
    if (!slugTouched && !slugLocked) next.slug = slugify(name);
    onChange(next);
  };

  const setSlug = (slug: string): void => {
    setSlugTouched(slug !== '');
    onChange({ ...event, slug });
  };

  const nameError = showErrors && errors.name ? errors.name : undefined;
  const slugError = showErrors && errors.slug ? errors.slug : undefined;

  const when = readWhen(event);
  const setWhen = (patch: EventWhenPatch): void => onChange(applyWhen(event, patch));

  const startError = Boolean(showErrors && errors.start);
  // An end before the start is the date's fault when it lands on an earlier
  // local day, and the time's fault when both sit on the same one.
  const endEarlierDay = Boolean(when.endDay && when.startDay && when.endDay.isBefore(when.startDay, 'day'));
  const endError = Boolean(showErrors && errors.end);
  const endDateError = endError && endEarlierDay;
  const endTimeError = endError && !endEarlierDay;
  const endBeforeStart = intl.formatMessage({ id: 'page.manage.events.error.endBeforeStart' });

  /** End adornment linking a translation-default field to its per-language key. */
  const translateAdornment = (i18nKey: string): React.ReactNode =>
    slugLocked ? (
      <TranslateAdornment i18nKey={i18nKey} label={intl.formatMessage({ id: 'page.manage.events.translate' })} />
    ) : undefined;

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={pickerLocale(intl.locale)}>
        <DialogTitle>
          {/* The same dialog serves both flows — `persisted` tells them apart. */}
          <FormattedMessage id={event.persisted ? 'page.manage.events.dialog.editTitle' : 'page.manage.events.dialog.addTitle'} />
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label={intl.formatMessage({ id: 'page.manage.events.field.name' })}
              value={event.name}
              onChange={(e) => setName(e.target.value)}
              size="small"
              fullWidth
              required
              error={Boolean(nameError)}
              helperText={nameError ? intl.formatMessage({ id: NAME_ERROR[nameError] }) : ' '}
              slotProps={{ input: { endAdornment: translateAdornment(eventNameKey(event.slug)) } }}
            />
            <TextField
              label={intl.formatMessage({ id: 'page.manage.events.field.slug' })}
              value={event.slug}
              onChange={(e) => setSlug(e.target.value)}
              size="small"
              fullWidth
              required
              disabled={slugLocked}
              error={Boolean(slugError)}
              helperText={
                slugError
                  ? intl.formatMessage({ id: SLUG_ERROR[slugError] })
                  : intl.formatMessage({
                      id: slugLocked ? 'page.manage.events.field.slug.locked' : 'page.manage.events.field.slug.help',
                    })
              }
            />
            <MediaUrlField
              label={intl.formatMessage({ id: 'page.manage.events.field.image' })}
              value={event.imageUrl ?? ''}
              onChange={(imageUrl) => onChange({ ...event, imageUrl: imageUrl || undefined })}
              enablePicker={enablePicker}
              fullWidth
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <DatePicker
                label={intl.formatMessage({ id: 'page.manage.events.field.startDate' })}
                value={when.startDay}
                onChange={(startDay) => setWhen({ startDay })}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    required: true,
                    error: startError,
                    helperText: startError
                      ? intl.formatMessage({ id: 'page.manage.events.error.startRequired' })
                      : ' ',
                    sx: PICKER_FIELD_SX,
                  },
                  openPickerButton: { sx: PICKER_BUTTON_SX },
                }}
              />
              <DatePicker
                label={intl.formatMessage({ id: 'page.manage.events.field.endDate' })}
                value={when.endDay}
                onChange={(endDay) => setWhen({ endDay })}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    error: endDateError,
                    helperText: endDateError
                      ? endBeforeStart
                      : intl.formatMessage({ id: 'page.manage.events.field.endDate.help' }),
                    sx: PICKER_FIELD_SX,
                  },
                  openPickerButton: { sx: PICKER_BUTTON_SX },
                }}
              />
              {/* Several local days → whole days, so there is no time to enter. */}
              {!when.multiDay && (
                <>
                  <TimePicker
                    label={intl.formatMessage({ id: 'page.manage.events.field.startTime' })}
                    value={when.startTime}
                    onChange={(startTime) => setWhen({ startTime })}
                    slotProps={{
                      textField: { size: 'small', fullWidth: true, helperText: ' ', sx: PICKER_FIELD_SX },
                      openPickerButton: { sx: PICKER_BUTTON_SX },
                    }}
                  />
                  <TimePicker
                    label={intl.formatMessage({ id: 'page.manage.events.field.endTime' })}
                    value={when.endTime}
                    onChange={(endTime) => setWhen({ endTime })}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        error: endTimeError,
                        helperText: endTimeError ? endBeforeStart : ' ',
                        sx: PICKER_FIELD_SX,
                      },
                      openPickerButton: { sx: PICKER_BUTTON_SX },
                    }}
                  />
                </>
              )}
            </Box>
            <TextField
              label={intl.formatMessage({ id: 'page.manage.events.field.location' })}
              value={event.location}
              onChange={(e) => onChange({ ...event, location: e.target.value })}
              size="small"
              fullWidth
              required
              error={Boolean(showErrors && errors.location)}
              helperText={
                showErrors && errors.location
                  ? intl.formatMessage({ id: 'page.manage.events.error.locationEmpty' })
                  : intl.formatMessage({ id: 'page.manage.events.field.location.help' })
              }
              slotProps={{ input: { endAdornment: translateAdornment(eventLocationKey(event.slug)) } }}
            />
            <TextField
              label={intl.formatMessage({ id: 'page.manage.events.field.website' })}
              value={event.websiteUrl ?? ''}
              onChange={(e) => onChange({ ...event, websiteUrl: e.target.value || undefined })}
              size="small"
              fullWidth
              placeholder="https://…"
              error={Boolean(showErrors && errors.website)}
              helperText={
                showErrors && errors.website
                  ? intl.formatMessage({ id: 'page.manage.events.error.websiteUrl' })
                  : ' '
              }
            />
            <TextField
              label={intl.formatMessage({ id: 'page.manage.events.field.description' })}
              value={event.description ?? ''}
              onChange={(e) => onChange({ ...event, description: e.target.value || undefined })}
              size="small"
              fullWidth
              multiline
              minRows={6}
              helperText={intl.formatMessage({ id: 'page.manage.events.field.description.help' })}
              slotProps={{ input: { endAdornment: translateAdornment(eventDescriptionKey(event.slug)) } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ '& .MuiButton-root': { minHeight: 44 } }}>
          <Button onClick={onCancel}>
            <FormattedMessage id="page.manage.events.cancel" />
          </Button>
          <Button variant="contained" onClick={onConfirm}>
            <FormattedMessage id="page.manage.events.done" />
          </Button>
        </DialogActions>
      </LocalizationProvider>
    </Dialog>
  );
};
