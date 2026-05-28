import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import { useIntl, FormattedMessage } from 'react-intl';
import { requestPasswordRecovery } from '@netlify/identity';
import { loginPath } from '../../features/auth/auth.constants';
import { isValidEmail } from '../../features/auth/auth.utils';

export const ForgotPasswordPage: React.FC = () => {
  const intl = useIntl();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setLoading(true);
    setError(null);
    try {
      await requestPasswordRecovery(email);
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('not found')) {
        setSent(true);
      } else {
        setError(message || intl.formatMessage({ id: 'forgotPassword.error.generic' }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: { xs: '100%', sm: 400 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          <FormattedMessage id="forgotPassword.title" />
        </Typography>
        {sent ? (
          <Alert severity="success">
            <FormattedMessage id="forgotPassword.success" />
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                label={intl.formatMessage({ id: 'login.email' })}
                type="email"
                fullWidth
                size="medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailError(email !== '' && !isValidEmail(email))}
                error={emailError}
                helperText={emailError ? <FormattedMessage id="login.email.invalid" /> : ' '}
                sx={{ mb: 2, minHeight: 44 }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{ minHeight: 44 }}
              >
                <FormattedMessage id="forgotPassword.submit" />
              </Button>
            </Box>
          </>
        )}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link component={RouterLink} to={loginPath} variant="body2">
            <FormattedMessage id="forgotPassword.backToLogin" />
          </Link>
        </Box>
      </Paper>
    </Box>
  );
};
