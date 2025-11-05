import React from 'react';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { MenuBar } from './MenuBar';
import type { MenuItem } from '../types/menu.interface';
import { Footer } from './Footer';
import { useAppTheme } from '../hooks/useTheme';

interface MainLayoutProps {
  children: ReactNode;
  menuItems: MenuItem[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, menuItems }) => {
  const { themeConfig } = useAppTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <MenuBar menuItems={menuItems} logoUrl={themeConfig.logoUrl} />
      <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
      </Box>
      <Footer />
    </Box>
  );
}
