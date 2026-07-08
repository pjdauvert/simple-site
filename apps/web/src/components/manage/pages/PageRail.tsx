import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { PageConfiguration } from '@simple-site/interfaces';
import type { PageFieldErrors } from './pagesDraft';

interface PageRailProps {
  pages: PageConfiguration[];
  errors: PageFieldErrors[];
  showErrors: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

/** Left rail of the Pages editor: the list of pages with add / remove / reorder / select. */
export const PageRail: React.FC<PageRailProps> = ({
  pages,
  errors,
  showErrors,
  selectedIndex,
  onSelect,
  onAdd,
  onRemove,
  onMove,
}) => {
  const intl = useIntl();
  const untitled = intl.formatMessage({ id: 'page.manage.pages.untitled' });

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, mb: 0.5 }}>
        <FormattedMessage id="page.manage.pages.rail.title" />
      </Typography>

      {pages.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
          <FormattedMessage id="page.manage.pages.empty" />
        </Typography>
      )}

      <List dense disablePadding>
        {pages.map((page, index) => {
          const hasError = showErrors && Boolean(errors[index]?.route || errors[index]?.pageName);
          return (
            <ListItem
              key={index}
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={0}>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.moveUp' })}>
                    <span>
                      <IconButton
                        size="small"
                        edge="end"
                        disabled={index === 0}
                        onClick={(e) => { e.stopPropagation(); onMove(index, index - 1); }}
                        aria-label={intl.formatMessage({ id: 'page.manage.pages.moveUp' })}
                      >
                        <UpIcon fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.moveDown' })}>
                    <span>
                      <IconButton
                        size="small"
                        edge="end"
                        disabled={index === pages.length - 1}
                        onClick={(e) => { e.stopPropagation(); onMove(index, index + 1); }}
                        aria-label={intl.formatMessage({ id: 'page.manage.pages.moveDown' })}
                      >
                        <DownIcon fontSize="inherit" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.delete' })}>
                    <IconButton
                      size="small"
                      edge="end"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                      aria-label={intl.formatMessage({ id: 'page.manage.pages.delete' })}
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              }
            >
              <ListItemButton selected={index === selectedIndex} onClick={() => onSelect(index)}>
                <ListItemText
                  primary={page.menuTitle.trim() || untitled}
                  secondary={page.route}
                  slotProps={{
                    primary: { color: hasError ? 'error' : undefined, noWrap: true },
                    secondary: { noWrap: true },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ px: 1, mt: 1 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={onAdd} fullWidth>
          <FormattedMessage id="page.manage.pages.add" />
        </Button>
      </Box>
    </Box>
  );
};
