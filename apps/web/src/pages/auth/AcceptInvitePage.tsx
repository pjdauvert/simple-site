import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useIntl, FormattedMessage } from 'react-intl';
import { acceptInvite } from '@netlify/identity';
import { loginPath, loggedPath } from '../../features/auth/auth.constants';

export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const intl = useIntl();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) return <Navigate to={loginPath} replace />;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await acceptInvite(token, password);
      navigate(loggedPath);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : intl.formatMessage({ id: 'acceptInvite.error.generic' }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: { xs: '100%', sm: 400 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          <FormattedMessage id="acceptInvite.title" />
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label={intl.formatMessage({ id: 'acceptInvite.password' })}
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
            <FormattedMessage id="acceptInvite.submit" />
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
