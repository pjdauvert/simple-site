import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { Loader } from '../Loader';
import type { UploadProgress } from './types';

interface UploadProgressPanelProps {
  uploads: UploadProgress[];
  onCancel: (upload: UploadProgress) => void;
  onRetry: (upload: UploadProgress) => void;
  onDismiss: () => void;
}

/**
 * Framed panel of in-progress uploads — one framed row per file with a
 * determinate progress ring and a status action (cancel while uploading, a
 * success check when done, retry on failure/cancel). A dismiss button appears
 * once every row has reached a final state. Renders nothing when empty.
 */
export const UploadProgressPanel: React.FC<UploadProgressPanelProps> = ({
  uploads,
  onCancel,
  onRetry,
  onDismiss,
}) => {
  const intl = useIntl();
  if (uploads.length === 0) return null;

  const allFinal = uploads.every((u) => u.status !== 'uploading');

  return (
    <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      {uploads.map((upload) => (
        <Box
          key={upload.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            '&:not(:last-of-type)': { mb: 1 },
          }}
        >
          <Loader variant="determinate" progress={upload.percent} size={44} />
          <Typography variant="body2" noWrap title={upload.name} sx={{ flexGrow: 1, minWidth: 0 }}>
            {upload.name}
          </Typography>
          {upload.status === 'uploading' && (
            <Tooltip title={intl.formatMessage({ id: 'page.media.cancelUpload' })}>
              <IconButton
                size="small"
                aria-label={intl.formatMessage({ id: 'page.media.cancelUpload' })}
                onClick={() => onCancel(upload)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {upload.status === 'success' && (
            <CheckCircleIcon
              color="success"
              fontSize="small"
              titleAccess={intl.formatMessage({ id: 'page.media.uploadSuccess' })}
            />
          )}
          {(upload.status === 'error' || upload.status === 'canceled') && (
            <Tooltip title={intl.formatMessage({ id: 'page.media.retry' })}>
              <IconButton
                size="small"
                aria-label={intl.formatMessage({ id: 'page.media.retry' })}
                onClick={() => onRetry(upload)}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ))}
      {allFinal && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button size="small" onClick={onDismiss}>
            <FormattedMessage id="page.media.dismiss" />
          </Button>
        </Box>
      )}
    </Box>
  );
};
