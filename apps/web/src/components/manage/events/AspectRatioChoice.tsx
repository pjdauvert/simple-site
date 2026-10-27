import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { EVENT_ASPECT_RATIOS, type EventAspectRatio } from '@simple-site/interfaces';
import { aspectLabelKey } from './eventsDesign';
import { TOUCH_TARGET } from '../../../features/theme/muiTheme';

/**
 * The aspect-ratio picker both events design tabs offer (card images, detail
 * header). Toggle buttons rather than a dropdown: the four options fit a phone
 * screen, stay a single tap away and keep focus in place — a select would move
 * focus into a portal and drop the preview highlight while choosing.
 *
 * The buttons show the bare ratio token (`A4`, `16:9`…) to stay compact, and
 * carry the full localised label as their accessible name ("Poster (A4)").
 */
export const AspectRatioChoice: React.FC<{
  /** i18n id of the group's label. */
  labelKey: string;
  /** Unique id — the group is labelled by the rendered label element. */
  id: string;
  value: EventAspectRatio;
  onChange: (ratio: EventAspectRatio) => void;
}> = ({ labelKey, id, value, onChange }) => {
  const intl = useIntl();

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom id={id}>
        <FormattedMessage id={labelKey} />
      </Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={value}
        onChange={(_, ratio: EventAspectRatio | null) => {
          if (ratio) onChange(ratio);
        }}
        aria-labelledby={id}
        // Touch targets stay at 44 px however small the label is.
        sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { minHeight: TOUCH_TARGET, px: 2 } }}
      >
        {EVENT_ASPECT_RATIOS.map((ratio) => (
          <ToggleButton key={ratio} value={ratio} aria-label={intl.formatMessage({ id: aspectLabelKey(ratio) })}>
            {ratio}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};
