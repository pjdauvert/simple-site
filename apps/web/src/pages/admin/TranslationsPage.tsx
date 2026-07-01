import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutline as DeleteOutlineIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { I18nDictionary, Locale } from '@simple-site/interfaces';
import { I18nLocalesEnum } from '@simple-site/interfaces';
import { loadTranslations } from '../../services/initService';
import { replaceTranslations } from '../../services/translationsService';

const LOCALES = Object.values(I18nLocalesEnum) as Locale[];
/** Same constraint the backend I18nDictionarySchema enforces on keys. */
const KEY_REGEX = /^[a-zA-Z0-9_.]+$/;

/** One translation key with its value in each locale. */
interface Row {
  key: string;
  values: Record<string, string>;
}

const buildRows = (dicts: Record<string, I18nDictionary>): Row[] => {
  const keys = new Set<string>();
  for (const locale of LOCALES) Object.keys(dicts[locale] ?? {}).forEach((k) => keys.add(k));
  return Array.from(keys)
    .sort()
    .map((key) => ({
      key,
      values: Object.fromEntries(LOCALES.map((l) => [l, dicts[l]?.[key] ?? ''])),
    }));
};

/** Full editor for the blob-stored page translations: edit values, add / remove keys. */
export const TranslationsPage: React.FC = () => {
  const intl = useIntl();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newKeyError, setNewKeyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all(LOCALES.map((l) => loadTranslations(l)))
      .then((dicts) => {
        if (!active) return;
        setRows(buildRows(Object.fromEntries(LOCALES.map((l, i) => [l, dicts[i]]))));
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.translations.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const setValue = (key: string, locale: string, value: string) => {
    setSuccess(false);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, values: { ...r.values, [locale]: value } } : r)));
  };

  const removeKey = (key: string) => {
    setSuccess(false);
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const addKey = () => {
    const key = newKey.trim();
    if (!KEY_REGEX.test(key)) {
      setNewKeyError(intl.formatMessage({ id: 'page.manage.translations.error.keyInvalid' }));
      return;
    }
    if (rows.some((r) => r.key === key)) {
      setNewKeyError(intl.formatMessage({ id: 'page.manage.translations.error.keyExists' }));
      return;
    }
    setSuccess(false);
    setNewKeyError(null);
    setNewKey('');
    setRows((prev) => [{ key, values: Object.fromEntries(LOCALES.map((l) => [l, ''])) }, ...prev]);
  };

  const handleSave = async () => {
    setSuccess(false);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await Promise.all(
        LOCALES.map((locale) =>
          replaceTranslations(locale, Object.fromEntries(rows.map((r) => [r.key, r.values[locale] ?? ''])) as I18nDictionary),
        ),
      );
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.translations.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  const visibleRows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? rows.filter((r) => r.key.toLowerCase().includes(needle)) : rows;
  }, [rows, filter]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (loadError) {
    return <Box sx={{ p: { xs: 2, sm: 4 } }}><Alert severity="error">{loadError}</Alert></Box>;
  }

  const gridColumns = { xs: '1fr', md: `minmax(180px, 260px) repeat(${LOCALES.length}, 1fr) 40px` };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}><FormattedMessage id="page.manage.translations.title" /></Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ sm: 'flex-start' }}>
        <TextField
          label={intl.formatMessage({ id: 'page.manage.translations.filter' })}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 220 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          label={intl.formatMessage({ id: 'page.manage.translations.newKey' })}
          value={newKey}
          onChange={(e) => { setNewKey(e.target.value); setNewKeyError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') addKey(); }}
          error={Boolean(newKeyError)}
          helperText={newKeyError ?? ' '}
          size="small"
          sx={{ minWidth: 240 }}
        />
        <Button startIcon={<AddIcon />} onClick={addKey} sx={{ mt: 0.5 }}>
          <FormattedMessage id="page.manage.translations.add" />
        </Button>
      </Stack>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
          <FormattedMessage id="page.manage.translations.empty" />
        </Typography>
      ) : (
        <Box>
          {/* Column headers (desktop only) */}
          <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: gridColumns, gap: 1, px: 1, mb: 0.5 }}>
            <Typography variant="overline" color="text.secondary"><FormattedMessage id="page.manage.translations.keyColumn" /></Typography>
            {LOCALES.map((l) => (
              <Typography key={l} variant="overline" color="text.secondary">{l.toUpperCase()}</Typography>
            ))}
            <Box />
          </Box>

          {visibleRows.map((row) => (
            <Box
              key={row.key}
              sx={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                gap: 1,
                alignItems: 'center',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{row.key}</Typography>
              {LOCALES.map((locale) => (
                <TextField
                  key={locale}
                  value={row.values[locale] ?? ''}
                  onChange={(e) => setValue(row.key, locale, e.target.value)}
                  inputProps={{ 'aria-label': `${row.key} ${locale.toUpperCase()}` }}
                  size="small"
                  fullWidth
                />
              ))}
              <IconButton
                aria-label={intl.formatMessage({ id: 'page.manage.translations.remove' }, { key: row.key })}
                size="small"
                onClick={() => removeKey(row.key)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          {visibleRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
              <FormattedMessage id="page.manage.translations.noMatch" />
            </Typography>
          )}
        </Box>
      )}

      {submitError && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(false)}>
          <FormattedMessage id="page.manage.translations.success" />
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.manage.translations.save" />}
        </Button>
      </Box>
    </Box>
  );
};
