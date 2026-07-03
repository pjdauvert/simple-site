import { Alert, Box, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';

/** Translations management — placeholder shell; the editor from PR #66 lands here. */
export const TranslationsPage: React.FC = () => (
  <Box sx={{ p: { xs: 2, sm: 4 } }}>
    <Typography variant="h5" gutterBottom>
      <FormattedMessage id="page.manage.translations.title" />
    </Typography>
    <Alert severity="info">
      <FormattedMessage id="page.manage.translations.comingSoon" />
    </Alert>
  </Box>
);
