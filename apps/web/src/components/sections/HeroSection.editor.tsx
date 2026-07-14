import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteOutlineIcon,
  ExpandMore as ExpandMoreIcon,
  PhotoLibraryOutlined as PhotoLibraryIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type {
  HeroArtwork,
  HeroCtaButton,
  HeroFeaturingItem,
  HeroSectionProps,
} from '@simple-site/interfaces';
import { ImagePickerDialog } from '../media';
import type { SectionEditorProps } from './registry';
import { normalizeHeroSection } from './HeroSection.normalize';

type HeroContent = HeroSectionProps['content'];
type HeroDesign = NonNullable<HeroSectionProps['design']>;

const CTA_VARIANTS = ['contained', 'outlined', 'text'] as const;
const VERTICAL_ALIGNS = ['top', 'middle', 'bottom', 'stretch'] as const;
const HORIZONTAL_ALIGNS = ['left', 'center', 'right', 'span'] as const;

const KEY = 'page.manage.pages.section.hero';

/**
 * Editor for a Hero section. Controlled: reads `value`, emits changes via
 * `onChange`. Colocated with its renderer (`HeroSection.tsx`). Empty optional
 * fields are dropped on every edit so the section serializes clean.
 */
export const HeroSectionEditor: React.FC<SectionEditorProps<'hero'>> = ({ value, onChange }) => {
  const intl = useIntl();
  const t = (suffix: string) => intl.formatMessage({ id: `${KEY}.${suffix}` });

  const design = value.design;
  const isSplit = design?.layout === 'split';
  const artwork = design?.artwork;

  const [pickerOpen, setPickerOpen] = useState(false);

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

  // --- CTA buttons ---
  const ctaButtons = value.content.ctaButtons ?? [];
  const addCta = () => setContent({ ctaButtons: [...ctaButtons, { label: '', link: '' }] });
  const updateCta = (i: number, patch: Partial<HeroCtaButton>) =>
    setContent({ ctaButtons: ctaButtons.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const removeCta = (i: number) =>
    setContent({ ctaButtons: ctaButtons.filter((_, j) => j !== i) });

  // --- Featuring items ---
  const featuringItems = value.content.featuringItems ?? [];
  const addFeaturing = () =>
    setContent({ featuringItems: [...featuringItems, { label: '', value: '' }] });
  const updateFeaturing = (i: number, patch: Partial<HeroFeaturingItem>) =>
    setContent({
      featuringItems: featuringItems.map((f, j) => (j === i ? { ...f, ...patch } : f)),
    });
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

  return (
    <Box>
      {/* ---------------- Content ---------------- */}
      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2"><FormattedMessage id={`${KEY}.content`} /></Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              label={t('title')}
              value={value.content.title ?? ''}
              onChange={(e) => setContent({ title: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label={t('subtitle')}
              value={value.content.subtitle ?? ''}
              onChange={(e) => setContent({ subtitle: e.target.value })}
              size="small"
              fullWidth
              multiline
              minRows={2}
            />

            {/* CTA buttons */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                <FormattedMessage id={`${KEY}.ctaButtons`} />
              </Typography>
              <Stack spacing={1.5}>
                {ctaButtons.map((cta, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      alignItems: 'flex-start',
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <TextField
                      label={t('ctaButtons.label')}
                      value={cta.label}
                      onChange={(e) => updateCta(i, { label: e.target.value })}
                      size="small"
                      sx={{ flex: '1 1 140px' }}
                    />
                    <TextField
                      label={t('ctaButtons.link')}
                      value={cta.link}
                      onChange={(e) => updateCta(i, { link: e.target.value })}
                      size="small"
                      sx={{ flex: '1 1 140px' }}
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
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      alignItems: 'flex-start',
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <TextField
                      label={t('featuring.label')}
                      value={item.label}
                      onChange={(e) => updateFeaturing(i, { label: e.target.value })}
                      size="small"
                      sx={{ flex: '1 1 140px' }}
                    />
                    <TextField
                      label={t('featuring.value')}
                      value={item.value}
                      onChange={(e) => updateFeaturing(i, { value: e.target.value })}
                      size="small"
                      sx={{ flex: '1 1 140px' }}
                    />
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
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* ---------------- Design ---------------- */}
      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2"><FormattedMessage id={`${KEY}.design`} /></Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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
            </Box>

            <TextField
              select
              label={t('layout')}
              value={design?.layout ?? ''}
              onChange={(e) =>
                setDesign({ layout: e.target.value === '' ? undefined : (e.target.value as HeroDesign['layout']) })
              }
              size="small"
              sx={{ maxWidth: 260 }}
            >
              <MenuItem value=""><FormattedMessage id={`${KEY}.layout.default`} /></MenuItem>
              <MenuItem value="centered"><FormattedMessage id={`${KEY}.layout.centered`} /></MenuItem>
              <MenuItem value="split"><FormattedMessage id={`${KEY}.layout.split`} /></MenuItem>
            </TextField>

            {isSplit && (
              <>
                <Box>
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
                  sx={{ maxWidth: 260 }}
                >
                  <MenuItem value="left"><FormattedMessage id={`${KEY}.artworkSide.left`} /></MenuItem>
                  <MenuItem value="right"><FormattedMessage id={`${KEY}.artworkSide.right`} /></MenuItem>
                </TextField>

                {/* Artwork sub-editor */}
                <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    <FormattedMessage id={`${KEY}.artwork`} />
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <TextField
                        label={t('artwork.imageUrl')}
                        value={artwork?.imageUrl ?? ''}
                        size="small"
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                      {artwork?.imageUrl && (
                        <Tooltip title={t('artwork.clear')}>
                          <IconButton
                            aria-label={t('artwork.clear')}
                            onClick={() => setArtwork({ imageUrl: '' })}
                            size="small"
                            sx={{ mt: 0.25 }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                    <Box>
                      <Button startIcon={<PhotoLibraryIcon />} onClick={() => setPickerOpen(true)} size="small">
                        <FormattedMessage id={`${KEY}.artwork.choose`} />
                      </Button>
                    </Box>

                    {artwork?.imageUrl && (
                      <>
                        <TextField
                          label={t('artwork.alt')}
                          value={artwork.alt ?? ''}
                          onChange={(e) => setArtwork({ alt: e.target.value })}
                          size="small"
                          fullWidth
                        />
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                          <TextField
                            select
                            label={t('artwork.verticalAlign')}
                            value={artwork.verticalAlign ?? ''}
                            onChange={(e) =>
                              setArtwork({
                                verticalAlign:
                                  e.target.value === '' ? undefined : (e.target.value as HeroArtwork['verticalAlign']),
                              })
                            }
                            size="small"
                            fullWidth
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
                            value={artwork.horizontalAlign ?? ''}
                            onChange={(e) =>
                              setArtwork({
                                horizontalAlign:
                                  e.target.value === '' ? undefined : (e.target.value as HeroArtwork['horizontalAlign']),
                              })
                            }
                            size="small"
                            fullWidth
                          >
                            <MenuItem value=""><FormattedMessage id={`${KEY}.artwork.horizontalAlign.default`} /></MenuItem>
                            {HORIZONTAL_ALIGNS.map((h) => (
                              <MenuItem key={h} value={h}>
                                <FormattedMessage id={`${KEY}.artwork.horizontalAlign.${h}`} />
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      </>
                    )}
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <ImagePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => setArtwork({ imageUrl: url })}
      />
    </Box>
  );
};
