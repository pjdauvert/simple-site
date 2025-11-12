import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { FormattedMessage } from 'react-intl';
import ReactMarkdown from 'react-markdown';
import type { TextSectionProps } from '../../types/section.interface';
import { useAppTheme } from '../../hooks/useTheme';


export const TextSection: React.FC<TextSectionProps> = ({ sectionName, content, design }) => {
  const { siteThemeConfig, themeConfig } = useAppTheme();
  // Determine colors: use design props if provided, otherwise fallback to theme
  const backgroundColor = design?.backgroundColor || themeConfig.backgroundColor;
  const textColor = design?.textColor || (backgroundColor === themeConfig.backgroundColor ? 'inherit' : undefined);
  
  // Determine if image should cover background or be positioned alongside content
  const isCoverImage = design?.imageUrl && design?.imageSize === 'cover';
  const isInlineImage = design?.imageUrl && !isCoverImage;
  
  // Content component
  const ContentBlock = (
    <Box sx={{ py: 4 }}>
      {content.title && (
        <Typography variant="h4" component="h2" gutterBottom>
          <FormattedMessage id={`${sectionName}.content.title`} defaultMessage={content.title} />
        </Typography>
      )}
      {content.paragraph && (
        <Box
          sx={{
            '& p': { mb: 2 },
            '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 2, mb: 1 },
            '& ul, & ol': { pl: 3, mb: 2 },
            '& a': { 
              color: themeConfig.linkColor,
              '&:hover': {
                color: themeConfig.linkHoverColor,
              },
            },
            '& code': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            },
            '& pre': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              padding: 2,
              borderRadius: 1,
              overflow: 'auto',
            }
          }}
        >
          <ReactMarkdown>{content.paragraph}</ReactMarkdown>
        </Box>
      )}
    </Box>
  );

  // Image component for inline positioning
  const ImageBlock = isInlineImage && (
    <Box
      component="img"
      src={design.imageUrl}
      alt={content.title || 'Section image'}
      sx={{
        width: '100%',
        height: 'auto',
        maxHeight: '500px',
        objectFit: design.imageSize || 'contain',
        borderRadius: 2,
      }}
    />
  );

  // Cover background image case
  if (isCoverImage) {
    return (
      <Box
        sx={{
          backgroundColor,
          color: textColor,
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${design.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: design.parallax ? 'fixed' : 'scroll',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container maxWidth={siteThemeConfig.containerMaxWidth}>
          {ContentBlock}
        </Container>
      </Box>
    );
  }

  // Inline image case (left or right positioned)
  if (isInlineImage) {
    const imageOnLeft = design.imagePosition === 'left';
    
    return (
      <Box sx={{ backgroundColor, color: textColor, py: 4 }}>
        <Container maxWidth={siteThemeConfig.containerMaxWidth}>
          <Grid container spacing={4} alignItems="center">
            {imageOnLeft && (
              <Grid size={{ xs: 12, md: 6 }}>
                {ImageBlock}
              </Grid>
            )}
            <Grid size={{ xs: 12, md: imageOnLeft || design.imagePosition === 'right' ? 6 : 12 }}>
              {ContentBlock}
            </Grid>
            {design.imagePosition === 'right' && (
              <Grid size={{ xs: 12, md: 6 }}>
                {ImageBlock}
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>
    );
  }

  // No image case
  return (
    <Box sx={{ backgroundColor, color: textColor, py: 4 }}>
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        {ContentBlock}
      </Container>
    </Box>
  );
};