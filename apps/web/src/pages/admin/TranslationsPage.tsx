import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { I18n, I18nDictionary, Locale } from '@simple-site/interfaces';
import { BASE_LOCALE, I18nSchema, collectI18nEntries, isLocaleCode } from '@simple-site/interfaces';
import { loadDraftConfig } from '../../services/configVersionService';
import {
  deleteLanguage,
  importTranslations,
  loadAllTranslations,
  replaceTranslations,
} from '../../services/translationsService';
import { useNotifications } from '../../hooks/useNotifications';
import { languageLabel } from '../../features/i18n/languageNames';

type RowStatus = 'ok' | 'missing' | 'additional';

interface Row {
  key: string;
  value: string;
  original?: string;
  status: RowStatus;
}

/**
 * Translations editor. The key list is the union of the keys the site config references
 * (via `collectI18nEntries`, each carrying its original value) and the keys already in
 * the translations blob for the selected language. Keys expected by the config but not
 * yet translated show as `missing` (error); keys in the blob the config doesn't use show
 * as `additional` (warning). Admins pick a language, edit values, and add / import /
 * remove languages.
 */
export const TranslationsPage: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The last-saved blob and an editable working copy of it (edits persist across
  // language switches; Save persists the selected language only).
  const [saved, setSaved] = useState<I18n>({});
  const [working, setWorking] = useState<I18n>({});
  const [expected, setExpected] = useState<{ key: string; defaultValue: string }[]>([]);
  const [language, setLanguage] = useState<Locale>(BASE_LOCALE);
  const [filter, setFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadAllTranslations(), loadDraftConfig()])
      .then(([blob, config]) => {
        if (!active) return;
        setSaved(blob);
        setWorking(blob);
        setExpected(collectI18nEntries(config));
        const langs = Object.keys(blob) as Locale[];
        setLanguage(langs.includes(BASE_LOCALE) ? BASE_LOCALE : (langs[0] ?? BASE_LOCALE));
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.translations.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const languages = useMemo(() => (Object.keys(working) as Locale[]).sort(), [working]);
  const expectedMap = useMemo(() => new Map(expected.map((e) => [e.key, e.defaultValue])), [expected]);
  const dict = useMemo<I18nDictionary>(() => working[language] ?? {}, [working, language]);

  const rows = useMemo<Row[]>(() => {
    const keys = new Set<string>([...expectedMap.keys(), ...Object.keys(dict)]);
    const needle = filter.trim().toLowerCase();
    return [...keys]
      .filter((key) => !needle || key.toLowerCase().includes(needle))
      .sort()
      .map((key) => {
        const value = dict[key] ?? '';
        const expectedByConfig = expectedMap.has(key);
        const status: RowStatus = expectedByConfig
          ? (value.trim() === '' ? 'missing' : 'ok')
          : 'additional';
        return { key, value, original: expectedMap.get(key), status };
      });
  }, [expectedMap, dict, filter]);

  const missingCount = useMemo(
    () => [...expectedMap.keys()].filter((k) => (dict[k] ?? '').trim() === '').length,
    [expectedMap, dict],
  );
  const additionalCount = useMemo(
    () => Object.keys(dict).filter((k) => !expectedMap.has(k)).length,
    [expectedMap, dict],
  );

  const dirty = useMemo(
    () => JSON.stringify(working[language] ?? {}) !== JSON.stringify(saved[language] ?? {}),
    [working, saved, language],
  );

  const setValue = (key: string, value: string) => {
    setWorking((prev) => ({ ...prev, [language]: { ...(prev[language] ?? {}), [key]: value } }));
  };

  const removeKey = (key: string) => {
    setWorking((prev) => {
      const next = { ...(prev[language] ?? {}) };
      delete next[key];
      return { ...prev, [language]: next };
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const dictionary = working[language] ?? {};
      await replaceTranslations(language, dictionary);
      setSaved((prev) => ({ ...prev, [language]: dictionary }));
      notify.success(intl.formatMessage({ id: 'page.manage.translations.success' }, { language: languageLabel(language) }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.translations.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdd = async () => {
    const code = addCode.trim().toLowerCase();
    if (!isLocaleCode(code)) {
      setAddError(intl.formatMessage({ id: 'page.manage.translations.add.invalid' }));
      return;
    }
    if (code in working) {
      setAddError(intl.formatMessage({ id: 'page.manage.translations.add.exists' }));
      return;
    }
    // Seed the new language with every config key present-but-empty, ready to fill.
    const seeded: I18nDictionary = Object.fromEntries(expected.map((e) => [e.key, '']));
    setSubmitting(true);
    try {
      await replaceTranslations(code, seeded);
      setSaved((prev) => ({ ...prev, [code]: seeded }));
      setWorking((prev) => ({ ...prev, [code]: seeded }));
      setLanguage(code);
      setAddOpen(false);
      setAddCode('');
      setAddError(null);
      notify.success(intl.formatMessage({ id: 'page.manage.translations.add.success' }, { language: languageLabel(code) }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.translations.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    let parsed: I18n;
    try {
      const data = JSON.parse(await file.text());
      const result = I18nSchema.safeParse(data);
      if (!result.success) throw new Error('invalid');
      parsed = result.data;
    } catch {
      notify.error(intl.formatMessage({ id: 'page.manage.translations.import.invalid' }));
      return;
    }
    setSubmitting(true);
    try {
      await importTranslations(parsed);
      setSaved((prev) => ({ ...prev, ...parsed }));
      setWorking((prev) => ({ ...prev, ...parsed }));
      notify.success(intl.formatMessage({ id: 'page.manage.translations.import.success' }, { count: Object.keys(parsed).length }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.translations.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setSubmitting(true);
    try {
      await deleteLanguage(language);
      const drop = (blob: I18n): I18n => Object.fromEntries(Object.entries(blob).filter(([l]) => l !== language));
      setSaved(drop);
      setWorking((prev) => {
        const next = drop(prev);
        const remaining = Object.keys(next) as Locale[];
        setLanguage(remaining.includes(BASE_LOCALE) ? BASE_LOCALE : (remaining[0] ?? BASE_LOCALE));
        return next;
      });
      setRemoveOpen(false);
      notify.success(intl.formatMessage({ id: 'page.manage.translations.remove.success' }, { language: languageLabel(language) }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.translations.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (loadError) {
    return <Box sx={{ p: { xs: 2, sm: 4 } }}><Alert severity="error">{loadError}</Alert></Box>;
  }

  const gridColumns = { xs: '1fr', md: 'minmax(160px, 260px) minmax(120px, 1fr) 2fr 40px' };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom><FormattedMessage id="page.manage.translations.title" /></Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="translations-language-label"><FormattedMessage id="page.manage.translations.language" /></InputLabel>
          <Select
            labelId="translations-language-label"
            label={intl.formatMessage({ id: 'page.manage.translations.language' })}
            value={languages.includes(language) ? language : ''}
            onChange={(e) => setLanguage(e.target.value as Locale)}
          >
            {languages.map((loc) => (
              <MenuItem key={loc} value={loc}>{languageLabel(loc)} ({loc})</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button startIcon={<AddIcon />} onClick={() => { setAddCode(''); setAddError(null); setAddOpen(true); }}>
          <FormattedMessage id="page.manage.translations.add" />
        </Button>
        <Button startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
          <FormattedMessage id="page.manage.translations.import" />
        </Button>
        <Button
          color="error"
          startIcon={<DeleteOutlineIcon />}
          disabled={language === BASE_LOCALE || languages.length <= 1}
          onClick={() => setRemoveOpen(true)}
        >
          <FormattedMessage id="page.manage.translations.remove" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          data-testid="translations-import-input"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // allow re-importing the same file
            if (file) void handleImportFile(file);
          }}
        />
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label={intl.formatMessage({ id: 'page.manage.translations.filter' })}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 220 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Chip size="small" color="error" variant="outlined"
          label={intl.formatMessage({ id: 'page.manage.translations.legend.missing' }, { count: missingCount })} />
        <Chip size="small" color="warning" variant="outlined"
          label={intl.formatMessage({ id: 'page.manage.translations.legend.additional' }, { count: additionalCount })} />
      </Stack>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
          <FormattedMessage id="page.manage.translations.empty" />
        </Typography>
      ) : (
        <Box>
          <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: gridColumns, gap: 1, px: 1, mb: 0.5 }}>
            <Typography variant="overline" color="text.secondary"><FormattedMessage id="page.manage.translations.col.key" /></Typography>
            <Typography variant="overline" color="text.secondary"><FormattedMessage id="page.manage.translations.col.original" /></Typography>
            <Typography variant="overline" color="text.secondary"><FormattedMessage id="page.manage.translations.col.value" /></Typography>
            <Box />
          </Box>

          {rows.map((row) => (
            <Box
              key={row.key}
              sx={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                gap: 1,
                alignItems: 'center',
                px: 1,
                py: 0.5,
                borderLeft: 3,
                borderColor:
                  row.status === 'missing' ? 'error.main' : row.status === 'additional' ? 'warning.main' : 'transparent',
                borderRadius: 0.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{row.key}</Typography>
                {row.status === 'additional' && (
                  <Chip size="small" color="warning" variant="outlined"
                    label={intl.formatMessage({ id: 'page.manage.translations.tag.extra' })} />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {row.original ?? '—'}
              </Typography>
              <TextField
                value={row.value}
                onChange={(e) => setValue(row.key, e.target.value)}
                inputProps={{ 'aria-label': row.key }}
                error={row.status === 'missing'}
                size="small"
                fullWidth
              />
              <Tooltip title={intl.formatMessage({ id: 'page.manage.translations.removeKey' }, { key: row.key })}>
                <IconButton size="small" onClick={() => removeKey(row.key)}
                  aria-label={intl.formatMessage({ id: 'page.manage.translations.removeKey' }, { key: row.key })}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting || !dirty}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : (
            <FormattedMessage id="page.manage.translations.save" values={{ language: languageLabel(language) }} />
          )}
        </Button>
      </Box>

      {/* Add-language dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <DialogTitle><FormattedMessage id="page.manage.translations.add.title" /></DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}><FormattedMessage id="page.manage.translations.add.help" /></DialogContentText>
          <TextField
            autoFocus
            label={intl.formatMessage({ id: 'page.manage.translations.add.code' })}
            value={addCode}
            onChange={(e) => { setAddCode(e.target.value); setAddError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
            error={Boolean(addError)}
            helperText={addError ?? (isLocaleCode(addCode.trim().toLowerCase()) ? languageLabel(addCode.trim().toLowerCase()) : ' ')}
            size="small"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}><FormattedMessage id="page.manage.translations.cancel" /></Button>
          <Button variant="contained" onClick={handleAdd} disabled={submitting}>
            <FormattedMessage id="page.manage.translations.add.confirm" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove-language confirm */}
      <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)}>
        <DialogTitle><FormattedMessage id="page.manage.translations.remove.title" /></DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage id="page.manage.translations.remove.body" values={{ language: languageLabel(language) }} />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveOpen(false)}><FormattedMessage id="page.manage.translations.cancel" /></Button>
          <Button color="error" variant="contained" onClick={handleRemove} disabled={submitting}>
            <FormattedMessage id="page.manage.translations.remove.confirm" />
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
