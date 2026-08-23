import React from 'react';
import type { ReactNode } from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardActions,
  Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { brandGradient } from '../features/theme/muiTheme';

interface CardProps {
  media?: ReactNode;
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
  elevation?: 0 | 1 | 2;
}

export const Card: React.FC<CardProps> = ({
  media,
  title,
  body,
  actions,
  elevation = 1,
}) => {
  const theme = useTheme();

  return (
    <MuiCard
      elevation={elevation}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%',
          overflow: 'hidden',
        }}
      >
        {media ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {media}
          </Box>
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: brandGradient(theme),
            }}
          />
        )}
      </Box>

      <CardContent>
        <Box component="h6" sx={{ m: 0, mb: body ? 1 : 0, typography: 'h6' }}>
          {title}
        </Box>
        {body}
      </CardContent>

      {actions && (
        <CardActions
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            px: 2,
          }}
        >
          {actions}
        </CardActions>
      )}
    </MuiCard>
  );
};
