import { Box } from '@mui/material';

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
        <h1>{title}</h1>
        <p>{message}</p>
      </Box>
    </Box>
  );
};