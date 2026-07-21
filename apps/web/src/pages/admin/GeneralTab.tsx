import { Paper } from '@mui/material';
import { SiteSettingsForm } from '../../components/manage';

/** General tab of /manage/site — the site-settings form (self-notifies on save). */
export const GeneralTab: React.FC = () => (
  <Paper sx={{ p: { xs: 2, sm: 3 } }}>
    <SiteSettingsForm />
  </Paper>
);
