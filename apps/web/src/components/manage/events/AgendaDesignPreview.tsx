import { Box } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { useTheme } from '@mui/material/styles';
import { brandGradient } from '../../../features/theme/muiTheme';
import { aspectRatioCss, eventContrastPanelSx } from '../../../pages/events/eventDisplay';
import { PreviewBar } from '../DesignTabPanels';
import { DesignPreviewShell } from './DesignPreviewShell';
import { spotlightSx } from './designSpotlight';
import type { AgendaDesignDraft, SectionTextsDraft } from './eventsDesign';

/** The agenda preview elements a field can ring — see `useDesignSpotlight`. */
export type AgendaPreviewTarget =
  | 'pastEvents'
  | 'cardRatio'
  | 'columns'
  | 'location'
  | 'backdrop'
  | 'upcomingText'
  | 'pastText';

/**
 * Symbolic skeleton of the public agenda under the picked design — solid
 * blocks for the illustrations, bars for the text lines, mirroring the real
 * rendering rules: the featured block's blurred backdrop (its poster gaining
 * a shadow when the backdrop is off, exactly like the public section), the
 * contrasted panel carrying the presentation, the card grid in the chosen
 * column count and image ratio, the card location line, and the past section
 * disappearing when the design hides it.
 *
 * The element matching the field being edited is ringed (`highlight`), so the
 * admin sees *what* an option acts on before changing it.
 */
export const AgendaDesignPreview: React.FC<{
  design: AgendaDesignDraft;
  texts: SectionTextsDraft;
  highlight: AgendaPreviewTarget | null;
}> = ({ design, texts, highlight }) => {
  const theme = useTheme();
  /**
   * Props of a ringable skeleton element: its own styles plus the ring, and
   * `data-highlighted` so the state is readable (and testable) without
   * inspecting computed styles.
   */
  const ringed = (
    target: AgendaPreviewTarget,
    sx: Record<string, unknown>,
  ): { 'data-highlighted': true | undefined; sx: Record<string, unknown> } => ({
    'data-highlighted': highlight === target || undefined,
    sx: { ...sx, ...spotlightSx(highlight === target) },
  });

  /** One agenda card: the illustration in the design's ratio, name/date on a
      frosted strip, and the location line under it when the design shows it. */
  const card = (key: number): React.ReactNode => (
    <Box key={key} sx={{ borderRadius: 1.5, overflow: 'hidden', bgcolor: 'background.paper', boxShadow: 2 }}>
      <Box
        data-testid="agenda-preview-card-image"
        {...ringed('cardRatio', {
          position: 'relative',
          aspectRatio: aspectRatioCss(design.cardAspectRatio),
          bgcolor: 'action.selected',
        })}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'grid',
            gap: 0.5,
            px: 0.75,
            py: 0.5,
            // The real strip's frosted darkening, kept symbolic.
            bgcolor: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          <PreviewBar width="70%" tone="light" height={6} />
          <PreviewBar width="45%" tone="light" height={4} />
        </Box>
      </Box>
      {design.showLocationOnCards && (
        <Box
          data-testid="agenda-preview-card-location"
          {...ringed('location', { display: 'flex', alignItems: 'center', gap: 0.5, px: 0.75, py: 0.75 })}
        >
          <PlaceOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
          <PreviewBar width="60%" height={4} />
        </Box>
      )}
    </Box>
  );

  /** A card grid in the design's desktop column count. */
  const grid = (section: 'upcoming' | 'past'): React.ReactNode => (
    <Box
      data-testid={`agenda-preview-grid-${section}`}
      {...ringed('columns', {
        display: 'grid',
        gridTemplateColumns: `repeat(${design.columns}, 1fr)`,
        gap: 1,
      })}
    >
      {Array.from({ length: design.columns }, (_, index) => card(index))}
    </Box>
  );

  /** A section's heading bar plus, when the design sets one, its intro lines. */
  const sectionText = (target: 'upcomingText' | 'pastText', header: string): React.ReactNode => (
    <Box data-testid={`agenda-preview-${target}`} {...ringed(target, { display: 'grid', gap: 0.5, mb: 1 })}>
      <PreviewBar width="45%" strong />
      {header.trim() && (
        <>
          <PreviewBar width="90%" height={4} />
          <PreviewBar width="70%" height={4} />
        </>
      )}
    </Box>
  );

  return (
    <DesignPreviewShell testId="agenda-design-preview">
      {/* Featured block — the hero: blurred backdrop (optional), poster on the
          left third, presentation on a contrasted panel. */}
      <Box
        data-testid="agenda-preview-featured"
        {...ringed('backdrop', { position: 'relative', overflow: 'hidden', borderRadius: 1.5, p: 1, mb: 2 })}
      >
        {design.showFeaturedBackdrop && (
          <Box
            data-testid="agenda-preview-backdrop"
            sx={{
              position: 'absolute',
              inset: 0,
              // Stands for the illustration blurred into a cover; without an
              // illustration the public section paints this very gradient.
              background: brandGradient(theme),
              filter: 'blur(8px)',
              transform: 'scale(1.15)',
              opacity: 0.45,
            }}
          />
        )}
        <Box sx={{ position: 'relative', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box
            sx={{
              width: '33%',
              flexShrink: 0,
              aspectRatio: aspectRatioCss('A4'),
              bgcolor: 'action.selected',
              // Mirrors the public rule: no backdrop → the poster is elevated.
              boxShadow: design.showFeaturedBackdrop ? undefined : 4,
            }}
          />
          <Box sx={{ flex: 1, display: 'grid', gap: 0.75, p: 1, ...eventContrastPanelSx(theme) }}>
            <PreviewBar width="55%" height={4} />
            <PreviewBar width="80%" strong />
            <PreviewBar width="95%" height={4} />
            <PreviewBar width="85%" height={4} />
          </Box>
        </Box>
      </Box>

      {/* Upcoming section. */}
      {sectionText('upcomingText', texts.upcomingHeader)}
      {grid('upcoming')}

      {/* Past section — gone entirely when the design hides it. */}
      {design.pastEventsMode !== 'none' && (
        <Box data-testid="agenda-preview-past" {...ringed('pastEvents', { mt: 2 })}>
          {sectionText('pastText', texts.pastHeader)}
          <Box sx={{ mb: 1 }}>
            <PreviewBar width="20%" strong height={6} />
          </Box>
          {grid('past')}
        </Box>
      )}
    </DesignPreviewShell>
  );
};
