import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Translate as TranslateIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  TEAM_FORMER_MEMBERS_TITLE_KEY,
  TEAM_PRESENTATION_KEY,
  TEAM_TITLE_KEY,
  TeamConfigSchema,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { loadTeam, saveTeam } from '../../../services/teamService';
import { loadAllTranslations } from '../../../services/translationsService';
import { languageLabel } from '../../../features/i18n/languageNames';
import { useNotifications } from '../../../hooks/useNotifications';

/** Field adornment opening the Translations page deep-linked to a team key. */
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
 * Page tab of /manage/team — the team page's layout options: heading,
 * presentation text, alternate row layout, former-members section visibility
 * and heading. Saving re-fetches the stored team and merges only these options,
 * so member edits saved from the Members tab are never clobbered. DIRECT SAVE:
 * changes are live immediately (the team sits outside draft/publish).
 */
export const TeamPageSettings: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [title, setTitle] = useState('');
  const [presentation, setPresentation] = useState('');
  const [showFormerMembers, setShowFormerMembers] = useState(false);
  const [formerMembersTitle, setFormerMembersTitle] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadTeam(),
      // Only feeds the default-language reminder — losing it must not block the tab.
      loadAllTranslations().catch(() => null),
    ])
      .then(([team, translations]) => {
        if (!active) return;
        setTitle(team.title ?? '');
        setPresentation(team.presentation ?? '');
        setShowFormerMembers(Boolean(team.showFormerMembers));
        setFormerMembersTitle(team.formerMembersTitle ?? '');
        setDefaultLanguage(translations?.defaultLanguage ?? null);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.team.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      // Re-fetch so members saved from the Members tab aren't clobbered.
      const current = await loadTeam();
      // `alternateLayout` and `design` belong to the Design tab; `...current` keeps them.
      const parsed = TeamConfigSchema.safeParse({
        ...current,
        title: title.trim() || undefined,
        presentation: presentation.trim() || undefined,
        showFormerMembers,
        formerMembersTitle: formerMembersTitle.trim() || undefined,
      });
      if (!parsed.success) {
        notify.error(intl.formatMessage({ id: 'page.manage.team.error.invalid' }));
        return;
      }
      await saveTeam(parsed.data);
      notify.success(intl.formatMessage({ id: 'page.manage.team.saved' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.team.error.save' }));
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

  const translateLabel = intl.formatMessage({ id: 'page.manage.team.translate' });

  return (
    <Box sx={{ maxWidth: 640 }}>
      {defaultLanguage && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          <FormattedMessage
            id="page.manage.team.defaultLanguageNote"
            values={{ language: `${languageLabel(defaultLanguage)} (${defaultLanguage})` }}
          />
        </Alert>
      )}
      <TextField
        label={intl.formatMessage({ id: 'page.manage.team.field.title' })}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        size="small"
        fullWidth
        helperText={intl.formatMessage({ id: 'page.manage.team.field.title.help' })}
        sx={{ mb: 2 }}
        slotProps={{ input: { endAdornment: <TranslateShortcut i18nKey={TEAM_TITLE_KEY} label={translateLabel} /> } }}
      />

      <TextField
        label={intl.formatMessage({ id: 'page.manage.team.field.presentation' })}
        value={presentation}
        onChange={(e) => setPresentation(e.target.value)}
        size="small"
        fullWidth
        multiline
        minRows={3}
        helperText={intl.formatMessage({ id: 'page.manage.team.field.presentation.help' })}
        sx={{ mb: 2 }}
        slotProps={{ input: { endAdornment: <TranslateShortcut i18nKey={TEAM_PRESENTATION_KEY} label={translateLabel} /> } }}
      />

      <FormControlLabel
        control={<Switch checked={showFormerMembers} onChange={(_, checked) => setShowFormerMembers(checked)} />}
        label={<Typography variant="body2"><FormattedMessage id="page.manage.team.showFormerMembers" /></Typography>}
        sx={{ display: 'flex', mb: 1 }}
      />
      {showFormerMembers && (
        <TextField
          label={intl.formatMessage({ id: 'page.manage.team.field.formerMembersTitle' })}
          value={formerMembersTitle}
          onChange={(e) => setFormerMembersTitle(e.target.value)}
          size="small"
          fullWidth
          helperText={intl.formatMessage({ id: 'page.manage.team.field.formerMembersTitle.help' })}
          sx={{ mb: 2 }}
          slotProps={{
            input: { endAdornment: <TranslateShortcut i18nKey={TEAM_FORMER_MEMBERS_TITLE_KEY} label={translateLabel} /> },
          }}
        />
      )}

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.manage.team.save" />}
        </Button>
      </Box>
    </Box>
  );
};
