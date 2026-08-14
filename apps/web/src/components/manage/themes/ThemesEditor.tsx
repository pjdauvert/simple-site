import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateThemes } from '../../../services/themesService';
import { useNotifications } from '../../../hooks/useNotifications';
import { ThemeEditor } from './ThemeEditor';
import { Loader } from '../../Loader';
import { StickySaveButton } from '../StickySaveButton';
import { draftToTheme, isDraftValid, newThemeDraft, themeToDraft, type ThemeDraft } from './themeFields';

/**
 * Themes editor for /manage/site: full-CRUD editor for the config `themes` array
 * (add / edit / delete, saved together). Prefills from the working draft
 * (`GET /api/config/draft`) and saves via `PUT /api/config/themes`, which writes
 * the draft. Changes go live only when published from the Config Versions panel.
 */
export const ThemesEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();
  const [drafts, setDrafts] = useState<ThemeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | false>(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => { if (active) setDrafts(config.themes.map(themeToDraft)); })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.themes.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const updateDraft = (index: number, draft: ThemeDraft) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? draft : d)));
  };

  const addTheme = () => {
    setExpanded(drafts.length); // open the newly appended theme
    setDrafts((prev) => [...prev, newThemeDraft()]);
  };

  const removeTheme = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setShowErrors(true);
    const names = drafts.map((d) => d.themeName.trim());
    const hasDuplicate = new Set(names).size !== names.length;
    if (!drafts.every(isDraftValid) || hasDuplicate) {
      notify.error(intl.formatMessage({
        id: hasDuplicate ? 'page.manage.themes.error.duplicate' : 'page.manage.themes.error.invalid',
      }));
      return;
    }
    setSubmitting(true);
    try {
      await updateThemes(drafts.map(draftToTheme));
      notify.success(intl.formatMessage({ id: 'page.manage.themes.success' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.themes.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader variant="triskelion" size={48} /></Box>;
  }
  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  return (
    <Box>
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

      <StickySaveButton onClick={handleSave} disabled={submitting} submitting={submitting}>
        <FormattedMessage id="page.manage.themes.save" />
      </StickySaveButton>
    </Box>
  );
};
