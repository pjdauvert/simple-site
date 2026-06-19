import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/react/dashboard';
import Transloadit from '@uppy/transloadit';
import type { ApiResponseSuccessPayload } from '@simple-site/interfaces';
import apiService from '../../services/apiService';

import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';

type SignaturePayload = { params: string; signature: string };

function createUppy() {
  return new Uppy({
    restrictions: { allowedFileTypes: ['image/*'] },
  }).use(Transloadit, {
    assemblyOptions: async () => {
      const res = await apiService.post<void, SignaturePayload>('upload/signature');
      if (!('data' in res)) throw new Error('Failed to obtain upload signature');
      const { params, signature } = (res as ApiResponseSuccessPayload<SignaturePayload>).data;
      return { params, signature };
    },
    waitForEncoding: true,
  });
}

export const MediaPage: React.FC = () => {
  const [uppy] = useState(createUppy);
  const theme = useTheme();

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>Media</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload images for use across your site. Files are processed and stored via Transloadit.
      </Typography>
      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
        <Dashboard
          uppy={uppy}
          theme={theme.palette.mode}
          height={480}
        />
      </Paper>
    </Box>
  );
};
