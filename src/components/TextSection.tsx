import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { PageSectionProps, PageSectionType } from '../types/page.interface';

export interface TextSectionProps extends PageSectionProps<typeof PageSectionType.TEXT> {
    title?: string;
    content?: string;
    backgroundColor?: string;
    textColor?: string;
    imageUrl?: string;
}

export const TextSection: React.FC<TextSectionProps> = ({ name, title, content, backgroundColor, textColor, imageUrl }) => {
  return (
    <Box sx={{ backgroundColor, color: textColor, backgroundImage: imageUrl ? `url(${imageUrl})` : undefined, backgroundSize: imageUrl ? 'cover' : undefined, backgroundPosition: imageUrl ? 'center' : undefined }}>
      <Container maxWidth="md">
        <Typography variant="h4">
          <FormattedMessage id={`${name}.title`} defaultMessage={title} />
        </Typography>
        <Typography variant="body1">
          <FormattedMessage id={`${name}.content`} defaultMessage={content} />
        </Typography>
      </Container>
    </Box>
  );
};