import React, { Suspense } from 'react';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
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
 * Design & structure for a section, shown inline directly below it (opened from the
 * section's floating "edit" control). Content — text, images, and per-item /
 * per-column design — is edited in place on the rendered section; this panel holds
 * the section-level design that has no place on the canvas: layout, colours,
 * background, column widths, and add/remove of columns.
 */
export const SectionBottomSheet: React.FC<SectionBottomSheetProps> = ({
  page,
  sectionIndex,
  onChangeSection,
  onClose,
}) => {
  const intl = useIntl();

  const section = page.sections[sectionIndex];
  if (!section) return null;

  const def = SECTION_REGISTRY[section.type];
  const Editor = def.Editor as React.ComponentType<SectionEditorProps>;

  return (
    // Rendered inside the selected section's card, so it reads as the section's
    // own settings footer: the selection accent continues across the top, and the
    // paper background sets the editing surface apart from the section content.
    <Box sx={{ borderTop: '2px solid', borderColor: 'primary.main', bgcolor: 'background.paper', color: 'text.primary' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1, bgcolor: 'action.hover' }}>
        <Chip size="small" icon={<def.Icon fontSize="small" />} label={<FormattedMessage id={def.labelKey} />} />
        <Typography variant="subtitle2" color="text.secondary" noWrap sx={{ flexGrow: 1 }}>
          {section.sectionName}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, mr: 1 }}>
          <FormattedMessage id="page.manage.pages.sheet.hint" />
        </Typography>
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

      <Box sx={{ p: 2, maxHeight: '60vh', overflowY: 'auto' }}>
        <Suspense fallback={<Loading />}>
          <Editor
            value={section}
            onChange={(next) => onChangeSection(sectionIndex, next)}
            pageName={sectionScope(page.pageName, section.sectionName)}
          />
        </Suspense>
      </Box>
    </Box>
  );
};
