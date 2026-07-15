import React from 'react';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { DeleteOutline as DeleteOutlineIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { HeroArtwork, HeroCtaButton } from '@simple-site/interfaces';
import { useSectionEdit } from '../sectionEdit';

const KEY = 'page.manage.pages.section.hero';

const CTA_VARIANTS = ['contained', 'outlined', 'text'] as const;
const VERTICAL_ALIGNS = ['top', 'middle', 'bottom', 'stretch'] as const;
const HORIZONTAL_ALIGNS = ['left', 'center', 'right', 'span'] as const;

/**
 * Lazy-loaded design panels for a Hero section, mounted inside the floating
 * popovers anchored over the rendered section (admin only). Each reads its current
 * values from props and writes through the inline `useSectionEdit()` context — the
 * section's copy (labels, values) is edited in place, so these panels only handle
 * the non-textual props and item removal. They are only ever mounted while a
 * section is selected, so `useSectionEdit()` is always present.
 */

/** The CTA button's link, style, and a delete action. */
export const CtaDesignPanel: React.FC<{ index: number; cta: HeroCtaButton }> = ({ index, cta }) => {
  const edit = useSectionEdit()!;
  const intl = useIntl();
  const t = (suffix: string) => intl.formatMessage({ id: `${KEY}.${suffix}` });

  return (
    <Stack spacing={2}>
      <TextField
        label={t('ctaButtons.link')}
        value={cta.link ?? ''}
        onChange={(e) => edit.setContentAt(`ctaButtons.${index}.link`, e.target.value)}
        size="small"
        fullWidth
      />
      <TextField
        select
        label={t('ctaButtons.variant')}
        value={cta.variant ?? ''}
        onChange={(e) => edit.setContentAt(`ctaButtons.${index}.variant`, e.target.value || undefined)}
        size="small"
        fullWidth
      >
        <MenuItem value=""><FormattedMessage id={`${KEY}.ctaButtons.variant.default`} /></MenuItem>
        {CTA_VARIANTS.map((v) => (
          <MenuItem key={v} value={v}>
            <FormattedMessage id={`${KEY}.ctaButtons.variant.${v}`} />
          </MenuItem>
        ))}
      </TextField>
      <Button
        color="error"
        variant="outlined"
        size="small"
        startIcon={<DeleteOutlineIcon />}
        onClick={() => edit.removeItemAt('ctaButtons', index)}
      >
        <FormattedMessage id={`${KEY}.ctaButtons.remove`} />
      </Button>
    </Stack>
  );
};

/** A featuring item's only non-textual action: delete (label/value are edited inline). */
export const FeaturingDesignPanel: React.FC<{ index: number }> = ({ index }) => {
  const edit = useSectionEdit()!;

  return (
    <Stack spacing={2}>
      <Button
        color="error"
        variant="outlined"
        size="small"
        startIcon={<DeleteOutlineIcon />}
        onClick={() => edit.removeItemAt('featuringItems', index)}
      >
        <FormattedMessage id={`${KEY}.featuring.remove`} />
      </Button>
    </Stack>
  );
};

/** Artwork alt text and alignment (the image itself is picked by clicking it). */
export const ArtworkDesignPanel: React.FC<{ artwork?: HeroArtwork }> = ({ artwork }) => {
  const edit = useSectionEdit()!;
  const intl = useIntl();
  const t = (suffix: string) => intl.formatMessage({ id: `${KEY}.${suffix}` });

  return (
    <Stack spacing={2}>
      <TextField
        label={t('artwork.alt')}
        value={artwork?.alt ?? ''}
        onChange={(e) => edit.setDesignAt('artwork.alt', e.target.value)}
        size="small"
        fullWidth
      />
      <TextField
        select
        label={t('artwork.verticalAlign')}
        value={artwork?.verticalAlign ?? ''}
        onChange={(e) => edit.setDesignAt('artwork.verticalAlign', e.target.value || undefined)}
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
        value={artwork?.horizontalAlign ?? ''}
        onChange={(e) => edit.setDesignAt('artwork.horizontalAlign', e.target.value || undefined)}
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
    </Stack>
  );
};
