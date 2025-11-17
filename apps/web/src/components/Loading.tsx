import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#121212',
        color: '#fff',
        gap: 3,
      }}
    >
      <CircularProgress size={60} sx={{ color: '#90caf9' }} />
      <Typography variant="h5" component="div">
        {message}
      </Typography>
    </Box>
  );
};

