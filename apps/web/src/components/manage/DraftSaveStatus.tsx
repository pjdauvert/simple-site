import { Box, Fade, Paper, Typography } from '@mui/material';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { FormattedMessage } from 'react-intl';
import { Loader } from '../Loader';
import type { DraftSaveState } from '../../hooks/useDraftAutoSave';

/** Reserved for the floating indicator, so it never shifts the form. */
const ROW_HEIGHT = 48;

/**
 * The auto-save indicator every DRAFT-backed admin form renders in place of a
 * save button: edits are written on their own (see `useDraftAutoSave`), so the
 * admin only needs to know where the write stands. It sits bottom-right of the
 * editor column, lets clicks through, and says nothing while there is nothing
 * to report.
 */
export const DraftSaveStatus: React.FC<DraftSaveState> = ({ status, error }) => (
  <Box
    sx={{
      position: 'sticky',
      bottom: 0,
      height: ROW_HEIGHT,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      pointerEvents: 'none',
      mt: 2,
    }}
  >
    <Fade in={status !== 'idle'}>
      <Paper
        elevation={2}
        role="status"
        aria-live="polite"
        sx={{
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 999,
          color: status === 'error' ? 'error.main' : 'text.secondary',
        }}
      >
        {status === 'saving' || status === 'pending' ? (
          <Loader variant="triskelion" size={18} />
        ) : status === 'error' ? (
          <ErrorOutlineIcon fontSize="small" />
        ) : (
          <CloudDoneOutlinedIcon fontSize="small" color="success" />
        )}
        <Typography variant="caption">
          {status === 'error' ? (
            <FormattedMessage id="page.manage.autoSave.error" values={{ reason: error ?? '' }} />
          ) : status === 'saved' ? (
            <FormattedMessage id="page.manage.autoSave.saved" />
          ) : (
            <FormattedMessage id="page.manage.autoSave.saving" />
          )}
        </Typography>
      </Paper>
    </Fade>
  </Box>
);
