import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import { Translate as TranslateIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { CONTACT_PRESENTATION_KEY, ContactConfigSchema } from '@simple-site/interfaces';
import { Loader } from '../../components/Loader';
import { loadContactConfig, saveContactConfig } from '../../services/contactService';
import { loadAllTranslations } from '../../services/translationsService';
import { languageLabel } from '../../features/i18n/languageNames';
import { useNotifications } from '../../hooks/useNotifications';

/** Field adornment opening the Translations page deep-linked to the contact key. */
const TranslateShortcut: React.FC<{ i18nKey: string; label: string }> = ({ i18nKey, label }) => (
  <Tooltip title={label}>
    <IconButton
      size="small"
      sx={{ alignSelf: 'flex-start' }}
      // Same-origin target, deliberately no `noopener` (see InlineTranslateButton).
      onClick={() => window.open(`/manage/translations?key=${encodeURIComponent(i18nKey)}`, '_blank')}
      aria-label={label}
    >
      <TranslateIcon fontSize="small" />
    </IconButton>
  </Tooltip>
);

/**
 * Contact management (/manage/contact, flag-gated): the presentation message
 * shown above the public contact form. The text is a translation DEFAULT —
 * per-language values are managed on the Translations page under
 * {@link CONTACT_PRESENTATION_KEY}. DIRECT SAVE: changes are live immediately
 * (the contact settings sit outside draft/publish, like the team).
 */
export const ContactPage: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [presentation, setPresentation] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadContactConfig(),
      // Only feeds the default-language reminder — losing it must not block the page.
      loadAllTranslations().catch(() => null),
    ])
      .then(([contact, translations]) => {
        if (!active) return;
        setPresentation(contact.presentation ?? '');
        setDefaultLanguage(translations?.defaultLanguage ?? null);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.contact.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const parsed = ContactConfigSchema.safeParse({ presentation: presentation.trim() || undefined });
      if (!parsed.success) {
        notify.error(intl.formatMessage({ id: 'page.manage.contact.error.save' }));
        return;
      }
      await saveContactConfig(parsed.data);
      notify.success(intl.formatMessage({ id: 'page.manage.contact.saved' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.contact.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id="page.manage.contact.title" />
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.contact.liveNote" />
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader variant="triskelion" size={48} /></Box>
      )}
      {!loading && loadError && <Alert severity="error">{loadError}</Alert>}

      {!loading && !loadError && (
        <Box sx={{ maxWidth: 640 }}>
          {defaultLanguage && (
            <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
              <FormattedMessage
                id="page.manage.contact.defaultLanguageNote"
                values={{ language: `${languageLabel(defaultLanguage)} (${defaultLanguage})` }}
              />
            </Alert>
          )}
          <TextField
            label={intl.formatMessage({ id: 'page.manage.contact.field.presentation' })}
            value={presentation}
            onChange={(e) => setPresentation(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={4}
            helperText={intl.formatMessage({ id: 'page.manage.contact.field.presentation.help' })}
            sx={{ mb: 2 }}
            slotProps={{
              input: {
                endAdornment: (
                  <TranslateShortcut
                    i18nKey={CONTACT_PRESENTATION_KEY}
                    label={intl.formatMessage({ id: 'page.manage.contact.translate' })}
                  />
                ),
              },
            }}
          />
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={handleSave} disabled={submitting}>
              {submitting ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.manage.contact.save" />}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};
