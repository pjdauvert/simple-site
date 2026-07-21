import React, { useEffect, useState } from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { HeroSectionProps } from '@simple-site/interfaces';
import type { SectionEditorProps } from '../registry';
import { normalizeHeroSection } from './HeroSection.normalize';
import { ColorField } from '../../manage/themes/ColorField';
import { MediaUrlField } from '../../media/MediaUrlField';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';

type HeroDesign = NonNullable<HeroSectionProps['design']>;

const KEY = 'page.manage.pages.section.hero';

/**
 * Editor for a Hero section: **section-level design only**, grouped as Text
 * (colour), Background (colour + image) and Design (layout, artwork side, column
 * ratios).
 *
 * All copy (title, subtitle, CTA labels, featuring label/value) and structure
 * (add/remove CTAs and featuring items, their link/variant, and the artwork image,
 * alt text and alignment) are edited in place on the rendered section via floating
 * popovers, so they are not duplicated here. Controlled: reads `value`, emits via
 * `onChange`, always through `normalizeHeroSection` so empty optional fields drop.
 */
export const HeroSectionEditor: React.FC<SectionEditorProps<'hero'>> = ({ value, onChange }) => {
  const intl = useIntl();
  const flags = useFeatureFlags();
  const enablePicker = Boolean(flags?.media);
  const t = (suffix: string) => intl.formatMessage({ id: `${KEY}.${suffix}` });

  const design = value.design;
  const isSplit = design?.layout === 'split';

  // Column ratio inputs are held locally so clearing one field doesn't wipe the
  // other while the (positive, positive) tuple is momentarily invalid.
  const [colLeft, setColLeft] = useState(() => design?.columnLayout?.[0]?.toString() ?? '');
  const [colRight, setColRight] = useState(() => design?.columnLayout?.[1]?.toString() ?? '');
  useEffect(() => {
    setColLeft(value.design?.columnLayout?.[0]?.toString() ?? '');
    setColRight(value.design?.columnLayout?.[1]?.toString() ?? '');
    // Resync only when a different section is loaded into this editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.sectionName]);

  const setDesign = (patch: Partial<HeroDesign>) => {
    onChange(normalizeHeroSection({ ...value, design: { ...value.design, ...patch } }));
  };

  const setBackgroundUrl = (url: string) => {
    if (url && url.length > 0) {
      setDesign({ backgroundUrl: url });
    } else {
      const d = value.design ?? {};
      const { backgroundUrl, ...rest } = d;
      void backgroundUrl;
      onChange(normalizeHeroSection({ ...value, design: rest }));
    }
  };

  const applyColumns = (leftStr: string, rightStr: string) => {
    const l = Number(leftStr);
    const r = Number(rightStr);
    const valid =
      leftStr.trim() !== '' && rightStr.trim() !== '' && l > 0 && r > 0 && Number.isFinite(l) && Number.isFinite(r);
    setDesign({ columnLayout: valid ? [l, r] : undefined });
  };

  return (
    <Stack spacing={3}>
      {/* Text */}
      <Box>
        <Typography variant="subtitle2" gutterBottom><FormattedMessage id={`${KEY}.group.text`} /></Typography>
        <ColorField
          label={t('textColor')}
          value={design?.textColor ?? ''}
          onChange={(v) => setDesign({ textColor: v })}
        />
      </Box>

      {/* Background */}
      <Box>
        <Typography variant="subtitle2" gutterBottom><FormattedMessage id={`${KEY}.group.background`} /></Typography>
        <Stack spacing={1.5}>
          <ColorField
            label={t('backgroundColor')}
            value={design?.backgroundColor ?? ''}
            onChange={(v) => setDesign({ backgroundColor: v })}
          />
          <MediaUrlField
            label={t('backgroundUrl')}
            value={design?.backgroundUrl ?? ''}
            onChange={setBackgroundUrl}
            enablePicker={enablePicker}
            preview={false}
            fullWidth
          />
        </Stack>
      </Box>

      {/* Design */}
      <Box>
        <Typography variant="subtitle2" gutterBottom><FormattedMessage id={`${KEY}.group.design`} /></Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
          <TextField
            select
            label={t('layout')}
            value={design?.layout ?? ''}
            onChange={(e) =>
              setDesign({ layout: e.target.value === '' ? undefined : (e.target.value as HeroDesign['layout']) })
            }
            size="small"
            fullWidth
          >
            <MenuItem value=""><FormattedMessage id={`${KEY}.layout.default`} /></MenuItem>
            <MenuItem value="centered"><FormattedMessage id={`${KEY}.layout.centered`} /></MenuItem>
            <MenuItem value="split"><FormattedMessage id={`${KEY}.layout.split`} /></MenuItem>
          </TextField>

          {isSplit && (
            <TextField
              select
              label={t('artworkSide')}
              value={design?.artworkSide ?? ''}
              onChange={(e) =>
                setDesign({ artworkSide: e.target.value === '' ? undefined : (e.target.value as HeroDesign['artworkSide']) })
              }
              size="small"
              fullWidth
            >
              <MenuItem value="left"><FormattedMessage id={`${KEY}.artworkSide.left`} /></MenuItem>
              <MenuItem value="right"><FormattedMessage id={`${KEY}.artworkSide.right`} /></MenuItem>
            </TextField>
          )}

          {isSplit && (
            <Box sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                <FormattedMessage id={`${KEY}.columnLayout`} />
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('columnLayout.left')}
                  type="number"
                  value={colLeft}
                  onChange={(e) => { setColLeft(e.target.value); applyColumns(e.target.value, colRight); }}
                  size="small"
                  slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
                  sx={{ width: 120 }}
                />
                <TextField
                  label={t('columnLayout.right')}
                  type="number"
                  value={colRight}
                  onChange={(e) => { setColRight(e.target.value); applyColumns(colLeft, e.target.value); }}
                  size="small"
                  slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
                  sx={{ width: 120 }}
                />
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Stack>
  );
};
