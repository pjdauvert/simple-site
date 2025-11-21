import React from 'react';
import { Box, Container, Typography, useTheme, useMediaQuery } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { FormattedMessage } from 'react-intl';
import ReactMarkdown from 'react-markdown';
import type { TextColumnContent, TextColumnDesign, TextSectionProps } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useTheme';

interface ColumnWithConfig {
  content: TextColumnContent;
  design?: TextColumnDesign;
  index: number;
}

export const TextSection: React.FC<TextSectionProps> = ({ sectionName, content, design }) => {
  const { siteThemeConfig, themeConfig } = useAppTheme();
  const muiTheme = useTheme();
  
  // Breakpoint detection for column hiding
  const isXs = useMediaQuery(muiTheme.breakpoints.only('xs'));
  const isSm = useMediaQuery(muiTheme.breakpoints.only('sm'));
  const isMd = useMediaQuery(muiTheme.breakpoints.only('md'));
  const isLg = useMediaQuery(muiTheme.breakpoints.only('lg'));
  
  const currentBreakpoint = isXs ? 'xs' : isSm ? 'sm' : isMd ? 'md' : isLg ? 'lg' : 'xl';
  
  // Determine colors: use design props if provided, otherwise fallback to theme
  const backgroundColor = design?.backgroundColor || themeConfig.backgroundColor;
  const textColor = design?.textColor || (backgroundColor === themeConfig.backgroundColor ? 'inherit' : undefined);

  
  // Multi-column mode
  const columns: ColumnWithConfig[] = content.columns.map((col, index) => ({
    content: col,
    design: design?.columnConfig?.[index],
    index,
  }));
  
  // Filter visible columns based on breakpoint
  const visibleColumns = columns.filter(col => {
    const hideOnBreakpoints = col.design?.hideOnBreakpoints || [];
    return !hideOnBreakpoints.includes(currentBreakpoint);
  });
  
  // Calculate column layout
  const columnLayout = design?.columnLayout || [1];
  const visibleLayout = getVisibleLayout(columnLayout, columns, visibleColumns);
  
  // Section background
  const sectionBackgroundStyle: React.CSSProperties = {};
  if (design?.backgroundUrl) {
    sectionBackgroundStyle.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${design.backgroundUrl})`;
    sectionBackgroundStyle.backgroundSize = 'cover';
    sectionBackgroundStyle.backgroundPosition = 'center';
    sectionBackgroundStyle.backgroundAttachment = design.parallax ? 'fixed' : 'scroll';
  }
  
  return (
    <Box 
      sx={{ 
        backgroundColor, 
        color: textColor, 
        py: 4,
        ...sectionBackgroundStyle,
      }}
    >
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        <Grid container spacing={4}>
          {visibleColumns.map((col, visibleIndex) => {
            const gridSize = visibleLayout[visibleIndex];
            return (
              <Grid 
                key={col.index} 
                size={{ xs: 12, md: gridSize }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: getTextVerticalAlign(col.design?.textVerticalAlign),
                }}
              >
                {renderColumn(col, sectionName)}
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
  
  // Helper: Get alignment for text vertical align
  function getTextVerticalAlign(align?: string): string {
    switch (align) {
      case 'center':
        return 'center';
      case 'bottom':
        return 'flex-end';
      case 'stretch':
        return 'stretch';
      case 'top':
      default:
        return 'flex-start';
    }
  }
  
  // Helper: Calculate visible layout (redistribute ratios)
  function getVisibleLayout(
    layout: number[], 
    _allColumns: ColumnWithConfig[], 
    visibleCols: ColumnWithConfig[]
  ): number[] {
    const visibleIndices = visibleCols.map(c => c.index);
    const visibleRatios = layout.filter((_, index) => visibleIndices.includes(index));
    const totalRatio = visibleRatios.reduce((sum, ratio) => sum + ratio, 0);
    
    // Convert ratios to MUI Grid sizes (out of 12)
    return visibleRatios.map(ratio => Math.round((ratio / totalRatio) * 12));
  }
  
  // Render individual column
  function renderColumn(col: ColumnWithConfig, sectionName: string) {
    const { content, design, index } = col;
    const media = design?.media;
    const mediaPosition = media?.position || 'contain';
    
    // If media is cover, render as background with text overlay
    if (media && mediaPosition === 'cover') {
      const coverImageUrl = `${media.url}?tr=w-1200,q-80,f-auto`;
      return (
        <Box
          sx={{
            backgroundImage: `url(${coverImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: getMediaVerticalPosition(media.verticalAlign),
            borderRadius: 2,
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: getTextVerticalAlign(design?.textVerticalAlign),
            p: 3,
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {renderColumnContent(content, index, sectionName, design)}
        </Box>
      );
    }
    
    // If media is contain, render media above text
    if (media && mediaPosition === 'contain') {
      return (
        <>
          {renderMedia(media)}
          {renderColumnContent(content, index, sectionName, design)}
        </>
      );
    }
    
    // No media, just content
    return renderColumnContent(content, index, sectionName, design);
  }
  
  // Get background position based on media vertical alignment
  function getMediaVerticalPosition(align?: string): string {
    switch (align) {
      case 'top':
        return 'top';
      case 'bottom':
        return 'bottom';
      case 'middle':
      default:
        return 'center';
    }
  }
  
  // Render media (image) when size is 'contain'
  function renderMedia(media: NonNullable<TextColumnDesign['media']>) {
    const mediaHorizontalAlign = media.horizontalAlign || 'left';
    
    // Determine alignment CSS
    const getAlignmentStyle = () => {
      switch (mediaHorizontalAlign) {
        case 'center':
          return { marginLeft: 'auto', marginRight: 'auto', display: 'block' };
        case 'right':
          return { marginLeft: 'auto', display: 'block' };
        case 'left':
        default:
          return { marginRight: 'auto', display: 'block' };
      }
    };
    
    // Extract dimensions for ImageKit transformation
    const maxHeight = media.maxHeight ? parseInt(media.maxHeight) : 400;
    const maxWidth = media.maxWidth ? parseInt(media.maxWidth) : null;
    
    // Build ImageKit transformation
    let transformations = 'q-80,f-auto';
    if (maxWidth) {
      transformations += `,w-${maxWidth * 2}`; // 2x for retina
    } else {
      transformations += `,h-${maxHeight * 2}`; // 2x for retina
    }
    
    const optimizedImageUrl = `${media.url}?tr=${transformations}`;
    
    return (
      <Box
        component="img"
        src={optimizedImageUrl}
        alt="Column media"
        sx={{
          width: '100%',
          height: 'auto',
          maxHeight: media.maxHeight || '400px',
          maxWidth: media.maxWidth || undefined,
          objectFit: 'contain',
          borderRadius: 2,
          mb: 2,
          ...getAlignmentStyle(),
        }}
      />
    );
  }
  
  // Render column content (title + paragraph)
  function renderColumnContent(content: TextColumnContent, index: number, sectionName: string, design?: TextColumnDesign) {
    return (
      <Box sx={{ textAlign: design?.textHorizontalAlign || 'left' }}>
        {content.title && (
          <Typography variant="h4" component="h2" gutterBottom>
            <FormattedMessage 
              id={`${sectionName}.content.columns.${index}.title`} 
              defaultMessage={content.title} 
            />
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
            <FormattedMessage 
              id={`${sectionName}.content.columns.${index}.paragraph`} 
              defaultMessage={content.paragraph}
            >
              {(message) => <ReactMarkdown>{String(message)}</ReactMarkdown>}
            </FormattedMessage>
          </Box>
        )}
      </Box>
    );
  }
};
