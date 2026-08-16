import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, HideImageOutlined as MissingImageIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { EventsConfigSchema } from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { StickySaveButton } from '../StickySaveButton';
import { ikTransform } from '../../../utils/imagekit';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateEvents } from '../../../services/eventsService';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { useNotifications } from '../../../hooks/useNotifications';
import { isPastEvent } from '../../../pages/events/eventDates';
import {
  createEvent,
  eventsAreValid,
  normalizeEvent,
  sortForEditor,
  validateEvents,
  type EventDraft,
} from './eventsDraft';
import { EventFormDialog } from './EventFormDialog';

/**
 * List tab of /manage/events — every event sorted by start date (newest
 * first; the public placement is automatic, so there is no manual reorder).
 * A row opens the edit dialog; deletion asks for confirmation. Saves via
 * `PUT /api/config/events`, merging over a fresh draft read so the Design
 * tab is never clobbered; changes go live only when published from the
 * Config Versions panel.
 */
export const EventsListEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();
  const flags = useFeatureFlags();

  const [events, setEvents] = useState<EventDraft[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [dialogIndex, setDialogIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (active) setEvents(sortForEditor(config.events?.events ?? []).map((event) => ({ ...event, persisted: true })));
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.events.error.load' }));
      });
    return () => {
      active = false;
    };
  }, [intl]);

  const errors = validateEvents(events ?? []);

  const updateAt = (index: number, next: EventDraft): void => {
    setEvents((prev) => (prev ? prev.map((event, i) => (i === index ? next : event)) : prev));
  };

  const addEvent = (): void => {
    setEvents((prev) => (prev ? [...prev, createEvent()] : prev));
    setDialogIndex(events?.length ?? 0);
  };

  const closeDialog = (): void => {
    // Discard a blank just-added row abandoned without any input.
    setEvents((prev) => {
      if (!prev || dialogIndex === null) return prev;
      const edited = prev[dialogIndex];
      const blank = edited && !edited.persisted && !edited.name && !edited.slug && !edited.startDateTime && !edited.location;
      return blank ? prev.filter((_, i) => i !== dialogIndex) : sortForEditor(prev);
    });
    setDialogIndex(null);
  };

  const confirmDelete = (): void => {
    if (deleteIndex !== null) setEvents((prev) => (prev ? prev.filter((_, i) => i !== deleteIndex) : prev));
    setDeleteIndex(null);
  };

  const handleSave = async (): Promise<void> => {
    if (!events) return;
    if (!eventsAreValid(validateEvents(events))) {
      setShowErrors(true);
      notify.error(intl.formatMessage({ id: 'page.manage.events.error.invalid' }));
      return;
    }
    setSubmitting(true);
    try {
      // Merge over the freshest draft so the Design tab's fields survive.
      const fresh = (await loadDraftConfig()).events;
      const parsed = EventsConfigSchema.safeParse({
        ...(fresh ?? {}),
        events: sortForEditor(events).map(normalizeEvent),
      });
      if (!parsed.success) {
        setShowErrors(true);
        notify.error(intl.formatMessage({ id: 'page.manage.events.error.invalid' }));
        return;
      }
      await updateEvents(parsed.data);
      setEvents((prev) => (prev ? sortForEditor(prev).map((event) => ({ ...event, persisted: true })) : prev));
      setShowErrors(false);
      notify.success(intl.formatMessage({ id: 'page.manage.events.saved' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.events.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }
  if (events === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader variant="triskelion" size={48} />
      </Box>
    );
  }

  const now = new Date();
  const dialogEvent = dialogIndex !== null ? (events[dialogIndex] ?? null) : null;

  const rowDates = (event: EventDraft): string => {
    if (!event.startDateTime) return '—';
    const start = intl.formatDate(event.startDateTime, { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!event.endDateTime) return start;
    const end = intl.formatDate(event.endDateTime, { day: '2-digit', month: '2-digit', year: 'numeric' });
    return intl.formatMessage({ id: 'page.events.card.range' }, { startDate: start, endDate: end });
  };

  return (
    <Box sx={{ maxWidth: 860 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        <FormattedMessage id="page.manage.events.hint" />
      </Typography>

      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          <FormattedMessage id="page.manage.events.empty" />
        </Typography>
      ) : (
        <List sx={{ mt: 1 }}>
          {events.map((event, index) => (
            <ListItem
              key={event.persisted ? event.slug : `new-${index}`}
              disablePadding
              divider
              secondaryAction={
                <Tooltip title={intl.formatMessage({ id: 'page.manage.events.delete' })}>
                  <IconButton
                    edge="end"
                    onClick={() => setDeleteIndex(index)}
                    aria-label={intl.formatMessage({ id: 'page.manage.events.delete' })}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemButton onClick={() => setDialogIndex(index)} sx={{ minHeight: 56, gap: 1.5 }}>
                {event.imageUrl?.trim() ? (
                  <Box
                    component="img"
                    src={ikTransform(event.imageUrl, 'w-96,h-96,q-75,f-auto')}
                    alt=""
                    loading="lazy"
                    sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'action.hover',
                      color: 'text.disabled',
                      flexShrink: 0,
                    }}
                  >
                    <MissingImageIcon fontSize="small" />
                  </Box>
                )}
                <ListItemText
                  primary={event.name || intl.formatMessage({ id: 'page.manage.events.untitled' })}
                  secondary={`${rowDates(event)} · ${event.location || '—'}`}
                  slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                />
                {event.startDateTime && isPastEvent(event, now) && (
                  <Chip size="small" label={intl.formatMessage({ id: 'page.manage.events.badge.past' })} />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <Button size="small" startIcon={<AddIcon />} onClick={addEvent} sx={{ mt: 1 }}>
        <FormattedMessage id="page.manage.events.add" />
      </Button>

      {dialogEvent !== null && dialogIndex !== null && (
        <EventFormDialog
          open
          event={dialogEvent}
          errors={errors[dialogIndex] ?? {}}
          showErrors={showErrors}
          enablePicker={Boolean(flags?.media)}
          onChange={(next) => updateAt(dialogIndex, next)}
          onClose={closeDialog}
        />
      )}

      <Dialog open={deleteIndex !== null} onClose={() => setDeleteIndex(null)}>
        <DialogTitle>
          <FormattedMessage id="page.manage.events.confirmDelete.title" />
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage
              id="page.manage.events.confirmDelete.body"
              values={{ name: deleteIndex !== null ? (events[deleteIndex]?.name ?? '') : '' }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteIndex(null)}>
            <FormattedMessage id="page.manage.events.confirmDelete.cancel" />
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            <FormattedMessage id="page.manage.events.confirmDelete.confirm" />
          </Button>
        </DialogActions>
      </Dialog>

      <StickySaveButton onClick={handleSave} disabled={submitting} submitting={submitting} />
    </Box>
  );
};
