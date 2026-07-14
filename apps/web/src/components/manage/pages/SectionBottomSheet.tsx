import React, { Suspense, useState } from 'react';
import { Box, Chip, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import {
  Close as CloseIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  type PageConfiguration,
  type SectionProps,
  type SectionType,
  sectionScope,
} from '@simple-site/interfaces';
import { Loading } from '../../Loading';
import { SECTION_REGISTRY, type SectionEditorProps } from '../../sections/registry';

interface SectionBottomSheetProps {
  page: PageConfiguration;
  sectionIndex: number;
  onChangeSection: (index: number, next: SectionProps<SectionType>) => void;
  onClose: () => void;
}

/**
 * Design & structure for the selected section, docked under the preview.
 *
 * Content (text, images) is edited in place on the rendered section; everything
 * that has no place on the canvas — layout, colours, breakpoints, media options,
 * add/remove of repeatable items — lives here. Being full-width (rather than a
 * narrow drawer) lets a multi-column section lay its columns out side by side.
 */
export const SectionBottomSheet: React.FC<SectionBottomSheetProps> = ({
  page,
  sectionIndex,
  onChangeSection,
  onClose,
}) => {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(true);

  const section = page.sections[sectionIndex];
  if (!section) return null;

  const def = SECTION_REGISTRY[section.type];
  const Editor = def.Editor as React.ComponentType<SectionEditorProps>;
  const toggleLabel = intl.formatMessage({
    id: expanded ? 'page.manage.pages.sheet.collapse' : 'page.manage.pages.sheet.expand',
  });

  return (
    <Paper
      variant="outlined"
      sx={{ position: 'sticky', bottom: 0, zIndex: 3, mt: 2, borderRadius: 2, overflow: 'hidden', boxShadow: 8 }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1, bgcolor: 'action.hover' }}>
        <Chip size="small" icon={<def.Icon fontSize="small" />} label={<FormattedMessage id={def.labelKey} />} />
        <Typography variant="subtitle2" color="text.secondary" noWrap sx={{ flexGrow: 1 }}>
          {section.sectionName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, mr: 1 }}>
          <FormattedMessage id="page.manage.pages.sheet.hint" />
        </Typography>
        <Tooltip title={toggleLabel}>
          <IconButton size="small" onClick={() => setExpanded((e) => !e)} aria-label={toggleLabel}>
            {expanded ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.sheet.close' })}>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label={intl.formatMessage({ id: 'page.manage.pages.sheet.close' })}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ p: 2, maxHeight: '45vh', overflowY: 'auto' }}>
          <Suspense fallback={<Loading />}>
            <Editor
              value={section}
              onChange={(next) => onChangeSection(sectionIndex, next)}
              pageName={sectionScope(page.pageName, section.sectionName)}
            />
          </Suspense>
        </Box>
      </Collapse>
    </Paper>
  );
};
