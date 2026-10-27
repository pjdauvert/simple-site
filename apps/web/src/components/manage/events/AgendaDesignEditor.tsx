import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Divider,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  EVENT_COLUMNS_MAX,
  EVENT_COLUMNS_MIN,
  EVENTS_PAST_HEADER_KEY,
  EVENTS_PAST_TITLE_KEY,
  EVENTS_UPCOMING_HEADER_KEY,
  EVENTS_UPCOMING_TITLE_KEY,
  EVENT_WEEK_STARTS,
  EventsConfigSchema,
  PAST_EVENTS_MODES,
  type EventAspectRatio,
  type EventWeekStart,
  type PastEventsMode,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { TranslateAdornment } from '../TranslateAdornment';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateEvents } from '../../../services/eventsService';
import { useDraftAutoSave } from '../../../hooks/useDraftAutoSave';
import { useDraftSaveNotifications } from '../../../hooks/useDraftSaveNotifications';
import { AgendaDesignPreview, type AgendaPreviewTarget } from './AgendaDesignPreview';
import { AspectRatioChoice } from './AspectRatioChoice';
import { DesignTabLayout } from '../DesignTabPanels';
import { useDesignSpotlight } from './designSpotlight';
import {
  mergeAgendaDraft,
  toAgendaDraft,
  toTextsDraft,
  type AgendaDesignDraft,
  type SectionTextsDraft,
} from './eventsDesign';
import { TOUCH_TARGET } from '../../../features/theme/muiTheme';

/** The desktop column counts the editor offers (the schema's bounds, enumerated). */
const COLUMN_CHOICES = Array.from(
  { length: EVENT_COLUMNS_MAX - EVENT_COLUMNS_MIN + 1 },
  (_, offset) => EVENT_COLUMNS_MIN + offset,
);

/**
 * The agenda's two headed sections and the preview element each one rings.
 * The featured block is absent on purpose: it carries neither heading nor
 * introduction.
 */
const SECTIONS: ReadonlyArray<{
  target: Extract<AgendaPreviewTarget, 'upcomingText' | 'pastText'>;
  titleField: 'upcomingTitle' | 'pastTitle';
  headerField: 'upcomingHeader' | 'pastHeader';
  titleKey: string;
  headerKey: string;
  labelKey: string;
}> = [
  {
    target: 'upcomingText',
    titleField: 'upcomingTitle',
    headerField: 'upcomingHeader',
    titleKey: EVENTS_UPCOMING_TITLE_KEY,
    headerKey: EVENTS_UPCOMING_HEADER_KEY,
    labelKey: 'page.events.upcomingTitle',
  },
  {
    target: 'pastText',
    titleField: 'pastTitle',
    headerField: 'pastHeader',
    titleKey: EVENTS_PAST_TITLE_KEY,
    headerKey: EVENTS_PAST_HEADER_KEY,
    labelKey: 'page.events.pastTitle',
  },
];

/**
 * Agenda design tab of /manage/events (`/manage/events/agenda-design`): how
 * the public /events page looks — past-events visibility, card ratio, column
 * count, card location, the featured block's backdrop — plus the two headed
 * sections' titles and markdown introductions (translation defaults).
 *
 * Every settled change AUTO-SAVES to the draft (no save button — see
 * `useDraftAutoSave`), merging over a fresh draft read so neither the event
 * list nor the event-page design tab is ever clobbered. Only deviations from
 * the defaults are stored: a pristine tab persists nothing. Per the
 * show-only-applicable-options principle the `from` cut-off date is HIDDEN
 * outside the `from` mode — never disabled — and its stored value survives
 * mode switches.
 */
export const AgendaDesignEditor: React.FC = () => {
  const intl = useIntl();
  const [agenda, setAgenda] = useState<AgendaDesignDraft | null>(null);
  const [texts, setTexts] = useState<SectionTextsDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { highlight, spotlight } = useDesignSpotlight<AgendaPreviewTarget>();

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        setAgenda(toAgendaDraft(config.events));
        setTexts(toTextsDraft(config.events));
      })
      .catch((err) => {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.events.error.load' }),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [intl]);

  const save = useCallback(
    async ({ agenda: design, texts: sectionTexts }: { agenda: AgendaDesignDraft; texts: SectionTextsDraft }) => {
      // Merge over the freshest draft so the other tabs' fields survive.
      const fresh = (await loadDraftConfig()).events;
      const parsed = EventsConfigSchema.safeParse(mergeAgendaDraft(fresh, design, sectionTexts));
      if (!parsed.success) throw new Error(intl.formatMessage({ id: 'page.manage.events.error.invalid' }));
      await updateEvents(parsed.data);
    },
    [intl],
  );

  // The tab edits two drafts but auto-saves them as ONE value (a single write
  // carries both). Memoised on purpose: a value rebuilt on every render would
  // re-arm the debounce after a failed write, turning the hook's "a failed
  // value waits for the next edit" into an endless retry loop.
  const value = useMemo(() => (agenda && texts ? { agenda, texts } : null), [agenda, texts]);
  const saveState = useDraftAutoSave({ value, save });
  useDraftSaveNotifications(saveState);

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }
  if (!agenda || !texts) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader variant="triskelion" size={48} />
      </Box>
    );
  }

  const translateAdornment = (i18nKey: string): React.ReactNode => (
    <TranslateAdornment i18nKey={i18nKey} label={intl.formatMessage({ id: 'page.manage.events.translate' })} />
  );

  return (
    <DesignTabLayout
      form={
        <>
          <Box sx={{ display: 'grid', gap: 2 }} {...spotlight('pastEvents')}>
            <TextField
              select
              label={intl.formatMessage({ id: 'page.manage.events.design.pastEvents' })}
              value={agenda.pastEventsMode}
              onChange={(e) => setAgenda({ ...agenda, pastEventsMode: e.target.value as PastEventsMode })}
            >
              {PAST_EVENTS_MODES.map((mode) => (
                <MenuItem key={mode} value={mode} sx={{ minHeight: TOUCH_TARGET }}>
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
                helperText={intl.formatMessage({ id: 'page.manage.events.design.pastEvents.fromDate.help' })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          </Box>

          <Box {...spotlight('cardRatio')}>
            <AspectRatioChoice
              id="events-card-aspect-ratio-label"
              labelKey="page.manage.events.design.cardAspectRatio"
              value={agenda.cardAspectRatio}
              onChange={(cardAspectRatio: EventAspectRatio) => setAgenda({ ...agenda, cardAspectRatio })}
            />
          </Box>

          <Box {...spotlight('columns')}>
            <Typography variant="subtitle2" gutterBottom id="events-columns-label">
              <FormattedMessage id="page.manage.events.design.columns" />
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={agenda.columns}
              onChange={(_, columns: number | null) => {
                if (columns) setAgenda({ ...agenda, columns });
              }}
              aria-labelledby="events-columns-label"
              sx={{ '& .MuiToggleButton-root': { minHeight: TOUCH_TARGET, px: 2.5 } }}
            >
              {COLUMN_CHOICES.map((count) => (
                <ToggleButton key={count} value={count}>
                  {count}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box {...spotlight('location')}>
            <FormControlLabel
              sx={{ minHeight: TOUCH_TARGET, mr: 0 }}
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
          </Box>

          <Box {...spotlight('backdrop')}>
            <FormControlLabel
              sx={{ minHeight: TOUCH_TARGET, mr: 0 }}
              control={
                <Switch
                  checked={agenda.showFeaturedBackdrop}
                  onChange={(_, checked) => setAgenda({ ...agenda, showFeaturedBackdrop: checked })}
                />
              }
              label={
                <Typography variant="body2">
                  <FormattedMessage id="page.manage.events.design.showFeaturedBackdrop" />
                </Typography>
              }
            />
          </Box>

          <Divider />
          <Typography variant="subtitle1">
            <FormattedMessage id="page.manage.events.design.searchPage" />
          </Typography>

          {/* Drives the search page's calendar panel, which the agenda
              skeleton does not show — hence no preview element to ring. */}
          <Box>
            <Typography variant="subtitle2" gutterBottom id="events-week-start-label">
              <FormattedMessage id="page.manage.events.design.weekStart" />
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={agenda.weekStartsOn}
              onChange={(_, weekStartsOn: EventWeekStart | null) => {
                if (weekStartsOn) setAgenda({ ...agenda, weekStartsOn });
              }}
              aria-labelledby="events-week-start-label"
              sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { minHeight: TOUCH_TARGET, px: 2 } }}
            >
              {EVENT_WEEK_STARTS.map((day) => (
                <ToggleButton key={day} value={day}>
                  {intl.formatMessage({ id: `page.manage.events.design.weekStart.${day}` })}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary" component="p" sx={{ mt: 1 }}>
              <FormattedMessage id="page.manage.events.design.weekStart.help" />
            </Typography>
          </Box>

          <Divider />
          <Typography variant="subtitle1">
            <FormattedMessage id="page.manage.events.design.sectionTexts" />
          </Typography>

          {SECTIONS.map(({ target, titleField, headerField, titleKey, headerKey, labelKey }) => (
            <Box key={target} sx={{ display: 'grid', gap: 2 }} {...spotlight(target)}>
              <TextField
                label={`${intl.formatMessage({ id: 'page.manage.events.field.sectionTitle' })} — ${intl.formatMessage({ id: labelKey })}`}
                value={texts[titleField]}
                onChange={(e) => setTexts({ ...texts, [titleField]: e.target.value })}
                helperText={intl.formatMessage({ id: 'page.manage.events.field.sectionTitle.help' })}
                slotProps={{ input: { endAdornment: translateAdornment(titleKey) } }}
              />
              <TextField
                label={`${intl.formatMessage({ id: 'page.manage.events.field.sectionHeader' })} — ${intl.formatMessage({ id: labelKey })}`}
                value={texts[headerField]}
                onChange={(e) => setTexts({ ...texts, [headerField]: e.target.value })}
                multiline
                minRows={2}
                helperText={intl.formatMessage({ id: 'page.manage.events.field.sectionHeader.help' })}
                slotProps={{ input: { endAdornment: translateAdornment(headerKey) } }}
              />
            </Box>
          ))}
        </>
      }
      preview={<AgendaDesignPreview design={agenda} texts={texts} highlight={highlight} />}
    />
  );
};
