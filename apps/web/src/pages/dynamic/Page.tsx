import React from 'react';
import type { PageConfiguration } from '@simple-site/interfaces';
import { sectionScope } from '@simple-site/interfaces';
import { Box } from '@mui/material';
import { PageSection } from './PageSection';

export const Page: React.FC<PageConfiguration> = ({ pageName, sections }) => {
  return (
    <Box>
      {sections.map((section) => {
        const { sectionName, ...sectionProps } = section;
        // Scope keys by page (same convention the admin key extractor uses).
        const sectionKey = sectionScope(pageName, sectionName);
        return <PageSection key={sectionKey} sectionName={sectionKey} {...sectionProps} />;
      })}
    </Box>
  );
};
