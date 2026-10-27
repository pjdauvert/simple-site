import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  EVENT_IMAGE_PLACEMENTS,
  EventsConfigSchema,
  type EventAspectRatio,
  type EventImagePlacement,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateEvents } from '../../../services/eventsService';
import { useDraftAutoSave } from '../../../hooks/useDraftAutoSave';
import { useDraftSaveNotifications } from '../../../hooks/useDraftSaveNotifications';
import { AspectRatioChoice } from './AspectRatioChoice';
import { DesignTabLayout } from './DesignPreviewShell';
import { EventPageDesignPreview, type EventPagePreviewTarget } from './EventPageDesignPreview';
import { useDesignSpotlight } from './designSpotlight';
import { mergeEventPageDraft, placementLabelKey, toEventPageDraft, type EventPageDesignDraft } from './eventsDesign';

/** The placement group is labelled by its own rendered label element. */
const PLACEMENT_LABEL_ID = 'events-page-image-placement-label';

/**
 * Event page design tab of /manage/events (`/manage/events/event-design`):
 * how one event's detail page looks — where the illustration sits (above the
 * descriptive panel or beside it, capped at half the screen either way), its
 * ratio (A4 poster by default, like the cards) and whether it is painted as a
 * blurred full background behind the page.
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
  useDraftSaveNotifications(saveState);

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
          <Box {...spotlight('imagePlacement')}>
            <Typography variant="subtitle2" gutterBottom id={PLACEMENT_LABEL_ID}>
              <FormattedMessage id="page.manage.events.design.imagePlacement" />
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={design.imagePlacement}
              onChange={(_, imagePlacement: EventImagePlacement | null) => {
                if (imagePlacement) setDesign({ ...design, imagePlacement });
              }}
              aria-labelledby={PLACEMENT_LABEL_ID}
              // Touch targets stay at 44 px, and the two labels wrap on a phone.
              sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { minHeight: 44, px: 2 } }}
            >
              {EVENT_IMAGE_PLACEMENTS.map((placement) => (
                <ToggleButton key={placement} value={placement}>
                  <FormattedMessage id={placementLabelKey(placement)} />
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary" component="p" sx={{ mt: 1 }}>
              <FormattedMessage id="page.manage.events.design.imagePlacement.help" />
            </Typography>
          </Box>

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
        </>
      }
      preview={<EventPageDesignPreview design={design} highlight={highlight} />}
    />
  );
};
