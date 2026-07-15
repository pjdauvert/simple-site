import React from 'react';
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  IconButton,
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
import type { TextDesign, TextSectionProps } from '@simple-site/interfaces';
import type { SectionEditorProps } from '../registry';
import { normalizeTextSection } from './TextSection.normalize';
import { ColorField } from '../../manage/themes/ColorField';

const MAX_COLUMNS = 4;

/**
 * Editor for a Text section — **structure and section-level design only**.
 *
 * Copy and per-column design/media are edited in place on the rendered section:
 * column titles/paragraphs via the editable slots the renderer declares
 * (`EditableText` / `EditableMarkdown`), and each column's design + media via a
 * floating popover on the column itself (`ColumnDesignPanel`). Only structure
 * (add/remove columns, custom widths) and section-wide design (colors, background)
 * live here, so they are deliberately not duplicated.
 *
 * Controlled: reads `value`, emits changes via `onChange`. Colocated with its
 * renderer (`TextSection.tsx`). Every emit is normalized so empty fields drop out
 * and the section stays schema-valid.
 */
export const TextSectionEditor: React.FC<SectionEditorProps<'text'>> = ({ value, onChange, pageName }) => {
  const intl = useIntl();

  const columns = value.content.columns;
  // Stable, page-unique key prefix so column blocks don't clash across sections.
  const keyBase = `${pageName}.${value.sectionName}`;

  const emit = (next: TextSectionProps) => onChange(normalizeTextSection(next));

  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id: `page.manage.pages.section.text.${id}` }, values);

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

      {/* One cell per column — structure only. The copy and each column's design +
          media are edited in place on the rendered section. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, alignItems: 'start' }}>
        {columns.map((col, i) => (
          <Paper key={`${keyBase}-col-${i}`} variant="outlined" sx={{ p: 2, height: '100%' }}>
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
          </Paper>
        ))}
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
