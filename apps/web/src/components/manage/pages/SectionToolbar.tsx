import { Chip, IconButton, Stack, Tooltip } from '@mui/material';
import {
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  DeleteOutline as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';

interface SectionToolbarProps {
  /** Section-type icon (from the registry definition). */
  icon: React.ElementType;
  /** i18n key for the section-type label. */
  labelKey: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

/**
 * Floating controls for the selected section (type chip + edit / reorder / delete),
 * anchored to the bottom-right of the section content. Shown only while the section
 * is selected; its `position: absolute` needs a relative ancestor.
 */
export const SectionToolbar: React.FC<SectionToolbarProps> = ({
  icon: Icon,
  labelKey,
  canMoveUp,
  canMoveDown,
  onEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => {
  const intl = useIntl();
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  const label = (id: string) => intl.formatMessage({ id });

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        zIndex: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 2,
        p: 0.25,
      }}
    >
      <Chip size="small" icon={<Icon fontSize="small" />} label={<FormattedMessage id={labelKey} />} />
      <Tooltip title={label('page.manage.pages.section.edit')}>
        <IconButton size="small" onClick={stop(onEdit)} aria-label={label('page.manage.pages.section.edit')}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={label('page.manage.pages.section.moveUp')}>
        <span>
          <IconButton size="small" disabled={!canMoveUp} onClick={stop(onMoveUp)} aria-label={label('page.manage.pages.section.moveUp')}>
            <UpIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={label('page.manage.pages.section.moveDown')}>
        <span>
          <IconButton size="small" disabled={!canMoveDown} onClick={stop(onMoveDown)} aria-label={label('page.manage.pages.section.moveDown')}>
            <DownIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={label('page.manage.pages.section.delete')}>
        <IconButton size="small" color="error" onClick={stop(onRemove)} aria-label={label('page.manage.pages.section.delete')}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};
