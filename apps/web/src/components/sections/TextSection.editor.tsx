import React, { useState } from 'react';
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
  EditOutlined as EditIcon,
  VisibilityOutlined as VisibilityIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import ReactMarkdown from 'react-markdown';
import type {
  Media,
  TextColumnContent,
  TextColumnDesign,
  TextDesign,
  TextSectionProps,
} from '@simple-site/interfaces';
import type { SectionEditorProps } from './registry';
import { ColorField } from '../themes/ColorField';
import { MediaUrlField } from '../media';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

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

/** Lightweight markdown styling for the in-editor preview (mirrors the renderer). */
const MARKDOWN_SX = {
  '& > :first-of-type': { mt: 0 },
  '& p': { mt: 0, mb: 1 },
  '& h1,& h2,& h3,& h4,& h5,& h6': { mt: 1, mb: 0.5 },
  '& ul,& ol': { pl: 3, mb: 1 },
  '& code': { fontFamily: 'monospace' },
  '& pre': { overflow: 'auto' },
} as const;

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

// --- Normalization: keep the emitted section clean & schema-valid ------------
// Empty optionals serialize as ABSENT; `content.columns` always has length >= 1;
// `design` is omitted entirely when nothing is set; `columnConfig` stays aligned
// to `columns` by index.

const nonEmpty = (s?: string): string | undefined => (s && s.length > 0 ? s : undefined);

const cleanColumn = (col: TextColumnContent): TextColumnContent => {
  const out: TextColumnContent = {};
  const title = nonEmpty(col.title);
  const paragraph = nonEmpty(col.paragraph);
  if (title) out.title = title;
  if (paragraph) out.paragraph = paragraph;
  return out;
};

const cleanMedia = (m?: Media): Media | undefined => {
  const url = nonEmpty(m?.url);
  if (!m || !url) return undefined;
  const out: Media = { url };
  if (m.position) out.position = m.position;
  if (m.verticalAlign) out.verticalAlign = m.verticalAlign;
  if (m.horizontalAlign) out.horizontalAlign = m.horizontalAlign;
  const maxWidth = nonEmpty(m.maxWidth);
  const maxHeight = nonEmpty(m.maxHeight);
  if (maxWidth) out.maxWidth = maxWidth;
  if (maxHeight) out.maxHeight = maxHeight;
  return out;
};

const cleanColumnDesign = (cfg?: TextColumnDesign): TextColumnDesign => {
  const out: TextColumnDesign = {};
  if (!cfg) return out;
  if (cfg.hideOnBreakpoints && cfg.hideOnBreakpoints.length > 0) out.hideOnBreakpoints = cfg.hideOnBreakpoints;
  if (cfg.textHorizontalAlign) out.textHorizontalAlign = cfg.textHorizontalAlign;
  if (cfg.textVerticalAlign) out.textVerticalAlign = cfg.textVerticalAlign;
  const media = cleanMedia(cfg.media);
  if (media) out.media = media;
  return out;
};

const cleanDesign = (d: TextDesign | undefined, columnCount: number): TextDesign | undefined => {
  if (!d) return undefined;
  const out: TextDesign = {};
  const backgroundColor = nonEmpty(d.backgroundColor);
  const textColor = nonEmpty(d.textColor);
  const backgroundUrl = nonEmpty(d.backgroundUrl);
  if (backgroundColor) out.backgroundColor = backgroundColor;
  if (textColor) out.textColor = textColor;
  if (backgroundUrl) out.backgroundUrl = backgroundUrl;
  if (backgroundUrl && d.parallax) out.parallax = true;

  // Ratios are only valid for 2..4 columns; align length to the column count.
  if (d.columnLayout && columnCount > 1) {
    const layout = d.columnLayout.slice(0, columnCount).map((n) => (Number.isFinite(n) && n > 0 ? n : 1));
    while (layout.length < columnCount) layout.push(1);
    if (layout.length >= 2 && layout.length <= 4) out.columnLayout = layout;
  }

  // Per-column config: clean each entry, drop trailing empties, keep index alignment.
  if (d.columnConfig) {
    const cfgs = d.columnConfig.slice(0, columnCount).map(cleanColumnDesign);
    let lastNonEmpty = -1;
    cfgs.forEach((c, i) => { if (Object.keys(c).length > 0) lastNonEmpty = i; });
    if (lastNonEmpty >= 0) out.columnConfig = cfgs.slice(0, lastNonEmpty + 1);
  }

  return Object.keys(out).length > 0 ? out : undefined;
};

const normalize = (next: TextSectionProps): TextSectionProps => {
  const cleaned = next.content.columns.map(cleanColumn);
  const columns = cleaned.length > 0 ? cleaned : [{}];
  const content = { columns };
  const design = cleanDesign(next.design, columns.length);
  const base: TextSectionProps = { type: next.type, sectionName: next.sectionName, content };
  return design ? { ...base, design } : base;
};

/**
 * Editor for a Text section. Controlled: reads `value`, emits changes via
 * `onChange`. Colocated with its renderer (`TextSection.tsx`). Every emit is
 * normalized so empty fields drop out and the section stays schema-valid.
 */
export const TextSectionEditor: React.FC<SectionEditorProps<'text'>> = ({ value, onChange, pageName }) => {
  const intl = useIntl();
  const flags = useFeatureFlags();
  const enablePicker = Boolean(flags?.media);
  const [preview, setPreview] = useState<Set<number>>(new Set());

  const columns = value.content.columns;
  // Stable, page-unique key prefix so column blocks don't clash across sections.
  const keyBase = `${pageName}.${value.sectionName}`;

  const emit = (next: TextSectionProps) => onChange(normalize(next));

  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id: `page.manage.pages.section.text.${id}` }, values);
  const alignLabel = (v: string) => t(`align.${v}`);
  const posLabel = (v: string) => t(`position.${v}`);
  const noneLabel = t('align.none');

  // --- content ---
  const setColumnField = (index: number, patch: Partial<TextColumnContent>) => {
    const next = columns.map((c, i) => (i === index ? { ...c, ...patch } : c));
    emit({ ...value, content: { columns: next } });
  };

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

  const setColumnMediaUrl = (index: number, url: string) => {
    const design = value.design ?? {};
    const cfgs = [...(design.columnConfig ?? [])];
    while (cfgs.length <= index) cfgs.push({});
    const cur = cfgs[index] ?? {};
    if (url && url.length > 0) {
      const media: Media = { ...(cur.media ?? {}), url };
      cfgs[index] = { ...cur, media };
    } else {
      const { media, ...rest } = cur;
      void media;
      cfgs[index] = rest;
    }
    emit({ ...value, design: { ...design, columnConfig: cfgs } });
  };

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

  const togglePreview = (index: number) =>
    setPreview((prev) => {
      const n = new Set(prev);
      if (n.has(index)) n.delete(index); else n.add(index);
      return n;
    });

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2"><FormattedMessage id="page.manage.pages.section.text.columns" /></Typography>

      {columns.map((col, i) => {
        const cfg = value.design?.columnConfig?.[i];
        const media = cfg?.media;
        const inPreview = preview.has(i);
        return (
          <Paper key={`${keyBase}-col-${i}`} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">
                  <FormattedMessage id="page.manage.pages.section.text.column" values={{ number: i + 1 }} />
                </Typography>
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

              <TextField
                label={t('title')}
                value={col.title ?? ''}
                onChange={(e) => setColumnField(i, { title: e.target.value })}
                size="small"
                fullWidth
              />

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{t('paragraph')}</Typography>
                  <Button
                    size="small"
                    startIcon={inPreview ? <EditIcon /> : <VisibilityIcon />}
                    onClick={() => togglePreview(i)}
                  >
                    <FormattedMessage id={inPreview ? 'page.manage.pages.section.text.edit' : 'page.manage.pages.section.text.preview'} />
                  </Button>
                </Box>
                {inPreview ? (
                  <Box sx={{ ...MARKDOWN_SX, minHeight: 120, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    {col.paragraph ? (
                      <ReactMarkdown>{col.paragraph}</ReactMarkdown>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        <FormattedMessage id="page.manage.pages.section.text.previewEmpty" />
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <TextField
                    value={col.paragraph ?? ''}
                    onChange={(e) => setColumnField(i, { paragraph: e.target.value })}
                    size="small"
                    fullWidth
                    multiline
                    minRows={4}
                    sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                  />
                )}
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

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
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

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('media')}</Typography>
                <MediaUrlField
                  label={t('mediaUrl')}
                  value={media?.url ?? ''}
                  onChange={(url) => setColumnMediaUrl(i, url)}
                  enablePicker={enablePicker}
                  fullWidth
                />
                {media && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1.5 }}>
                    <EnumSelect
                      label={t('mediaPosition')}
                      value={media.position}
                      options={POSITIONS}
                      optionLabel={posLabel}
                      noneLabel={noneLabel}
                      onChange={(v) => patchColumnMedia(i, { position: v as MediaPos | undefined })}
                    />
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
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
                )}
              </Box>
            </Stack>
          </Paper>
        );
      })}

      <Box>
        <Button startIcon={<AddIcon />} onClick={addColumn} disabled={columns.length >= MAX_COLUMNS}>
          <FormattedMessage id="page.manage.pages.section.text.addColumn" />
        </Button>
      </Box>

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

      <Divider />

      <Typography variant="subtitle2"><FormattedMessage id="page.manage.pages.section.text.design" /></Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
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
      </Box>

      <MediaUrlField
        label={t('backgroundUrl')}
        value={value.design?.backgroundUrl ?? ''}
        onChange={setBackgroundUrl}
        enablePicker={enablePicker}
        fullWidth
      />

      {value.design?.backgroundUrl && (
        <FormControlLabel
          control={<Switch checked={Boolean(value.design?.parallax)} onChange={(e) => patchDesign({ parallax: e.target.checked })} />}
          label={<FormattedMessage id="page.manage.pages.section.text.parallax" />}
        />
      )}
    </Stack>
  );
};
