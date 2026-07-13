import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import {
  ArrowBack as BackIcon,
  ChevronRight as CloseDrawerIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { PageConfiguration, SectionProps, SectionType } from '@simple-site/interfaces';
import { PageSettingsForm } from './PageSettingsForm';
import { SectionEditorPanel } from './SectionEditorPanel';
import type { PageFieldErrors } from './pagesDraft';

interface PageDrawerProps {
  page: PageConfiguration;
  selectedSection: number | null;
  errors: PageFieldErrors;
  showErrors: boolean;
  isHome: boolean;
  onChangePage: (next: PageConfiguration) => void;
  onChangeSection: (index: number, next: SectionProps<SectionType>) => void;
  onBack: () => void;
  onClose: () => void;
  onDelete: () => void;
}

/**
 * Foldable right drawer of the Pages editor. With no section selected it shows the
 * page settings and a delete action; with a section selected it shows that
 * section's editor and a back button that returns to the settings view.
 */
export const PageDrawer: React.FC<PageDrawerProps> = ({
  page,
  selectedSection,
  errors,
  showErrors,
  isHome,
  onChangePage,
  onChangeSection,
  onBack,
  onClose,
  onDelete,
}) => {
  const intl = useIntl();
  const editingSection = selectedSection !== null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
        {editingSection ? (
          <>
            <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.drawer.back' })}>
              <IconButton size="small" onClick={onBack} aria-label={intl.formatMessage({ id: 'page.manage.pages.drawer.back' })}>
                <BackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              <FormattedMessage id="page.manage.pages.drawer.editSection" />
            </Typography>
          </>
        ) : (
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            <FormattedMessage id="page.manage.pages.settings.title" />
          </Typography>
        )}
        <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.drawer.close' })}>
          <IconButton size="small" onClick={onClose} aria-label={intl.formatMessage({ id: 'page.manage.pages.drawer.close' })}>
            <CloseDrawerIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box>
        {editingSection ? (
          <SectionEditorPanel page={page} sectionIndex={selectedSection} onChangeSection={onChangeSection} />
        ) : (
          <>
            <PageSettingsForm
              page={page}
              errors={errors}
              showErrors={showErrors}
              onChange={onChangePage}
              lockIdentity={isHome}
            />
            <Box sx={{ mt: 3 }}>
              <Tooltip title={isHome ? intl.formatMessage({ id: 'page.manage.pages.homeCannotDelete' }) : ''}>
                <span>
                  <Button
                    color="error"
                    startIcon={<DeleteIcon />}
                    disabled={isHome}
                    onClick={onDelete}
                  >
                    <FormattedMessage id="page.manage.pages.delete" />
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
