import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { FormattedMessage } from 'react-intl';
import type { HeroSectionProps } from '@simple-site/interfaces';
import type { ZoneStyle } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useAppTheme';

function zoneStyle(zone?: ZoneStyle): React.CSSProperties | undefined {
  if (!zone?.style && !zone?.cssVars) return undefined;
  return { ...zone?.style, ...zone?.cssVars } as React.CSSProperties;
}

function getFlexAlign(align?: string): string {
  switch (align) {
    case 'top':    return 'flex-start';
    case 'bottom': return 'flex-end';
    case 'stretch': return 'stretch';
    case 'middle':
    default:       return 'center';
  }
}

function getJustify(align?: string): string {
  switch (align) {
    case 'left':  return 'flex-start';
    case 'right': return 'flex-end';
    case 'span':  return 'stretch';
    case 'center':
    default:      return 'center';
  }
}

export const HeroSection: React.FC<HeroSectionProps> = ({ sectionName, content, design }) => {
  const { siteThemeConfig, themeConfig } = useAppTheme();
  const backgroundColor = design?.backgroundColor || themeConfig.backgroundColor;
  const textColor = design?.textColor || (backgroundColor === themeConfig.backgroundColor ? 'inherit' : undefined);

  const isSplit = design?.layout === 'split';

  if (isSplit) {
    const [leftRatio, rightRatio] = design?.columnLayout ?? [1.1, 1];
    const total     = leftRatio + rightRatio;
    const leftSize  = Math.round((leftRatio  / total) * 12);
    const rightSize = Math.round((rightRatio / total) * 12);
    const artworkSide = design?.artworkSide ?? 'right';
    const artwork = design?.artwork;

    const contentPane = (
      <Grid
        size={{ xs: 12, md: leftSize }}
        sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        style={zoneStyle(design?.contentStyle)}
      >
        {content.title && (
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, mb: { xs: 2, sm: 3 }, fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}
          >
            <FormattedMessage id={`${sectionName}.content.title`} defaultMessage={content.title} />
          </Typography>
        )}
        {content.subtitle && (
          <Typography
            variant="body1"
            component="p"
            sx={{ mb: { xs: 3, sm: 4 }, fontSize: { xs: '1rem', md: '1.0625rem' }, maxWidth: '44ch', color: textColor }}
          >
            <FormattedMessage id={`${sectionName}.content.subtitle`} defaultMessage={content.subtitle} />
          </Typography>
        )}
        {content.ctaButtons && content.ctaButtons.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: content.featuringItems?.length ? { xs: 3, sm: 4 } : 0 }}>
            {content.ctaButtons.map((cta, i) => (
              <Button
                key={i}
                variant={cta.variant ?? 'contained'}
                size="large"
                href={cta.link}
                sx={{ px: { xs: 3, sm: 4 }, py: { xs: 1, sm: 1.5 } }}
              >
                <FormattedMessage id={`${sectionName}.content.ctaButtons.${i}.label`} defaultMessage={cta.label} />
              </Button>
            ))}
          </Box>
        )}
        {content.featuringItems && content.featuringItems.length > 0 && (
          <Box
            sx={{
              display: 'flex', gap: 3.5, flexWrap: 'wrap',
              pt: 3, borderTop: `1px solid`, borderColor: 'divider',
            }}
          >
            {content.featuringItems.map((item, i) => (
              <Box key={i}>
                <Typography variant="caption" sx={{ display: 'block', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
                  <FormattedMessage id={`${sectionName}.content.featuringItems.${i}.label`} defaultMessage={item.label} />
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  <FormattedMessage id={`${sectionName}.content.featuringItems.${i}.value`} defaultMessage={item.value} />
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Grid>
    );

    const artworkPane = artwork ? (
      <Grid
        size={{ xs: 12, md: rightSize }}
        sx={{ display: 'flex', alignItems: getFlexAlign(artwork.verticalAlign), justifyContent: getJustify(artwork.horizontalAlign) }}
        style={zoneStyle(design?.artworkStyle)}
      >
        <Box
          component="img"
          src={artwork.imageUrl}
          alt={artwork.alt ?? ''}
          style={zoneStyle(artwork.imageStyle)}
          sx={{ maxWidth: '100%', height: 'auto', display: 'block' }}
        />
      </Grid>
    ) : (
      <Grid size={{ xs: 12, md: rightSize }} style={zoneStyle(design?.artworkStyle)} />
    );

    return (
      <Box
        sx={{ py: { xs: 6, sm: 8, md: 10 }, px: { xs: 2, sm: 3 }, backgroundColor, color: textColor }}
        style={zoneStyle(design?.sectionStyle)}
      >
        <Container maxWidth={siteThemeConfig.containerMaxWidth}>
          <Grid container spacing={7} alignItems="center">
            {artworkSide === 'right' ? (
              <>{contentPane}{artworkPane}</>
            ) : (
              <>{artworkPane}{contentPane}</>
            )}
          </Grid>
        </Container>
      </Box>
    );
  }

  // Centered layout (default)
  return (
    <Box
      sx={{
        minHeight: { xs: '50vh', sm: '55vh', md: '60vh' },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        py: { xs: 4, sm: 6, md: 8 },
        px: { xs: 2, sm: 3 },
        backgroundColor, color: textColor,
      }}
      style={zoneStyle(design?.sectionStyle)}
    >
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        {content.title && (
          <Typography
            variant="h2" component="h1" gutterBottom
            sx={{ fontWeight: 700, mb: { xs: 2, sm: 3 }, fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' } }}
          >
            <FormattedMessage id={`${sectionName}.content.title`} defaultMessage={content.title} />
          </Typography>
        )}
        {content.subtitle && (
          <Typography
            variant="h5" component="p" color={textColor}
            sx={{ mb: { xs: 3, sm: 4 }, lineHeight: 1.6, fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }, px: { xs: 1, sm: 2 } }}
          >
            <FormattedMessage id={`${sectionName}.content.subtitle`} defaultMessage={content.subtitle} />
          </Typography>
        )}
        {content.ctaButtons && content.ctaButtons.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {content.ctaButtons.map((cta, i) => (
              <Button
                key={i}
                variant={cta.variant ?? 'contained'}
                size="large"
                href={cta.link}
                sx={{ px: { xs: 3, sm: 4 }, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '1rem', sm: '1.1rem' } }}
              >
                <FormattedMessage id={`${sectionName}.content.ctaButtons.${i}.label`} defaultMessage={cta.label} />
              </Button>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
};
