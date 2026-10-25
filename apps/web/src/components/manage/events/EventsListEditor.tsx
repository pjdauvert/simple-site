import { useCallback, useEffect, useMemo, useState } from 'react';
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
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as ClearIcon,
  Delete as DeleteIcon,
  HideImageOutlined as MissingImageIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { EventsConfigSchema, type SiteEvent } from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { ikTransform } from '../../../utils/imagekit';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateEvents } from '../../../services/eventsService';
import { useDraftAutoSave } from '../../../hooks/useDraftAutoSave';
import { useDraftSaveNotifications } from '../../../hooks/useDraftSaveNotifications';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { isPastEvent } from '../../../pages/events/eventDates';
import {
  createEvent,
  eventsAreValid,
  normalizeEvent,
  sortForEditor,
  validateEvents,
  type EventDraft,
  type EventFieldErrors,
} from './eventsDraft';
import {
  DEFAULT_EVENT_SORT,
  EVENT_SORT_CRITERIA,
  filterEvents,
  sortEvents,
  type EventSortCriterion,
} from './eventsSearch';
import { EventFormDialog } from './EventFormDialog';

/** Minimum size of anything the admin taps on a phone. */
const TOUCH_TARGET = 44;

/**
 * The event being edited in the dialog — a WORKING COPY. `index` is its
 * position in the list state, or `null` for an event that has not been added
 * yet: cancelling then simply forgets it, and nothing reaches the draft before
 * the admin confirms.
 */
interface DialogState {
  index: number | null;
  draft: EventDraft;
}

/**
 * List tab of /manage/events — one row per event, a row opens the edit dialog,
 * deletion asks for confirmation.
 *
 * There is no save button: every settled change is written to the configuration
 * DRAFT on its own (`useDraftAutoSave`, reported by the admin notifications),
 * merged over a fresh draft read so the Design tab is never clobbered, and goes
 * live only when the draft is published. A list holding an incomplete event is
 * NOT written — the write waits, the row's fields are flagged, and it goes out
 * as soon as the event is complete.
 *
 * The sort selector and the search field are DISPLAY-ONLY (see
 * `eventsSearch.ts`): the stored order is always start-date descending, which
 * is also what the public agenda derives its placement from.
 */
export const EventsListEditor: React.FC = () => {
  const intl = useIntl();
  const flags = useFeatureFlags();

  const [events, setEvents] = useState<EventDraft[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [criterion, setCriterion] = useState<EventSortCriterion>(DEFAULT_EVENT_SORT);

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

  const errors = useMemo(() => validateEvents(events ?? []), [events]);
  const valid = eventsAreValid(errors);

  /**
   * What the draft would hold: stored order, editor-only state stripped. The
   * auto-save compares successive values structurally, so deriving the payload
   * here keeps editor noise (the `persisted` flag, untrimmed whitespace) from
   * triggering a redundant write.
   */
  const payload = useMemo(
    () => (events ? sortForEditor(events).map(normalizeEvent) : null),
    [events],
  );

  const persist = useCallback(
    async (list: SiteEvent[]): Promise<void> => {
      // Merge over the freshest draft so the Design tab's fields survive.
      const fresh = (await loadDraftConfig()).events;
      const parsed = EventsConfigSchema.safeParse({ ...(fresh ?? {}), events: list });
      if (!parsed.success) throw new Error(intl.formatMessage({ id: 'page.manage.events.error.invalid' }));
      await updateEvents(parsed.data);
      // Every row now exists in the stored draft: its slug is locked for good.
      setEvents((prev) => (prev ? prev.map((event) => (event.persisted ? event : { ...event, persisted: true })) : prev));
    },
    [intl],
  );

  const autoSave = useDraftAutoSave({ value: payload, save: persist, enabled: valid });
  useDraftSaveNotifications(autoSave);

  /** Display order and filter — never the stored order (see `eventsSearch.ts`). */
  const rows = useMemo(
    () => sortEvents(filterEvents((events ?? []).map((event, index) => ({ ...event, index })), query), criterion, intl.locale),
    [events, query, criterion, intl.locale],
  );

  const addEvent = (): void => setDialog({ index: null, draft: createEvent() });

  /** Commits the working copy to the list state — which auto-saves it. */
  const confirmDialog = (): void => {
    if (!dialog) return;
    const { index, draft } = dialog;
    setEvents((prev) => {
      if (!prev) return prev;
      return index === null ? [...prev, draft] : prev.map((event, i) => (i === index ? draft : event));
    });
    setDialog(null);
  };

  const confirmDelete = (): void => {
    if (deleteIndex !== null) setEvents((prev) => (prev ? prev.filter((_, i) => i !== deleteIndex) : prev));
    setDeleteIndex(null);
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

  /**
   * The working copy's own field errors: validated inside the list it is about
   * to join, so a slug clashing with another event is caught while editing.
   */
  const dialogErrors = (): EventFieldErrors => {
    if (!dialog) return {};
    const list = dialog.index === null ? [...events, dialog.draft] : events.map((event, i) => (i === dialog.index ? dialog.draft : event));
    return validateEvents(list)[dialog.index ?? list.length - 1] ?? {};
  };

  // Fields are flagged once a save is actually held back — never while the
  // admin is still filling in a row that has not joined the list yet.
  const showErrors = !valid && dialog !== null && dialog.index !== null;

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

      {events.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 18rem)' },
            gap: { xs: 1, sm: 2 },
            mt: 2,
          }}
        >
          <TextField
            label={intl.formatMessage({ id: 'page.manage.events.search' })}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            fullWidth
            helperText={intl.formatMessage({ id: 'page.manage.events.search.help' })}
            slotProps={{
              input: {
                sx: { minHeight: TOUCH_TARGET },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="disabled" />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={intl.formatMessage({ id: 'page.manage.events.search.clear' })}
                      onClick={() => setQuery('')}
                      sx={{ minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <TextField
            select
            label={intl.formatMessage({ id: 'page.manage.events.sortBy' })}
            value={criterion}
            onChange={(e) => setCriterion(e.target.value as EventSortCriterion)}
            size="small"
            fullWidth
            // Keeps both fields' baselines aligned next to the search helper.
            helperText=" "
            slotProps={{ input: { sx: { minHeight: TOUCH_TARGET } } }}
          >
            {EVENT_SORT_CRITERIA.map((option) => (
              <MenuItem key={option} value={option} sx={{ minHeight: TOUCH_TARGET }}>
                {intl.formatMessage({ id: `page.manage.events.sort.${option}` })}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      {!valid && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          <FormattedMessage id="page.manage.events.error.invalid" />
        </Alert>
      )}

      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          <FormattedMessage id="page.manage.events.empty" />
        </Typography>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          <FormattedMessage id="page.manage.events.search.empty" />
        </Typography>
      ) : (
        <List sx={{ mt: 1 }}>
          {rows.map((row) => (
            <ListItem
              key={`${row.index}-${row.slug}`}
              disablePadding
              divider
              secondaryAction={
                <Tooltip title={intl.formatMessage({ id: 'page.manage.events.delete' })}>
                  <IconButton
                    edge="end"
                    onClick={() => setDeleteIndex(row.index)}
                    aria-label={intl.formatMessage({ id: 'page.manage.events.delete' })}
                    sx={{ minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemButton
                onClick={() => setDialog({ index: row.index, draft: events[row.index] })}
                sx={{ minHeight: 56, gap: 1.5 }}
              >
                {row.imageUrl?.trim() ? (
                  <Box
                    component="img"
                    src={ikTransform(row.imageUrl, 'w-96,h-96,q-75,f-auto')}
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
                  primary={row.name || intl.formatMessage({ id: 'page.manage.events.untitled' })}
                  secondary={`${rowDates(row)} · ${row.location || '—'}`}
                  slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                />
                {row.startDateTime && isPastEvent(row, now) && (
                  <Chip size="small" label={intl.formatMessage({ id: 'page.manage.events.badge.past' })} />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <Button size="small" startIcon={<AddIcon />} onClick={addEvent} sx={{ mt: 1, minHeight: TOUCH_TARGET }}>
        <FormattedMessage id="page.manage.events.add" />
      </Button>

      {dialog !== null && (
        <EventFormDialog
          open
          event={dialog.draft}
          errors={dialogErrors()}
          showErrors={showErrors}
          enablePicker={Boolean(flags?.media)}
          onChange={(next) => setDialog((prev) => (prev ? { ...prev, draft: next } : prev))}
          onCancel={() => setDialog(null)}
          onConfirm={confirmDialog}
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
    </Box>
  );
};
