import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { PageSectionProps, PageSectionType } from '../types/page.interface';

export interface TextSectionProps extends PageSectionProps<typeof PageSectionType.TEXT> {
    content: {
        title?: string;
        paragraph?: string;
    };
    design: {
        backgroundColor?: string;
        textColor?: string;
        imageUrl?: string;
        imagePosition?: string;
        imageSize?: string;
    };
}

export const TextSection: React.FC<TextSectionProps> = ({ sectionName, content, design }) => {
  return (
    <Box sx={{ 
      backgroundColor: design.backgroundColor,
      color: design.textColor,
      backgroundImage: design.imageUrl ? `url(${design.imageUrl})` : undefined,
      backgroundSize: design.imageSize ? design.imageSize : 'cover',
      backgroundPosition: design.imagePosition ? design.imagePosition : 'center'
      }}>
      <Container maxWidth="md">
        <Typography variant="h4">
          <FormattedMessage id={`${sectionName}.content.title`} defaultMessage={content.title} />
        </Typography>
        <Typography variant="body1">
          <FormattedMessage id={`${sectionName}.content.paragraph`} defaultMessage={content.paragraph} />
        </Typography>
      </Container>
    </Box>
  );
};