import React from 'react';
import { Box, Typography } from '@mui/material';
import { Loader } from './Loader';

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
        bgcolor: 'background.default',
        color: 'text.primary',
        gap: 3,
      }}
    >
      <Loader variant="triskelion" size={72} />
      <Typography variant="h5" component="div">
        {message}
      </Typography>
    </Box>
  );
};

