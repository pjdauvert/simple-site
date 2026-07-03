import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { PhotoLibrary as PhotoLibraryIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { SiteThemeConfig } from '@simple-site/interfaces';
import { SiteThemeConfigSchema, UrlOrPathSchema } from '@simple-site/interfaces';
import { loadDraftConfig } from '../../services/configVersionService';
import { updateSiteSettings } from '../../services/siteConfigService';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { ImagePickerDialog } from '../media';

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
/** Select value: '' = inherit/default, 'false' = full width, otherwise a breakpoint. */
type ContainerChoice = '' | 'false' | (typeof BREAKPOINTS)[number];
type PickerTarget = 'logo' | 'favicon' | null;

const toChoice = (value: SiteThemeConfig['containerMaxWidth']): ContainerChoice =>
  value === undefined ? '' : value === false ? 'false' : value;

const isValidUrl = (value: string) => UrlOrPathSchema.safeParse(value).success;

/**
 * Edits the `site` section of the config (name, logo, favicon, container width).
 * Prefills from the working draft (`GET /api/config/draft`) — the admin shell has
 * no SiteConfigProvider — and saves via `PUT /api/config/site`, which writes the
 * draft. Changes go live only when published from the Config Versions panel.
 */
/** `onSaved` fires after a successful draft save so a parent can refresh siblings. */
export const SiteSettingsForm: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const intl = useIntl();
  const flags = useFeatureFlags();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [siteName, setSiteName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [container, setContainer] = useState<ContainerChoice>('');

  const [siteNameError, setSiteNameError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        setSiteName(config.site.siteName);
        setLogoUrl(config.site.logoUrl ?? '');
        setFaviconUrl(config.site.faviconUrl ?? '');
        setContainer(toChoice(config.site.containerMaxWidth));
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.site.error.load' }));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const handlePicked = (url: string) => {
    if (pickerTarget === 'logo') { setLogoUrl(url); setLogoError(false); }
    else if (pickerTarget === 'favicon') { setFaviconUrl(url); setFaviconError(false); }
    setSuccess(false);
    setPickerTarget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = siteName.trim();
    const logo = logoUrl.trim();
    const favicon = faviconUrl.trim();

    const nameInvalid = name.length === 0;
    const logoInvalid = logo.length > 0 && !isValidUrl(logo);
    const faviconInvalid = favicon.length > 0 && !isValidUrl(favicon);
    setSiteNameError(nameInvalid);
    setLogoError(logoInvalid);
    setFaviconError(faviconInvalid);
    if (nameInvalid || logoInvalid || faviconInvalid) return;

    const site: SiteThemeConfig = {
      siteName: name,
      ...(logo ? { logoUrl: logo } : {}),
      ...(favicon ? { faviconUrl: favicon } : {}),
      ...(container === '' ? {} : { containerMaxWidth: container === 'false' ? false : container }),
    };

    const parsed = SiteThemeConfigSchema.safeParse(site);
    if (!parsed.success) {
      setSubmitError(intl.formatMessage({ id: 'page.manage.site.error.invalid' }));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSuccess(false);
    try {
      await updateSiteSettings(parsed.data);
      setSuccess(true);
      onSaved?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.site.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  const showPicker = Boolean(flags?.media);

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h6" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.site.title" />
      </Typography>

      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <TextField
          label={intl.formatMessage({ id: 'page.manage.site.siteName' })}
          value={siteName}
          onChange={(e) => { setSiteName(e.target.value); setSiteNameError(false); setSuccess(false); }}
          error={siteNameError}
          helperText={siteNameError ? <FormattedMessage id="page.manage.site.siteName.required" /> : ' '}
          required
          fullWidth
        />

        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            label={intl.formatMessage({ id: 'page.manage.site.logoUrl' })}
            value={logoUrl}
            onChange={(e) => { setLogoUrl(e.target.value); setLogoError(false); setSuccess(false); }}
            error={logoError}
            helperText={logoError ? <FormattedMessage id="page.manage.site.url.invalid" /> : ' '}
            fullWidth
          />
          {showPicker && (
            <Button
              variant="outlined"
              startIcon={<PhotoLibraryIcon />}
              onClick={() => setPickerTarget('logo')}
              sx={{ mt: 1, flexShrink: 0 }}
            >
              <FormattedMessage id="page.manage.site.chooseFromLibrary" />
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            label={intl.formatMessage({ id: 'page.manage.site.faviconUrl' })}
            value={faviconUrl}
            onChange={(e) => { setFaviconUrl(e.target.value); setFaviconError(false); setSuccess(false); }}
            error={faviconError}
            helperText={faviconError ? <FormattedMessage id="page.manage.site.url.invalid" /> : ' '}
            fullWidth
          />
          {showPicker && (
            <Button
              variant="outlined"
              startIcon={<PhotoLibraryIcon />}
              onClick={() => setPickerTarget('favicon')}
              sx={{ mt: 1, flexShrink: 0 }}
            >
              <FormattedMessage id="page.manage.site.chooseFromLibrary" />
            </Button>
          )}
        </Stack>

        <TextField
          select
          label={intl.formatMessage({ id: 'page.manage.site.containerMaxWidth' })}
          value={container}
          onChange={(e) => { setContainer(e.target.value as ContainerChoice); setSuccess(false); }}
          helperText={intl.formatMessage({ id: 'page.manage.site.containerMaxWidth.help' })}
          sx={{ maxWidth: 280 }}
        >
          <MenuItem value=""><FormattedMessage id="page.manage.site.containerMaxWidth.default" /></MenuItem>
          {BREAKPOINTS.map((bp) => (
            <MenuItem key={bp} value={bp}>{bp}</MenuItem>
          ))}
          <MenuItem value="false"><FormattedMessage id="page.manage.site.containerMaxWidth.full" /></MenuItem>
        </TextField>

        {submitError && <Alert severity="error" onClose={() => setSubmitError(null)}>{submitError}</Alert>}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(false)}>
            <FormattedMessage id="page.manage.site.success" />
          </Alert>
        )}

        <Box>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.manage.site.save" />}
          </Button>
        </Box>
      </Stack>

      <ImagePickerDialog
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handlePicked}
      />
    </Box>
  );
};
