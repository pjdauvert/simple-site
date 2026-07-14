import React from 'react';
import { Box, Container, Typography, useTheme, useMediaQuery } from '@mui/material';
import Grid from '@mui/material/Grid2';
import type { TextColumnContent, TextColumnDesign, TextSectionProps } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useAppTheme';
import { EditableText } from './EditableText';
import { EditableImage } from './EditableImage';
import { EditableMarkdown } from './EditableMarkdown';
import { useSlotVisible } from './sectionEdit';

const VERT_ALIGN: Record<string, string> = { center: 'center', bottom: 'flex-end', stretch: 'stretch' };
const MEDIA_VERT: Record<string, string> = { top: 'top', bottom: 'bottom' };
const IMG_JUSTIFY: Record<string, string> = { center: 'auto auto', right: 'auto 0' };

function getVisibleLayout(layout: number[], allCount: number, visibleIndices: number[]): number[] {
  const visibleRatios = layout.filter((_, i) => i < allCount && visibleIndices.includes(i));
  const total = visibleRatios.reduce((s, r) => s + r, 0);
  return visibleRatios.map(r => Math.round((r / total) * 12));
}


export const TextSection: React.FC<TextSectionProps> = ({ sectionName, content, design }) => {
  const { siteThemeConfig, themeConfig } = useAppTheme();
  const muiTheme = useTheme();
  // Publicly an empty field renders nothing; while editing inline, empty slots
  // still render so they can be filled in place.
  const showSlot = useSlotVisible();

  const isXs = useMediaQuery(muiTheme.breakpoints.only('xs'));
  const isSm = useMediaQuery(muiTheme.breakpoints.only('sm'));
  const isMd = useMediaQuery(muiTheme.breakpoints.only('md'));
  const isLg = useMediaQuery(muiTheme.breakpoints.only('lg'));
  const currentBreakpoint = isXs ? 'xs' : isSm ? 'sm' : isMd ? 'md' : isLg ? 'lg' : 'xl';

  const backgroundColor = design?.backgroundColor || themeConfig.backgroundColor;
  const textColor = design?.textColor || (backgroundColor === themeConfig.backgroundColor ? 'inherit' : undefined);

  const columnLayout = design?.columnLayout ?? [1];

  const visibleIndices = content.columns
    .map((_, i) => i)
    .filter(i => !design?.columnConfig?.[i]?.hideOnBreakpoints?.includes(currentBreakpoint));

  const gridSizes = getVisibleLayout(columnLayout, content.columns.length, visibleIndices);

  function renderColumnContent(col: TextColumnContent, index: number, colDesign?: TextColumnDesign) {
    return (
      <Box sx={{ textAlign: colDesign?.textHorizontalAlign ?? 'left' }}>
        {showSlot(col.title) && (
          <Typography variant="h4" component="h2" gutterBottom>
            <EditableText sectionName={sectionName} path={`columns.${index}.title`} value={col.title} multiline />
          </Typography>
        )}
        {showSlot(col.paragraph) && (
          <Box sx={{
            '& p': { mb: 2 },
            '& h1,& h2,& h3,& h4,& h5,& h6': { mt: 2, mb: 1 },
            '& ul,& ol': { pl: 3, mb: 2 },
            '& a': { color: themeConfig.linkColor, '&:hover': { color: themeConfig.linkHoverColor } },
            '& code': { backgroundColor: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' },
            '& pre': { backgroundColor: 'rgba(0,0,0,0.1)', padding: 2, borderRadius: 1, overflow: 'auto' },
          }}>
            <EditableMarkdown
              sectionName={sectionName}
              path={`columns.${index}.paragraph`}
              value={col.paragraph}
            />
          </Box>
        )}
      </Box>
    );
  }

  function renderMedia(media: NonNullable<TextColumnDesign['media']>, index: number) {
    const justify = IMG_JUSTIFY[media.horizontalAlign ?? ''] ?? '0 auto 0 0';
    return (
      <EditableImage
        designPath={`columnConfig.${index}.media.url`}
        src={media.url}
        alt="Column media"
        sx={{
          width: '100%', height: 'auto', display: 'block',
          maxHeight: media.maxHeight ?? '400px',
          maxWidth: media.maxWidth ?? undefined,
          objectFit: 'contain', borderRadius: 2, mb: 2,
          margin: justify,
        }}
      />
    );
  }

  function renderColumn(index: number, visibleIndex: number) {
    const col = content.columns[index];
    const colDesign = design?.columnConfig?.[index];
    const media = colDesign?.media;
    const gridSize = gridSizes[visibleIndex];

    return (
      <Grid key={index} size={{ xs: 12, md: gridSize }}
        sx={{ display: 'flex', flexDirection: 'column', justifyContent: VERT_ALIGN[colDesign?.textVerticalAlign ?? ''] ?? 'flex-start' }}>
        {media?.position === 'cover' ? (
          <Box sx={{
            backgroundImage: `url(${media.url})`,
            backgroundSize: 'cover',
            backgroundPosition: MEDIA_VERT[media.verticalAlign ?? ''] ?? 'center',
            borderRadius: 2, minHeight: '300px',
            display: 'flex', flexDirection: 'column',
            justifyContent: VERT_ALIGN[colDesign?.textVerticalAlign ?? ''] ?? 'flex-start',
            p: 3, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}>
            {renderColumnContent(col, index, colDesign)}
          </Box>
        ) : (
          <>
            {media && renderMedia(media, index)}
            {renderColumnContent(col, index, colDesign)}
          </>
        )}
      </Grid>
    );
  }

  return (
    <Box id={sectionName} component="section"
      sx={{
        backgroundColor, color: textColor, py: 4,
        ...(design?.backgroundUrl && {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url(${design.backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: design.parallax ? 'fixed' : 'scroll',
        }),
      }}>
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        <Grid container spacing={4}>
          {visibleIndices.map((colIndex, visibleIndex) => renderColumn(colIndex, visibleIndex))}
        </Grid>
      </Container>
    </Box>
  );
};
