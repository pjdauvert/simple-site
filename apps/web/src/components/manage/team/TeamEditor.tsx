import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  BASE_LOCALE,
  TEAM_PRESENTATION_KEY,
  TEAM_TITLE_KEY,
  TeamConfigSchema,
  type Locale,
  type TeamMember,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { loadTeam, saveTeam } from '../../../services/teamService';
import { loadLanguages } from '../../../services/initService';
import { useNotifications } from '../../../hooks/useNotifications';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { moveItem } from '../pages/pagesDraft';
import { createMember, membersAreValid, normalizeSocialLinks, validateMembers } from './teamDraft';
import { MemberFormDialog } from './MemberFormDialog';

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
 * Team editor for /manage/team: list of members (reorder = public overview order)
 * with an edit dialog per member. DIRECT SAVE: unlike the rest of the admin, a
 * save is live immediately — the team has its own blob, outside the config
 * draft/publish cycle — which the caption under the toolbar spells out.
 */
export const TeamEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();
  const flags = useFeatureFlags();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [title, setTitle] = useState('');
  const [presentation, setPresentation] = useState('');
  const [alternateLayout, setAlternateLayout] = useState(false);
  const [languages, setLanguages] = useState<Locale[]>([BASE_LOCALE]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadTeam(),
      // The language list only drives the biography locale switch — losing it
      // must not block the editor, so fall back to the base locale alone.
      loadLanguages().then(({ locales }) => locales).catch(() => [BASE_LOCALE] as Locale[]),
    ])
      .then(([team, langs]) => {
        if (!active) return;
        setMembers(team.members);
        setTitle(team.title ?? '');
        setPresentation(team.presentation ?? '');
        setAlternateLayout(Boolean(team.alternateLayout));
        setLanguages(langs.length > 0 ? langs : [BASE_LOCALE]);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.team.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  const errors = useMemo(() => validateMembers(members), [members]);

  const updateMember = (index: number, next: TeamMember) =>
    setMembers((prev) => prev.map((m, i) => (i === index ? next : m)));

  const addMember = () => {
    setMembers((prev) => {
      setEditIndex(prev.length);
      return [...prev, createMember()];
    });
  };

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setEditIndex(null);
  };

  const handleSave = async () => {
    setShowErrors(true);
    if (!membersAreValid(errors)) {
      notify.error(intl.formatMessage({ id: 'page.manage.team.error.invalid' }));
      return;
    }
    const normalized = members.map((m) => ({
      ...m,
      slug: m.slug.trim(),
      name: m.name.trim(),
      jobTitle: m.jobTitle.trim(),
      socialLinks: normalizeSocialLinks(m.socialLinks),
    }));
    const parsed = TeamConfigSchema.safeParse({
      members: normalized,
      title: title.trim() || undefined,
      presentation: presentation.trim() || undefined,
      alternateLayout,
    });
    if (!parsed.success) {
      notify.error(intl.formatMessage({ id: 'page.manage.team.error.invalid' }));
      return;
    }
    setSubmitting(true);
    try {
      await saveTeam(parsed.data);
      setMembers(parsed.data.members);
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

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.team.liveNote" />
      </Typography>

      <TextField
        label={intl.formatMessage({ id: 'page.manage.team.field.title' })}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        size="small"
        fullWidth
        helperText={intl.formatMessage({ id: 'page.manage.team.field.title.help' })}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            endAdornment: (
              <TranslateShortcut
                i18nKey={TEAM_TITLE_KEY}
                label={intl.formatMessage({ id: 'page.manage.team.translate' })}
              />
            ),
          },
        }}
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
        slotProps={{
          input: {
            endAdornment: (
              <TranslateShortcut
                i18nKey={TEAM_PRESENTATION_KEY}
                label={intl.formatMessage({ id: 'page.manage.team.translate' })}
              />
            ),
          },
        }}
      />

      <FormControlLabel
        control={<Switch checked={alternateLayout} onChange={(_, checked) => setAlternateLayout(checked)} />}
        label={<Typography variant="body2"><FormattedMessage id="page.manage.team.alternateLayout" /></Typography>}
        sx={{ mb: 1 }}
      />

      {members.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <FormattedMessage id="page.manage.team.empty" />
        </Typography>
      )}

      <List dense disablePadding>
        {members.map((member, index) => {
          const rowErrors = errors[index] ?? {};
          const hasError = showErrors && Boolean(rowErrors.name || rowErrors.slug);
          return (
            <ListItem
              key={index}
              disableGutters
              secondaryAction={
                <Stack direction="row" spacing={0} alignItems="center">
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.team.moveUp' })}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={index === 0}
                        onClick={() => setMembers((prev) => moveItem(prev, index, index - 1))}
                        aria-label={intl.formatMessage({ id: 'page.manage.team.moveUp' })}
                      >
                        <UpIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.team.moveDown' })}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={index === members.length - 1}
                        onClick={() => setMembers((prev) => moveItem(prev, index, index + 1))}
                        aria-label={intl.formatMessage({ id: 'page.manage.team.moveDown' })}
                      >
                        <DownIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.team.edit' })}>
                    <IconButton
                      size="small"
                      onClick={() => setEditIndex(index)}
                      aria-label={intl.formatMessage({ id: 'page.manage.team.edit' })}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.team.delete' })}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteIndex(index)}
                      aria-label={intl.formatMessage({ id: 'page.manage.team.delete' })}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              }
            >
              <ListItemAvatar>
                <Avatar src={member.photoUrl ? `${member.photoUrl}?tr=w-80,h-80,fo-face,q-80,f-auto` : undefined}>
                  {(member.name.trim() || '?').charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" noWrap color={hasError ? 'error' : undefined} sx={{ pr: 18 }}>
                    {member.name.trim() || intl.formatMessage({ id: 'page.manage.team.untitled' })}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ pr: 18 }}>
                    {[member.jobTitle.trim(), `/team/member/${member.slug || '…'}`].filter(Boolean).join(' — ')}
                  </Typography>
                }
                disableTypography
              />
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ mt: 2 }}>
        <Button startIcon={<AddIcon />} onClick={addMember}>
          <FormattedMessage id="page.manage.team.add" />
        </Button>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.manage.team.save" />}
        </Button>
      </Box>

      {editIndex !== null && members[editIndex] && (
        <MemberFormDialog
          open
          member={members[editIndex]}
          errors={errors[editIndex] ?? {}}
          showErrors={showErrors}
          languages={languages}
          enablePicker={Boolean(flags?.media)}
          onChange={(next) => updateMember(editIndex, next)}
          onClose={() => setEditIndex(null)}
        />
      )}

      <Dialog open={deleteIndex !== null} onClose={() => setDeleteIndex(null)} maxWidth="xs" fullWidth>
        <DialogTitle><FormattedMessage id="page.manage.team.confirmDelete.title" /></DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage
              id="page.manage.team.confirmDelete.body"
              values={{ name: deleteIndex !== null ? (members[deleteIndex]?.name || members[deleteIndex]?.slug) : '' }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteIndex(null)}><FormattedMessage id="page.manage.team.confirmDelete.cancel" /></Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { if (deleteIndex !== null) removeMember(deleteIndex); setDeleteIndex(null); }}
          >
            <FormattedMessage id="page.manage.team.confirmDelete.confirm" />
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
