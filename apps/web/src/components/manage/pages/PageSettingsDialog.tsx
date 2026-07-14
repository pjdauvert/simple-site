import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Tooltip } from '@mui/material';
import { DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { PageConfiguration } from '@simple-site/interfaces';
import { PageSettingsForm } from './PageSettingsForm';
import type { PageFieldErrors } from './pagesDraft';

interface PageSettingsDialogProps {
  open: boolean;
  page: PageConfiguration;
  errors: PageFieldErrors;
  showErrors: boolean;
  isHome: boolean;
  onChange: (next: PageConfiguration) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * The page's own settings (menu title, route, i18n page name) plus deletion.
 * Opened from the toolbar, and automatically when a page is created — nothing
 * persistent steals width from the preview.
 */
export const PageSettingsDialog: React.FC<PageSettingsDialogProps> = ({
  open,
  page,
  errors,
  showErrors,
  isHome,
  onChange,
  onDelete,
  onClose,
}) => {
  const intl = useIntl();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle><FormattedMessage id="page.manage.pages.settings.title" /></DialogTitle>
      <DialogContent dividers>
        <PageSettingsForm
          page={page}
          errors={errors}
          showErrors={showErrors}
          onChange={onChange}
          lockIdentity={isHome}
        />
      </DialogContent>
      <DialogActions>
        <Tooltip title={isHome ? intl.formatMessage({ id: 'page.manage.pages.homeCannotDelete' }) : ''}>
          <span style={{ marginRight: 'auto' }}>
            <Button color="error" startIcon={<DeleteIcon />} disabled={isHome} onClick={onDelete}>
              <FormattedMessage id="page.manage.pages.delete" />
            </Button>
          </span>
        </Tooltip>
        <Button variant="contained" onClick={onClose}>
          <FormattedMessage id="page.manage.pages.settings.done" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
