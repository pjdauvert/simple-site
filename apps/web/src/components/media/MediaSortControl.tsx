import { Box, IconButton, MenuItem, TextField, Tooltip } from '@mui/material';
import { ArrowDownward as ArrowDownwardIcon, ArrowUpward as ArrowUpwardIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { FileSortKey, SortDir } from './types';

interface MediaSortControlProps {
  sortKey: FileSortKey;
  sortDir: SortDir;
  onSortKeyChange: (key: FileSortKey) => void;
  onSortDirChange: (dir: SortDir) => void;
}

/** The selectable sort fields, in display order; default is creation date. */
const SORT_OPTIONS: { value: FileSortKey; labelId: string }[] = [
  { value: 'createdAt', labelId: 'page.media.sort.date' },
  { value: 'name', labelId: 'page.media.sort.name' },
  { value: 'size', labelId: 'page.media.sort.size' },
  { value: 'width', labelId: 'page.media.sort.width' },
  { value: 'height', labelId: 'page.media.sort.height' },
];

/** Field selector + ascending/descending toggle that orders the file grid. */
export const MediaSortControl: React.FC<MediaSortControlProps> = ({
  sortKey,
  sortDir,
  onSortKeyChange,
  onSortDirChange,
}) => {
  const intl = useIntl();
  const ascending = sortDir === 'asc';
  const dirLabel = intl.formatMessage({
    id: ascending ? 'page.media.sort.ascending' : 'page.media.sort.descending',
  });

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <TextField
        select
        size="small"
        value={sortKey}
        onChange={(event) => onSortKeyChange(event.target.value as FileSortKey)}
        label={intl.formatMessage({ id: 'page.media.sort.label' })}
        sx={{ minWidth: 140 }}
      >
        {SORT_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <FormattedMessage id={option.labelId} />
          </MenuItem>
        ))}
      </TextField>
      <Tooltip title={dirLabel}>
        <IconButton
          size="small"
          aria-label={dirLabel}
          onClick={() => onSortDirChange(ascending ? 'desc' : 'asc')}
        >
          {ascending ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};
