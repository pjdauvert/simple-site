import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, FormControlLabel, Switch, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { EventsConfigSchema, type EventAspectRatio } from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { DraftSaveStatus } from '../DraftSaveStatus';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateEvents } from '../../../services/eventsService';
import { useDraftAutoSave } from '../../../hooks/useDraftAutoSave';
import { AspectRatioChoice } from './AspectRatioChoice';
import { DesignTabLayout } from './DesignPreviewShell';
import { EventPageDesignPreview, type EventPagePreviewTarget } from './EventPageDesignPreview';
import { useDesignSpotlight } from './designSpotlight';
import { mergeEventPageDraft, toEventPageDraft, type EventPageDesignDraft } from './eventsDesign';

/**
 * Event page design tab of /manage/events (`/manage/events/event-design`):
 * how one event's detail page looks — the header illustration's ratio (A4
 * poster by default, like the cards) and whether the illustration is painted
 * as a blurred full background behind the page.
 *
 * Every settled change AUTO-SAVES to the draft (no save button — see
 * `useDraftAutoSave`), merging over a fresh draft read so neither the event
 * list nor the agenda design tab is ever clobbered. Only deviations from the
 * defaults are stored: a pristine tab persists nothing.
 */
export const EventPageDesignEditor: React.FC = () => {
  const intl = useIntl();
  const [design, setDesign] = useState<EventPageDesignDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { highlight, spotlight } = useDesignSpotlight<EventPagePreviewTarget>();

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (active) setDesign(toEventPageDraft(config.events));
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
    async (value: EventPageDesignDraft) => {
      // Merge over the freshest draft so the other tabs' fields survive.
      const fresh = (await loadDraftConfig()).events;
      const parsed = EventsConfigSchema.safeParse(mergeEventPageDraft(fresh, value));
      if (!parsed.success) throw new Error(intl.formatMessage({ id: 'page.manage.events.error.invalid' }));
      await updateEvents(parsed.data);
    },
    [intl],
  );

  const saveState = useDraftAutoSave({ value: design, save });

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }
  if (!design) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader variant="triskelion" size={48} />
      </Box>
    );
  }

  return (
    <DesignTabLayout
      form={
        <>
          <Box {...spotlight('imageRatio')}>
            <AspectRatioChoice
              id="events-page-aspect-ratio-label"
              labelKey="page.manage.events.design.imageAspectRatio"
              value={design.imageAspectRatio}
              onChange={(imageAspectRatio: EventAspectRatio) => setDesign({ ...design, imageAspectRatio })}
            />
          </Box>

          <Box {...spotlight('fullBackground')}>
            <FormControlLabel
              sx={{ minHeight: 44, mr: 0 }}
              control={
                <Switch
                  checked={design.fullBackgroundImage}
                  onChange={(_, fullBackgroundImage) => setDesign({ ...design, fullBackgroundImage })}
                />
              }
              label={
                <Typography variant="body2">
                  <FormattedMessage id="page.manage.events.design.fullBackgroundImage" />
                </Typography>
              }
            />
            <Typography variant="body2" color="text.secondary" component="p">
              <FormattedMessage id="page.manage.events.design.fullBackgroundImage.help" />
            </Typography>
          </Box>

          <DraftSaveStatus {...saveState} />
        </>
      }
      preview={<EventPageDesignPreview design={design} highlight={highlight} />}
    />
  );
};
