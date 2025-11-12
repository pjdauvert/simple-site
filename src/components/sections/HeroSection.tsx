import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { HeroSectionProps } from '../../types/section.interface';
import { useAppTheme } from '../../hooks/useTheme';


export const HeroSection: React.FC<HeroSectionProps> = ({ sectionName, content, design }) => {
  const { siteThemeConfig, themeConfig } = useAppTheme();
  // Determine colors: use design props if provided, otherwise fallback to theme
  const backgroundColor = design?.backgroundColor || themeConfig.backgroundColor;
  const textColor = design?.textColor || (backgroundColor === themeConfig.backgroundColor ? 'inherit' : undefined);
  
  return (
    <Box
      sx={{
        minHeight: { xs: '50vh', sm: '55vh', md: '60vh' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: { xs: 4, sm: 6, md: 8 },
        px: { xs: 2, sm: 3 },
        backgroundColor,
        color: textColor,
      }}
    >
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        {content.title && (
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              mb: { xs: 2, sm: 3 },
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
            }}
          >
            <FormattedMessage id={`${sectionName}.content.title`} defaultMessage={content.title} />
          </Typography>
        )}
        {content.subtitle && (
          <Typography
            variant="h5"
            component="p"
            color={textColor}
            sx={{
              mb: { xs: 3, sm: 4 },
              lineHeight: 1.6,
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              px: { xs: 1, sm: 2 },
            }}
          >
            <FormattedMessage id={`${sectionName}.content.subtitle`} defaultMessage={content.subtitle} />
          </Typography>
        )}
        {content.ctaLabel && content.ctaLink && (
          <Button
            variant="contained"
            size="large"
            href={content.ctaLink}
            sx={{
              px: { xs: 3, sm: 4 },
              py: { xs: 1, sm: 1.5 },
              fontSize: { xs: '1rem', sm: '1.1rem' },
            }}
          >
            <FormattedMessage id={`${sectionName}.content.ctaLabel`} defaultMessage={content.ctaLabel} />
          </Button>
        )}
      </Container>
    </Box>
  );
};

