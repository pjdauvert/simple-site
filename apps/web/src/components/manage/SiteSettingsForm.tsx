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
import { FormattedMessage, useIntl } from 'react-intl';
import type { SiteThemeConfig } from '@simple-site/interfaces';
import { SiteThemeConfigSchema, UrlOrPathSchema } from '@simple-site/interfaces';
import { loadDraftConfig } from '../../services/configVersionService';
import { updateSiteSettings } from '../../services/siteConfigService';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useNotifications } from '../../hooks/useNotifications';
import { MediaUrlField } from '../media';

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
/** Select value: '' = inherit/default, 'false' = full width, otherwise a breakpoint. */
type ContainerChoice = '' | 'false' | (typeof BREAKPOINTS)[number];

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
  const notify = useNotifications();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [siteName, setSiteName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [container, setContainer] = useState<ContainerChoice>('');

  // Snapshot of the loaded (or last-saved) values, to enable Save only when dirty.
  const [initial, setInitial] = useState({ siteName: '', logoUrl: '', faviconUrl: '', container: '' as ContainerChoice });

  const [siteNameError, setSiteNameError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        const loaded = {
          siteName: config.site.siteName,
          logoUrl: config.site.logoUrl ?? '',
          faviconUrl: config.site.faviconUrl ?? '',
          container: toChoice(config.site.containerMaxWidth),
        };
        setSiteName(loaded.siteName);
        setLogoUrl(loaded.logoUrl);
        setFaviconUrl(loaded.faviconUrl);
        setContainer(loaded.container);
        setInitial(loaded);
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.site.error.load' }));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

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
      notify.error(intl.formatMessage({ id: 'page.manage.site.error.invalid' }));
      return;
    }

    setSubmitting(true);
    try {
      await updateSiteSettings(parsed.data);
      setInitial({ siteName, logoUrl, faviconUrl, container }); // saved values are the new baseline
      notify.success(intl.formatMessage({ id: 'page.manage.site.success' }));
      onSaved?.();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.site.error.save' }));
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
  const isDirty =
    siteName !== initial.siteName ||
    logoUrl !== initial.logoUrl ||
    faviconUrl !== initial.faviconUrl ||
    container !== initial.container;

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h6" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.site.title" />
      </Typography>

      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <TextField
          label={intl.formatMessage({ id: 'page.manage.site.siteName' })}
          value={siteName}
          onChange={(e) => { setSiteName(e.target.value); setSiteNameError(false); }}
          error={siteNameError}
          helperText={siteNameError ? <FormattedMessage id="page.manage.site.siteName.required" /> : ' '}
          required
          fullWidth
        />

        <MediaUrlField
          label={intl.formatMessage({ id: 'page.manage.site.logoUrl' })}
          value={logoUrl}
          onChange={(v) => { setLogoUrl(v); setLogoError(false); }}
          error={logoError}
          helperText={logoError ? <FormattedMessage id="page.manage.site.url.invalid" /> : ' '}
          enablePicker={showPicker}
          fullWidth
        />

        <MediaUrlField
          label={intl.formatMessage({ id: 'page.manage.site.faviconUrl' })}
          value={faviconUrl}
          onChange={(v) => { setFaviconUrl(v); setFaviconError(false); }}
          error={faviconError}
          helperText={faviconError ? <FormattedMessage id="page.manage.site.url.invalid" /> : ' '}
          enablePicker={showPicker}
          fullWidth
        />

        <TextField
          select
          label={intl.formatMessage({ id: 'page.manage.site.containerMaxWidth' })}
          value={container}
          onChange={(e) => { setContainer(e.target.value as ContainerChoice); }}
          helperText={intl.formatMessage({ id: 'page.manage.site.containerMaxWidth.help' })}
          sx={{ maxWidth: 280 }}
        >
          <MenuItem value=""><FormattedMessage id="page.manage.site.containerMaxWidth.default" /></MenuItem>
          {BREAKPOINTS.map((bp) => (
            <MenuItem key={bp} value={bp}>{bp}</MenuItem>
          ))}
          <MenuItem value="false"><FormattedMessage id="page.manage.site.containerMaxWidth.full" /></MenuItem>
        </TextField>

        <Box>
          <Button type="submit" variant="contained" disabled={submitting || !isDirty}>
            {submitting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.manage.site.save" />}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
