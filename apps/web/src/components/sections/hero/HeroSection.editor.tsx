import React, { useEffect, useState } from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { HeroSectionProps } from '@simple-site/interfaces';
import type { SectionEditorProps } from '../registry';
import { normalizeHeroSection } from './HeroSection.normalize';

type HeroDesign = NonNullable<HeroSectionProps['design']>;

const KEY = 'page.manage.pages.section.hero';

/**
 * Editor for a Hero section: **section-level design only**. All copy (title,
 * subtitle, CTA labels, featuring label/value) and structure (adding/removing CTA
 * buttons and featuring items, wiring their link/variant, and the artwork image,
 * alt text and alignment) are edited in place on the rendered section via floating
 * popovers. This form drives only the section-wide design: layout, column ratio,
 * artwork side, and colors. Controlled: reads `value`, emits changes via
 * `onChange`, always through `normalizeHeroSection` so empty optional fields are
 * dropped and the section serializes clean.
 */
export const HeroSectionEditor: React.FC<SectionEditorProps<'hero'>> = ({ value, onChange }) => {
  const intl = useIntl();
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

  // --- Column ratio ---
  const applyColumns = (leftStr: string, rightStr: string) => {
    const l = Number(leftStr);
    const r = Number(rightStr);
    const valid =
      leftStr.trim() !== '' && rightStr.trim() !== '' && l > 0 && r > 0 && Number.isFinite(l) && Number.isFinite(r);
    setDesign({ columnLayout: valid ? [l, r] : undefined });
  };

  return (
    <Stack spacing={3}>
      {/* ---------------- Design (section-level; content & structure are inline) ---------------- */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          <FormattedMessage id={`${KEY}.design`} />
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <TextField
            label={t('backgroundColor')}
            value={design?.backgroundColor ?? ''}
            onChange={(e) => setDesign({ backgroundColor: e.target.value })}
            size="small"
            fullWidth
          />
          <TextField
            label={t('textColor')}
            value={design?.textColor ?? ''}
            onChange={(e) => setDesign({ textColor: e.target.value })}
            size="small"
            fullWidth
          />
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
            <>
              <TextField
                select
                label={t('artworkSide')}
                value={design?.artworkSide ?? ''}
                onChange={(e) =>
                  setDesign({
                    artworkSide: e.target.value === '' ? undefined : (e.target.value as HeroDesign['artworkSide']),
                  })
                }
                size="small"
                fullWidth
              >
                <MenuItem value="left"><FormattedMessage id={`${KEY}.artworkSide.left`} /></MenuItem>
                <MenuItem value="right"><FormattedMessage id={`${KEY}.artworkSide.right`} /></MenuItem>
              </TextField>

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
                    inputProps={{ min: 0, step: 0.1 }}
                    sx={{ width: 120 }}
                  />
                  <TextField
                    label={t('columnLayout.right')}
                    type="number"
                    value={colRight}
                    onChange={(e) => { setColRight(e.target.value); applyColumns(colLeft, e.target.value); }}
                    size="small"
                    inputProps={{ min: 0, step: 0.1 }}
                    sx={{ width: 120 }}
                  />
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Stack>
  );
};
