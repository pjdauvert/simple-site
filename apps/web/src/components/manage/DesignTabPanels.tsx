import { Box, Stack } from '@mui/material';

/**
 * The two bricks every admin **design tab** is built from — the two-column
 * layout, and the bar that stands for a line of text in a skeleton preview.
 *
 * They carry nothing feature-specific on purpose: the gallery's design tab and
 * the two events ones are the same screen with different options, and when
 * each owned its own copy they drifted — most visibly on a phone, where one
 * hid its preview and the other stacked it.
 */

/**
 * Layout of a design tab: the option form, and the live preview sticky beside
 * it from `md` up.
 *
 * The preview is **desktop-only**. It is a symbolic skeleton — not the real
 * thing — so on a phone it would push the options the admin came to change
 * below a screenful of decoration, for feedback a reader has to decode anyway.
 * Every option states its meaning in its own label and help text; the preview
 * never carries information the form does not.
 *
 * From `md` up the two columns sit side by side and the preview sticks under
 * the admin AppBar (64 px) while the long options column scrolls; a taller
 * skeleton scrolls inside its own box rather than overflowing the viewport.
 */
export const DesignTabLayout: React.FC<{ form: React.ReactNode; preview: React.ReactNode }> = ({
  form,
  preview,
}) => (
  <Box
    sx={{
      display: 'flex',
      gap: { md: 4, lg: 6 },
      alignItems: 'flex-start',
      maxWidth: 1100,
    }}
  >
    {/* `width: 100%` — a flex container with `alignItems: flex-start` would
        otherwise shrink the column to its content width. */}
    <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
      {form}
    </Stack>
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: { xs: 'none', md: 'block' },
        position: 'sticky',
        top: 88,
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 112px)',
        overflowY: 'auto',
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
