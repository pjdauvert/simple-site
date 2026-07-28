import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  ALL_SOCIAL_NETWORKS,
  BASE_LOCALE,
  UrlOrPathSchema,
  slugify,
  type Locale,
  type SocialNetworkId,
  type TeamMember,
} from '@simple-site/interfaces';
import { MediaUrlField } from '../../media';
import type { MemberFieldErrors } from './teamDraft';

interface MemberFormDialogProps {
  open: boolean;
  member: TeamMember;
  errors: MemberFieldErrors;
  showErrors: boolean;
  /** The platform's configured languages; the biography switch shows only with 2+. */
  languages: Locale[];
  /** Enables the media-library picker on the photo field. */
  enablePicker: boolean;
  onChange: (next: TeamMember) => void;
  onClose: () => void;
}

const NAME_ERROR: Record<NonNullable<MemberFieldErrors['name']>, string> = {
  empty: 'page.manage.team.error.nameEmpty',
};
const SLUG_ERROR: Record<NonNullable<MemberFieldErrors['slug']>, string> = {
  empty: 'page.manage.team.error.slugEmpty',
  duplicate: 'page.manage.team.error.slugDuplicate',
  pattern: 'page.manage.team.error.slugPattern',
};

/**
 * Edit form for one team member. The slug auto-derives from the name until it is
 * edited by hand (clearing it re-enables derivation); the per-locale biography is
 * markdown, with a language switch shown only when the platform offers several
 * languages (the base locale is the public fallback).
 */
export const MemberFormDialog: React.FC<MemberFormDialogProps> = ({
  open,
  member,
  errors,
  showErrors,
  languages,
  enablePicker,
  onChange,
  onClose,
}) => {
  const intl = useIntl();
  const [slugTouched, setSlugTouched] = useState(false);
  const [bioLocale, setBioLocale] = useState<Locale>(BASE_LOCALE);

  // Re-arm per member: an already-customized slug must never be silently rewritten.
  useEffect(() => {
    if (!open) return;
    setSlugTouched(member.slug !== '' && member.slug !== slugify(member.name));
    setBioLocale(BASE_LOCALE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setName = (name: string) => {
    const next = { ...member, name };
    if (!slugTouched) next.slug = slugify(name);
    onChange(next);
  };

  const setSlug = (slug: string) => {
    setSlugTouched(slug !== '');
    onChange({ ...member, slug });
  };

  const nameError = showErrors && errors.name ? errors.name : undefined;
  const slugError = showErrors && errors.slug ? errors.slug : undefined;

  const setSocialLink = (network: SocialNetworkId, value: string) =>
    onChange({ ...member, socialLinks: { ...member.socialLinks, [network]: value } });
  /** Live feedback only — the save-time schema parse is the backstop. */
  const socialLinkInvalid = (value: string | undefined): boolean =>
    Boolean(value?.trim()) && !UrlOrPathSchema.safeParse(value?.trim()).success;
  const localeLabel = (locale: Locale): string =>
    locale === BASE_LOCALE
      ? `${locale.toUpperCase()} · ${intl.formatMessage({ id: 'page.manage.team.field.biography.default' })}`
      : locale.toUpperCase();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle><FormattedMessage id="page.manage.team.edit" /></DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label={intl.formatMessage({ id: 'page.manage.team.field.name' })}
            value={member.name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            fullWidth
            required
            error={Boolean(nameError)}
            helperText={nameError ? intl.formatMessage({ id: NAME_ERROR[nameError] }) : ' '}
          />
          <TextField
            label={intl.formatMessage({ id: 'page.manage.team.field.jobTitle' })}
            value={member.jobTitle}
            onChange={(e) => onChange({ ...member, jobTitle: e.target.value })}
            size="small"
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(member.former)}
                onChange={(_, checked) => onChange({ ...member, former: checked || undefined })}
              />
            }
            label={<Typography variant="body2"><FormattedMessage id="page.manage.team.field.former" /></Typography>}
          />
          <TextField
            label={intl.formatMessage({ id: 'page.manage.team.field.slug' })}
            value={member.slug}
            onChange={(e) => setSlug(e.target.value)}
            size="small"
            fullWidth
            required
            error={Boolean(slugError)}
            helperText={
              slugError
                ? intl.formatMessage({ id: SLUG_ERROR[slugError] })
                : intl.formatMessage({ id: 'page.manage.team.field.slug.help' })
            }
          />
          <MediaUrlField
            label={intl.formatMessage({ id: 'page.manage.team.field.photo' })}
            value={member.photoUrl ?? ''}
            onChange={(photoUrl) => onChange({ ...member, photoUrl: photoUrl || undefined })}
            enablePicker={enablePicker}
            fullWidth
          />
          {languages.length > 1 && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={bioLocale}
              onChange={(_, next: Locale | null) => { if (next) setBioLocale(next); }}
              aria-label={intl.formatMessage({ id: 'page.manage.team.field.biography.language' })}
            >
              {languages.map((locale) => (
                <ToggleButton key={locale} value={locale}>{localeLabel(locale)}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          <TextField
            label={intl.formatMessage({ id: 'page.manage.team.field.biography' })}
            value={member.biography[bioLocale] ?? ''}
            onChange={(e) => onChange({ ...member, biography: { ...member.biography, [bioLocale]: e.target.value } })}
            size="small"
            fullWidth
            multiline
            minRows={6}
            helperText={intl.formatMessage({ id: 'page.manage.team.field.biography.help' })}
          />
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              <FormattedMessage id="page.manage.team.field.socialLinks" />
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {ALL_SOCIAL_NETWORKS.map((network) => (
                <TextField
                  key={network}
                  label={intl.formatMessage({ id: `page.team.social.${network}` })}
                  value={member.socialLinks?.[network] ?? ''}
                  onChange={(e) => setSocialLink(network, e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="https://…"
                  error={socialLinkInvalid(member.socialLinks?.[network])}
                  helperText={
                    socialLinkInvalid(member.socialLinks?.[network])
                      ? intl.formatMessage({ id: 'page.manage.team.error.socialUrl' })
                      : undefined
                  }
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          <FormattedMessage id="page.manage.team.done" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
