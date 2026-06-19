import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/manage' },
  { label: 'Media',     path: '/manage/media' },
];

export const AdminNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = NAV_ITEMS.findIndex(item => item.path === location.pathname);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={activeIndex === -1 ? 0 : activeIndex}
        onChange={(_, idx: number) => navigate(NAV_ITEMS[idx].path)}
      >
        {NAV_ITEMS.map(item => (
          <Tab key={item.path} label={item.label} />
        ))}
      </Tabs>
    </Box>
  );
};
