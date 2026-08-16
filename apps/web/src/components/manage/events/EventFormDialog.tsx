import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { eventDescriptionKey, eventLocationKey, eventNameKey } from '@simple-site/interfaces';
import { MediaUrlField } from '../../media';
import { TranslateShortcut } from '../TranslateShortcut';
import { slugify } from '../slugify';
import { localInputToUtc, utcToLocalInput, type EventDraft, type EventFieldErrors } from './eventsDraft';

interface EventFormDialogProps {
  open: boolean;
  event: EventDraft;
  errors: EventFieldErrors;
  showErrors: boolean;
  /** Enables the media-library picker on the illustration field. */
  enablePicker: boolean;
  onChange: (next: EventDraft) => void;
  onClose: () => void;
}

const NAME_ERROR: Record<NonNullable<EventFieldErrors['name']>, string> = {
  empty: 'page.manage.events.error.nameEmpty',
};
const SLUG_ERROR: Record<NonNullable<EventFieldErrors['slug']>, string> = {
  empty: 'page.manage.events.error.slugEmpty',
  duplicate: 'page.manage.events.error.slugDuplicate',
  pattern: 'page.manage.events.error.slugPattern',
};

/**
 * Edit form for one event. The slug auto-derives from the name until edited by
 * hand, and becomes read-only once the event has been saved (public URL and
 * i18n-key identity — see `EventDraft.persisted`). Start/end edit in the
 * ADMIN's local timezone through native `datetime-local` inputs, converted to
 * the stored UTC instants on every change. Name, description and location are
 * translation defaults — a saved event links each to its translation key.
 */
export const EventFormDialog: React.FC<EventFormDialogProps> = ({
  open,
  event,
  errors,
  showErrors,
  enablePicker,
  onChange,
  onClose,
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

  /** End adornment linking a translation-default field to its per-language key. */
  const translateAdornment = (i18nKey: string): React.ReactNode =>
    slugLocked ? (
      <InputAdornment position="end">
        <TranslateShortcut i18nKey={i18nKey} label={intl.formatMessage({ id: 'page.manage.events.translate' })} />
      </InputAdornment>
    ) : undefined;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <FormattedMessage id="page.manage.events.edit" />
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
            <TextField
              label={intl.formatMessage({ id: 'page.manage.events.field.start' })}
              type="datetime-local"
              value={utcToLocalInput(event.startDateTime)}
              onChange={(e) => onChange({ ...event, startDateTime: localInputToUtc(e.target.value) })}
              size="small"
              fullWidth
              required
              error={Boolean(showErrors && errors.start)}
              helperText={
                showErrors && errors.start
                  ? intl.formatMessage({ id: 'page.manage.events.error.startRequired' })
                  : intl.formatMessage({ id: 'page.manage.events.field.dates.help' })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={intl.formatMessage({ id: 'page.manage.events.field.end' })}
              type="datetime-local"
              value={utcToLocalInput(event.endDateTime)}
              onChange={(e) => {
                const endDateTime = localInputToUtc(e.target.value);
                onChange({ ...event, endDateTime: endDateTime || undefined });
              }}
              size="small"
              fullWidth
              error={Boolean(showErrors && errors.end)}
              helperText={
                showErrors && errors.end
                  ? intl.formatMessage({ id: 'page.manage.events.error.endBeforeStart' })
                  : intl.formatMessage({ id: 'page.manage.events.field.end.help' })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
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
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          <FormattedMessage id="page.manage.events.done" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
