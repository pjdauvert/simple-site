import { Box, Button, Typography } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5">Hello {user?.name ?? user?.email}</Typography>
      <Button onClick={logout} sx={{ mt: 2 }}>Log out</Button>
    </Box>
  );
};
