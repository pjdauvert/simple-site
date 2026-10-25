import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { ThemeConfig } from '@simple-site/interfaces';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateThemes } from '../../../services/themesService';
import { ThemeEditor } from './ThemeEditor';
import { Loader } from '../../Loader';
import { useDraftAutoSave } from '../../../hooks/useDraftAutoSave';
import { useDraftSaveNotifications } from '../../../hooks/useDraftSaveNotifications';
import { draftToTheme, isDraftValid, newThemeDraft, themeToDraft, type ThemeDraft } from './themeFields';

/**
 * Themes editor for /manage/site: full-CRUD editor for the config `themes` array
 * (add / edit / delete, saved together). Prefills from the working draft
 * (`GET /api/config/draft`) and AUTO-SAVES every settled change via
 * `PUT /api/config/themes`, which writes the draft — there is no save button, the
 * indicator reports where the write stands. A theme missing its name or one of its
 * required colors (and a duplicate name) holds the write back instead of sending a
 * payload the schema would reject. Changes go live only when published from the
 * Config Versions panel.
 */
export const ThemesEditor: React.FC = () => {
  const intl = useIntl();
  const [drafts, setDrafts] = useState<ThemeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | false>(0);

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

  // The payload itself is the auto-saved value: the drafts' trailing whitespace
  // is not a change worth a write.
  const themes = useMemo<ThemeConfig[] | null>(
    () => (loading ? null : drafts.map(draftToTheme)),
    [loading, drafts],
  );

  const names = themes?.map((theme) => theme.themeName) ?? [];
  const hasDuplicate = new Set(names).size !== names.length;
  const complete = drafts.every(isDraftValid);

  const save = useCallback(async (next: ThemeConfig[]) => {
    await updateThemes(next);
  }, []);

  const saveState = useDraftAutoSave({ value: themes, save, enabled: complete && !hasDuplicate });
  useDraftSaveNotifications(saveState);

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

      {/* Duplicate names have no field of their own to flag — without this the
          write would just sit pending with nothing explaining why. */}
      {hasDuplicate && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <FormattedMessage id="page.manage.themes.error.duplicate" />
        </Alert>
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
            {/* Auto-save: a missing required field is flagged as soon as it is
                missing — it is what is holding the write back. */}
            <ThemeEditor draft={draft} showErrors onChange={(d) => updateDraft(index, d)} />
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
    </Box>
  );
};
