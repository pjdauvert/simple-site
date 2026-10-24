import { Box, Stack, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';

/**
 * Layout of a design tab: the option form, and the live preview sticky on the
 * right half once there is room for it. Mobile-first — one column, the preview
 * stacked UNDER the form (an admin on a phone still gets the preview; it is
 * the only feedback they have) and scrolling with the page rather than inside
 * its own box. From `md` up the two columns sit side by side and the preview
 * sticks below the admin AppBar (64 px) while the form scrolls.
 */
export const DesignTabLayout: React.FC<{ form: React.ReactNode; preview: React.ReactNode }> = ({
  form,
  preview,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      gap: { xs: 3, md: 4, lg: 6 },
      alignItems: 'flex-start',
      maxWidth: 1100,
    }}
  >
    {/* `width: 100%` — a column flex container with `alignItems: flex-start`
        would otherwise shrink both halves to their content width. */}
    <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
      {form}
    </Stack>
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        width: '100%',
        position: { md: 'sticky' },
        top: { md: 88 },
        alignSelf: { md: 'flex-start' },
        maxHeight: { md: 'calc(100vh - 112px)' },
        overflowY: { md: 'auto' },
      }}
    >
      {preview}
    </Box>
  </Box>
);

/**
 * A solid bar standing for a line of text in a design preview — the skeleton
 * vocabulary the gallery's preview established (solid blocks for images, bars
 * for text). `strong` reads as a heading, `tone="light"` sits on a dark strip.
 */
export const PreviewBar: React.FC<{
  width: number | string;
  strong?: boolean;
  tone?: 'default' | 'light';
  height?: number;
}> = ({ width, strong = false, tone = 'default', height }) => (
  <Box
    sx={{
      width,
      height: height ?? (strong ? 8 : 5),
      borderRadius: 4,
      bgcolor: tone === 'light' ? 'common.white' : strong ? 'text.secondary' : 'text.disabled',
      ...(tone === 'light' ? { opacity: 0.9 } : {}),
    }}
  />
);

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
