import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { loadSiteConfig } from '../../services/initService';
import { updateThemes } from '../../services/themesService';
import {
  ThemeEditor,
  draftToTheme,
  isDraftValid,
  newThemeDraft,
  themeToDraft,
  type ThemeDraft,
} from '../../components/themes';

/** Full-CRUD editor for the config `themes` array (add / edit / delete, saved together). */
export const ThemesPage: React.FC = () => {
  const intl = useIntl();
  const [drafts, setDrafts] = useState<ThemeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | false>(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    loadSiteConfig()
      .then((config) => { if (active) setDrafts(config.themes.map(themeToDraft)); })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.themes.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const updateDraft = (index: number, draft: ThemeDraft) => {
    setSuccess(false);
    setDrafts((prev) => prev.map((d, i) => (i === index ? draft : d)));
  };

  const addTheme = () => {
    setSuccess(false);
    setExpanded(drafts.length); // open the newly appended theme
    setDrafts((prev) => [...prev, newThemeDraft()]);
  };

  const removeTheme = (index: number) => {
    setSuccess(false);
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setShowErrors(true);
    setSuccess(false);
    const names = drafts.map((d) => d.themeName.trim());
    const hasDuplicate = new Set(names).size !== names.length;
    if (!drafts.every(isDraftValid) || hasDuplicate) {
      setSubmitError(intl.formatMessage({
        id: hasDuplicate ? 'page.manage.themes.error.duplicate' : 'page.manage.themes.error.invalid',
      }));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateThemes(drafts.map(draftToTheme));
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.themes.error.save' }));
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

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}><FormattedMessage id="page.manage.themes.title" /></Typography>

      {drafts.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <FormattedMessage id="page.manage.themes.empty" />
        </Typography>
      )}

      {drafts.map((draft, index) => (
        <Accordion
          key={index}
          expanded={expanded === index}
          onChange={(_, isOpen) => setExpanded(isOpen ? index : false)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              {draft.themeName.trim() || intl.formatMessage({ id: 'page.manage.themes.untitled' })}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ThemeEditor draft={draft} showErrors={showErrors} onChange={(d) => updateDraft(index, d)} />
            <Box sx={{ mt: 2 }}>
              <Button color="error" startIcon={<DeleteIcon />} onClick={() => removeTheme(index)}>
                <FormattedMessage id="page.manage.themes.delete" />
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      <Box sx={{ mt: 2 }}>
        <Button startIcon={<AddIcon />} onClick={addTheme}>
          <FormattedMessage id="page.manage.themes.add" />
        </Button>
      </Box>

      {submitError && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(false)}>
          <FormattedMessage id="page.manage.themes.success" />
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.manage.themes.save" />}
        </Button>
      </Box>
    </Box>
  );
};
