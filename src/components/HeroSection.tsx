import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { PageSectionProps, PageSectionType } from '../types/page.interface';

export interface HeroSectionProps extends PageSectionProps<typeof PageSectionType.HERO> {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ name, title, subtitle, ctaLabel, ctaLink }) => {
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
      }}
    >
      <Container maxWidth="md">
        {title && (
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
            <FormattedMessage id={`${name}.title`} defaultMessage={title} />
          </Typography>
        )}
        {subtitle && (
          <Typography
            variant="h5"
            component="p"
            color="text.secondary"
            sx={{
              mb: { xs: 3, sm: 4 },
              lineHeight: 1.6,
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              px: { xs: 1, sm: 2 },
            }}
          >
            <FormattedMessage id={`${name}.subtitle`} defaultMessage={subtitle} />
          </Typography>
        )}
        {ctaLabel && ctaLink && (
          <Button
            variant="contained"
            size="large"
            href={ctaLink}
            sx={{
              px: { xs: 3, sm: 4 },
              py: { xs: 1, sm: 1.5 },
              fontSize: { xs: '1rem', sm: '1.1rem' },
            }}
          >
            <FormattedMessage id={`${name}.ctaLabel`} defaultMessage={ctaLabel} />
          </Button>
        )}
      </Container>
    </Box>
  );
};

