import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

export const NotFoundPage: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexGrow: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      p: { xs: 2, sm: 4 },
    }}
  >
    <Typography variant="h1" sx={{ fontSize: { xs: '4rem', sm: '6rem' }, fontWeight: 700, lineHeight: 1 }}>
      404
    </Typography>
    <Typography variant="h5">
      <FormattedMessage id="notFound.title" />
    </Typography>
    <Typography variant="body1" color="text.secondary">
      <FormattedMessage id="notFound.message" />
    </Typography>
    <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 1 }}>
      <FormattedMessage id="notFound.backHome" />
    </Button>
  </Box>
);
