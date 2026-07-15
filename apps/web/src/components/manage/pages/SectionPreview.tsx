import React, { Suspense, useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import {
  type PageConfiguration,
  type SectionProps,
  type SectionType,
  sectionScope,
} from '@simple-site/interfaces';
import { Loading } from '../../Loading';
import { SECTION_DEFINITIONS, SECTION_REGISTRY } from '../../sections/registry';
import { SectionEditProvider } from './SectionEditProvider';
import { SectionBottomSheet } from './SectionBottomSheet';
import { SectionToolbar } from './SectionToolbar';

/**
 * The selected section is interactive so its editable slots can be typed into,
 * but it is still a preview: clicking a link or a CTA must not navigate away.
 */
const suppressNavigation = (e: React.MouseEvent) => {
  if ((e.target as HTMLElement).closest('a')) e.preventDefault();
};

interface SectionPreviewProps {
  page: PageConfiguration;
  selectedSectionIndex: number | null;
  /** Admin-theme colour for the selection accent (passed so it survives the preview theme). */
  selectionColor: string;
  onSelectSection: (index: number) => void;
  onMoveSection: (from: number, to: number) => void;
  onRemoveSection: (index: number) => void;
  onAddSection: (type: SectionType) => void;
  onChangeSection: (index: number, next: SectionProps<SectionType>) => void;
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
  selectionColor,
  onSelectSection,
  onMoveSection,
  onRemoveSection,
  onAddSection,
  onChangeSection,
}) => {
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  // Which section has its design panel open below it. Toggled by the section's
  // floating "edit" control; only shown for the currently-selected section.
  const [designOpenIndex, setDesignOpenIndex] = useState<number | null>(null);

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
      <Stack spacing={0}>
        {page.sections.map((section, index) => {
          const def = SECTION_REGISTRY[section.type];
          const Renderer = def.Renderer as React.ComponentType<SectionProps<SectionType>>;
          const selected = index === selectedSectionIndex;
          const scopedName = sectionScope(page.pageName, section.sectionName);
          // Selecting a different section (by clicking its content) closes any open panel.
          const select = () => { onSelectSection(index); setDesignOpenIndex(null); };
          return (
            <Box
              key={`${section.sectionName}-${index}`}
              role={selected ? undefined : 'button'}
              tabIndex={selected ? undefined : 0}
              onClick={selected ? undefined : select}
              onKeyDown={selected ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } }}
              sx={{
                position: 'relative',
                cursor: selected ? 'default' : 'pointer',
                overflow: 'hidden',
              }}
            >
              {/*
                Selection frame as an overlay, so the 2px border is visible on all
                four sides — above the rendered section's own (often full-bleed)
                background, which otherwise paints over an inset outline.
              */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  inset: 0,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                  zIndex: 4,
                  border: selected ? '2px solid' : '1px dashed',
                  borderColor: selected ? selectionColor : 'divider',
                }}
              />
              {/* Content area: the positioning context for the floating toolbar. */}
              <Box sx={{ position: 'relative' }}>
              {/* The toolbar appears only while the section is selected. */}
              {selected && (
                <SectionToolbar
                  icon={def.Icon}
                  labelKey={def.labelKey}
                  canMoveUp={index > 0}
                  canMoveDown={index < page.sections.length - 1}
                  onEdit={() => setDesignOpenIndex((prev) => (prev === index ? null : index))}
                  onMoveUp={() => onMoveSection(index, index - 1)}
                  onMoveDown={() => onMoveSection(index, index + 1)}
                  onRemove={() => onRemoveSection(index)}
                />
              )}

              {/*
                Unselected: non-interactive, so a click anywhere selects the section.
                Selected: interactive, so the renderer's editable slots can be typed
                into — but link/button navigation is suppressed, since this is a
                preview, not the live site.
              */}
              <Box
                sx={{ pointerEvents: selected ? 'auto' : 'none' }}
                onClickCapture={selected ? suppressNavigation : undefined}
              >
                <Suspense fallback={<Loading />}>
                  {selected ? (
                    <SectionEditProvider section={section} onChange={(next) => onChangeSection(index, next)}>
                      <Renderer {...section} sectionName={scopedName} />
                    </SectionEditProvider>
                  ) : (
                    <Renderer {...section} sectionName={scopedName} />
                  )}
                </Suspense>
              </Box>
              </Box>

              {selected && designOpenIndex === index && (
                <SectionBottomSheet
                  page={page}
                  sectionIndex={index}
                  accentColor={selectionColor}
                  onChangeSection={onChangeSection}
                  onClose={() => setDesignOpenIndex(null)}
                />
              )}
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ mt: 2, textAlign: 'center' }}>{addButton}</Box>
    </Box>
  );
};
