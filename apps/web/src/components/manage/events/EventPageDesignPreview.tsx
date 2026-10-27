import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { brandGradient } from '../../../features/theme/muiTheme';
import { aspectRatioCss, eventContrastPanelSx } from '../../../pages/events/eventDisplay';
import { DesignPreviewShell, PreviewBar } from './DesignPreviewShell';
import { spotlightSx } from './designSpotlight';
import type { EventPageDesignDraft } from './eventsDesign';

/** The event-page preview elements a field can ring — see `useDesignSpotlight`. */
export type EventPagePreviewTarget = 'imageRatio' | 'imagePlacement' | 'fullBackground';

/**
 * Symbolic skeleton of a public event page under the picked design: the
 * illustration in its ratio — above the texts or beside them, as the
 * placement says — with the name, the date/location/website lines and the
 * description as bars. With the full-background option on, the canvas
 * is painted with the (blurred) illustration and the texts move onto the same
 * contrasted panel the public page uses — the preview reads the real
 * treatment, not an approximation of it.
 */
export const EventPageDesignPreview: React.FC<{
  design: EventPageDesignDraft;
  highlight: EventPagePreviewTarget | null;
}> = ({ design, highlight }) => {
  const theme = useTheme();
  const { fullBackgroundImage } = design;
  const beside = design.imagePlacement === 'beside';
  /**
   * Props of a ringable skeleton element: its own styles plus the ring, and
   * `data-highlighted` so the state is readable (and testable) without
   * inspecting computed styles.
   */
  const ringed = (
    target: EventPagePreviewTarget,
    sx: Record<string, unknown>,
  ): { 'data-highlighted': true | undefined; sx: Record<string, unknown> } => ({
    'data-highlighted': highlight === target || undefined,
    sx: { ...sx, ...spotlightSx(highlight === target) },
  });

  // The whole canvas IS the page: it carries the full-background ring whether
  // the option is on or off, so focusing the toggle always shows what it acts on.
  return (
    <DesignPreviewShell
      testId="event-page-design-preview"
      canvasSx={spotlightSx(highlight === 'fullBackground')}
      canvasHighlighted={highlight === 'fullBackground'}
    >
      {fullBackgroundImage && (
        <Box
          data-testid="event-preview-full-background"
          sx={{
            position: 'absolute',
            inset: 0,
            // Stands for the illustration blurred into a full-page cover.
            background: brandGradient(theme),
            filter: 'blur(8px)',
            transform: 'scale(1.15)',
            opacity: 0.45,
          }}
        />
      )}
      <Box
        data-testid="event-preview-layout"
        data-image-placement={design.imagePlacement}
        {...ringed('imagePlacement', {
          position: 'relative',
          display: 'grid',
          gap: 1.5,
          // Beside: the illustration takes one column of two, as on the real
          // page. Above: one column, the texts under the illustration.
          ...(beside ? { gridTemplateColumns: '1fr 1fr', alignItems: 'start' } : {}),
        })}
      >
        <Box
          data-testid="event-preview-header-image"
          {...ringed('imageRatio', {
            aspectRatio: aspectRatioCss(design.imageAspectRatio),
            // Beside the texts the illustration fills its column; above them
            // the skeleton stays compact enough that a portrait ratio still
            // leaves the texts visible — the half-screen cap of the real page.
            width: beside ? '100%' : '55%',
            mx: 'auto',
            borderRadius: 1.5,
            bgcolor: 'action.selected',
          })}
        />
        <Box
          sx={{
            display: 'grid',
            gap: 0.75,
            alignContent: 'start',
            ...(fullBackgroundImage ? { p: 1, ...eventContrastPanelSx(theme) } : {}),
          }}
        >
          <PreviewBar width="70%" strong height={10} />
          <PreviewBar width="50%" height={4} />
          <PreviewBar width="40%" height={4} />
          <Box sx={{ height: 14, width: 56, borderRadius: 1, bgcolor: 'primary.main', my: 0.5 }} />
          <PreviewBar width="95%" height={4} />
          <PreviewBar width="90%" height={4} />
          <PreviewBar width="60%" height={4} />
        </Box>
      </Box>
    </DesignPreviewShell>
  );
};
