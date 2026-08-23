import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Divider,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  EVENT_ASPECT_RATIOS,
  EVENT_COLUMNS_MAX,
  EVENT_COLUMNS_MIN,
  EVENTS_NEXT_HEADER_KEY,
  EVENTS_PAST_HEADER_KEY,
  EVENTS_PAST_TITLE_KEY,
  EVENTS_UPCOMING_HEADER_KEY,
  EVENTS_UPCOMING_TITLE_KEY,
  EventsConfigSchema,
  PAST_EVENTS_MODES,
  type EventAspectRatio,
  type PastEventsMode,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { StickySaveButton } from '../StickySaveButton';
import { TranslateShortcut } from '../TranslateShortcut';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateEvents } from '../../../services/eventsService';
import { useNotifications } from '../../../hooks/useNotifications';
import {
  buildDesign,
  fromTextsDraft,
  toAgendaDraft,
  toEventPageDraft,
  toTextsDraft,
  type AgendaDesignDraft,
  type EventPageDesignDraft,
  type SectionTextsDraft,
} from './eventsDesign';

/** i18n label of an aspect ratio option (`16:9` → `page.manage.events.design.aspect.16_9`). */
const aspectLabelKey = (ratio: EventAspectRatio): string =>
  `page.manage.events.design.aspect.${ratio.replace(':', '_')}`;

// The featured section has no heading of its own — only the markdown intro.
const SECTION_TEXTS: Array<{
  titleField?: 'upcomingTitle' | 'pastTitle';
  headerField: 'nextHeader' | 'upcomingHeader' | 'pastHeader';
  titleKey?: string;
  headerKey: string;
  labelKey: string;
}> = [
  { headerField: 'nextHeader', headerKey: EVENTS_NEXT_HEADER_KEY, labelKey: 'page.events.nextTitle' },
  { titleField: 'upcomingTitle', headerField: 'upcomingHeader', titleKey: EVENTS_UPCOMING_TITLE_KEY, headerKey: EVENTS_UPCOMING_HEADER_KEY, labelKey: 'page.events.upcomingTitle' },
  { titleField: 'pastTitle', headerField: 'pastHeader', titleKey: EVENTS_PAST_TITLE_KEY, headerKey: EVENTS_PAST_HEADER_KEY, labelKey: 'page.events.pastTitle' },
];

/**
 * Design tab of /manage/events: the agenda page's options (past-events
 * visibility, card ratio/columns/location), the sections' titles and markdown
 * headers (translation defaults), and the event page's image ratio. Only
 * deviations from the defaults are stored (a pristine tab persists nothing);
 * the `from` cut-off date is HIDDEN outside the `from` mode but its stored
 * value survives mode switches. Saves merge over a fresh draft read so the
 * List tab is never clobbered.
 */
export const EventsDesignEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [agenda, setAgenda] = useState<AgendaDesignDraft | null>(null);
  const [eventPage, setEventPage] = useState<EventPageDesignDraft | null>(null);
  const [texts, setTexts] = useState<SectionTextsDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        setAgenda(toAgendaDraft(config.events));
        setEventPage(toEventPageDraft(config.events));
        setTexts(toTextsDraft(config.events));
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.events.error.load' }));
      });
    return () => {
      active = false;
    };
  }, [intl]);

  const handleSave = async (): Promise<void> => {
    if (!agenda || !eventPage || !texts) return;
    setSubmitting(true);
    try {
      // Merge over the freshest draft so the List tab's events survive.
      const fresh = (await loadDraftConfig()).events;
      const design = buildDesign(agenda, eventPage);
      const parsed = EventsConfigSchema.safeParse({
        events: fresh?.events ?? [],
        ...fromTextsDraft(texts),
        ...(design ? { design } : {}),
      });
      if (!parsed.success) {
        notify.error(intl.formatMessage({ id: 'page.manage.events.error.invalid' }));
        return;
      }
      await updateEvents(parsed.data);
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
  if (!agenda || !eventPage || !texts) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader variant="triskelion" size={48} />
      </Box>
    );
  }

  const translateAdornment = (i18nKey: string): React.ReactNode => (
    <InputAdornment position="end">
      <TranslateShortcut i18nKey={i18nKey} label={intl.formatMessage({ id: 'page.manage.events.translate' })} />
    </InputAdornment>
  );

  return (
    <Box sx={{ maxWidth: 640, display: 'grid', gap: 2 }}>
      <Typography variant="subtitle1">
        <FormattedMessage id="page.manage.events.design.agendaPage" />
      </Typography>

      <TextField
        select
        label={intl.formatMessage({ id: 'page.manage.events.design.pastEvents' })}
        value={agenda.pastEventsMode}
        onChange={(e) => setAgenda({ ...agenda, pastEventsMode: e.target.value as PastEventsMode })}
        size="small"
      >
        {PAST_EVENTS_MODES.map((mode) => (
          <MenuItem key={mode} value={mode}>
            {intl.formatMessage({ id: `page.manage.events.design.pastEvents.${mode}` })}
          </MenuItem>
        ))}
      </TextField>
      {/* Applicable in `from` mode only — hidden otherwise, value kept. */}
      {agenda.pastEventsMode === 'from' && (
        <TextField
          label={intl.formatMessage({ id: 'page.manage.events.design.pastEvents.fromDate' })}
          type="date"
          value={agenda.pastEventsFromDate}
          onChange={(e) => setAgenda({ ...agenda, pastEventsFromDate: e.target.value })}
          size="small"
          helperText={intl.formatMessage({ id: 'page.manage.events.design.pastEvents.fromDate.help' })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      )}
      <TextField
        select
        label={intl.formatMessage({ id: 'page.manage.events.design.cardAspectRatio' })}
        value={agenda.cardAspectRatio}
        onChange={(e) => setAgenda({ ...agenda, cardAspectRatio: e.target.value as EventAspectRatio })}
        size="small"
      >
        {EVENT_ASPECT_RATIOS.map((ratio) => (
          <MenuItem key={ratio} value={ratio}>
            {intl.formatMessage({ id: aspectLabelKey(ratio) })}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={intl.formatMessage({ id: 'page.manage.events.design.columns' })}
        value={agenda.columns}
        onChange={(e) => setAgenda({ ...agenda, columns: Number(e.target.value) })}
        size="small"
      >
        {Array.from({ length: EVENT_COLUMNS_MAX - EVENT_COLUMNS_MIN + 1 }, (_, i) => EVENT_COLUMNS_MIN + i).map(
          (count) => (
            <MenuItem key={count} value={count}>
              {count}
            </MenuItem>
          ),
        )}
      </TextField>
      <FormControlLabel
        control={
          <Switch
            checked={agenda.showLocationOnCards}
            onChange={(_, checked) => setAgenda({ ...agenda, showLocationOnCards: checked })}
          />
        }
        label={
          <Typography variant="body2">
            <FormattedMessage id="page.manage.events.design.showLocation" />
          </Typography>
        }
      />

      <Divider />
      <Typography variant="subtitle1">
        <FormattedMessage id="page.manage.events.design.sectionTexts" />
      </Typography>

      {SECTION_TEXTS.map(({ titleField, headerField, titleKey, headerKey, labelKey }) => (
        <Box key={headerField} sx={{ display: 'grid', gap: 1.5 }}>
          {titleField && titleKey && (
            <TextField
              label={`${intl.formatMessage({ id: 'page.manage.events.field.sectionTitle' })} — ${intl.formatMessage({ id: labelKey })}`}
              value={texts[titleField]}
              onChange={(e) => setTexts({ ...texts, [titleField]: e.target.value })}
              size="small"
              helperText={intl.formatMessage({ id: 'page.manage.events.field.sectionTitle.help' })}
              slotProps={{ input: { endAdornment: translateAdornment(titleKey) } }}
            />
          )}
          <TextField
            label={`${intl.formatMessage({ id: 'page.manage.events.field.sectionHeader' })} — ${intl.formatMessage({ id: labelKey })}`}
            value={texts[headerField]}
            onChange={(e) => setTexts({ ...texts, [headerField]: e.target.value })}
            size="small"
            multiline
            minRows={2}
            helperText={intl.formatMessage({ id: 'page.manage.events.field.sectionHeader.help' })}
            slotProps={{ input: { endAdornment: translateAdornment(headerKey) } }}
          />
        </Box>
      ))}

      <Divider />
      <Typography variant="subtitle1">
        <FormattedMessage id="page.manage.events.design.eventPage" />
      </Typography>

      <TextField
        select
        label={intl.formatMessage({ id: 'page.manage.events.design.imageAspectRatio' })}
        value={eventPage.imageAspectRatio}
        onChange={(e) => setEventPage({ imageAspectRatio: e.target.value as EventAspectRatio })}
        size="small"
      >
        {EVENT_ASPECT_RATIOS.map((ratio) => (
          <MenuItem key={ratio} value={ratio}>
            {intl.formatMessage({ id: aspectLabelKey(ratio) })}
          </MenuItem>
        ))}
      </TextField>

      <StickySaveButton onClick={handleSave} disabled={submitting} submitting={submitting} />
    </Box>
  );
};
