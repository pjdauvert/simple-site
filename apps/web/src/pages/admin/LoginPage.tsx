import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useIntl, FormattedMessage } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const intl = useIntl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  const isValidEmail = (value: string) => EMAIL_REGEX.test(value);

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
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : intl.formatMessage({ id: 'login.error.generic' }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: { xs: '100%', sm: 400 } }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          <FormattedMessage id="login.title" />
        </Typography>
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
          <TextField
            label={intl.formatMessage({ id: 'login.password' })}
            type="password"
            fullWidth
            size="medium"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3, minHeight: 44 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ minHeight: 44 }}
          >
            <FormattedMessage id="login.submit" />
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
