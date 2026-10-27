import { Box, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';

/**
 * Frame shared by the events design previews: the heading, the sentence
 * telling the admin that the element being edited is ringed, and the skeleton
 * canvas itself.
 *
 * The canvas is DECORATIVE (`aria-hidden`): a symbolic skeleton conveys
 * nothing to assistive tech, so every option carries its meaning in its own
 * label and help text instead — the preview only ever repeats visually what
 * the form already says.
 */
export const DesignPreviewShell: React.FC<{
  testId: string;
  /** Extra styles of the skeleton canvas — a full background option paints it. */
  canvasSx?: Record<string, unknown>;
  /** True while the canvas ITSELF is the highlighted element (page-wide option). */
  canvasHighlighted?: boolean;
  children: React.ReactNode;
}> = ({ testId, canvasSx, canvasHighlighted, children }) => (
  <Box>
    <Typography variant="subtitle2">
      <FormattedMessage id="page.manage.events.design.preview" />
    </Typography>
    {/* body2 (14 px), not caption: this sentence explains the highlight and
        has to stay comfortably readable. */}
    <Typography variant="body2" color="text.secondary" component="p" sx={{ mb: 1 }}>
      <FormattedMessage id="page.manage.events.design.preview.hint" />
    </Typography>
    <Box
      aria-hidden
      data-testid={testId}
      data-highlighted={canvasHighlighted || undefined}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        bgcolor: 'background.default',
        ...canvasSx,
      }}
    >
      {children}
    </Box>
  </Box>
);
