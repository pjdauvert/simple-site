import React from 'react';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { MenuBar } from './MenuBar';
import type { MenuGroupDisplay } from '@simple-site/interfaces';
import type { NavNode } from '../router/publicMenu';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: ReactNode;
  navNodes: NavNode[];
  groupDisplay?: MenuGroupDisplay;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, navNodes, groupDisplay }) => {

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <MenuBar navNodes={navNodes} groupDisplay={groupDisplay} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
          {children}
      </Box>
      <Footer />
    </Box>
  );
}
