import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';
import { FormattedMessage } from 'react-intl';


export const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: { xs: 2, sm: 3 },
        px: 2,
        mt: 'auto',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { sm: 'space-between' },
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
            textAlign: { xs: 'center', sm: 'left' },
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            <FormattedMessage id="footer.copyright" />
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            <Link
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
            >
              <FormattedMessage id="footer.license" />
            </Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

