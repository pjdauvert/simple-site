import { Box, Paper, Typography } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { FormattedMessage } from 'react-intl';
import { SiteSettingsForm } from '../../components/manage';

export const ManagePage: React.FC = () => {
  const { user } = useAuth();
  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5"><FormattedMessage id="page.manage.greetings"  values={{ user: user?.name ?? user?.email}} /></Typography>
      <Typography variant="h6"><FormattedMessage id="page.manage.disclaimer" /></Typography>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
        <SiteSettingsForm />
      </Paper>
    </Box>
  );
};
