import React from 'react';
import { Box, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { TextDesign, TextSectionProps } from '@simple-site/interfaces';
import type { SectionEditorProps } from '../registry';
import { normalizeTextSection } from './TextSection.normalize';
import { ColorField } from '../../manage/themes/ColorField';
import { MediaUrlField } from '../../media/MediaUrlField';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';

/**
 * Editor for a Text section — **section-level design only**, grouped as Text
 * (colour), Background (colour, image, parallax) and Columns (custom widths).
 *
 * Everything else is edited in place on the rendered section: copy via the
 * editable slots the renderer declares, each column's design + media and its
 * deletion via a floating popover on the column, and column addition via an inline
 * control — so none of that is duplicated here.
 *
 * Controlled: reads `value`, emits via `onChange`, normalized so empty fields drop.
 */
export const TextSectionEditor: React.FC<SectionEditorProps<'text'>> = ({ value, onChange, pageName }) => {
  const intl = useIntl();
  const flags = useFeatureFlags();
  const enablePicker = Boolean(flags?.media);

  const columns = value.content.columns;
  // Stable, page-unique key prefix so width fields don't clash across sections.
  const keyBase = `${pageName}.${value.sectionName}`;

  const emit = (next: TextSectionProps) => onChange(normalizeTextSection(next));
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id: `page.manage.pages.section.text.${id}` }, values);

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
    <Stack spacing={3}>
      {/* Text */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>{t('group.text')}</Typography>
        <ColorField
          label={t('textColor')}
          value={value.design?.textColor ?? ''}
          onChange={(v) => patchDesign({ textColor: v })}
        />
      </Box>

      {/* Background */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>{t('group.background')}</Typography>
        <Stack spacing={1.5}>
          <ColorField
            label={t('backgroundColor')}
            value={value.design?.backgroundColor ?? ''}
            onChange={(v) => patchDesign({ backgroundColor: v })}
          />
          <MediaUrlField
            label={t('backgroundUrl')}
            value={value.design?.backgroundUrl ?? ''}
            onChange={setBackgroundUrl}
            enablePicker={enablePicker}
            preview={false}
            fullWidth
          />
          {value.design?.backgroundUrl && (
            <FormControlLabel
              control={<Switch checked={Boolean(value.design?.parallax)} onChange={(e) => patchDesign({ parallax: e.target.checked })} />}
              label={<FormattedMessage id="page.manage.pages.section.text.parallax" />}
            />
          )}
        </Stack>
      </Box>

      {/* Columns */}
      {columns.length > 1 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>{t('group.columns')}</Typography>
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
