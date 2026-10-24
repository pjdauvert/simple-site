import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { SiteThemeConfig } from '@simple-site/interfaces';
import { SiteThemeConfigSchema, UrlOrPathSchema } from '@simple-site/interfaces';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateSiteSettings } from '../../../services/siteConfigService';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { useDraftAutoSave } from '../../../hooks/useDraftAutoSave';
import { MediaUrlField } from '../../media';
import { Loader } from '../../Loader';
import { DraftSaveStatus } from '../DraftSaveStatus';

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
/** Select value: '' = inherit/default, 'false' = full width, otherwise a breakpoint. */
type ContainerChoice = '' | 'false' | (typeof BREAKPOINTS)[number];

const toChoice = (value: SiteThemeConfig['containerMaxWidth']): ContainerChoice =>
  value === undefined ? '' : value === false ? 'false' : value;

const isValidUrl = (value: string) => UrlOrPathSchema.safeParse(value).success;

/**
 * Edits the `site` section of the config (name, logo, favicon, container width).
 * Prefills from the working draft (`GET /api/config/draft`) — the admin shell has
 * no SiteConfigProvider — and AUTO-SAVES every settled change via
 * `PUT /api/config/site`, which writes the draft: there is no save button, the
 * indicator reports where the write stands. An empty name or a malformed URL is
 * flagged and holds the write back rather than sending what the schema rejects.
 * Changes go live only when published from the Config Versions panel.
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
  // Set once at setup and not editable in-app; carried through saves so the
  // schema default can't silently reset it.
  const [defaultLanguage, setDefaultLanguage] = useState('en');

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        setSiteName(config.site.siteName);
        setLogoUrl(config.site.logoUrl ?? '');
        setFaviconUrl(config.site.faviconUrl ?? '');
        setContainer(toChoice(config.site.containerMaxWidth));
        setDefaultLanguage(config.site.defaultLanguage);
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.site.error.load' }));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const name = siteName.trim();
  const logo = logoUrl.trim();
  const favicon = faviconUrl.trim();

  // Flagged live: these are exactly what holds the auto-save back.
  const siteNameError = !loading && name.length === 0;
  const logoError = logo.length > 0 && !isValidUrl(logo);
  const faviconError = favicon.length > 0 && !isValidUrl(favicon);

  // The payload itself is the auto-saved value, so untrimmed whitespace and a
  // re-render never count as a change.
  const site = useMemo<SiteThemeConfig | null>(
    () =>
      loading
        ? null
        : {
            siteName: name,
            defaultLanguage,
            ...(logo ? { logoUrl: logo } : {}),
            ...(favicon ? { faviconUrl: favicon } : {}),
            ...(container === '' ? {} : { containerMaxWidth: container === 'false' ? false : container }),
          },
    [loading, name, logo, favicon, container, defaultLanguage],
  );

  const save = useCallback(
    async (next: SiteThemeConfig) => {
      const parsed = SiteThemeConfigSchema.safeParse(next);
      if (!parsed.success) throw new Error(intl.formatMessage({ id: 'page.manage.site.error.invalid' }));
      await updateSiteSettings(parsed.data);
      onSaved?.();
    },
    [intl, onSaved],
  );

  const saveState = useDraftAutoSave({
    value: site,
    save,
    enabled: !siteNameError && !logoError && !faviconError,
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Loader variant="triskelion" size={48} />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  const showPicker = Boolean(flags?.media);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.site.title" />
      </Typography>

      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <TextField
          label={intl.formatMessage({ id: 'page.manage.site.siteName' })}
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          error={siteNameError}
          helperText={siteNameError ? <FormattedMessage id="page.manage.site.siteName.required" /> : ' '}
          required
          fullWidth
        />

        <MediaUrlField
          label={intl.formatMessage({ id: 'page.manage.site.logoUrl' })}
          value={logoUrl}
          onChange={setLogoUrl}
          error={logoError}
          helperText={logoError ? <FormattedMessage id="page.manage.site.url.invalid" /> : ' '}
          enablePicker={showPicker}
          fullWidth
        />

        <MediaUrlField
          label={intl.formatMessage({ id: 'page.manage.site.faviconUrl' })}
          value={faviconUrl}
          onChange={setFaviconUrl}
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

        <DraftSaveStatus {...saveState} />
      </Stack>
    </Box>
  );
};
