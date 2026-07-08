import React, { Suspense, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  DeleteOutline as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  type PageConfiguration,
  type SectionProps,
  type SectionType,
  sectionScope,
} from '@simple-site/interfaces';
import { Loading } from '../../Loading';
import { SECTION_DEFINITIONS, SECTION_REGISTRY } from '../../sections/registry';

interface SectionPreviewProps {
  page: PageConfiguration;
  selectedSectionIndex: number | null;
  onSelectSection: (index: number) => void;
  onMoveSection: (from: number, to: number) => void;
  onRemoveSection: (index: number) => void;
  onAddSection: (type: SectionType) => void;
}

/**
 * Center pane: a live preview of the page's sections rendered by the real section
 * components. Sections are non-interactive (pointer events disabled on the render)
 * so clicking selects the section for editing; a floating toolbar handles
 * reorder/delete, and an "Add section" menu appends a new section of a chosen type.
 */
export const SectionPreview: React.FC<SectionPreviewProps> = ({
  page,
  selectedSectionIndex,
  onSelectSection,
  onMoveSection,
  onRemoveSection,
  onAddSection,
}) => {
  const intl = useIntl();
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);

  const openAdd = (e: React.MouseEvent<HTMLElement>) => setAddAnchor(e.currentTarget);
  const closeAdd = () => setAddAnchor(null);
  const pickType = (type: SectionType) => { closeAdd(); onAddSection(type); };

  const addButton = (
    <>
      <Button startIcon={<AddIcon />} onClick={openAdd} variant="outlined" size="small">
        <FormattedMessage id="page.manage.pages.section.add" />
      </Button>
      <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={closeAdd}>
        {SECTION_DEFINITIONS.map((def) => (
          <MenuItem key={def.type} onClick={() => pickType(def.type)}>
            <ListItemIcon><def.Icon fontSize="small" /></ListItemIcon>
            <ListItemText><FormattedMessage id={def.labelKey} /></ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );

  if (page.sections.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <FormattedMessage id="page.manage.pages.section.empty" />
        </Typography>
        {addButton}
      </Paper>
    );
  }

  return (
    <Box>
      <Stack spacing={1.5}>
        {page.sections.map((section, index) => {
          const def = SECTION_REGISTRY[section.type];
          const Renderer = def.Renderer as React.ComponentType<SectionProps<SectionType>>;
          const selected = index === selectedSectionIndex;
          const scopedName = sectionScope(page.pageName, section.sectionName);
          return (
            <Box
              key={`${section.sectionName}-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSection(index)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSection(index); } }}
              sx={{
                position: 'relative',
                cursor: 'pointer',
                borderRadius: 1,
                outline: selected ? '2px solid' : '1px dashed',
                outlineColor: selected ? 'primary.main' : 'divider',
                outlineOffset: 2,
                overflow: 'hidden',
                '&:hover .section-toolbar': { opacity: 1 },
              }}
            >
              {/* Floating toolbar (interactive; above the non-interactive render). */}
              <Stack
                className="section-toolbar"
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 2,
                  p: 0.25,
                  opacity: selected ? 1 : 0,
                  transition: 'opacity 120ms',
                }}
              >
                <Chip size="small" icon={<def.Icon fontSize="small" />} label={<FormattedMessage id={def.labelKey} />} />
                <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.section.edit' })}>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSelectSection(index); }} aria-label={intl.formatMessage({ id: 'page.manage.pages.section.edit' })}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.section.moveUp' })}>
                  <span>
                    <IconButton size="small" disabled={index === 0} onClick={(e) => { e.stopPropagation(); onMoveSection(index, index - 1); }} aria-label={intl.formatMessage({ id: 'page.manage.pages.section.moveUp' })}>
                      <UpIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.section.moveDown' })}>
                  <span>
                    <IconButton size="small" disabled={index === page.sections.length - 1} onClick={(e) => { e.stopPropagation(); onMoveSection(index, index + 1); }} aria-label={intl.formatMessage({ id: 'page.manage.pages.section.moveDown' })}>
                      <DownIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={intl.formatMessage({ id: 'page.manage.pages.section.delete' })}>
                  <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onRemoveSection(index); }} aria-label={intl.formatMessage({ id: 'page.manage.pages.section.delete' })}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* The real renderer, made non-interactive so clicks select the section. */}
              <Box sx={{ pointerEvents: 'none' }}>
                <Suspense fallback={<Loading />}>
                  <Renderer {...section} sectionName={scopedName} />
                </Suspense>
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ mt: 2, textAlign: 'center' }}>{addButton}</Box>
    </Box>
  );
};
