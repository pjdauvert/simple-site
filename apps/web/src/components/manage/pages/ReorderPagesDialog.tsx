import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { PageConfiguration } from '@simple-site/interfaces';

interface ReorderPagesDialogProps {
  open: boolean;
  pages: PageConfiguration[];
  onClose: () => void;
  onMove: (from: number, to: number) => void;
}

/** A dialog for reordering pages via up/down controls; changes apply live. */
export const ReorderPagesDialog: React.FC<ReorderPagesDialogProps> = ({ open, pages, onClose, onMove }) => {
  const intl = useIntl();
  const untitled = intl.formatMessage({ id: 'page.manage.pages.untitled' });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle><FormattedMessage id="page.manage.pages.reorder.title" /></DialogTitle>
      <DialogContent dividers>
        <List dense disablePadding>
          {pages.map((page, index) => (
            <ListItem
              key={index}
              disableGutters
              secondaryAction={
                <Stack direction="row" spacing={0}>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.moveUp' })}>
                    <span>
                      <IconButton size="small" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={intl.formatMessage({ id: 'page.manage.pages.moveUp' })}>
                        <UpIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.moveDown' })}>
                    <span>
                      <IconButton size="small" disabled={index === pages.length - 1} onClick={() => onMove(index, index + 1)} aria-label={intl.formatMessage({ id: 'page.manage.pages.moveDown' })}>
                        <DownIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              }
            >
              <ListItemText
                primary={page.menuTitle.trim() || untitled}
                secondary={page.route}
                slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}><FormattedMessage id="page.manage.pages.reorder.done" /></Button>
      </DialogActions>
    </Dialog>
  );
};
