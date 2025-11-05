import React from 'react';
import type { PageConfiguration } from '../types/page.interface';
import { Box } from '@mui/material';
import { PageSection } from '../layouts/PageSection';

export const Page: React.FC<PageConfiguration> = ({ sections }) => {
  return (
    <Box>
      {sections.map((section) => <PageSection key={section.name} {...section} />)}
    </Box>
  );
};
