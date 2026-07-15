import React from 'react';
import { Box, Chip, Divider, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import type { Media, TextColumnDesign } from '@simple-site/interfaces';
import { useSectionEdit } from '../sectionEdit';
import { MediaUrlField } from '../../media/MediaUrlField';

// Enum value types, derived from the interface (the schemas don't export TS types).
type Breakpoint = NonNullable<TextColumnDesign['hideOnBreakpoints']>[number];
type HAlign = NonNullable<TextColumnDesign['textHorizontalAlign']>;
type VAlign = NonNullable<TextColumnDesign['textVerticalAlign']>;
type MediaPos = NonNullable<Media['position']>;

const BREAKPOINTS: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const H_ALIGNS: HAlign[] = ['left', 'center', 'right', 'span'];
const V_ALIGNS: VAlign[] = ['top', 'middle', 'bottom', 'stretch'];
const POSITIONS: MediaPos[] = ['cover', 'contain'];

interface EnumSelectProps {
  label: string;
  value?: string;
  options: readonly string[];
  optionLabel: (v: string) => string;
  noneLabel: string;
  onChange: (v: string | undefined) => void;
}

/** A small Select with a leading "default" (unset) option; emits `undefined` when cleared. */
const EnumSelect: React.FC<EnumSelectProps> = ({ label, value, options, optionLabel, noneLabel, onChange }) => (
  <TextField
    select
    size="small"
    fullWidth
    label={label}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
  >
    <MenuItem value=""><em>{noneLabel}</em></MenuItem>
    {options.map((o) => <MenuItem key={o} value={o}>{optionLabel(o)}</MenuItem>)}
  </TextField>
);

interface ColumnDesignPanelProps {
  index: number;
  colDesign?: TextColumnDesign;
}

/**
 * Per-column design + media controls, shown in a floating popover **on the column
 * itself** (via `InlineDesignPopover` in `TextSection`). Admin-only: it reads the
 * current values from `colDesign` and writes them through the inline-editing seam
 * (`useSectionEdit`), patching dotted paths under `columnConfig.<index>`.
 *
 * This pulls in the media-library UI (`MediaUrlField`), so `TextSection` lazy-imports
 * it to keep it out of the public section chunk — it only mounts while editing.
 */
export const ColumnDesignPanel: React.FC<ColumnDesignPanelProps> = ({ index, colDesign }) => {
  // Only rendered while a section is selected inline, so the context is always present.
  const edit = useSectionEdit()!;
  const intl = useIntl();

  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id: `page.manage.pages.section.text.${id}` }, values);
  const alignLabel = (v: string) => t(`align.${v}`);
  const posLabel = (v: string) => t(`position.${v}`);
  const noneLabel = t('align.none');

  const setDesign = (path: string, value: unknown) =>
    edit.setDesignAt(`columnConfig.${index}.${path}`, value);

  const media = colDesign?.media;
  const url = media?.url ?? '';
  const hasMedia = url.trim().length > 0;

  const toggleBreakpoint = (bp: Breakpoint) => {
    const current = colDesign?.hideOnBreakpoints ?? [];
    const set = new Set<Breakpoint>(current);
    if (set.has(bp)) set.delete(bp); else set.add(bp);
    const next = BREAKPOINTS.filter((b) => set.has(b));
    setDesign('hideOnBreakpoints', next.length > 0 ? next : undefined);
  };

  return (
    <Stack spacing={2}>
      <Divider textAlign="left">
        <Typography variant="caption" color="text.secondary">{t('columnDesign')}</Typography>
      </Divider>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('hideOnBreakpoints')}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {BREAKPOINTS.map((bp) => {
            const active = colDesign?.hideOnBreakpoints?.includes(bp) ?? false;
            return (
              <Chip
                key={bp}
                label={t(`breakpoint.${bp}`)}
                size="small"
                color={active ? 'primary' : 'default'}
                variant={active ? 'filled' : 'outlined'}
                onClick={() => toggleBreakpoint(bp)}
              />
            );
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        <EnumSelect
          label={t('textHorizontalAlign')}
          value={colDesign?.textHorizontalAlign}
          options={H_ALIGNS}
          optionLabel={alignLabel}
          noneLabel={noneLabel}
          onChange={(v) => setDesign('textHorizontalAlign', v)}
        />
        <EnumSelect
          label={t('textVerticalAlign')}
          value={colDesign?.textVerticalAlign}
          options={V_ALIGNS}
          optionLabel={alignLabel}
          noneLabel={noneLabel}
          onChange={(v) => setDesign('textVerticalAlign', v)}
        />
      </Box>

      <Divider textAlign="left">
        <Typography variant="caption" color="text.secondary">{t('media')}</Typography>
      </Divider>

      <MediaUrlField
        label={t('mediaUrl')}
        value={url}
        onChange={(v) => setDesign('media.url', v)}
        enablePicker={edit.canPickImage}
        preview={false}
        fullWidth
      />

      {hasMedia && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <EnumSelect
            label={t('mediaPosition')}
            value={media?.position}
            options={POSITIONS}
            optionLabel={posLabel}
            noneLabel={noneLabel}
            onChange={(v) => setDesign('media.position', v)}
          />
          <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
          <EnumSelect
            label={t('mediaVerticalAlign')}
            value={media?.verticalAlign}
            options={V_ALIGNS}
            optionLabel={alignLabel}
            noneLabel={noneLabel}
            onChange={(v) => setDesign('media.verticalAlign', v)}
          />
          <EnumSelect
            label={t('mediaHorizontalAlign')}
            value={media?.horizontalAlign}
            options={H_ALIGNS}
            optionLabel={alignLabel}
            noneLabel={noneLabel}
            onChange={(v) => setDesign('media.horizontalAlign', v)}
          />
          <TextField
            label={t('mediaMaxWidth')}
            value={media?.maxWidth ?? ''}
            onChange={(e) => setDesign('media.maxWidth', e.target.value === '' ? undefined : e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label={t('mediaMaxHeight')}
            value={media?.maxHeight ?? ''}
            onChange={(e) => setDesign('media.maxHeight', e.target.value === '' ? undefined : e.target.value)}
            size="small"
            fullWidth
          />
        </Box>
      )}
    </Stack>
  );
};
