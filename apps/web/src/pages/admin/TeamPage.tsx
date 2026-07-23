import { Box, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { TeamEditor } from '../../components/manage';

/** Team management page (/manage/team) — flag-gated; saves are live immediately. */
export const TeamPage: React.FC = () => (
  <Box sx={{ p: { xs: 2, sm: 4 } }}>
    <Typography variant="h5" gutterBottom>
      <FormattedMessage id="page.manage.team.title" />
    </Typography>
    <TeamEditor />
  </Box>
);
