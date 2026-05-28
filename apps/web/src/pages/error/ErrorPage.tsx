import { Box, Typography } from '@mui/material';

export type ErrorPageProps = {
    title: string;
    message: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ title, message }) => {
  // KNOWN LIMITATION: this error screen is always rendered in English regardless of user
  // locale. Localising it would require a synchronous fallback message bundle loaded before
  // the async translation fetch — complexity not warranted at this stage. Accepted trade-off:
  // the i18n layer has failed, so no translated string is available anyway.
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" style={{ marginBottom: '0.5rem' }}>{title}</Typography>
        <Typography variant="body1" color="text.secondary">{message}</Typography>
      </Box>
    </Box>
  );
};