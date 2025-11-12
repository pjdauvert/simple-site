import React from 'react';
import type { PageConfiguration } from '../../types/page.interface';
import { Box } from '@mui/material';
import { PageSection } from './PageSection';

export const Page: React.FC<PageConfiguration> = ({ pageName, sections }) => {
  return (
    <Box>
      {sections.map((section) => {
        const { sectionName, ...sectionProps } = section;
        const sectionKey = `${pageName}.${sectionName}`;
        return <PageSection key={sectionKey} sectionName={sectionKey} {...sectionProps} />;
      })}
    </Box>
  );
};
