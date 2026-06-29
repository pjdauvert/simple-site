import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { MediaType } from '@simple-site/interfaces';

interface MediaTypeFilterProps {
  value: MediaType;
  onChange: (value: MediaType) => void;
}

/** All / Images / Videos toggle that narrows the file grid. */
export const MediaTypeFilter: React.FC<MediaTypeFilterProps> = ({ value, onChange }) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    size="small"
    onChange={(_event, next: MediaType | null) => { if (next) onChange(next); }}
  >
    <ToggleButton value="all"><FormattedMessage id="page.media.filter.all" /></ToggleButton>
    <ToggleButton value="image"><FormattedMessage id="page.media.filter.images" /></ToggleButton>
    <ToggleButton value="video"><FormattedMessage id="page.media.filter.videos" /></ToggleButton>
  </ToggleButtonGroup>
);
