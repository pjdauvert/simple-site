import { Box, Paper, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { ConfigVersionsPanel } from '../../components/manage';

/** Admin dashboard: a greeting over the config version panel (publish / archives). */
export const ManagePage: React.FC = () => {
  const { user } = useAuth();
  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id="page.manage.greetings" values={{ user: user?.name ?? user?.email }} />
      </Typography>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
        <ConfigVersionsPanel />
      </Paper>
    </Box>
  );
};
