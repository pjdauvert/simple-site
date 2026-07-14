import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { HeroArtwork, HeroCtaButton, HeroSectionProps } from '@simple-site/interfaces';
import type { SectionEditorProps } from './registry';
import { normalizeHeroSection } from './HeroSection.normalize';

type HeroContent = HeroSectionProps['content'];
type HeroDesign = NonNullable<HeroSectionProps['design']>;

const CTA_VARIANTS = ['contained', 'outlined', 'text'] as const;
const VERTICAL_ALIGNS = ['top', 'middle', 'bottom', 'stretch'] as const;
const HORIZONTAL_ALIGNS = ['left', 'center', 'right', 'span'] as const;

const KEY = 'page.manage.pages.section.hero';

/** Placeholder for a not-yet-written inline label (locale-neutral). */
const EMPTY_LABEL = '—';

/**
 * Editor for a Hero section: **structure + design only**. All copy (title,
 * subtitle, CTA labels, featuring label/value) is edited in place on the
 * rendered section, so it is never duplicated here — this form only adds/removes
 * repeatable items, wires their non-textual props (link, variant) and drives the
 * design. Controlled: reads `value`, emits changes via `onChange`, always through
 * `normalizeHeroSection` so empty optional fields are dropped and the section
 * serializes clean.
 */
export const HeroSectionEditor: React.FC<SectionEditorProps<'hero'>> = ({ value, onChange }) => {
  const intl = useIntl();
  const t = (suffix: string) => intl.formatMessage({ id: `${KEY}.${suffix}` });

  const design = value.design;
  const isSplit = design?.layout === 'split';
  const artwork = design?.artwork;
  const hasArtwork = !!artwork?.imageUrl;

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

  const setContent = (patch: Partial<HeroContent>) => {
    onChange(normalizeHeroSection({ ...value, content: { ...value.content, ...patch } }));
  };

  const setDesign = (patch: Partial<HeroDesign>) => {
    onChange(normalizeHeroSection({ ...value, design: { ...value.design, ...patch } }));
  };

  const setArtwork = (patch: Partial<HeroArtwork>) => {
    setDesign({ artwork: { ...value.design?.artwork, ...patch } as HeroArtwork });
  };

  // --- CTA buttons (labels are edited inline on the rendered section) ---
  const ctaButtons = value.content.ctaButtons ?? [];
  const addCta = () => setContent({ ctaButtons: [...ctaButtons, { label: '', link: '' }] });
  const updateCta = (i: number, patch: Partial<HeroCtaButton>) =>
    setContent({ ctaButtons: ctaButtons.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const removeCta = (i: number) => setContent({ ctaButtons: ctaButtons.filter((_, j) => j !== i) });

  // --- Featuring items (label/value are edited inline on the rendered section) ---
  const featuringItems = value.content.featuringItems ?? [];
  const addFeaturing = () =>
    setContent({ featuringItems: [...featuringItems, { label: '', value: '' }] });
  const removeFeaturing = (i: number) =>
    setContent({ featuringItems: featuringItems.filter((_, j) => j !== i) });

  // --- Column ratio ---
  const applyColumns = (leftStr: string, rightStr: string) => {
    const l = Number(leftStr);
    const r = Number(rightStr);
    const valid =
      leftStr.trim() !== '' && rightStr.trim() !== '' && l > 0 && r > 0 && Number.isFinite(l) && Number.isFinite(r);
    setDesign({ columnLayout: valid ? [l, r] : undefined });
  };

  const rowSx = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
    alignItems: 'center',
    p: 1,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
  } as const;

  return (
    <Stack spacing={3}>
      {/* ---------------- Structure (repeatable items; their copy is inline) ---------------- */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          <FormattedMessage id={`${KEY}.content`} />
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {/* CTA buttons */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              <FormattedMessage id={`${KEY}.ctaButtons`} />
            </Typography>
            <Stack spacing={1.5}>
              {ctaButtons.map((cta, i) => (
                <Box key={i} sx={rowSx}>
                  <Tooltip title={t('ctaButtons.label')}>
                    <Chip
                      label={cta.label || EMPTY_LABEL}
                      size="small"
                      variant="outlined"
                      sx={{ maxWidth: 160, color: cta.label ? undefined : 'text.disabled' }}
                    />
                  </Tooltip>
                  <TextField
                    label={t('ctaButtons.link')}
                    value={cta.link}
                    onChange={(e) => updateCta(i, { link: e.target.value })}
                    size="small"
                    sx={{ flex: '1 1 160px' }}
                  />
                  <TextField
                    select
                    label={t('ctaButtons.variant')}
                    value={cta.variant ?? ''}
                    onChange={(e) =>
                      updateCta(i, {
                        variant: e.target.value === '' ? undefined : (e.target.value as HeroCtaButton['variant']),
                      })
                    }
                    size="small"
                    sx={{ minWidth: 130 }}
                  >
                    <MenuItem value=""><FormattedMessage id={`${KEY}.ctaButtons.variant.default`} /></MenuItem>
                    {CTA_VARIANTS.map((v) => (
                      <MenuItem key={v} value={v}>
                        <FormattedMessage id={`${KEY}.ctaButtons.variant.${v}`} />
                      </MenuItem>
                    ))}
                  </TextField>
                  <Tooltip title={t('ctaButtons.remove')}>
                    <IconButton aria-label={t('ctaButtons.remove')} onClick={() => removeCta(i)} size="small">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
            <Button startIcon={<AddIcon />} onClick={addCta} size="small" sx={{ mt: 1 }}>
              <FormattedMessage id={`${KEY}.ctaButtons.add`} />
            </Button>
          </Box>

          {/* Featuring items */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              <FormattedMessage id={`${KEY}.featuring`} />
            </Typography>
            <Stack spacing={1.5}>
              {featuringItems.map((item, i) => (
                <Box key={i} sx={rowSx}>
                  <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' }}
                      color={item.label ? 'text.secondary' : 'text.disabled'}
                      noWrap
                    >
                      {item.label || EMPTY_LABEL}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500 }}
                      color={item.value ? 'text.primary' : 'text.disabled'}
                      noWrap
                    >
                      {item.value || EMPTY_LABEL}
                    </Typography>
                  </Box>
                  <Tooltip title={t('featuring.remove')}>
                    <IconButton aria-label={t('featuring.remove')} onClick={() => removeFeaturing(i)} size="small">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
            <Button startIcon={<AddIcon />} onClick={addFeaturing} size="small" sx={{ mt: 1 }}>
              <FormattedMessage id={`${KEY}.featuring.add`} />
            </Button>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* ---------------- Design ---------------- */}
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

              {/* Artwork: the image itself is picked by clicking it on the rendered
                  section; only its alt text and alignment are set here. */}
              <Box
                sx={{
                  gridColumn: '1 / -1',
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  <FormattedMessage id={`${KEY}.artwork`} />
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <TextField
                    label={t('artwork.imageUrl')}
                    value={artwork?.imageUrl ?? ''}
                    size="small"
                    fullWidth
                    InputProps={{ readOnly: true }}
                    sx={{ gridColumn: { xs: 'auto', sm: 'span 2', md: 'auto' } }}
                  />
                  <TextField
                    label={t('artwork.alt')}
                    value={artwork?.alt ?? ''}
                    onChange={(e) => setArtwork({ alt: e.target.value })}
                    size="small"
                    fullWidth
                    disabled={!hasArtwork}
                    sx={{ gridColumn: { xs: 'auto', sm: 'span 2', md: 'span 2' } }}
                  />
                  <TextField
                    select
                    label={t('artwork.verticalAlign')}
                    value={artwork?.verticalAlign ?? ''}
                    onChange={(e) =>
                      setArtwork({
                        verticalAlign:
                          e.target.value === '' ? undefined : (e.target.value as HeroArtwork['verticalAlign']),
                      })
                    }
                    size="small"
                    fullWidth
                    disabled={!hasArtwork}
                  >
                    <MenuItem value=""><FormattedMessage id={`${KEY}.artwork.verticalAlign.default`} /></MenuItem>
                    {VERTICAL_ALIGNS.map((v) => (
                      <MenuItem key={v} value={v}>
                        <FormattedMessage id={`${KEY}.artwork.verticalAlign.${v}`} />
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label={t('artwork.horizontalAlign')}
                    value={artwork?.horizontalAlign ?? ''}
                    onChange={(e) =>
                      setArtwork({
                        horizontalAlign:
                          e.target.value === '' ? undefined : (e.target.value as HeroArtwork['horizontalAlign']),
                      })
                    }
                    size="small"
                    fullWidth
                    disabled={!hasArtwork}
                  >
                    <MenuItem value=""><FormattedMessage id={`${KEY}.artwork.horizontalAlign.default`} /></MenuItem>
                    {HORIZONTAL_ALIGNS.map((h) => (
                      <MenuItem key={h} value={h}>
                        <FormattedMessage id={`${KEY}.artwork.horizontalAlign.${h}`} />
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Stack>
  );
};
