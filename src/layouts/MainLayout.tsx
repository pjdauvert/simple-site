import React from 'react';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { MenuBar } from './MenuBar';
import type { MenuItem } from '../types/menu.interface';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: ReactNode;
  menuItems: MenuItem[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, menuItems }) => {

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <MenuBar menuItems={menuItems} />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1
        }}
      >
          {children}
      </Box>
      <Footer />
    </Box>
  );
}
