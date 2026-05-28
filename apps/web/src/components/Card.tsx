import React from 'react';
import type { ReactNode } from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardActions,
  Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

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
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const tertiary = theme.palette.tertiary?.main ?? primary;

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
              background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${tertiary} 100%)`,
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
