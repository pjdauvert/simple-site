import React from 'react';
import { Box, Container, Typography, useTheme, useMediaQuery } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { FormattedMessage } from 'react-intl';
import ReactMarkdown from 'react-markdown';
import type { TextColumnContent, TextColumnDesign, TextSectionProps } from '../../types/sections/text.section.interface';
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
                  justifyContent: getAlignItems(col.design?.verticalAlign),
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
  
  // Helper: Get alignment for vertical align
  function getAlignItems(align?: string): string {
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
    const hasImage = design?.imageUrl;
    const imagePosition = design?.imagePosition || 'top';
    
    // If image is background, render differently
    if (hasImage && imagePosition === 'background') {
      return (
        <Box
          sx={{
            backgroundImage: `url(${design.imageUrl})`,
            backgroundSize: design.imageSize || 'cover',
            backgroundPosition: 'center',
            borderRadius: 2,
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            p: 3,
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {renderColumnContent(content, index, sectionName)}
        </Box>
      );
    }
    
    // Image and content positioning
    const imageBlock = hasImage ? renderImage(design) : null;
    const contentBlock = renderColumnContent(content, index, sectionName);
    
    if (!hasImage) {
      return contentBlock;
    }
    
    // Layout based on image position
    switch (imagePosition) {
      case 'top':
        return (
          <>
            {imageBlock}
            {contentBlock}
          </>
        );
      case 'bottom':
        return (
          <>
            {contentBlock}
            {imageBlock}
          </>
        );
      case 'left':
        return (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flex: '0 0 40%' }}>{imageBlock}</Box>
            <Box sx={{ flex: '1' }}>{contentBlock}</Box>
          </Box>
        );
      case 'right':
        return (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flex: '1' }}>{contentBlock}</Box>
            <Box sx={{ flex: '0 0 40%' }}>{imageBlock}</Box>
          </Box>
        );
      default:
        return (
          <>
            {imageBlock}
            {contentBlock}
          </>
        );
    }
  }
  
  // Render column image
  function renderImage(design: TextColumnDesign) {
    if (!design.imageUrl) return null;
    
    const aspectRatio = design.imageAspectRatio || 'auto';
    
    return (
      <Box
        component="img"
        src={design.imageUrl}
        alt="Column image"
        sx={{
          width: '100%',
          height: 'auto',
          aspectRatio: aspectRatio !== 'auto' ? aspectRatio : undefined,
          maxHeight: aspectRatio === 'auto' ? '400px' : undefined,
          objectFit: design.imageSize || 'contain',
          borderRadius: 2,
          mb: 2,
        }}
      />
    );
  }
  
  // Render column content (title + paragraph)
  function renderColumnContent(content: TextColumnContent, index: number, sectionName: string) {
    return (
      <Box>
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
