import React from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type {
  Media,
  TextColumnDesign,
  TextDesign,
  TextSectionProps,
} from '@simple-site/interfaces';
import type { SectionEditorProps } from './registry';
import { normalizeTextSection } from './TextSection.normalize';
import { ColorField } from '../manage/themes/ColorField';

// Enum value types, derived from the interface (the schemas don't export TS types).
type Breakpoint = NonNullable<TextColumnDesign['hideOnBreakpoints']>[number];
type HAlign = NonNullable<TextColumnDesign['textHorizontalAlign']>;
type VAlign = NonNullable<TextColumnDesign['textVerticalAlign']>;
type MediaPos = NonNullable<Media['position']>;

const BREAKPOINTS: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const H_ALIGNS: HAlign[] = ['left', 'center', 'right', 'span'];
const V_ALIGNS: VAlign[] = ['top', 'middle', 'bottom', 'stretch'];
const POSITIONS: MediaPos[] = ['cover', 'contain'];

const MAX_COLUMNS = 4;

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

/**
 * Editor for a Text section — **structure and design only**. Copy (column titles,
 * paragraphs, images) is edited in place on the rendered section, via the editable
 * slots the renderer declares (`EditableText` / `EditableMarkdown` / `EditableImage`),
 * so it is deliberately not duplicated here.
 *
 * Controlled: reads `value`, emits changes via `onChange`. Colocated with its
 * renderer (`TextSection.tsx`). Every emit is normalized so empty fields drop out
 * and the section stays schema-valid. Rendered in a wide bottom sheet under the
 * preview, hence the side-by-side column layout.
 */
export const TextSectionEditor: React.FC<SectionEditorProps<'text'>> = ({ value, onChange, pageName }) => {
  const intl = useIntl();

  const columns = value.content.columns;
  // Stable, page-unique key prefix so column blocks don't clash across sections.
  const keyBase = `${pageName}.${value.sectionName}`;

  const emit = (next: TextSectionProps) => onChange(normalizeTextSection(next));

  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id: `page.manage.pages.section.text.${id}` }, values);
  const alignLabel = (v: string) => t(`align.${v}`);
  const posLabel = (v: string) => t(`position.${v}`);
  const noneLabel = t('align.none');

  // --- structure ---
  const addColumn = () => {
    if (columns.length >= MAX_COLUMNS) return;
    const nextColumns = [...columns, {}];
    let design = value.design;
    if (design?.columnLayout) design = { ...design, columnLayout: [...design.columnLayout, 1] };
    emit({ ...value, content: { columns: nextColumns }, design });
  };

  const removeColumn = (index: number) => {
    if (columns.length <= 1) return;
    const nextColumns = columns.filter((_, i) => i !== index);
    let design = value.design;
    if (design) {
      const d: TextDesign = { ...design };
      if (d.columnConfig) d.columnConfig = d.columnConfig.filter((_, i) => i !== index);
      if (d.columnLayout) d.columnLayout = d.columnLayout.filter((_, i) => i !== index);
      design = d;
    }
    emit({ ...value, content: { columns: nextColumns }, design });
  };

  // --- per-column design ---
  const updateColumnDesign = (index: number, patch: Partial<TextColumnDesign>) => {
    const design = value.design ?? {};
    const cfgs = [...(design.columnConfig ?? [])];
    while (cfgs.length <= index) cfgs.push({});
    cfgs[index] = { ...cfgs[index], ...patch };
    emit({ ...value, design: { ...design, columnConfig: cfgs } });
  };

  const toggleBreakpoint = (index: number, bp: Breakpoint) => {
    const current = value.design?.columnConfig?.[index]?.hideOnBreakpoints ?? [];
    const set = new Set<Breakpoint>(current);
    if (set.has(bp)) set.delete(bp); else set.add(bp);
    const nextArr = BREAKPOINTS.filter((b) => set.has(b));
    updateColumnDesign(index, { hideOnBreakpoints: nextArr });
  };

  /** Media design only — the image itself is picked in place on the rendered section. */
  const patchColumnMedia = (index: number, patch: Partial<Media>) => {
    const design = value.design ?? {};
    const cfgs = [...(design.columnConfig ?? [])];
    const cur = cfgs[index];
    if (!cur?.media) return;
    cfgs[index] = { ...cur, media: { ...cur.media, ...patch } };
    emit({ ...value, design: { ...design, columnConfig: cfgs } });
  };

  // --- section design ---
  const patchDesign = (patch: Partial<TextDesign>) => {
    const design = value.design ?? {};
    emit({ ...value, design: { ...design, ...patch } });
  };

  const setBackgroundUrl = (url: string) => {
    if (url && url.length > 0) {
      patchDesign({ backgroundUrl: url });
    } else {
      const design = value.design ?? {};
      const { backgroundUrl, parallax, ...rest } = design;
      void backgroundUrl; void parallax;
      emit({ ...value, design: rest });
    }
  };

  const toggleCustomWidths = (on: boolean) => {
    const design = value.design ?? {};
    if (on) {
      const cur = design.columnLayout ?? [];
      const layout = columns.map((_, i) => cur[i] ?? 1);
      emit({ ...value, design: { ...design, columnLayout: layout } });
    } else {
      const { columnLayout, ...rest } = design;
      void columnLayout;
      emit({ ...value, design: rest });
    }
  };

  const setColumnWidth = (index: number, n: number) => {
    const design = value.design ?? {};
    const layout = columns.map((_, i) => design.columnLayout?.[i] ?? 1);
    layout[index] = n > 0 ? n : 1;
    emit({ ...value, design: { ...design, columnLayout: layout } });
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="subtitle2"><FormattedMessage id="page.manage.pages.section.text.columns" /></Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addColumn} disabled={columns.length >= MAX_COLUMNS}>
          <FormattedMessage id="page.manage.pages.section.text.addColumn" />
        </Button>
      </Box>

      {/* One cell per column — the editor sits in a wide bottom sheet, so columns
          are laid out side by side, mirroring the section itself. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, alignItems: 'start' }}>
        {columns.map((col, i) => {
          const cfg = value.design?.columnConfig?.[i];
          const media = cfg?.media;
          return (
            <Paper key={`${keyBase}-col-${i}`} variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      <FormattedMessage id="page.manage.pages.section.text.column" values={{ number: i + 1 }} />
                    </Typography>
                    {/* Read-only context: the copy itself is edited in place on the section. */}
                    <Typography variant="subtitle2" noWrap title={col.title ?? ''}>
                      {col.title || t('column', { number: i + 1 })}
                    </Typography>
                  </Box>
                  <Tooltip title={t('removeColumn')}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeColumn(i)}
                        disabled={columns.length <= 1}
                        aria-label={t('removeColumn')}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                <Divider textAlign="left">
                  <Typography variant="caption" color="text.secondary">{t('columnDesign')}</Typography>
                </Divider>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('hideOnBreakpoints')}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {BREAKPOINTS.map((bp) => {
                      const active = cfg?.hideOnBreakpoints?.includes(bp) ?? false;
                      return (
                        <Chip
                          key={bp}
                          label={t(`breakpoint.${bp}`)}
                          size="small"
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          onClick={() => toggleBreakpoint(i, bp)}
                        />
                      );
                    })}
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                  <EnumSelect
                    label={t('textHorizontalAlign')}
                    value={cfg?.textHorizontalAlign}
                    options={H_ALIGNS}
                    optionLabel={alignLabel}
                    noneLabel={noneLabel}
                    onChange={(v) => updateColumnDesign(i, { textHorizontalAlign: v as HAlign | undefined })}
                  />
                  <EnumSelect
                    label={t('textVerticalAlign')}
                    value={cfg?.textVerticalAlign}
                    options={V_ALIGNS}
                    optionLabel={alignLabel}
                    noneLabel={noneLabel}
                    onChange={(v) => updateColumnDesign(i, { textVerticalAlign: v as VAlign | undefined })}
                  />
                </Box>

                <Divider textAlign="left">
                  <Typography variant="caption" color="text.secondary">{t('media')}</Typography>
                </Divider>

                {media ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                    <EnumSelect
                      label={t('mediaPosition')}
                      value={media.position}
                      options={POSITIONS}
                      optionLabel={posLabel}
                      noneLabel={noneLabel}
                      onChange={(v) => patchColumnMedia(i, { position: v as MediaPos | undefined })}
                    />
                    <Box sx={{ display: { xs: 'none', md: 'block' } }} />
                    <EnumSelect
                      label={t('mediaVerticalAlign')}
                      value={media.verticalAlign}
                      options={V_ALIGNS}
                      optionLabel={alignLabel}
                      noneLabel={noneLabel}
                      onChange={(v) => patchColumnMedia(i, { verticalAlign: v as VAlign | undefined })}
                    />
                    <EnumSelect
                      label={t('mediaHorizontalAlign')}
                      value={media.horizontalAlign}
                      options={H_ALIGNS}
                      optionLabel={alignLabel}
                      noneLabel={noneLabel}
                      onChange={(v) => patchColumnMedia(i, { horizontalAlign: v as HAlign | undefined })}
                    />
                    <TextField
                      label={t('mediaMaxWidth')}
                      value={media.maxWidth ?? ''}
                      onChange={(e) => patchColumnMedia(i, { maxWidth: e.target.value })}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label={t('mediaMaxHeight')}
                      value={media.maxHeight ?? ''}
                      onChange={(e) => patchColumnMedia(i, { maxHeight: e.target.value })}
                      size="small"
                      fullWidth
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage id="page.manage.pages.section.text.mediaEmpty" />
                  </Typography>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Box>

      <Divider />

      <Typography variant="subtitle2"><FormattedMessage id="page.manage.pages.section.text.design" /></Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5, alignItems: 'start' }}>
        <ColorField
          label={t('backgroundColor')}
          value={value.design?.backgroundColor ?? ''}
          onChange={(v) => patchDesign({ backgroundColor: v })}
        />
        <ColorField
          label={t('textColor')}
          value={value.design?.textColor ?? ''}
          onChange={(v) => patchDesign({ textColor: v })}
        />
        {/* The section background has no inline affordance on the rendered section
            (it is a CSS background, not an image slot), so it stays editable here. */}
        <TextField
          label={t('backgroundUrl')}
          value={value.design?.backgroundUrl ?? ''}
          onChange={(e) => setBackgroundUrl(e.target.value)}
          size="small"
          fullWidth
        />
      </Box>

      {value.design?.backgroundUrl && (
        <FormControlLabel
          control={<Switch checked={Boolean(value.design?.parallax)} onChange={(e) => patchDesign({ parallax: e.target.checked })} />}
          label={<FormattedMessage id="page.manage.pages.section.text.parallax" />}
        />
      )}

      {columns.length > 1 && (
        <Box>
          <FormControlLabel
            control={<Switch checked={Boolean(value.design?.columnLayout)} onChange={(e) => toggleCustomWidths(e.target.checked)} />}
            label={<FormattedMessage id="page.manage.pages.section.text.customColumnWidths" />}
          />
          {value.design?.columnLayout && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: `repeat(${columns.length}, 1fr)` }, gap: 1.5, mt: 1 }}>
              {columns.map((_, i) => (
                <TextField
                  key={`${keyBase}-w-${i}`}
                  type="number"
                  size="small"
                  label={t('columnWidth', { number: i + 1 })}
                  value={String(value.design?.columnLayout?.[i] ?? 1)}
                  onChange={(e) => setColumnWidth(i, Number(e.target.value))}
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Stack>
  );
};
