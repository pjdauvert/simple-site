import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { TeamConfigSchema } from '@simple-site/interfaces';
import { MEMBER_PAGE_DESIGN_DEFAULTS, TEAM_PAGE_DESIGN_DEFAULTS } from '../../../pages/team/teamDisplay';
import { Loader } from '../../Loader';
import { StickySaveButton } from '../StickySaveButton';
import { ColorField } from '../themes/ColorField';
import { loadTeam, saveTeam } from '../../../services/teamService';
import { useNotifications } from '../../../hooks/useNotifications';
import { buildDesign, toSectionDraft, type SectionDesignDraft } from './teamDesign';

interface SectionDesignFieldsProps {
  value: SectionDesignDraft;
  onChange: (next: SectionDesignDraft) => void;
}

/**
 * The design options of one surface: portrait corner radius (slider + live
 * shape preview), portrait border, and the description frame (background,
 * border) — colors fall back to the theme when left empty.
 */
const SectionDesignFields: React.FC<SectionDesignFieldsProps> = ({ value, onChange }) => {
  const intl = useIntl();
  const theme = useTheme();
  const set = (patch: Partial<SectionDesignDraft>) => onChange({ ...value, ...patch });

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="body2" gutterBottom>
          <FormattedMessage id="page.manage.team.design.pictureRadius" />
        </Typography>
        <Stack direction="row" spacing={3} alignItems="center">
          <Slider
            value={value.pictureRadius}
            onChange={(_, radius) => set({ pictureRadius: radius as number })}
            min={0}
            max={50}
            valueLabelDisplay="auto"
            valueLabelFormat={(radius) => `${radius}%`}
            aria-label={intl.formatMessage({ id: 'page.manage.team.design.pictureRadius' })}
            sx={{ maxWidth: 260 }}
          />
          <Box
            aria-hidden
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              bgcolor: 'primary.main',
              opacity: 0.85,
              borderRadius: `${value.pictureRadius}%`,
              border: value.pictureBorder
                ? `3px solid ${value.pictureBorderColor.trim() || theme.palette.primary.dark}`
                : undefined,
            }}
          />
        </Stack>
      </Box>

      <Box>
        <FormControlLabel
          control={<Switch checked={value.pictureBorder} onChange={(_, checked) => set({ pictureBorder: checked })} />}
          label={<Typography variant="body2"><FormattedMessage id="page.manage.team.design.pictureBorder" /></Typography>}
        />
        {value.pictureBorder && (
          <Box sx={{ mt: 1 }}>
            <ColorField
              label={intl.formatMessage({ id: 'page.manage.team.design.pictureBorderColor' })}
              value={value.pictureBorderColor}
              onChange={(pictureBorderColor) => set({ pictureBorderColor })}
              helperText={intl.formatMessage({ id: 'page.manage.team.design.colorFallback' })}
            />
          </Box>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          <FormattedMessage id="page.manage.team.design.frame" />
        </Typography>
        <ColorField
          label={intl.formatMessage({ id: 'page.manage.team.design.frameBackgroundColor' })}
          value={value.frameBackgroundColor}
          onChange={(frameBackgroundColor) => set({ frameBackgroundColor })}
          helperText={intl.formatMessage({ id: 'page.manage.team.design.colorFallback' })}
        />
        <FormControlLabel
          control={<Switch checked={value.frameBorder} onChange={(_, checked) => set({ frameBorder: checked })} />}
          label={<Typography variant="body2"><FormattedMessage id="page.manage.team.design.frameBorder" /></Typography>}
        />
        {value.frameBorder && (
          <Box sx={{ mt: 1 }}>
            <ColorField
              label={intl.formatMessage({ id: 'page.manage.team.design.frameBorderColor' })}
              value={value.frameBorderColor}
              onChange={(frameBorderColor) => set({ frameBorderColor })}
              helperText={intl.formatMessage({ id: 'page.manage.team.design.colorFallback' })}
            />
          </Box>
        )}
      </Box>
    </Stack>
  );
};

/**
 * Design tab of /manage/team, split per surface: the team page (member rows —
 * also hosts the alternate-sides layout switch) and the member profile page.
 * Saving re-fetches the stored team and merges only the design options, so
 * edits from the other tabs are never clobbered. DIRECT SAVE: changes are live
 * immediately (the team sits outside draft/publish).
 */
export const TeamDesignEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [teamPage, setTeamPage] = useState<SectionDesignDraft>(toSectionDraft(undefined, TEAM_PAGE_DESIGN_DEFAULTS));
  const [memberPage, setMemberPage] = useState<SectionDesignDraft>(toSectionDraft(undefined, MEMBER_PAGE_DESIGN_DEFAULTS));
  const [alternateLayout, setAlternateLayout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    loadTeam()
      .then((team) => {
        if (!active) return;
        setTeamPage(toSectionDraft(team.design?.teamPage, TEAM_PAGE_DESIGN_DEFAULTS));
        setMemberPage(toSectionDraft(team.design?.memberPage, MEMBER_PAGE_DESIGN_DEFAULTS));
        setAlternateLayout(Boolean(team.alternateLayout));
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
      // Re-fetch so edits saved from the other team tabs aren't clobbered.
      const current = await loadTeam();
      const parsed = TeamConfigSchema.safeParse({
        ...current,
        alternateLayout,
        design: buildDesign(teamPage, memberPage),
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

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        <FormattedMessage id="page.manage.team.design.teamPage" />
      </Typography>
      <FormControlLabel
        control={<Switch checked={alternateLayout} onChange={(_, checked) => setAlternateLayout(checked)} />}
        label={<Typography variant="body2"><FormattedMessage id="page.manage.team.alternateLayout" /></Typography>}
        sx={{ display: 'flex', mb: 1.5 }}
      />
      <SectionDesignFields value={teamPage} onChange={setTeamPage} />

      <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4 }}>
        <FormattedMessage id="page.manage.team.design.memberPage" />
      </Typography>
      <SectionDesignFields value={memberPage} onChange={setMemberPage} />

      <StickySaveButton onClick={handleSave} disabled={submitting} submitting={submitting} />
    </Box>
  );
};
