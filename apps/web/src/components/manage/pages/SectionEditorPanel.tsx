import React, { Suspense } from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import {
  type PageConfiguration,
  type SectionProps,
  type SectionType,
  sectionScope,
} from '@simple-site/interfaces';
import { Loading } from '../../Loading';
import { SECTION_REGISTRY, type SectionEditorProps } from '../../sections/registry';

interface SectionEditorPanelProps {
  page: PageConfiguration;
  sectionIndex: number | null;
  onChangeSection: (index: number, next: SectionProps<SectionType>) => void;
}

/**
 * Right panel: renders the editor for the currently-selected section (one at a
 * time), dispatched through the section registry. Empty state when nothing is
 * selected.
 */
export const SectionEditorPanel: React.FC<SectionEditorPanelProps> = ({ page, sectionIndex, onChangeSection }) => {
  if (sectionIndex === null || !page.sections[sectionIndex]) {
    return (
      <Box sx={{ p: 3, color: 'text.secondary', textAlign: 'center' }}>
        <Typography variant="body2">
          <FormattedMessage id="page.manage.pages.panel.empty" />
        </Typography>
      </Box>
    );
  }

  const section = page.sections[sectionIndex];
  const def = SECTION_REGISTRY[section.type];
  const Editor = def.Editor as React.ComponentType<SectionEditorProps>;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Chip size="small" icon={<def.Icon fontSize="small" />} label={<FormattedMessage id={def.labelKey} />} />
        <Typography variant="subtitle2" color="text.secondary" noWrap>
          {section.sectionName}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <Suspense fallback={<Loading />}>
        <Editor
          value={section}
          onChange={(next) => onChangeSection(sectionIndex, next)}
          pageName={sectionScope(page.pageName, section.sectionName)}
        />
      </Suspense>
    </Box>
  );
};
