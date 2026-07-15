import React, { Suspense, lazy } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useIntl } from 'react-intl';
import type { HeroSectionProps, ZoneStyle } from '@simple-site/interfaces';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { EditableText } from '../EditableText';
import { EditableImage } from '../EditableImage';
import { useSlotVisible, useSectionEdit } from '../sectionEdit';
import { InlineDesignPopover, InlineAddButton } from '../InlineControls';

// Admin-only design panels for the inline popovers; lazy so the public bundle
// never pulls them in (they render nothing without an editing context anyway).
const CtaDesignPanel = lazy(() => import('./HeroDesignPanels').then((m) => ({ default: m.CtaDesignPanel })));
const FeaturingDesignPanel = lazy(() => import('./HeroDesignPanels').then((m) => ({ default: m.FeaturingDesignPanel })));
const ArtworkDesignPanel = lazy(() => import('./HeroDesignPanels').then((m) => ({ default: m.ArtworkDesignPanel })));

function zoneStyle(zone?: ZoneStyle): React.CSSProperties | undefined {
  if (!zone?.style && !zone?.cssVars) return undefined;
  return { ...zone?.style, ...zone?.cssVars } as React.CSSProperties;
}

const FLEX_ALIGN: Record<string, string>   = { top: 'flex-start', bottom: 'flex-end', stretch: 'stretch', middle: 'center' };
const FLEX_JUSTIFY: Record<string, string> = { left: 'flex-start', right: 'flex-end', span: 'stretch', center: 'center' };

export const HeroSection: React.FC<HeroSectionProps> = ({ sectionName, content, design }) => {
  const { siteThemeConfig, themeConfig } = useAppTheme();
  // Publicly an empty field renders nothing; while editing inline, empty slots
  // still render so they can be filled in place.
  const showSlot = useSlotVisible();
  // Present only in the admin preview; drives the extra inline-editing chrome
  // below. All of it renders null publicly, so the public output is unchanged.
  const edit = useSectionEdit();
  const intl = useIntl();
  const t = (suffix: string) => intl.formatMessage({ id: `page.manage.pages.section.hero.${suffix}` });
  const backgroundColor = design?.backgroundColor || themeConfig.backgroundColor;
  const textColor = design?.textColor || (backgroundColor === themeConfig.backgroundColor ? 'inherit' : undefined);

  const ctaRow = (!!content.ctaButtons?.length || edit) && (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: content.featuringItems?.length ? { xs: 3, sm: 4 } : 0 }}>
      {content.ctaButtons?.map((cta, i) => (
        <Box key={i} sx={{ position: 'relative', display: 'inline-flex' }}>
          <Button variant={cta.variant ?? 'contained'} size="large" href={cta.link}
            sx={{ px: { xs: 3, sm: 4 }, py: { xs: 1, sm: 1.5 } }}>
            <EditableText sectionName={sectionName} path={`ctaButtons.${i}.label`} value={cta.label} autoWidth />
          </Button>
          <InlineDesignPopover corner="bottom-right" label={t('ctaButtons.settings')}>
            <Suspense fallback={null}><CtaDesignPanel index={i} cta={cta} /></Suspense>
          </InlineDesignPopover>
        </Box>
      ))}
      <InlineAddButton contentPath="ctaButtons" blank={{ label: '', link: '' }} label={t('ctaButtons.add')} />
    </Box>
  );

  const featuringRow = (!!content.featuringItems?.length || edit) && (
    <Box sx={{ display: 'flex', gap: 3.5, flexWrap: 'wrap', alignItems: 'flex-start', pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
      {content.featuringItems?.map((item, i) => (
        <Box key={i} sx={{ position: 'relative' }}>
          <Typography variant="caption" sx={{ display: 'block', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
            <EditableText sectionName={sectionName} path={`featuringItems.${i}.label`} value={item.label} />
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <EditableText sectionName={sectionName} path={`featuringItems.${i}.value`} value={item.value} />
          </Typography>
          <InlineDesignPopover corner="bottom-right" label={t('featuring.settings')} width={220}>
            <Suspense fallback={null}><FeaturingDesignPanel index={i} /></Suspense>
          </InlineDesignPopover>
        </Box>
      ))}
      <InlineAddButton contentPath="featuringItems" blank={{ label: '', value: '' }} label={t('featuring.add')} />
    </Box>
  );

  const isSplit = design?.layout === 'split';

  let inner: React.ReactNode;

  if (isSplit) {
    const [leftRatio, rightRatio] = design!.columnLayout ?? [1.1, 1];
    const total     = leftRatio + rightRatio;
    const leftSize  = Math.round((leftRatio  / total) * 12);
    const rightSize = Math.round((rightRatio / total) * 12);
    const artworkSide = design!.artworkSide ?? 'right';
    const artwork = design!.artwork;

    const contentPane = (
      <Grid size={{ xs: 12, md: leftSize }}
        sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        style={zoneStyle(design!.contentStyle)}>
        {showSlot(content.title) && (
          <Typography variant="h2" component="h1" gutterBottom
            sx={{ fontWeight: 700, mb: { xs: 2, sm: 3 }, fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}>
            <EditableText sectionName={sectionName} path="title" value={content.title} multiline />
          </Typography>
        )}
        {showSlot(content.subtitle) && (
          <Typography variant="body1" component="p" color={textColor}
            sx={{ mb: { xs: 3, sm: 4 }, fontSize: { xs: '1rem', md: '1.0625rem' }, maxWidth: '44ch' }}>
            <EditableText sectionName={sectionName} path="subtitle" value={content.subtitle} multiline />
          </Typography>
        )}
        {ctaRow}
        {featuringRow}
      </Grid>
    );

    const artworkPane = (
      <Grid size={{ xs: 12, md: rightSize }}
        sx={{ display: 'flex', alignItems: FLEX_ALIGN[artwork?.verticalAlign ?? ''] ?? 'center', justifyContent: FLEX_JUSTIFY[artwork?.horizontalAlign ?? ''] ?? 'center' }}
        style={zoneStyle(design!.artworkStyle)}>
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <EditableImage
            designPath="artwork.imageUrl"
            src={artwork?.imageUrl}
            alt={artwork?.alt ?? ''}
            style={zoneStyle(artwork?.imageStyle)}
            sx={{ maxWidth: '100%', height: 'auto', display: 'block' }}
          />
          <InlineDesignPopover corner="bottom-right" label={t('artwork.settings')}>
            <Suspense fallback={null}><ArtworkDesignPanel artwork={artwork} /></Suspense>
          </InlineDesignPopover>
        </Box>
      </Grid>
    );

    inner = (
      <Grid container spacing={7} alignItems="center">
        {artworkSide === 'right' ? <>{contentPane}{artworkPane}</> : <>{artworkPane}{contentPane}</>}
      </Grid>
    );
  } else {
    inner = (
      <>
        {showSlot(content.title) && (
          <Typography variant="h2" component="h1" gutterBottom
            sx={{ fontWeight: 700, mb: { xs: 2, sm: 3 }, fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' } }}>
            <EditableText sectionName={sectionName} path="title" value={content.title} multiline />
          </Typography>
        )}
        {showSlot(content.subtitle) && (
          <Typography variant="h5" component="p" color={textColor}
            sx={{ mb: { xs: 3, sm: 4 }, lineHeight: 1.6, fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }, px: { xs: 1, sm: 2 } }}>
            <EditableText sectionName={sectionName} path="subtitle" value={content.subtitle} multiline />
          </Typography>
        )}
        {ctaRow}
      </>
    );
  }

  return (
    <Box id={sectionName} component="section"
      sx={{
        ...(!isSplit && { minHeight: { xs: '50vh', sm: '55vh', md: '60vh' }, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }),
        py: isSplit ? { xs: 6, sm: 8, md: 10 } : { xs: 4, sm: 6, md: 8 },
        px: { xs: 2, sm: 3 },
        backgroundColor, color: textColor,
      }}
      style={zoneStyle(design?.sectionStyle)}>
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        {inner}
      </Container>
    </Box>
  );
};
